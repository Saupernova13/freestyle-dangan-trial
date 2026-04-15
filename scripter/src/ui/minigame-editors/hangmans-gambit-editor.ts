import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { HangmansGambit, HangmansGambitData } from '../../domain/minigame-types.js';
import { editorStyles } from '../shared/editor-styles.js';

@customElement('dr-hangmans-gambit')
export class DrHangmansGambitEditor extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property({ attribute: false }) minigame!: HangmansGambit;

  static styles = editorStyles;

  render() {
    const data = this.minigame.typeSpecific;

    return html`
      <div class="section">
        <h3>Answer Key</h3>
        <p class="help-text">Enter the answer key for this Hangman's Gambit puzzle.</p>

        <div class="form-group">
          <label>Answer Key</label>
          <input
            type="text"
            class="form-input"
            .value=${data.answerKey}
            @change=${(e: Event) => this.updateField('answerKey', (e.target as HTMLInputElement).value)}
            placeholder="Enter answer key"
          />
        </div>
      </div>
    `;
  }

  private updateField<K extends keyof HangmansGambitData>(field: K, value: HangmansGambitData[K]) {
    this.store.api.updateMinigame(this.minigame.gameId, {
      typeSpecific: { ...this.minigame.typeSpecific, [field]: value },
    } as Partial<HangmansGambit>);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-hangmans-gambit': DrHangmansGambitEditor;
  }
}
