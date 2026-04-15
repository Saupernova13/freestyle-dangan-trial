import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { LogicDive, LogicDiveQuestion, LogicDiveAnswer } from '../../domain/minigame-types.js';
import { MAX_LOGIC_DIVE_ANSWERS } from '../../domain/constants.js';
import { generateId } from '../../domain/ids.js';
import { editorStyles } from '../shared/editor-styles.js';

@customElement('dr-logic-dive')
export class DrLogicDiveEditor extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property({ attribute: false }) minigame!: LogicDive;

  static styles = [
    editorStyles,
    css`
      .question-card {
        background: var(--bg-secondary, #f9fafb);
        border: 1px solid var(--border-primary, #e5e7eb);
        border-radius: var(--radius, 8px);
        padding: 1rem;
        margin-bottom: 0.75rem;
      }

      .answers-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0.75rem 0 0.5rem;
      }

      .answers-header h4 {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }

      .answer-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.4rem;
      }

      .answer-item.correct {
        background: color-mix(in srgb, var(--success, #22c55e) 10%, transparent);
        border-radius: var(--radius-sm, 6px);
        padding: 0.25rem 0.4rem;
      }

      .answer-item input[type="radio"] { cursor: pointer; }

      .answer-item .form-input { flex: 1; }

      .validation-warning {
        font-size: 0.8rem;
        color: var(--warning, #f59e0b);
        margin: 0.25rem 0 0;
      }
    `,
  ];

  render() {
    const questions = this.minigame.typeSpecific.questions;

    return html`
      <div class="section">
        <h3>Logic Dive Questions</h3>
        <p class="help-text">Create questions with multiple choice answers. Select a radio button to mark the correct answer.</p>

        ${questions.length === 0
          ? html`<div class="empty-state">No questions yet. Click "Add Question" to get started.</div>`
          : questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q, i) => this.renderQuestion(q, i))}

        <div class="actions-row">
          <button class="btn btn-primary" @click=${this.addQuestion}>+ Add Question</button>
        </div>
      </div>
    `;
  }

  private renderQuestion(question: LogicDiveQuestion, index: number) {
    return html`
      <div class="question-card">
        <div class="card-header">
          <span class="card-number">Question #${index + 1}</span>
          <div style="display:flex;gap:0.25rem;">
            <button class="btn-icon" @click=${() => this.moveQuestion(question.questionId, -1)} title="Move up" aria-label="Move question up">&#9650;</button>
            <button class="btn-icon" @click=${() => this.moveQuestion(question.questionId, 1)} title="Move down" aria-label="Move question down">&#9660;</button>
            <button class="btn-icon" @click=${() => this.deleteQuestion(question.questionId)} title="Delete" aria-label="Delete question">&#128465;</button>
          </div>
        </div>

        <div class="form-group">
          <label>Question Text</label>
          <textarea
            class="form-input"
            rows="2"
            .value=${question.questionText}
            @change=${(e: Event) => this.updateQuestionText(question.questionId, (e.target as HTMLTextAreaElement).value)}
            placeholder="Enter the question..."
          ></textarea>
        </div>

        <div class="answers-header">
          <h4>Answers (${question.answers.length}/${MAX_LOGIC_DIVE_ANSWERS})</h4>
          ${question.answers.length < MAX_LOGIC_DIVE_ANSWERS
            ? html`<button class="btn btn-ghost" @click=${() => this.addAnswer(question.questionId)}>+ Add Answer</button>`
            : ''}
        </div>

        ${question.answers.map((a, ai) => this.renderAnswer(question, a, ai))}

        ${question.answers.length < 2
          ? html`<p class="validation-warning">Add at least 2 answers</p>`
          : ''}
      </div>
    `;
  }

  private renderAnswer(question: LogicDiveQuestion, answer: LogicDiveAnswer, _index: number) {
    return html`
      <div class="answer-item ${answer.isCorrect ? 'correct' : ''}">
        <input
          type="radio"
          name="correct_${question.questionId}"
          .checked=${answer.isCorrect}
          @change=${() => this.setCorrectAnswer(question.questionId, answer.answerId)}
          title="Mark as correct"
        />
        <input
          type="text"
          class="form-input"
          .value=${answer.answerText}
          @change=${(e: Event) => this.updateAnswerText(question.questionId, answer.answerId, (e.target as HTMLInputElement).value)}
          placeholder="Answer text"
        />
        ${question.answers.length > 2
          ? html`<button class="btn-icon" @click=${() => this.deleteAnswer(question.questionId, answer.answerId)} title="Delete answer" aria-label="Delete answer">&#128465;</button>`
          : ''}
      </div>
    `;
  }

  // ---- Mutations ----

  private getQuestions(): LogicDiveQuestion[] {
    return [...this.minigame.typeSpecific.questions];
  }

  private save(questions: LogicDiveQuestion[]) {
    this.store.api.updateMinigame(this.minigame.gameId, {
      typeSpecific: { questions },
    } as Partial<LogicDive>);
  }

  private addQuestion() {
    const questions = this.getQuestions();
    questions.push({
      questionId: generateId('q'),
      order: questions.length,
      questionText: '',
      answers: Array.from({ length: MAX_LOGIC_DIVE_ANSWERS }, (_, i) => ({
        answerId: generateId('a'),
        answerText: '',
        isCorrect: i === 0,
      })),
    });
    this.save(questions);
  }

  private deleteQuestion(questionId: string) {
    const questions = this.getQuestions().filter(q => q.questionId !== questionId);
    questions.forEach((q, i) => (q.order = i));
    this.save(questions);
  }

  private updateQuestionText(questionId: string, text: string) {
    const questions = this.getQuestions();
    const q = questions.find(q => q.questionId === questionId);
    if (q) q.questionText = text;
    this.save(questions);
  }

  private moveQuestion(questionId: string, direction: -1 | 1) {
    const questions = this.getQuestions().sort((a, b) => a.order - b.order);
    const idx = questions.findIndex(q => q.questionId === questionId);
    const target = idx + direction;
    if (target < 0 || target >= questions.length) return;
    [questions[idx], questions[target]] = [questions[target], questions[idx]];
    questions.forEach((q, i) => (q.order = i));
    this.save(questions);
  }

  private addAnswer(questionId: string) {
    const questions = this.getQuestions();
    const q = questions.find(q => q.questionId === questionId);
    if (!q || q.answers.length >= MAX_LOGIC_DIVE_ANSWERS) return;
    q.answers.push({ answerId: generateId('a'), answerText: '', isCorrect: false });
    this.save(questions);
  }

  private deleteAnswer(questionId: string, answerId: string) {
    const questions = this.getQuestions();
    const q = questions.find(q => q.questionId === questionId);
    if (!q || q.answers.length <= 2) return;
    q.answers = q.answers.filter(a => a.answerId !== answerId);
    if (!q.answers.some(a => a.isCorrect)) q.answers[0].isCorrect = true;
    this.save(questions);
  }

  private updateAnswerText(questionId: string, answerId: string, text: string) {
    const questions = this.getQuestions();
    const q = questions.find(q => q.questionId === questionId);
    const a = q?.answers.find(a => a.answerId === answerId);
    if (a) a.answerText = text;
    this.save(questions);
  }

  private setCorrectAnswer(questionId: string, answerId: string) {
    const questions = this.getQuestions();
    const q = questions.find(q => q.questionId === questionId);
    if (!q) return;
    q.answers.forEach(a => (a.isCorrect = a.answerId === answerId));
    this.save(questions);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-logic-dive': DrLogicDiveEditor;
  }
}
