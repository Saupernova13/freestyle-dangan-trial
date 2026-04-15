import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { Minigame } from '../../domain/minigame-types.js';
import { MINIGAME_TYPE_LABELS } from '../../domain/constants.js';
import '../shared/floating-action-button.js';
import '../minigame-editors/hangmans-gambit-editor.js';
import '../minigame-editors/logic-dive-editor.js';
import '../minigame-editors/nonstop-debate-editor.js';
import '../minigame-editors/debate-scrum-editor.js';
import '../minigame-editors/mass-panic-debate-editor.js';
import '../minigame-editors/stub-editor.js';

@customElement('dr-minigames-view')
export class DrMinigamesView extends LitElement {
  @property({ attribute: false }) store!: TrialStore;

  static styles = css`
    :host { display: block; }

    h2 {
      margin: 0 0 1rem;
      font-size: 1.2rem;
      color: var(--text-primary);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-tertiary);
    }

    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

    .minigame-cards {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .minigame-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius, 8px);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .card-header:hover { background: var(--bg-tertiary); }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .card-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    .card-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.8rem;
      color: var(--text-tertiary);
    }

    .card-meta .type { color: var(--primary); font-weight: 500; }
    .card-meta .easy { color: var(--success); }
    .card-meta .medium { color: var(--warning); }
    .card-meta .hard { color: var(--error); }

    .card-actions {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      font-size: 0.9rem;
      border-radius: 4px;
      color: var(--text-tertiary);
    }

    .btn-icon:hover { background: var(--bg-tertiary); }

    .expand-icon {
      font-size: 0.8rem;
      color: var(--text-tertiary);
      margin-left: 0.5rem;
    }

    .card-body {
      padding: 1rem;
      border-top: 1px solid var(--border-primary);
    }

    .placeholder-text {
      color: var(--text-tertiary);
      font-style: italic;
      font-size: 0.9rem;
      text-align: center;
      padding: 1rem;
    }

    .btn-add {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--radius-sm, 6px);
      background: var(--primary);
      color: white;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .btn-add:hover { background: var(--primary-dark); }
  `;

  render() {
    const minigames = this.store.api.getMinigames();

    if (minigames.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">&#127918;</div>
          <h2>No Minigames Configured</h2>
          <p>Click the button below to create your first minigame instance</p>
          <button class="btn-add" @click=${this.addMinigame}>+ Create Minigame</button>
        </div>
      `;
    }

    return html`
      <h2>Minigame Instances</h2>
      <div class="minigame-cards">
        ${minigames.map(mg => this.renderCard(mg))}
      </div>
      <dr-fab label="Create Minigame" @fab-click=${this.addMinigame}></dr-fab>
    `;
  }

  private renderCard(mg: Minigame) {
    const isExpanded = this.store.expandedMinigameId === mg.gameId;
    const typeLabel = MINIGAME_TYPE_LABELS[mg.gameType] || mg.gameType;

    return html`
      <div class="minigame-card">
        <div class="card-header" @click=${() => this.store.toggleMinigameExpand(mg.gameId)}>
          <div class="card-info">
            <div class="card-name">${mg.name || 'Unnamed Minigame'}</div>
            <div class="card-meta">
              <span class="type">${typeLabel}</span>
              <span class="${mg.difficulty}">${mg.difficulty}</span>
              <span>&#9201; ${mg.timeLimit}s</span>
            </div>
          </div>
          <div class="card-actions">
            <button
              class="btn-icon"
              @click=${(e: Event) => { e.stopPropagation(); this.deleteMinigame(mg.gameId); }}
              title="Delete minigame"
              aria-label="Delete minigame"
            >&#128465;</button>
            <span class="expand-icon">${isExpanded ? '\u25BC' : '\u25B6'}</span>
          </div>
        </div>
        ${isExpanded ? html`
          <div class="card-body">
            ${this.renderEditor(mg)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderEditor(mg: Minigame) {
    switch (mg.gameType) {
      case 'hangmans_gambit':
        return html`<dr-hangmans-gambit .store=${this.store} .minigame=${mg}></dr-hangmans-gambit>`;
      case 'logic_dive':
        return html`<dr-logic-dive .store=${this.store} .minigame=${mg}></dr-logic-dive>`;
      case 'nonstop_debate':
        return html`<dr-nonstop-debate .store=${this.store} .minigame=${mg}></dr-nonstop-debate>`;
      case 'debate_scrum':
        return html`<dr-debate-scrum .store=${this.store} .minigame=${mg}></dr-debate-scrum>`;
      case 'mass_panic_debate':
        return html`<dr-mass-panic-debate .store=${this.store} .minigame=${mg}></dr-mass-panic-debate>`;
      default:
        return html`<dr-stub-editor .minigame=${mg}></dr-stub-editor>`;
    }
  }

  private addMinigame() {
    const mg = this.store.api.addMinigame({
      name: '',
      gameType: 'nonstop_debate',
      difficulty: 'medium',
      timeLimit: 60,
      typeSpecific: { selectedBullets: [], dialogueLines: [] },
    });
    this.store.toggleMinigameExpand(mg.gameId);
  }

  private deleteMinigame(id: string) {
    this.store.api.deleteMinigame(id);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-minigames-view': DrMinigamesView;
  }
}
