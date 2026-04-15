import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AppSettings } from '../../services/settings.js';
import '../shared/modal-container.js';

const settings = new AppSettings();

@customElement('dr-settings-modal')
export class DrSettingsModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private autoSaveDelay = 500;
  @state() private maxSprites = 25;

  static styles = css`
    .form-group {
      margin-bottom: 1rem;
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

    .help-text {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 0.2rem;
    }

    .btn-row {
      display: flex;
      justify-content: space-between;
      margin-top: 1.5rem;
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
    .btn-ghost { background: none; color: var(--text-tertiary); border: 1px solid var(--border-primary); }
    .btn-ghost:hover { background: var(--bg-tertiary); }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open) {
      this.autoSaveDelay = settings.get('autoSaveDelayMs') as number;
      this.maxSprites = settings.get('maxSprites') as number;
    }
  }

  render() {
    return html`
      <dr-modal .open=${this.open} heading="Settings" size="small" @modal-closed=${this.onClose}>
        <div class="form-group">
          <label>Auto-save Delay (ms)</label>
          <input type="number" class="form-input" .value=${String(this.autoSaveDelay)} min="100" max="5000" step="100"
            @input=${(e: Event) => (this.autoSaveDelay = Number((e.target as HTMLInputElement).value))} />
          <div class="help-text">How long to wait after a change before auto-saving (default: 500ms)</div>
        </div>

        <div class="form-group">
          <label>Max Sprites per Character</label>
          <input type="number" class="form-input" .value=${String(this.maxSprites)} min="1" max="50"
            @input=${(e: Event) => (this.maxSprites = Number((e.target as HTMLInputElement).value))} />
          <div class="help-text">Maximum number of sprite slots per character (default: 25)</div>
        </div>

        <div class="btn-row">
          <button class="btn btn-ghost" @click=${this.reset}>Reset Defaults</button>
          <button class="btn btn-primary" @click=${this.save}>Save</button>
        </div>
      </dr-modal>
    `;
  }

  private save() {
    settings.set('autoSaveDelayMs', this.autoSaveDelay);
    settings.set('maxSprites', this.maxSprites);
    this.onClose();
  }

  private reset() {
    settings.reset();
    this.autoSaveDelay = settings.get('autoSaveDelayMs') as number;
    this.maxSprites = settings.get('maxSprites') as number;
  }

  private onClose() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-closed'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-settings-modal': DrSettingsModal;
  }
}
