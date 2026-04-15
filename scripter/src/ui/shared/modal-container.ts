import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * <dr-modal> — shared modal container with backdrop, close button, focus trap, ARIA.
 * Replaces the raw `document.getElementById('modalroot').innerHTML = ...` pattern.
 */
@customElement('dr-modal')
export class DrModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() heading = '';
  @property() size: 'small' | 'medium' | 'large' = 'medium';

  private previousActiveElement: HTMLElement | null = null;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this.previousActiveElement = document.activeElement as HTMLElement;
        requestAnimationFrame(() => {
          this.shadowRoot?.querySelector<HTMLElement>('[autofocus], .modal-close')?.focus();
        });
      } else if (this.previousActiveElement) {
        this.previousActiveElement.focus();
        this.previousActiveElement = null;
      }
    }
  }

  static styles = css`
    :host {
      display: none;
    }

    :host([open]) {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 100;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      animation: fade-in 0.2s ease;
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg-primary, #fff);
      border-radius: var(--radius-md, 12px);
      box-shadow: var(--shadow-xl);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      animation: scale-in 0.2s ease;
    }

    .modal.small { width: min(400px, 90vw); }
    .modal.medium { width: min(600px, 90vw); }
    .modal.large { width: min(900px, 95vw); }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-primary, #e5e7eb);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.15rem;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
      color: var(--text-tertiary, #6b7280);
      border-radius: 4px;
    }

    .modal-close:hover { background: var(--bg-tertiary, #f3f4f6); }
    .modal-close:focus-visible { outline: 2px solid var(--primary, #6366f1); }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    @keyframes fade-in { from { opacity: 0; } }
    @keyframes scale-in {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
      }
    }
  `;

  render() {
    if (!this.open) return html``;

    return html`
      <div class="backdrop" @click=${this.close}></div>
      <div
        class="modal ${this.size}"
        role="dialog"
        aria-modal="true"
        aria-label=${this.heading}
        @keydown=${this.onKeydown}
      >
        <div class="modal-header">
          <h2>${this.heading}</h2>
          <button
            class="modal-close"
            @click=${this.close}
            aria-label="Close dialog"
          >&times;</button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
      </div>
    `;
  }

  private close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-closed'));
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  }

  private trapFocus(e: KeyboardEvent) {
    const modal = this.shadowRoot?.querySelector('.modal');
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === this) {
      // Shift+Tab from first → wrap to last
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && this.shadowRoot?.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-modal': DrModal;
  }
}
