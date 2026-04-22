import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { Character } from '../../domain/types.js';
import { BLOOD_TYPES, STUDENT_COUNT } from '../../domain/constants.js';
import { generateCharacterId } from '../../domain/ids.js';
import '../shared/modal-container.js';

@customElement('dr-character-modal')
export class DrCharacterModal extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property({ type: Number }) position = -1;
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private tab: 'details' | 'sprites' = 'details';
  @state() private fields = this.emptyFields();

  static styles = css`
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border-primary, #e5e7eb);
      padding-bottom: 0.5rem;
    }

    .tab {
      padding: 0.4rem 0.8rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.85rem;
      border-radius: var(--radius-sm, 6px);
      color: var(--text-secondary);
    }

    .tab.active {
      background: var(--primary, #6366f1);
      color: white;
    }

    .form-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .form-group {
      margin-bottom: 0.75rem;
    }

    .form-group.flex { flex: 1; min-width: 120px; }

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
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, #6366f1) 20%, transparent);
    }

    textarea.form-input { resize: vertical; min-height: 60px; }
    select.form-input { cursor: pointer; }

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
    .btn-secondary:hover { filter: brightness(0.95); }

    .sprites-info {
      color: var(--text-tertiary);
      font-size: 0.85rem;
      font-style: italic;
      text-align: center;
      padding: 2rem 1rem;
    }
  `;

  private emptyFields() {
    return {
      name: '',
      surname: '',
      heightM: 1,
      heightCM: 50,
      weight: '',
      chest: '',
      blood: 'A' as typeof BLOOD_TYPES[number],
      dob: '',
      likes: '',
      dislikes: '',
      notes: '',
    };
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      this.tab = 'details';
      const char = this.store.api.getCharacterAtPosition(this.position);
      if (char) {
        this.fields = {
          name: char.name,
          surname: char.surname,
          heightM: char.heightM,
          heightCM: char.heightCM,
          weight: String(char.weight),
          chest: String(char.chest),
          blood: char.blood,
          dob: char.dob,
          likes: char.likes,
          dislikes: char.dislikes,
          notes: char.notes,
        };
      } else {
        this.fields = this.emptyFields();
      }
    }
  }

  render() {
    const isHeadmaster = this.position >= STUDENT_COUNT;
    const heading = isHeadmaster ? 'Headmaster' : `Student #${this.position + 1}`;

    return html`
      <dr-modal .open=${this.open} heading=${heading} size="large" @modal-closed=${this.onClose}>
        <div class="tabs">
          <button class="tab ${this.tab === 'details' ? 'active' : ''}" @click=${() => (this.tab = 'details')}>Details</button>
          <button class="tab ${this.tab === 'sprites' ? 'active' : ''}" @click=${() => (this.tab = 'sprites')}>Sprites</button>
        </div>

        ${this.tab === 'details' ? this.renderDetails() : this.renderSprites()}

        <div class="btn-row">
          <button class="btn btn-secondary" @click=${this.onClose}>Cancel</button>
          <button class="btn btn-primary" @click=${this.save}>Save</button>
        </div>
      </dr-modal>
    `;
  }

  private renderDetails() {
    const f = this.fields;

    return html`
      <div class="form-row">
        <div class="form-group flex">
          <label>First Name</label>
          <input class="form-input" .value=${f.name} @input=${(e: Event) => (this.fields = { ...f, name: (e.target as HTMLInputElement).value })} placeholder="First name" />
        </div>
        <div class="form-group flex">
          <label>Surname</label>
          <input class="form-input" .value=${f.surname} @input=${(e: Event) => (this.fields = { ...f, surname: (e.target as HTMLInputElement).value })} placeholder="Surname" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex">
          <label>Height (m)</label>
          <input type="number" class="form-input" .value=${String(f.heightM)} min="0" max="3" @input=${(e: Event) => (this.fields = { ...f, heightM: Number((e.target as HTMLInputElement).value) })} />
        </div>
        <div class="form-group flex">
          <label>Height (cm)</label>
          <input type="number" class="form-input" .value=${String(f.heightCM)} min="0" max="99" @input=${(e: Event) => (this.fields = { ...f, heightCM: Number((e.target as HTMLInputElement).value) })} />
        </div>
        <div class="form-group flex">
          <label>Weight (kg)</label>
          <input type="number" min="0" max="300" class="form-input" .value=${f.weight} @input=${(e: Event) => (this.fields = { ...f, weight: (e.target as HTMLInputElement).value })} />
        </div>
        <div class="form-group flex">
          <label>Chest (cm)</label>
          <input type="number" min="0" max="200" class="form-input" .value=${f.chest} @input=${(e: Event) => (this.fields = { ...f, chest: (e.target as HTMLInputElement).value })} />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex">
          <label>Blood Type</label>
          <select class="form-input" .value=${f.blood} @change=${(e: Event) => (this.fields = { ...f, blood: (e.target as HTMLSelectElement).value as typeof BLOOD_TYPES[number] })}>
            ${BLOOD_TYPES.map(bt => html`<option value=${bt} ?selected=${bt === f.blood}>${bt}</option>`)}
          </select>
        </div>
        <div class="form-group flex">
          <label>Date of Birth</label>
          <input type="date" class="form-input" .value=${f.dob} @input=${(e: Event) => (this.fields = { ...f, dob: (e.target as HTMLInputElement).value })} />
        </div>
      </div>

      <div class="form-group">
        <label>Likes</label>
        <input class="form-input" .value=${f.likes} @input=${(e: Event) => (this.fields = { ...f, likes: (e.target as HTMLInputElement).value })} placeholder="Likes..." />
      </div>

      <div class="form-group">
        <label>Dislikes</label>
        <input class="form-input" .value=${f.dislikes} @input=${(e: Event) => (this.fields = { ...f, dislikes: (e.target as HTMLInputElement).value })} placeholder="Dislikes..." />
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea class="form-input" rows="3" .value=${f.notes} @input=${(e: Event) => (this.fields = { ...f, notes: (e.target as HTMLTextAreaElement).value })} placeholder="Additional notes..."></textarea>
      </div>
    `;
  }

  private renderSprites() {
    return html`
      <div class="sprites-info">
        Sprite management will be available after saving the character. Sprites are loaded from the character's folder on disk.
      </div>
    `;
  }

  private save() {
    const f = this.fields;
    if (!f.name.trim() && !f.surname.trim()) return;

    const existing = this.store.api.getCharacterAtPosition(this.position);
    const id = existing?.id ?? generateCharacterId(f.name, f.surname, f.dob);
    const isHeadmaster = this.position >= STUDENT_COUNT;

    const character: Character = {
      id,
      name: f.name,
      surname: f.surname,
      heightM: f.heightM,
      heightCM: f.heightCM,
      weight: parseInt(f.weight, 10),
      chest: parseInt(f.chest, 10),
      blood: f.blood,
      dob: f.dob,
      likes: f.likes,
      dislikes: f.dislikes,
      notes: f.notes,
      isHeadmaster,
      position: this.position,
      lastModified: new Date().toISOString(),
    };

    this.store.api.setCharacter(this.position, character);
    this.onClose();
  }

  private onClose() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-closed'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-character-modal': DrCharacterModal;
  }
}
