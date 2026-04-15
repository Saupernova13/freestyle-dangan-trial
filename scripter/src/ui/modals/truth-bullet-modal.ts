import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';

@customElement('dr-truth-bullet-modal')
export class DrTruthBulletModal extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property() bulletId = '';
  @property({ type: Boolean, reflect: true }) open = false;

  @state() private name = '';
  @state() private description = '';
  @state() private inversedLieBulletName = '';

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
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary, #6366f1) 20%, transparent);
    }

    textarea.form-input { resize: vertical; min-height: 80px; }

    .help-text {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-top: 0.2rem;
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

    .image-section {
      text-align: center;
      padding: 1rem;
      border: 1px dashed var(--border-secondary, #d1d5db);
      border-radius: var(--radius, 8px);
      color: var(--text-tertiary);
      font-size: 0.85rem;
      font-style: italic;
    }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this.open && this.bulletId) {
      const bullet = this.store.api.getTruthBullet(this.bulletId);
      if (bullet) {
        this.name = bullet.name;
        this.description = bullet.description;
        this.inversedLieBulletName = bullet.inversedLieBulletName;
      }
    }
  }

  render() {
    return html`
      <dr-modal .open=${this.open} heading="Truth Bullet" size="medium" @modal-closed=${this.onClose}>
        <div class="form-group">
          <label>Bullet Name</label>
          <input class="form-input" .value=${this.name} @input=${(e: Event) => (this.name = (e.target as HTMLInputElement).value)} placeholder="E.g., Bloody Knife" />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea class="form-input" rows="3" .value=${this.description} @input=${(e: Event) => (this.description = (e.target as HTMLTextAreaElement).value)} placeholder="Describe this evidence..."></textarea>
        </div>

        <div class="form-group">
          <label>Inversed Lie Bullet Name</label>
          <input class="form-input" .value=${this.inversedLieBulletName} @input=${(e: Event) => (this.inversedLieBulletName = (e.target as HTMLInputElement).value)} placeholder="E.g., Clean Knife" />
          <div class="help-text">Name when converted to a lie bullet</div>
        </div>

        <div class="form-group">
          <label>Image</label>
          <div class="image-section">
            Image management is handled via the file system. Save the bullet first, then place the image in the TruthBullets/ folder.
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-secondary" @click=${this.onClose}>Cancel</button>
          <button class="btn btn-primary" @click=${this.save}>Save</button>
        </div>
      </dr-modal>
    `;
  }

  private save() {
    if (!this.bulletId) return;
    this.store.api.updateTruthBullet(this.bulletId, {
      name: this.name,
      description: this.description,
      inversedLieBulletName: this.inversedLieBulletName,
    });
    this.onClose();
  }

  private onClose() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-closed'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-truth-bullet-modal': DrTruthBulletModal;
  }
}
