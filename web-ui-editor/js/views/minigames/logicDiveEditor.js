// Logic Dive editor: questions, their answers, and drag-to-reorder.
import { moveItem, reindexOrder } from '../../core/listOps.js';
import { icon } from '../../ui/icons.js';
import { orderedCopy } from '../../core/minigameDefaults.js';
import { confirmDialog } from '../../ui/dialogs.js';
import { autoSaveTrial } from '../../core/storage.js';
import { generateId, escapeHtml } from '../../utils.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
import { registerActions } from '../../ui/actions.js';

const questionOf = (el) => [el.dataset.gameId, el.dataset.questionId];
const answerOf = (el) => [...questionOf(el), el.dataset.answerId];

registerActions('click', {
  addLogicDiveQuestion: (el) => addLogicDiveQuestion(el.dataset.gameId),
  moveQuestionUp: (el) => moveQuestionUp(...questionOf(el)),
  moveQuestionDown: (el) => moveQuestionDown(...questionOf(el)),
  deleteLogicDiveQuestion: (el) => deleteLogicDiveQuestion(...questionOf(el)),
  addLogicDiveAnswer: (el) => addLogicDiveAnswer(...questionOf(el)),
  deleteLogicDiveAnswer: (el) => deleteLogicDiveAnswer(...answerOf(el)),
});

registerActions('change', {
  updateLogicDiveQuestion: (el) =>
    updateLogicDiveQuestion(...questionOf(el), el.dataset.field, el.value),
  setCorrectAnswer: (el) => setCorrectAnswer(...answerOf(el)),
  updateLogicDiveAnswer: (el) =>
    updateLogicDiveAnswer(...answerOf(el), el.dataset.field, el.value),
});

// --- Main Rendering ---

export function renderLogicDiveEditor(mg) {
  // Read-only: seeding lives in ensureTypeSpecific, called at load and on a
  // gameType change. Doing it here mutated trial data as a side effect of
  // expanding a card, and the next autosave persisted a change undo never saw.
  const questions = (mg.typeSpecific && mg.typeSpecific.questions) || [];

  let html = `
    <div class="minigame-editor-section logic-dive-section">
      <h3>Logic Dive Questions</h3>
      <p class="section-description">Create questions with 3-5 multiple choice answers. Select an answer in green to mark it as the correct answer.</p>

      <div class="logic-dive-questions-container">
        ${
          questions.length === 0
            ? `
          <div class="empty-state">
            <p>No questions yet. Click "Add Question" to create your first question.</p>
          </div>
        `
            : renderLogicDiveQuestions(mg.gameId, questions)
        }
      </div>

      <!-- Floating button for questions -->
      <button class="minigame-floating-btn"
              data-game-id="${escapeHtml(mg.gameId)}" data-on-click="addLogicDiveQuestion"
              title="Add Question">
        ${icon('plus', { size: 20 })} <span class="minigame-floating-btn-text">Add Question</span>
      </button>
    </div>
  `;

  return html;
}

export function renderLogicDiveQuestions(gameId, questions) {
  let html = '';

  html += `<div class="question-drop-zone"
                data-insert-position="0"
                data-on-dragover="listGapDragOver"
                data-game-id="${escapeHtml(gameId)}" data-list-key="questions"
           data-on-drop="listDropInGap"
                data-on-dragleave="listGapDragLeave"></div>`;

  orderedCopy(questions).forEach((question, index) => {
    html += `
        <div class="reorder-wrapper"
             draggable="true"
             data-list-key="questions" data-id-key="questionId" data-item-id="${escapeHtml(question.questionId)}"
           data-on-dragstart="listDragStart"
             data-on-dragend="listDragEnd">
          ${renderLogicDiveQuestionEditor(gameId, question, index)}
        </div>

        <div class="question-drop-zone"
             data-insert-position="${index + 1}"
             data-on-dragover="listGapDragOver"
             data-game-id="${escapeHtml(gameId)}" data-list-key="questions"
           data-on-drop="listDropInGap"
             data-on-dragleave="listGapDragLeave"></div>
      `;
  });

  return html;
}

