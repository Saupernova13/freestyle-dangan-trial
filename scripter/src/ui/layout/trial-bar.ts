import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dr-trial-bar')
export class DrTrialBar extends LitElement {
  @property({ type: Boolean }) hasDirectory = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1.5rem;
      background: var(--bg-secondary, #f9fafb);
      border-bottom: 1px solid var(--border-primary, #e5e7eb);
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.9rem;
      border: none;
      border-radius: var(--radius-sm, 6px);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background var(--transition-fast, 0.15s ease), opacity var(--transition-fast, 0.15s ease);
    }

    .btn:focus-visible {
      outline: 2px solid var(--primary, #6366f1);
      outline-offset: 2px;
    }

    .btn-primary {
      background: var(--primary, #6366f1);
      color: white;
    }
    .btn-primary:hover { background: var(--primary-dark, #4f46e5); }

    .btn-success {
      background: var(--success, #10b981);
      color: white;
    }
    .btn-success:hover:not(:disabled) { filter: brightness(0.9); }
    .btn-success:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <button
        class="btn btn-primary"
        @click=${() => this.dispatchEvent(new CustomEvent('choose-folder'))}
      >
        &#128193; Choose Folder
      </button>
      <button
        class="btn btn-success"
        ?disabled=${!this.hasDirectory}
        @click=${() => this.dispatchEvent(new CustomEvent('export-trial'))}
        title="Export trial to .drtrial file"
      >
        &#128230; Export to Playable File
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-trial-bar': DrTrialBar;
  }
}
