import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { ScriptLine, SpeakingLine, NarratorLine, MinigameLine, CameraMotion, DialogueBoxStyleConfig } from '../../domain/types.js';
import {
  LINE_TYPES,
  CAMERA_MOTION_TYPES,
  CAMERA_EASINGS,
  DIALOGUE_BOX_STYLES,
} from '../../domain/constants.js';
import '../shared/modal-container.js';

@customElement('dr-script-line-modal')
export class DrScriptLineModal extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property() lineId = '';
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private lineType: ScriptLine['type'] = 'speaking';
  @state() private characterId = '';
  @state() private dialogue = '';
  @state() private minigameId = '';
  @state() private spriteIndex: number | null = null;
  @state() private cameraMotion: CameraMotion = { type: 'none', duration: 1.0, easing: 'ease-in-out' };
  @state() private dialogueBoxStyle: DialogueBoxStyleConfig = { style: 'default', borderColor: '#FFFFFF', bgOpacity: 0.9, borderThickness: 2 };

  static styles = css`
    .form-group {
      margin-bottom: 0.75rem;
    }

    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .form-input {
      width: 100%;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--border-primary, #e5e7eb);
      border-radius: var(--radius-sm, 6px);
      font-size: 0.85rem;
      font-family: inherit;
      background: var(--bg-primary, #fff);
      color: var(--text-primary);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, #6366f1) 20%, transparent);
    }

    textarea.form-input { resize: vertical; min-height: 80px; }
    select.form-input { cursor: pointer; }

    .form-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .form-row .form-group { flex: 1; min-width: 120px; }

    h4 {
      margin: 1rem 0 0.5rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-primary, #e5e7eb);
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--radius-sm, 6px);
      font-size: 0.85rem;
      cursor: pointer;
    }

    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-dark); }
    .btn-secondary { background: var(--bg-tertiary); color: var(--text-secondary); }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open && this.lineId) {
      const line = this.store.api.getScriptLine(this.lineId);
      if (line) this.loadLine(line);
    }
  }

  private loadLine(line: ScriptLine) {
    this.lineType = line.type;
    switch (line.type) {
      case 'speaking':
        this.characterId = line.characterId;
        this.dialogue = line.dialogue;
        this.spriteIndex = line.spriteIndex;
        this.cameraMotion = { ...line.cameraMotion };
        this.dialogueBoxStyle = { ...line.dialogueBoxStyle };
        break;
      case 'narrator':
        this.dialogue = line.dialogue;
        this.dialogueBoxStyle = { ...line.dialogueBoxStyle };
        break;
      case 'minigame':
        this.minigameId = line.minigameId;
        break;
    }
  }

  render() {
    return html`
      <dr-modal .open=${this.open} heading="Edit Script Line" size="large" @modal-closed=${this.onClose}>
        <div class="form-group">
          <label>Line Type</label>
          <select class="form-input" .value=${this.lineType} @change=${(e: Event) => (this.lineType = (e.target as HTMLSelectElement).value as ScriptLine['type'])}>
            ${LINE_TYPES.map(t => html`<option value=${t} ?selected=${t === this.lineType}>${t}</option>`)}
          </select>
        </div>

        ${this.lineType === 'speaking' ? this.renderSpeaking() : ''}
        ${this.lineType === 'narrator' ? this.renderNarrator() : ''}
        ${this.lineType === 'minigame' ? this.renderMinigame() : ''}

        <div class="btn-row">
          <button class="btn btn-secondary" @click=${this.onClose}>Cancel</button>
          <button class="btn btn-primary" @click=${this.save}>Save</button>
        </div>
      </dr-modal>
    `;
  }

  private renderSpeaking() {
    const cast = this.store.api.getCast().filter(Boolean) as { id: string; name: string; surname: string }[];

    return html`
      <div class="form-row">
        <div class="form-group">
          <label>Character</label>
          <select class="form-input" .value=${this.characterId} @change=${(e: Event) => (this.characterId = (e.target as HTMLSelectElement).value)}>
            <option value="">None</option>
            ${cast.map(c => html`<option value=${c.id} ?selected=${c.id === this.characterId}>${c.name} ${c.surname}</option>`)}
          </select>
        </div>
        <div class="form-group">
          <label>Sprite Index</label>
          <input type="number" class="form-input" .value=${String(this.spriteIndex ?? '')} min="0" @input=${(e: Event) => {
            const val = (e.target as HTMLInputElement).value;
            this.spriteIndex = val ? Number(val) : null;
          }} placeholder="0" />
        </div>
      </div>

      <div class="form-group">
        <label>Dialogue</label>
        <textarea class="form-input" rows="3" .value=${this.dialogue} @input=${(e: Event) => (this.dialogue = (e.target as HTMLTextAreaElement).value)} placeholder="Character's dialogue..."></textarea>
      </div>

      <h4>Camera Motion</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Type</label>
          <select class="form-input" .value=${this.cameraMotion.type} @change=${(e: Event) => (this.cameraMotion = { ...this.cameraMotion, type: (e.target as HTMLSelectElement).value as CameraMotion['type'] })}>
            ${CAMERA_MOTION_TYPES.map(t => html`<option value=${t} ?selected=${t === this.cameraMotion.type}>${t}</option>`)}
          </select>
        </div>
        <div class="form-group">
          <label>Duration (s)</label>
          <input type="number" class="form-input" .value=${String(this.cameraMotion.duration)} step="0.1" min="0" @input=${(e: Event) => (this.cameraMotion = { ...this.cameraMotion, duration: Number((e.target as HTMLInputElement).value) })} />
        </div>
        <div class="form-group">
          <label>Easing</label>
          <select class="form-input" .value=${this.cameraMotion.easing} @change=${(e: Event) => (this.cameraMotion = { ...this.cameraMotion, easing: (e.target as HTMLSelectElement).value as CameraMotion['easing'] })}>
            ${CAMERA_EASINGS.map(e => html`<option value=${e} ?selected=${e === this.cameraMotion.easing}>${e}</option>`)}
          </select>
        </div>
      </div>

      ${this.renderDialogueBoxStyle()}
    `;
  }

  private renderNarrator() {
    return html`
      <div class="form-group">
        <label>Narration</label>
        <textarea class="form-input" rows="3" .value=${this.dialogue} @input=${(e: Event) => (this.dialogue = (e.target as HTMLTextAreaElement).value)} placeholder="Narrator text..."></textarea>
      </div>
      ${this.renderDialogueBoxStyle()}
    `;
  }

  private renderMinigame() {
    const minigames = this.store.api.getMinigames();

    return html`
      <div class="form-group">
        <label>Minigame</label>
        <select class="form-input" .value=${this.minigameId} @change=${(e: Event) => (this.minigameId = (e.target as HTMLSelectElement).value)}>
          <option value="">None</option>
          ${minigames.map(mg => html`<option value=${mg.gameId} ?selected=${mg.gameId === this.minigameId}>${mg.name || 'Unnamed'} (${mg.gameType})</option>`)}
        </select>
      </div>
    `;
  }

  private renderDialogueBoxStyle() {
    return html`
      <h4>Dialogue Box Style</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Style</label>
          <select class="form-input" .value=${this.dialogueBoxStyle.style} @change=${(e: Event) => (this.dialogueBoxStyle = { ...this.dialogueBoxStyle, style: (e.target as HTMLSelectElement).value as DialogueBoxStyleConfig['style'] })}>
            ${DIALOGUE_BOX_STYLES.map(s => html`<option value=${s} ?selected=${s === this.dialogueBoxStyle.style}>${s}</option>`)}
          </select>
        </div>
        <div class="form-group">
          <label>Border Color</label>
          <input type="color" class="form-input" .value=${this.dialogueBoxStyle.borderColor} @input=${(e: Event) => (this.dialogueBoxStyle = { ...this.dialogueBoxStyle, borderColor: (e.target as HTMLInputElement).value })} />
        </div>
        <div class="form-group">
          <label>BG Opacity</label>
          <input type="number" class="form-input" .value=${String(this.dialogueBoxStyle.bgOpacity)} step="0.1" min="0" max="1" @input=${(e: Event) => (this.dialogueBoxStyle = { ...this.dialogueBoxStyle, bgOpacity: Number((e.target as HTMLInputElement).value) })} />
        </div>
        <div class="form-group">
          <label>Border Width</label>
          <input type="number" class="form-input" .value=${String(this.dialogueBoxStyle.borderThickness)} min="0" @input=${(e: Event) => (this.dialogueBoxStyle = { ...this.dialogueBoxStyle, borderThickness: Number((e.target as HTMLInputElement).value) })} />
        </div>
      </div>
    `;
  }

  private save() {
    if (!this.lineId) return;

    let updates: Partial<ScriptLine>;
    switch (this.lineType) {
      case 'speaking':
        updates = {
          type: 'speaking',
          characterId: this.characterId,
          dialogue: this.dialogue,
          spriteIndex: this.spriteIndex,
          cameraMotion: this.cameraMotion,
          dialogueBoxStyle: this.dialogueBoxStyle,
        } as Partial<SpeakingLine>;
        break;
      case 'narrator':
        updates = {
          type: 'narrator',
          dialogue: this.dialogue,
          dialogueBoxStyle: this.dialogueBoxStyle,
        } as Partial<NarratorLine>;
        break;
      case 'minigame':
        updates = {
          type: 'minigame',
          minigameId: this.minigameId,
        } as Partial<MinigameLine>;
        break;
    }

    this.store.api.updateScriptLine(this.lineId, updates);
    this.onClose();
  }

  private onClose() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-closed'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-script-line-modal': DrScriptLineModal;
  }
}