// Read-only, for the render path. ensureTypeSpecific normalizes `answers` at
// load and on every gameType change, but a throw inside a render function
// propagates out to openTrialFromHandle's catch and takes the whole trial
// down - un-openable behind "Could not open trial", naming no minigame - so
// this is the one place a missing list must not be assumed. Not mutating,
// for the same reason the seeding was moved out of the render in the first
// place: an autosave would persist a change undo never saw.
function answersOf(question) {
  return Array.isArray(question.answers) ? question.answers : [];
}

// The mutating form, for the handlers that are about to write to the list
// anyway and autosave straight after.
function ensureAnswers(question) {
  if (!Array.isArray(question.answers)) question.answers = [];
  return question.answers;
}

export function renderLogicDiveQuestionEditor(gameId, question, index) {
  const answers = answersOf(question);
  return `
    <div class="reorder-card">
      <div class="reorder-card-header">
        <div class="reorder-drag-handle">
          <div class="arrow-btn arrow-up"
               data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}"
               data-on-click="moveQuestionUp"
               title="Move up">${icon('chevronUp', { size: 14 })}</div>
          <div class="arrow-btn arrow-down"
               data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}"
               data-on-click="moveQuestionDown"
               title="Move down">${icon('chevronDown', { size: 14 })}</div>
        </div>
        <div class="reorder-number">Question #${index + 1}</div>
        <button class="btn-icon" data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}"
                data-on-click="deleteLogicDiveQuestion"
                title="Delete question">${icon('trash', { size: 16 })}</button>
      </div>

      <div class="question-body">
        <div class="form-group">
          <label>Question Text</label>
          <textarea class="form-input"
                    rows="2"
                    placeholder="Enter the question..."
                    data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}" data-field="questionText"
                    data-on-change="updateLogicDiveQuestion">${escapeHtml(question.questionText || '')}</textarea>
        </div>

        <div class="answers-section">
          <div class="answers-header">
            <h4>Answers (${answers.length}/5)</h4>
            ${
              answers.length < 5
                ? `
              <button class="btn btn-secondary btn-sm"
                      data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}"
                      data-on-click="addLogicDiveAnswer">
                ${icon('plus', { size: 15 })} Add Answer
              </button>
            `
                : ''
            }
          </div>

          <div class="answers-list">
            ${answers
              .map(
                (answer, ansIndex) => `
              <div class="answer-item ${answer.isCorrect ? 'correct-answer' : ''}">
                <div class="answer-radio">
                  <input type="radio"
                         name="correct_${question.questionId}"
                         ${answer.isCorrect ? 'checked' : ''}
                         data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}" data-answer-id="${escapeHtml(answer.answerId)}"
                         data-on-change="setCorrectAnswer"
                         title="Mark as correct answer">
                </div>
                <input type="text"
                       class="form-input answer-text-input"
                       placeholder="Answer ${ansIndex + 1}"
                       value="${escapeHtml(answer.answerText || '')}"
                       data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}" data-answer-id="${escapeHtml(answer.answerId)}" data-field="answerText"
                       data-on-change="updateLogicDiveAnswer">
                ${
                  answers.length > 2
                    ? `
                  <button class="btn-icon btn-icon-danger"
                          data-game-id="${escapeHtml(gameId)}" data-question-id="${escapeHtml(question.questionId)}" data-answer-id="${escapeHtml(answer.answerId)}"
                          data-on-click="deleteLogicDiveAnswer"
                          title="Delete answer">${icon('trash', { size: 15 })}</button>
                `
                    : ''
                }
              </div>
            `
              )
              .join('')}
          </div>

          ${
            answers.length < 2
              ? `
            <p class="validation-warning">${icon('warning', { size: 15 })} Add at least 2 answers</p>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

