import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { STUDENT_COUNT } from '../../domain/constants.js';
import type { TrialStore } from '../../store/trial-store.js';
import '../shared/floating-action-button.js';
import '../shared/modal-container.js';
import '../modals/character-modal.js';

@customElement('dr-cast-view')
export class DrCastView extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @state() private modalOpen = false;
  @state() private modalPosition = -1;

  static styles = css`
    :host { display: block; }

    .cast-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
      padding: 1rem 0;
    }

    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      color: var(--text-primary);
    }

    .section-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
      margin: 1rem 0 0.5rem;
    }

    .cast-block {
      background: var(--bg-primary);
      border: 2px solid var(--border-primary);
      border-radius: var(--radius, 8px);
      padding: 0.75rem;
      text-align: center;
      cursor: pointer;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .cast-block:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-md);
    }

    .cast-block.filled {
      border-color: var(--primary-light);
    }

    .cast-block.headmaster {
      border-color: var(--warning);
    }

    .cast-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary);
      margin-top: 0.5rem;
    }

    .cast-empty {
      color: var(--text-tertiary);
      font-size: 0.8rem;
      font-style: italic;
    }

    .cast-sprite {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 4px;
    }

    .slot-number {
      font-size: 0.7rem;
      color: var(--text-tertiary);
    }
  `;

  render() {
    const cast = this.store.api.getCast();

    return html`
      <h2>Trial Cast</h2>

      <div class="section-label">Students</div>
      <div class="cast-grid">
        ${Array.from({ length: STUDENT_COUNT }, (_, i) => this.renderSlot(i, cast[i], false))}
      </div>

      <div class="section-label">Headmaster</div>
      <div class="cast-grid">
        ${this.renderSlot(STUDENT_COUNT, cast[STUDENT_COUNT], true)}
      </div>

      <dr-character-modal
        .store=${this.store}
        .position=${this.modalPosition}
        .open=${this.modalOpen}
        @modal-closed=${() => (this.modalOpen = false)}
      ></dr-character-modal>
    `;
  }

  private renderSlot(index: number, character: ReturnType<typeof this.store.api.getCharacterAtPosition>, isHeadmaster: boolean) {
    if (character) {
      return html`
        <div
          class="cast-block filled ${isHeadmaster ? 'headmaster' : ''}"
          @click=${() => this.onSlotClick(index)}
          role="button"
          tabindex="0"
          aria-label="${character.name} ${character.surname} at position ${index + 1}"
        >
          <span class="slot-number">#${index + 1}</span>
          <div class="cast-name">${character.name} ${character.surname}</div>
        </div>
      `;
    }

    return html`
      <div
        class="cast-block ${isHeadmaster ? 'headmaster' : ''}"
        @click=${() => this.onSlotClick(index)}
        role="button"
        tabindex="0"
        aria-label="Empty slot ${index + 1}"
      >
        <span class="slot-number">#${index + 1}</span>
        <div class="cast-empty">${isHeadmaster ? 'Headmaster' : 'Empty'}</div>
      </div>
    `;
  }

  private onSlotClick(index: number) {
    this.modalPosition = index;
    this.modalOpen = true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-cast-view': DrCastView;
  }
}
