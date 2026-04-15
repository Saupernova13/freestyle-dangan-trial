import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dr-fab')
export class DrFab extends LitElement {
  @property() label = 'Add';
  @property({ type: Boolean }) visible = true;

  static styles = css`
    :host {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 50;
    }

    :host([hidden]) { display: none; }

    button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: none;
      border-radius: 2rem;
      background: var(--primary, #6366f1);
      color: white;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      transition: background var(--transition-fast, 0.15s ease), transform var(--transition-fast, 0.15s ease);
    }

    button:hover {
      background: var(--primary-dark, #4f46e5);
      transform: translateY(-1px);
    }

    button:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
    }

    button:active {
      transform: scale(0.98);
    }
  `;

  render() {
    if (!this.visible) return html``;
    return html`
      <button
        @click=${() => this.dispatchEvent(new CustomEvent('fab-click'))}
        aria-label=${this.label}
      >
        <span>+</span>
        <span>${this.label}</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-fab': DrFab;
  }
}
