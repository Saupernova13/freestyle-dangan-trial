import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ViewName } from '../../store/trial-store.js';

interface NavItem {
  view: ViewName;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { view: 'cast', icon: '\u{1F465}', label: 'Cast' },
  { view: 'script', icon: '\u{1F4DD}', label: 'Script' },
  { view: 'truthBullets', icon: '\u{1F3AF}', label: 'Truth Bullets' },
  { view: 'minigames', icon: '\u{1F3AE}', label: 'Minigame Details' },
];

@customElement('dr-nav')
export class DrNav extends LitElement {
  @property() activeView: ViewName = 'cast';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 180px;
      min-width: 180px;
      background: var(--bg-primary, #fff);
      border-right: 1px solid var(--border-primary, #e5e7eb);
      padding: 0.5rem 0;
    }

    button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.7rem 1rem;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--text-secondary, #4b5563);
      text-align: left;
      transition: background var(--transition-fast, 0.15s ease), color var(--transition-fast, 0.15s ease);
    }

    button:hover {
      background: var(--bg-tertiary, #f3f4f6);
    }

    button[aria-current="page"] {
      background: var(--bg-tertiary, #f3f4f6);
      color: var(--primary, #6366f1);
      font-weight: 600;
      border-left: 3px solid var(--primary, #6366f1);
    }

    button:focus-visible {
      outline: 2px solid var(--primary, #6366f1);
      outline-offset: -2px;
    }

    .icon {
      font-size: 1.1rem;
      width: 1.5rem;
      text-align: center;
    }

    @media (max-width: 768px) {
      :host {
        flex-direction: row;
        width: 100%;
        min-width: unset;
        border-right: none;
        border-bottom: 1px solid var(--border-primary, #e5e7eb);
        overflow-x: auto;
      }
      button {
        flex-direction: column;
        font-size: 0.75rem;
        padding: 0.5rem;
        min-width: fit-content;
      }
      button[aria-current="page"] {
        border-left: none;
        border-bottom: 3px solid var(--primary, #6366f1);
      }
    }
  `;

  private onKeydown(e: KeyboardEvent) {
    const currentIdx = NAV_ITEMS.findIndex(item => item.view === this.activeView);
    let nextIdx = -1;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextIdx = (currentIdx + 1) % NAV_ITEMS.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextIdx = (currentIdx - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = NAV_ITEMS.length - 1;
    }

    if (nextIdx >= 0) {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent<ViewName>('view-changed', { detail: NAV_ITEMS[nextIdx].view }));
      const btn = this.shadowRoot?.querySelector<HTMLButtonElement>(`[data-index="${nextIdx}"]`);
      btn?.focus();
    }
  }

  render() {
    return html`
      <nav role="tablist" aria-label="Main navigation" @keydown=${this.onKeydown}>
        ${NAV_ITEMS.map((item, i) => html`
          <button
            role="tab"
            aria-current=${this.activeView === item.view ? 'page' : 'false'}
            aria-selected=${this.activeView === item.view}
            tabindex=${this.activeView === item.view ? 0 : -1}
            data-index=${i}
            @click=${() => this.dispatchEvent(new CustomEvent<ViewName>('view-changed', { detail: item.view }))}
          >
            <span class="icon">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `)}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-nav': DrNav;
  }
}
