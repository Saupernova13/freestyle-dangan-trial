import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { TruthBullet } from '../../domain/types.js';
import '../shared/floating-action-button.js';
import '../modals/truth-bullet-modal.js';

@customElement('dr-truth-bullets-view')
export class DrTruthBulletsView extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @state() private editModalOpen = false;
  @state() private editBulletId = '';

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

    .split-view {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 1rem;
      min-height: 400px;
    }

    .bullet-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius, 8px);
      padding: 0.5rem;
    }

    .bullet-item {
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius-sm, 6px);
      cursor: pointer;
      font-size: 0.85rem;
      transition: background var(--transition-fast);
    }

    .bullet-item:hover { background: var(--bg-tertiary); }
    .bullet-item.selected {
      background: color-mix(in srgb, var(--primary) 10%, var(--bg-primary));
      color: var(--primary);
      font-weight: 600;
    }

    .bullet-detail {
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius, 8px);
      padding: 1.5rem;
    }

    .bullet-detail h3 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
    }

    .bullet-detail p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .bullet-meta {
      margin-top: 1rem;
      font-size: 0.8rem;
      color: var(--text-tertiary);
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

    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .btn-danger {
      background: var(--error);
      color: white;
      border: none;
      border-radius: var(--radius-sm, 6px);
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .btn-danger:hover { filter: brightness(0.9); }

    @media (max-width: 768px) {
      .split-view {
        grid-template-columns: 1fr;
      }
    }
  `;

  render() {
    const bullets = this.store.api.getTruthBullets();

    if (bullets.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">&#127919;</div>
          <h2>No Truth Bullets</h2>
          <p>Create truth bullets that can be used as evidence in debates</p>
          <button class="btn-add" @click=${this.addBullet}>+ Add Truth Bullet</button>
        </div>
      `;
    }

    const selectedId = this.store.selectedTruthBulletId ?? bullets[0]?.bulletId;
    const selected = bullets.find(b => b.bulletId === selectedId);

    return html`
      <h2>Truth Bullets</h2>
      <div class="split-view">
        <div class="bullet-list" role="listbox" aria-label="Truth bullets">
          ${bullets.map(b => this.renderBulletItem(b, b.bulletId === selectedId))}
        </div>
        <div class="bullet-detail">
          ${selected ? this.renderBulletDetail(selected) : html`<p class="text-muted">Select a truth bullet</p>`}
        </div>
      </div>
      <dr-fab label="Add Bullet" @fab-click=${this.addBullet}></dr-fab>
      <dr-truth-bullet-modal
        .store=${this.store}
        .bulletId=${this.editBulletId}
        .open=${this.editModalOpen}
        @modal-closed=${() => (this.editModalOpen = false)}
      ></dr-truth-bullet-modal>
    `;
  }

  private renderBulletItem(bullet: TruthBullet, isSelected: boolean) {
    return html`
      <div
        class="bullet-item ${isSelected ? 'selected' : ''}"
        role="option"
        aria-selected=${isSelected}
        @click=${() => this.store.selectTruthBullet(bullet.bulletId)}
      >
        ${bullet.name || 'Unnamed Bullet'}
      </div>
    `;
  }

  private renderBulletDetail(bullet: TruthBullet) {
    return html`
      <h3>${bullet.name}</h3>
      <p>${bullet.description}</p>
      ${bullet.inversedLieBulletName ? html`
        <div class="bullet-meta">Lie Bullet: ${bullet.inversedLieBulletName}</div>
      ` : ''}
      <div class="actions">
        <button class="btn-add" @click=${() => this.editBullet(bullet.bulletId)}>Edit</button>
        <button class="btn-danger" @click=${() => this.deleteBullet(bullet.bulletId)}>Delete</button>
      </div>
    `;
  }

  private addBullet() {
    const bullet = this.store.api.addTruthBullet({
      name: '',
      description: '',
      imageFile: null,
      inversedLieBulletName: '',
    });
    this.store.selectTruthBullet(bullet.bulletId);
  }

  private editBullet(id: string) {
    this.editBulletId = id;
    this.editModalOpen = true;
  }

  private deleteBullet(id: string) {
    this.store.api.deleteTruthBullet(id);
    this.store.selectTruthBullet(null);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-truth-bullets-view': DrTruthBulletsView;
  }
}
