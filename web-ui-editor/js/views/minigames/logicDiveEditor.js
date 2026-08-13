// Logic Dive editor: questions, their answers, and drag-to-reorder.

// Drag state for questions
import { dropAtGap, moveItem, reindexOrder } from '../../core/listOps.js';
import { autoSaveTrial } from '../../core/storage.js';
import { generateId, escapeHtml } from '../../utils.js';
import { findMinigame, renderMinigameDetails } from '../minigameView.js';
let draggedQuestionId = null;

// ==================== Main Rendering ====================

export function renderLogicDiveEditor(mg) {
  if (!mg.typeSpecific) {
    mg.typeSpecific = {};
  }
  if (!mg.typeSpecific.questions) {
    mg.typeSpecific.questions = [];
  }

  const questions = mg.typeSpecific.questions;

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
              onclick="addLogicDiveQuestion('${mg.gameId}')"
              title="Add Question">
        ${window.icon('plus', { size: 20 })} <span class="minigame-floating-btn-text">Add Question</span>
      </button>
    </div>
  `;

  return html;
}

export function renderLogicDiveQuestions(gameId, questions) {
  let html = '';

  html += `<div class="question-drop-zone"
                data-insert-position="0"
                ondragover="handleQuestionGapDragOver(event)"
                ondrop="handleQuestionDropInGap(event, '${gameId}', 0)"
                ondragleave="handleQuestionGapDragLeave(event)"></div>`;

  questions
    .sort((a, b) => a.order - b.order)
    .forEach((question, index) => {
      html += `
        <div class="logic-dive-question-wrapper"
             draggable="true"
             ondragstart="handleQuestionDragStart(event, '${gameId}', '${question.questionId}')"
             ondragend="handleQuestionDragEnd(event)">
          ${renderLogicDiveQuestionEditor(gameId, question, index)}
        </div>

        <div class="question-drop-zone"
             data-insert-position="${index + 1}"
             ondragover="handleQuestionGapDragOver(event)"
             ondrop="handleQuestionDropInGap(event, '${gameId}', ${index + 1})"
             ondragleave="handleQuestionGapDragLeave(event)"></div>
      `;
    });

  return html;
}

export function renderLogicDiveQuestionEditor(gameId, question, index) {
  return `
    <div class="logic-dive-question-card">
      <div class="question-header">
        <div class="question-drag-handle">
          <div class="arrow-btn arrow-up"
               onclick="event.stopPropagation(); moveQuestionUp('${gameId}', '${question.questionId}')"
               title="Move up">${window.icon('chevronUp', { size: 14 })}</div>
          <div class="arrow-btn arrow-down"
               onclick="event.stopPropagation(); moveQuestionDown('${gameId}', '${question.questionId}')"
               title="Move down">${window.icon('chevronDown', { size: 14 })}</div>
        </div>
        <div class="question-number">Question #${index + 1}</div>
        <button class="btn-icon" onclick="deleteLogicDiveQuestion('${gameId}', '${question.questionId}')"
                title="Delete question">${window.icon('trash', { size: 16 })}</button>
      </div>

      <div class="question-body">
        <div class="form-group">
          <label>Question Text</label>
          <textarea class="form-input"
                    rows="2"
                    placeholder="Enter the question..."
                    onchange="updateLogicDiveQuestion('${gameId}', '${question.questionId}', 'questionText', this.value)">${escapeHtml(question.questionText || '')}</textarea>
        </div>

        <div class="answers-section">
          <div class="answers-header">
            <h4>Answers (${question.answers.length}/5)</h4>
            ${
              question.answers.length < 5
                ? `
              <button class="btn btn-secondary btn-sm"
                      onclick="addLogicDiveAnswer('${gameId}', '${question.questionId}')">
                ${window.icon('plus', { size: 15 })} Add Answer
              </button>
            `
                : ''
            }
          </div>

          <div class="answers-list">
            ${question.answers
              .map(
                (answer, ansIndex) => `
              <div class="answer-item ${answer.isCorrect ? 'correct-answer' : ''}">
                <div class="answer-radio">
                  <input type="radio"
                         name="correct_${question.questionId}"
                         ${answer.isCorrect ? 'checked' : ''}
                         onchange="setCorrectAnswer('${gameId}', '${question.questionId}', '${answer.answerId}')"
                         title="Mark as correct answer">
                </div>
                <input type="text"
                       class="form-input answer-text-input"
                       placeholder="Answer ${ansIndex + 1}"
                       value="${escapeHtml(answer.answerText || '')}"
                       onchange="updateLogicDiveAnswer('${gameId}', '${question.questionId}', '${answer.answerId}', 'answerText', this.value)">
                ${
                  question.answers.length > 2
                    ? `
                  <button class="btn-icon btn-icon-danger"
                          onclick="deleteLogicDiveAnswer('${gameId}', '${question.questionId}', '${answer.answerId}')"
                          title="Delete answer">${window.icon('trash', { size: 15 })}</button>
                `
                    : ''
                }
              </div>
            `
              )
              .join('')}
          </div>

          ${
            question.answers.length < 2
              ? `
            <p class="validation-warning">${window.icon('warning', { size: 15 })} Add at least 2 answers</p>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

// ==================== Question Management ====================

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

export function deleteLogicDiveQuestion(gameId, questionId) {
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

// ==================== Answer Management ====================

export function addLogicDiveAnswer(gameId, questionId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question || question.answers.length >= 5) return;

  const newAnswer = {
    answerId: generateId('a'),
    answerText: '',
    isCorrect: false,
  };

  question.answers.push(newAnswer);
  renderMinigameDetails();
  autoSaveTrial();
}

export function deleteLogicDiveAnswer(gameId, questionId, answerId) {
  const mg = findMinigame(gameId);
  if (!mg) return;

  const question = mg.typeSpecific.questions.find((q) => q.questionId === questionId);
  if (!question || question.answers.length <= 2) return; // Minimum 2 answers

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

// ==================== Question Reordering ====================

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

// ==================== Drag-and-Drop for Questions ====================

export function handleQuestionDragStart(event, gameId, questionId) {
  draggedQuestionId = questionId;
  event.target.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
}

export function handleQuestionDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedQuestionId = null;
  document.querySelectorAll('.drag-over-gap').forEach((el) => {
    el.classList.remove('drag-over-gap');
  });
}

export function handleQuestionDropInGap(event, gameId, insertPosition) {
  event.preventDefault();
  event.stopPropagation();

  const mg = findMinigame(gameId);
  if (!mg || !draggedQuestionId) return;

  const changed = dropAtGap(
    mg.typeSpecific.questions,
    'questionId',
    [draggedQuestionId],
    insertPosition
  );
  draggedQuestionId = null;
  renderMinigameDetails();
  if (changed) autoSaveTrial();
}

export function handleQuestionGapDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over-gap');
}

export function handleQuestionGapDragLeave(event) {
  event.currentTarget.classList.remove('drag-over-gap');
}
