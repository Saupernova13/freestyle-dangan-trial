import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './modal-container.js';

/**
 * <dr-confirm> — replaces native confirm() calls with an accessible dialog.
 *
 * Usage:
 *   <dr-confirm
 *     .open=${this.showConfirm}
 *     heading="Delete Character"
 *     message="Are you sure? This cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"
 *     @confirmed=${this.onConfirmed}
 *     @cancelled=${this.onCancelled}
 *   ></dr-confirm>
 */
@customElement('dr-confirm')
export class DrConfirmationDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() heading = 'Confirm';
  @property() message = 'Are you sure?';
  @property() confirmLabel = 'Confirm';
  @property() cancelLabel = 'Cancel';
  @property() variant: 'primary' | 'danger' = 'primary';

  static styles = css`
    .confirm-body {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }

    .btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--radius-sm, 6px);
      font-size: 0.85rem;
      cursor: pointer;
      font-weight: 500;
    }

    .btn:focus-visible {
      outline: 2px solid var(--primary, #6366f1);
      outline-offset: 2px;
    }

    .btn-cancel {
      background: var(--bg-tertiary, #f3f4f6);
      color: var(--text-secondary);
    }

    .btn-cancel:hover { filter: brightness(0.95); }

    .btn-confirm-primary {
      background: var(--primary, #6366f1);
      color: white;
    }
    .btn-confirm-primary:hover { background: var(--primary-dark, #4f46e5); }

    .btn-confirm-danger {
      background: var(--error, #ef4444);
      color: white;
    }
    .btn-confirm-danger:hover { filter: brightness(0.9); }
  `;

  render() {
    return html`
      <dr-modal .open=${this.open} heading=${this.heading} size="small" @modal-closed=${this.cancel}>
        <div class="confirm-body">${this.message}</div>
        <div class="btn-row">
          <button class="btn btn-cancel" @click=${this.cancel}>${this.cancelLabel}</button>
          <button class="btn btn-confirm-${this.variant}" @click=${this.confirm} autofocus>${this.confirmLabel}</button>
        </div>
      </dr-modal>
    `;
  }

  private confirm() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('confirmed'));
  }

  private cancel() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('cancelled'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-confirm': DrConfirmationDialog;
  }
}
