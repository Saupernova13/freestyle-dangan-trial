import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { NonstopDebate, NonstopDialogueLine } from '../../domain/minigame-types.js';
import { MAX_BULLETS_PER_DEBATE, MAX_DEBATE_DIALOGUE_LINES, TEXT_EFFECTS, TEXT_FONTS, TEXT_MOVEMENT_DIRECTIONS } from '../../domain/constants.js';
import { generateId } from '../../domain/ids.js';
import { editorStyles } from '../shared/editor-styles.js';

@customElement('dr-nonstop-debate')
export class DrNonstopDebateEditor extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property({ attribute: false }) minigame!: NonstopDebate;

  private expandedSections = new Map<string, Set<string>>();

  static styles = [
    editorStyles,
    css`
      .bullet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .bullet-card {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 2px solid var(--border-primary, #e5e7eb);
        border-radius: var(--radius-sm, 6px);
        cursor: pointer;
        transition: border-color var(--transition-fast);
        font-size: 0.85rem;
      }

      .bullet-card:hover { border-color: var(--primary-light); }
      .bullet-card.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }

      .bullet-check {
        width: 1.2rem;
        height: 1.2rem;
        border-radius: 3px;
        border: 2px solid var(--border-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        flex-shrink: 0;
      }

      .bullet-card.selected .bullet-check {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
      }

      .dialogue-card {
        background: var(--bg-secondary, #f9fafb);
        border: 1px solid var(--border-primary, #e5e7eb);
        border-radius: var(--radius, 8px);
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
      }

      .dialogue-main-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 0.5rem;
        align-items: start;
        margin-bottom: 0.5rem;
      }

      .dialogue-main-row .form-input { font-size: 0.85rem; }

      .target-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
      }

      .target-col label { font-size: 0.7rem; text-align: center; }

      .collapsible-header {
        font-size: 0.8rem;
        color: var(--text-tertiary);
        cursor: pointer;
        padding: 0.25rem 0;
        user-select: none;
      }

      .collapsible-header:hover { color: var(--text-secondary); }

      .collapsible-body {
        padding-top: 0.5rem;
      }

      @media (max-width: 768px) {
        .dialogue-main-row { grid-template-columns: 1fr; }
      }
    `,
  ];

  render() {
    const data = this.minigame.typeSpecific;
    const bullets = this.store.api.getTruthBullets();
    const dialogueLines = data.dialogueLines;

    return html`
      <!-- Truth Bullet Selection -->
      <div class="section">
        <h3>Truth Bullets (${data.selectedBullets.length}/${MAX_BULLETS_PER_DEBATE})</h3>
        <p class="help-text">Select truth bullets available during this debate.</p>

        ${bullets.length === 0
          ? html`<div class="empty-state">No truth bullets available. Create some in the Truth Bullets section first.</div>`
          : html`
            <div class="bullet-grid">
              ${bullets.map(b => {
                const sel = data.selectedBullets.includes(b.bulletId);
                return html`
                  <div
                    class="bullet-card ${sel ? 'selected' : ''}"
                    @click=${() => this.toggleBullet(b.bulletId)}
                  >
                    <span class="bullet-check">${sel ? '\u2713' : ''}</span>
                    <span>${b.name || 'Unnamed'}</span>
                  </div>
                `;
              })}
            </div>
          `}
      </div>

      <!-- Dialogue Lines -->
      <div class="section">
        <h3>Dialogue Lines (${dialogueLines.length}/${MAX_DEBATE_DIALOGUE_LINES})</h3>

        ${dialogueLines.length === 0
          ? html`<div class="empty-state">No dialogue lines yet.</div>`
          : dialogueLines
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((line, i) => this.renderDialogueLine(line, i))}

        ${dialogueLines.length < MAX_DEBATE_DIALOGUE_LINES
          ? html`
            <div class="actions-row">
              <button class="btn btn-primary" @click=${this.addDialogueLine}>+ Add Dialogue Line</button>
            </div>
          `
          : ''}
      </div>
    `;
  }

  private renderDialogueLine(line: NonstopDialogueLine, index: number) {
    const cast = this.store.api.getCast().filter(Boolean) as { id: string; name: string; surname: string }[];
    const selectedBullets = this.store.api.getTruthBullets().filter(b => this.minigame.typeSpecific.selectedBullets.includes(b.bulletId));

    return html`
      <div class="dialogue-card">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span class="card-number">#${index + 1}</span>
            ${line.isShootable ? html`<span class="badge badge-shootable">Shootable</span>` : ''}
          </div>
          <div style="display:flex;gap:0.25rem;">
            <button class="btn-icon" @click=${() => this.moveLine(line.lineId, -1)} title="Move up">&#9650;</button>
            <button class="btn-icon" @click=${() => this.moveLine(line.lineId, 1)} title="Move down">&#9660;</button>
            <button class="btn-icon" @click=${() => this.deleteLine(line.lineId)} title="Delete">&#128465;</button>
          </div>
        </div>

        <!-- Character + Shootable -->
        <div class="form-row">
          <div class="form-group">
            <label>Character</label>
            <select class="form-input" .value=${line.characterId} @change=${(e: Event) => this.updateLine(line.lineId, 'characterId', (e.target as HTMLSelectElement).value)}>
              <option value="">None</option>
              ${cast.map(c => html`<option value=${c.id} ?selected=${c.id === line.characterId}>${c.name} ${c.surname}</option>`)}
            </select>
          </div>
          <div class="form-group" style="flex:0 0 auto;">
            <label>&nbsp;</label>
            <label class="checkbox-label">
              <input type="checkbox" .checked=${line.isShootable} @change=${(e: Event) => this.updateLine(line.lineId, 'isShootable', (e.target as HTMLInputElement).checked)} />
              Shootable
            </label>
          </div>
        </div>

        <!-- Sentence parts: beginning | target | end -->
        <div class="dialogue-main-row">
          <div class="form-group">
            <label>Sentence Beginning</label>
            <input type="text" class="form-input" .value=${line.sentenceBeginning} @change=${(e: Event) => this.updateLine(line.lineId, 'sentenceBeginning', (e.target as HTMLInputElement).value)} placeholder="Start..." />
          </div>
          <div class="target-col">
            <label>Target Word</label>
            <input type="text" class="form-input" style="width:100px;text-align:center;font-weight:600;" .value=${line.target} @change=${(e: Event) => this.updateLine(line.lineId, 'target', (e.target as HTMLInputElement).value)} placeholder="target" />
          </div>
          <div class="form-group">
            <label>Sentence End</label>
            <input type="text" class="form-input" .value=${line.sentenceEnd} @change=${(e: Event) => this.updateLine(line.lineId, 'sentenceEnd', (e.target as HTMLInputElement).value)} placeholder="...end" />
          </div>
        </div>

        <!-- Shootable answer -->
        ${line.isShootable ? html`
          <div class="form-row">
            <div class="form-group">
              <label>Answer Bullet</label>
              <select class="form-input" .value=${line.answerBulletId ?? ''} @change=${(e: Event) => this.updateLine(line.lineId, 'answerBulletId', (e.target as HTMLSelectElement).value || null)}>
                <option value="">None</option>
                ${selectedBullets.map(b => html`<option value=${b.bulletId} ?selected=${b.bulletId === line.answerBulletId}>${b.name}</option>`)}
              </select>
            </div>
            <div class="form-group" style="flex:0 0 auto;">
              <label>&nbsp;</label>
              <label class="checkbox-label">
                <input type="checkbox" .checked=${line.useNegativeBullet} @change=${(e: Event) => this.updateLine(line.lineId, 'useNegativeBullet', (e.target as HTMLInputElement).checked)} />
                Use Negative Bullet
              </label>
            </div>
          </div>
        ` : ''}

        <!-- Collapsible: Text Styling -->
        ${this.renderCollapsible(line.lineId, 'textStyling', 'Text Styling', html`
          <div class="form-row">
            <div class="form-group">
              <label>Effect</label>
              <select class="form-input" .value=${line.textEffect} @change=${(e: Event) => this.updateLine(line.lineId, 'textEffect', (e.target as HTMLSelectElement).value)}>
                ${TEXT_EFFECTS.map(te => html`<option value=${te} ?selected=${te === line.textEffect}>${te}</option>`)}
              </select>
            </div>
            <div class="form-group">
              <label>Font</label>
              <select class="form-input" .value=${line.textFont} @change=${(e: Event) => this.updateLine(line.lineId, 'textFont', (e.target as HTMLSelectElement).value)}>
                ${TEXT_FONTS.map(tf => html`<option value=${tf} ?selected=${tf === line.textFont}>${tf}</option>`)}
              </select>
            </div>
            <div class="form-group">
              <label>Direction</label>
              <select class="form-input" .value=${line.textMovementDirection} @change=${(e: Event) => this.updateLine(line.lineId, 'textMovementDirection', (e.target as HTMLSelectElement).value)}>
                ${TEXT_MOVEMENT_DIRECTIONS.map(d => html`<option value=${d} ?selected=${d === line.textMovementDirection}>${d.replace('_', ' ')}</option>`)}
              </select>
            </div>
          </div>
          <label class="checkbox-label" style="margin-top:0.5rem;">
            <input type="checkbox" .checked=${line.characterSpotlight} @change=${(e: Event) => this.updateLine(line.lineId, 'characterSpotlight', (e.target as HTMLInputElement).checked)} />
            Character Spotlight
          </label>
        `)}

        <!-- Collapsible: Feedback -->
        ${line.isShootable ? this.renderCollapsible(line.lineId, 'feedback', 'Failure Feedback', html`
          <div class="form-group">
            <label>Failed Comment</label>
            <input type="text" class="form-input" .value=${line.userFailedComment} @change=${(e: Event) => this.updateLine(line.lineId, 'userFailedComment', (e.target as HTMLInputElement).value)} placeholder="What happens when the player fails..." />
          </div>
          <div class="form-group">
            <label>Wrong Answer Comment</label>
            <input type="text" class="form-input" .value=${line.userWrongAnswerComment} @change=${(e: Event) => this.updateLine(line.lineId, 'userWrongAnswerComment', (e.target as HTMLInputElement).value)} placeholder="What happens on wrong answer..." />
          </div>
        `) : ''}
      </div>
    `;
  }

  private renderCollapsible(lineId: string, sectionName: string, title: string, content: unknown) {
    const expanded = this.isSectionExpanded(lineId, sectionName);
    return html`
      <div class="collapsible-header" @click=${() => this.toggleSection(lineId, sectionName)}>
        ${expanded ? '\u25BC' : '\u25B6'} ${title}
      </div>
      ${expanded ? html`<div class="collapsible-body">${content}</div>` : ''}
    `;
  }

  private isSectionExpanded(lineId: string, section: string): boolean {
    return this.expandedSections.get(lineId)?.has(section) ?? false;
  }

  private toggleSection(lineId: string, section: string) {
    if (!this.expandedSections.has(lineId)) this.expandedSections.set(lineId, new Set());
    const sections = this.expandedSections.get(lineId)!;
    if (sections.has(section)) sections.delete(section);
    else sections.add(section);
    this.requestUpdate();
  }

  // ---- Mutations ----

  private getLines(): NonstopDialogueLine[] {
    return [...this.minigame.typeSpecific.dialogueLines];
  }

  private save(dialogueLines: NonstopDialogueLine[], selectedBullets?: string[]) {
    this.store.api.updateMinigame(this.minigame.gameId, {
      typeSpecific: {
        selectedBullets: selectedBullets ?? this.minigame.typeSpecific.selectedBullets,
        dialogueLines,
      },
    } as Partial<NonstopDebate>);
  }

  private toggleBullet(bulletId: string) {
    const current = [...this.minigame.typeSpecific.selectedBullets];
    const idx = current.indexOf(bulletId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else if (current.length < MAX_BULLETS_PER_DEBATE) {
      current.push(bulletId);
    }
    this.save(this.getLines(), current);
  }

  private addDialogueLine() {
    const lines = this.getLines();
    lines.push({
      lineId: generateId('dl'),
      order: lines.length,
      sentenceBeginning: '',
      target: '',
      sentenceEnd: '',
      isShootable: false,
      answerBulletId: null,
      useNegativeBullet: false,
      characterId: '',
      voiceLineFile: null,
      textEffect: 'normal',
      textFont: 'default',
      textMovementDirection: 'left_to_right',
      characterSpotlight: false,
      userFailedComment: '',
      userWrongAnswerComment: '',
    });
    this.save(lines);
  }

  private deleteLine(lineId: string) {
    const lines = this.getLines().filter(l => l.lineId !== lineId);
    lines.forEach((l, i) => (l.order = i));
    this.save(lines);
  }

  private moveLine(lineId: string, direction: -1 | 1) {
    const lines = this.getLines().sort((a, b) => a.order - b.order);
    const idx = lines.findIndex(l => l.lineId === lineId);
    const target = idx + direction;
    if (target < 0 || target >= lines.length) return;
    [lines[idx], lines[target]] = [lines[target], lines[idx]];
    lines.forEach((l, i) => (l.order = i));
    this.save(lines);
  }

  private updateLine(lineId: string, field: keyof NonstopDialogueLine, value: unknown) {
    const lines = this.getLines();
    const line = lines.find(l => l.lineId === lineId);
    if (!line) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (line as any)[field] = value;
    this.save(lines);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-nonstop-debate': DrNonstopDebateEditor;
  }
}
