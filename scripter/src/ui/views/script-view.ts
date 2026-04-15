import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { ScriptLine } from '../../domain/types.js';
import '../shared/floating-action-button.js';
import '../shared/confirmation-dialog.js';
import '../modals/script-line-modal.js';

@customElement('dr-script-view')
export class DrScriptView extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @state() private editModalOpen = false;
  @state() private editLineId = '';
  @state() private confirmDeleteId = '';

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

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .script-lines {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .script-line-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-sm, 6px);
      cursor: grab;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .script-line-bar:hover {
      border-color: var(--primary-light);
      box-shadow: var(--shadow-sm);
    }

    .script-line-bar.selected {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 5%, var(--bg-primary));
    }

    .line-number {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      min-width: 2rem;
      text-align: right;
    }

    .line-type-badge {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      min-width: 4.5rem;
      text-align: center;
    }

    .type-speaking { background: #dbeafe; color: #1d4ed8; }
    .type-narrator { background: #fef3c7; color: #92400e; }
    .type-minigame { background: #ede9fe; color: #6d28d9; }

    .line-content {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .line-character {
      font-weight: 600;
      color: var(--text-primary);
    }

    .line-actions {
      display: flex;
      gap: 0.25rem;
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

    .btn-icon:hover {
      background: var(--bg-tertiary);
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
    const lines = this.store.api.getScriptLines();

    if (lines.length === 0) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">&#128221;</div>
          <h2>No Script Lines Yet</h2>
          <p>Click the button below to add your first script line</p>
          <button class="btn-add" @click=${this.addLine}>+ Add Script Line</button>
        </div>
      `;
    }

    return html`
      <h2>Trial Script</h2>
      <div class="script-lines">
        ${lines.map((line, i) => this.renderLine(line, i))}
      </div>
      <dr-fab label="Add Line" @fab-click=${this.addLine}></dr-fab>
      <dr-confirm
        .open=${!!this.confirmDeleteId}
        heading="Delete Line"
        message="Delete this script line? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        @confirmed=${() => { this.store.api.deleteScriptLines([this.confirmDeleteId]); this.confirmDeleteId = ''; }}
        @cancelled=${() => (this.confirmDeleteId = '')}
      ></dr-confirm>
      <dr-script-line-modal
        .store=${this.store}
        .lineId=${this.editLineId}
        .open=${this.editModalOpen}
        @modal-closed=${() => (this.editModalOpen = false)}
      ></dr-script-line-modal>
    `;
  }

  private renderLine(line: ScriptLine, index: number) {
    const isSelected = this.store.selectedLineIds.has(line.id);
    const content = this.getLineContent(line);
    const character = line.type === 'speaking' ? this.getCharacterName(line.characterId) : '';

    return html`
      <div
        class="script-line-bar ${isSelected ? 'selected' : ''}"
        draggable="true"
        @click=${(e: MouseEvent) => {
          if (e.ctrlKey || e.metaKey) {
            this.store.toggleLineSelection(line.id);
          }
        }}
        @dblclick=${() => this.editLine(line.id)}
      >
        <span class="line-number">${index + 1}</span>
        <span class="line-type-badge type-${line.type}">${line.type}</span>
        <span class="line-content">
          ${character ? html`<span class="line-character">${character}:</span> ` : ''}
          ${content}
        </span>
        <span class="line-actions">
          <button class="btn-icon" @click=${() => this.deleteLine(line.id)} title="Delete" aria-label="Delete line">&#128465;</button>
        </span>
      </div>
    `;
  }

  private getLineContent(line: ScriptLine): string {
    switch (line.type) {
      case 'speaking': return line.dialogue || '(empty)';
      case 'narrator': return line.dialogue || '(empty narration)';
      case 'minigame': return `[Minigame: ${line.minigameId || 'unassigned'}]`;
    }
  }

  private getCharacterName(characterId: string): string {
    const char = this.store.api.getCharacter(characterId);
    return char ? `${char.name} ${char.surname}`.trim() : characterId;
  }

  private addLine() {
    this.store.api.addScriptLine({
      type: 'speaking' as const,
      characterId: '',
      dialogue: '',
      spriteIndex: null,
      audioFile: null,
      highlights: [],
      cameraMotion: { type: 'none', duration: 1.0, easing: 'ease-in-out' },
      specialEffects: { effects: [] },
      dialogueBoxStyle: { style: 'default', borderColor: '#FFFFFF', bgOpacity: 0.9, borderThickness: 2 },
    } as Omit<import('../../domain/types.js').SpeakingLine, 'id' | 'order'>);
  }

  private editLine(id: string) {
    this.editLineId = id;
    this.editModalOpen = true;
  }

  private deleteLine(id: string) {
    this.confirmDeleteId = id;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-script-view': DrScriptView;
  }
}