// --- Question Management ---

export function addLogicDiveQuestion(gameId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.questions) {
    mg.typeSpecific.questions = [];
  }

  const newQuestion = {
    questionId: generateId('q'),
    order: mg.typeSpecific.questions.length,
    questionText: '',
    answers: [
      { answerId: `a_${Date.now()}_1`, answerText: '', isCorrect: true },
      { answerId: `a_${Date.now()}_2`, answerText: '', isCorrect: false },
      { answerId: `a_${Date.now()}_3`, answerText: '', isCorrect: false },
      { answerId: `a_${Date.now()}_4`, answerText: '', isCorrect: false },
      { answerId: `a_${Date.now()}_5`, answerText: '', isCorrect: false },
    ],
  };

  mg.typeSpecific.questions.push(newQuestion);
  renderMinigameDetails();
  autoSaveTrial();
}

export async function deleteLogicDiveQuestion(gameId, questionId) {
  // The button sits beside the reorder arrows, and a question carries up to
  // five answers with it.
  const confirmed = await confirmDialog({
    title: 'Delete question',
    message: 'Delete this question? Its answers go with it.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  const mg = findMinigame(gameId);
  if (!mg) return;

  mg.typeSpecific.questions = mg.typeSpecific.questions.filter((q) => q.questionId !== questionId);
  reindexOrder(mg.typeSpecific.questions);

  renderMinigameDetails();
  autoSaveTrial();
}

export function updateLogicDiveQuestion(gameId, questionId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question) return;

  question[field] = value;
  autoSaveTrial();
}

// --- Answer Management ---

export function addLogicDiveAnswer(gameId, questionId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question) return;
  ensureAnswers(question);
  if (question.answers.length >= 5) return;

  const newAnswer = {
    answerId: generateId('a'),
    answerText: '',
    isCorrect: false,
  };

  question.answers.push(newAnswer);
  renderMinigameDetails();
  autoSaveTrial();
}

export async function deleteLogicDiveAnswer(gameId, questionId, answerId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question) return;
  ensureAnswers(question);
  // Two is the floor: a question with one answer is not a question.
  if (question.answers.length <= 2) return;

  // Removing the correct answer silently promotes the first one, so this
  // deletes more than the text the author clicked next to.
  const answer = question.answers.find((a) => a.answerId === answerId);
  const confirmed = await confirmDialog({
    title: 'Delete answer',
    message:
      answer && answer.isCorrect
        ? 'Delete this answer? It is the correct one, so the first remaining answer becomes correct.'
        : 'Delete this answer?',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  question.answers = question.answers.filter((a) => a.answerId !== answerId);

  // A question always has exactly one correct answer.
  if (!question.answers.some((a) => a.isCorrect)) {
    question.answers[0].isCorrect = true;
  }

  renderMinigameDetails();
  autoSaveTrial();
}

export function updateLogicDiveAnswer(gameId, questionId, answerId, field, value) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question) return;

  const answer = question.answers.find((a) => a.answerId === answerId);
  if (!answer) return;

  answer[field] = value;
  autoSaveTrial();
}

export function setCorrectAnswer(gameId, questionId, answerId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question) return;

  question.answers.forEach((a) => {
    a.isCorrect = a.answerId === answerId;
  });

  renderMinigameDetails();
  autoSaveTrial();
}

// --- Question Reordering ---

export function moveQuestionUp(gameId, questionId) {
  const mg = findMinigame(gameId);
  if (!mg) return;
  if (!moveItem(mg.typeSpecific.questions, 'questionId', questionId, -1)) return;
  renderMinigameDetails();
  autoSaveTrial();
}

export function moveQuestionDown(gameId, questionId) {
  const mg = findMinigame(gameId);
  if (!mg) return;
  if (!moveItem(mg.typeSpecific.questions, 'questionId', questionId, 1)) return;
  renderMinigameDetails();
  autoSaveTrial();
}

