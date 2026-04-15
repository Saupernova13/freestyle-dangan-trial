import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dr-toast')
export class DrToast extends LitElement {
  @property() message = '';
  @property() type: 'success' | 'error' | 'info' = 'info';

  private timer: ReturnType<typeof setTimeout> | null = null;

  updated(changed: Map<string, unknown>) {
    if (changed.has('message') && this.message) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('toast-closed'));
      }, 4000);
    }
  }

  static styles = css`
    :host {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: none;
    }

    .toast {
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius, 8px);
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      animation: slide-up 0.3s ease;
      color: white;
    }

    .toast.success { background: var(--success, #10b981); }
    .toast.error { background: var(--error, #ef4444); }
    .toast.info { background: var(--primary, #6366f1); }

    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
    }
  `;

  render() {
    if (!this.message) return html``;
    return html`
      <div class="toast ${this.type}" role="alert" aria-live="polite">
        ${this.message}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-toast': DrToast;
  }
}
