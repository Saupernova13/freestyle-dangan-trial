import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('dr-header')
export class DrHeader extends LitElement {
  @property() trialName = '';

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1.5rem;
      background: var(--bg-primary, #fff);
      border-bottom: 1px solid var(--border-primary, #e5e7eb);
      z-index: 10;
    }

    h1 {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary, #111827);
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    button {
      background: none;
      border: 1px solid var(--border-primary, #e5e7eb);
      border-radius: var(--radius-sm, 6px);
      padding: 0.4rem 0.6rem;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      color: var(--text-secondary, #4b5563);
      transition: background var(--transition-fast, 0.15s ease);
    }

    button:hover {
      background: var(--bg-tertiary, #f3f4f6);
    }

    button:focus-visible {
      outline: 2px solid var(--primary, #6366f1);
      outline-offset: 2px;
    }
  `;

  render() {
    return html`
      <h1>Danganronpa Trial Scripter</h1>
      <div class="actions">
        <button
          @click=${() => this.dispatchEvent(new CustomEvent('settings-open'))}
          title="Settings"
          aria-label="Open settings"
        >&#9881;</button>
        <button
          @click=${() => this.dispatchEvent(new CustomEvent('theme-toggle'))}
          title="Toggle theme"
          aria-label="Toggle light/dark theme"
        >
          <span class="theme-icon">&#127769;</span>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-header': DrHeader;
  }
}
