import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { MassPanicDebate, MassPanicLineGroup, MassPanicSpeakerLine } from '../../domain/minigame-types.js';
import { TEXT_EFFECTS, TEXT_FONTS, TEXT_MOVEMENT_DIRECTIONS } from '../../domain/constants.js';
import { generateId } from '../../domain/ids.js';
import { editorStyles } from '../shared/editor-styles.js';

function defaultSpeakerLine(): MassPanicSpeakerLine {
  return {
    sentenceBeginning: '',
    target: '',
    sentenceEnd: '',
    isLoudAssertion: false,
    answerBulletId: null,
    textEffect: 'normal',
    textMovementDirection: 'left_to_right',
    textFont: 'default',
    voiceLineFile: null,
  };
}

@customElement('dr-mass-panic-debate')
export class DrMassPanicDebateEditor extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property({ attribute: false }) minigame!: MassPanicDebate;

  static styles = [
    editorStyles,
    css`
      .speakers-setup {
        margin-bottom: 1rem;
      }

      .group-card {
        background: var(--bg-secondary, #f9fafb);
        border: 1px solid var(--border-primary, #e5e7eb);
        border-radius: var(--radius, 8px);
        padding: 1rem;
        margin-bottom: 0.75rem;
      }

      .speaker-columns {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0.75rem;
      }

      .speaker-col {
        border: 1px solid var(--border-secondary, #d1d5db);
        border-radius: var(--radius-sm, 6px);
        padding: 0.75rem;
      }

      .speaker-col-header {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
        color: var(--text-tertiary);
      }

      .loud-badge {
        background: #fef2f2;
        color: #dc2626;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
        margin-left: 0.3rem;
      }

      @media (max-width: 768px) {
        .speaker-columns { grid-template-columns: 1fr; }
      }
    `,
  ];

  render() {
    const data = this.minigame.typeSpecific;
    const cast = this.store.api.getCast().filter(Boolean) as { id: string; name: string; surname: string }[];
    const bullets = this.store.api.getTruthBullets();

    return html`
      <!-- Speaker Setup -->
      <div class="section speakers-setup">
        <h3>Speaker Configuration</h3>
        <p class="help-text">Select 3 characters who speak simultaneously. Each character can only be assigned once.</p>
        <div class="form-row">
          ${(['speaker1CharacterId', 'speaker2CharacterId', 'speaker3CharacterId'] as const).map((field, i) => {
            const othersSelected = [data.speaker1CharacterId, data.speaker2CharacterId, data.speaker3CharacterId].filter((_, j) => j !== i);
            return html`
              <div class="form-group">
                <label>Speaker ${i + 1}</label>
                <select class="form-input" .value=${data[field]} @change=${(e: Event) => this.updateSpeaker(field, (e.target as HTMLSelectElement).value)}>
                  <option value="">None</option>
                  ${cast.map(c => html`
                    <option value=${c.id} ?selected=${c.id === data[field]} ?disabled=${othersSelected.includes(c.id)}>
                      ${c.name} ${c.surname}${othersSelected.includes(c.id) ? ' (taken)' : ''}
                    </option>
                  `)}
                </select>
              </div>
            `;
          })}
        </div>
      </div>

      <!-- Line Groups -->
      <div class="section">
        <h3>Line Groups (${data.lineGroups.length})</h3>
        <p class="help-text">Each group has all 3 speakers talking simultaneously. Only one speaker per group can have a loud assertion.</p>

        ${data.lineGroups.length === 0
          ? html`<div class="empty-state">No line groups yet.</div>`
          : data.lineGroups
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((group, i) => this.renderGroup(group, i, cast, bullets))}

        <div class="actions-row">
          <button class="btn btn-primary" @click=${this.addGroup}>+ Add Line Group</button>
        </div>
      </div>
    `;
  }

  private renderGroup(
    group: MassPanicLineGroup,
    index: number,
    cast: { id: string; name: string; surname: string }[],
    bullets: ReadonlyArray<{ bulletId: string; name: string }>,
  ) {
    const data = this.minigame.typeSpecific;
    const speakerNames = [
      this.getCharName(data.speaker1CharacterId, cast),
      this.getCharName(data.speaker2CharacterId, cast),
      this.getCharName(data.speaker3CharacterId, cast),
    ];

    return html`
      <div class="group-card">
        <div class="card-header">
          <span class="card-number">Group #${index + 1}</span>
          <div style="display:flex;gap:0.25rem;">
            <button class="btn-icon" @click=${() => this.moveGroup(group.groupId, -1)} title="Move up">&#9650;</button>
            <button class="btn-icon" @click=${() => this.moveGroup(group.groupId, 1)} title="Move down">&#9660;</button>
            <button class="btn-icon" @click=${() => this.deleteGroup(group.groupId)} title="Delete">&#128465;</button>
          </div>
        </div>

        <div class="speaker-columns">
          ${(['speaker1', 'speaker2', 'speaker3'] as const).map((key, i) =>
            this.renderSpeakerCol(group, key, speakerNames[i], bullets)
          )}
        </div>
      </div>
    `;
  }

  private renderSpeakerCol(
    group: MassPanicLineGroup,
    key: 'speaker1' | 'speaker2' | 'speaker3',
    speakerName: string,
    bullets: ReadonlyArray<{ bulletId: string; name: string }>,
  ) {
    const line = group[key];

    return html`
      <div class="speaker-col">
        <div class="speaker-col-header">
          ${speakerName}
          ${line.isLoudAssertion ? html`<span class="loud-badge">LOUD</span>` : ''}
        </div>

        <div class="form-group">
          <label>Beginning</label>
          <input type="text" class="form-input" .value=${line.sentenceBeginning} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'sentenceBeginning', (e.target as HTMLInputElement).value)} placeholder="Start..." />
        </div>
        <div class="form-group">
          <label>Target</label>
          <input type="text" class="form-input" style="font-weight:600;" .value=${line.target} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'target', (e.target as HTMLInputElement).value)} placeholder="target" />
        </div>
        <div class="form-group">
          <label>End</label>
          <input type="text" class="form-input" .value=${line.sentenceEnd} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'sentenceEnd', (e.target as HTMLInputElement).value)} placeholder="...end" />
        </div>

        <label class="checkbox-label">
          <input type="checkbox" .checked=${line.isLoudAssertion} @change=${(e: Event) => this.toggleLoudAssertion(group.groupId, key, (e.target as HTMLInputElement).checked)} />
          Loud Assertion
        </label>

        ${line.isLoudAssertion ? html`
          <div class="form-group" style="margin-top:0.5rem;">
            <label>Answer Bullet</label>
            <select class="form-input" .value=${line.answerBulletId ?? ''} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'answerBulletId', (e.target as HTMLSelectElement).value || null)}>
              <option value="">None</option>
              ${bullets.map(b => html`<option value=${b.bulletId} ?selected=${b.bulletId === line.answerBulletId}>${b.name}</option>`)}
            </select>
          </div>
        ` : ''}

        <div class="form-row" style="margin-top:0.5rem;">
          <div class="form-group">
            <label>Effect</label>
            <select class="form-input" .value=${line.textEffect} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'textEffect', (e.target as HTMLSelectElement).value)}>
              ${TEXT_EFFECTS.map(te => html`<option value=${te} ?selected=${te === line.textEffect}>${te}</option>`)}
            </select>
          </div>
          <div class="form-group">
            <label>Font</label>
            <select class="form-input" .value=${line.textFont} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'textFont', (e.target as HTMLSelectElement).value)}>
              ${TEXT_FONTS.map(tf => html`<option value=${tf} ?selected=${tf === line.textFont}>${tf}</option>`)}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Direction</label>
          <select class="form-input" .value=${line.textMovementDirection} @change=${(e: Event) => this.updateSpeakerLine(group.groupId, key, 'textMovementDirection', (e.target as HTMLSelectElement).value)}>
            ${TEXT_MOVEMENT_DIRECTIONS.map(d => html`<option value=${d} ?selected=${d === line.textMovementDirection}>${d.replace('_', ' ')}</option>`)}
          </select>
        </div>
      </div>
    `;
  }

  private getCharName(id: string, cast: { id: string; name: string; surname: string }[]): string {
    const c = cast.find(c => c.id === id);
    return c ? `${c.name} ${c.surname}`.trim() : 'Unassigned';
  }

  // ---- Mutations ----

  private getGroups(): MassPanicLineGroup[] {
    return this.minigame.typeSpecific.lineGroups.map(g => ({
      ...g,
      speaker1: { ...g.speaker1 },
      speaker2: { ...g.speaker2 },
      speaker3: { ...g.speaker3 },
    }));
  }

  private save(updates: Partial<MassPanicDebate['typeSpecific']>) {
    this.store.api.updateMinigame(this.minigame.gameId, {
      typeSpecific: { ...this.minigame.typeSpecific, ...updates },
    } as Partial<MassPanicDebate>);
  }

  private updateSpeaker(field: 'speaker1CharacterId' | 'speaker2CharacterId' | 'speaker3CharacterId', value: string) {
    this.save({ [field]: value });
  }

  private addGroup() {
    const groups = this.getGroups();
    groups.push({
      groupId: generateId('mpg'),
      order: groups.length,
      speaker1: defaultSpeakerLine(),
      speaker2: defaultSpeakerLine(),
      speaker3: defaultSpeakerLine(),
    });
    this.save({ lineGroups: groups });
  }

  private deleteGroup(groupId: string) {
    const groups = this.getGroups().filter(g => g.groupId !== groupId);
    groups.forEach((g, i) => (g.order = i));
    this.save({ lineGroups: groups });
  }

  private moveGroup(groupId: string, direction: -1 | 1) {
    const groups = this.getGroups().sort((a, b) => a.order - b.order);
    const idx = groups.findIndex(g => g.groupId === groupId);
    const target = idx + direction;
    if (target < 0 || target >= groups.length) return;
    [groups[idx], groups[target]] = [groups[target], groups[idx]];
    groups.forEach((g, i) => (g.order = i));
    this.save({ lineGroups: groups });
  }

  private updateSpeakerLine(groupId: string, speaker: 'speaker1' | 'speaker2' | 'speaker3', field: keyof MassPanicSpeakerLine, value: unknown) {
    const groups = this.getGroups();
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (group[speaker] as any)[field] = value;
    this.save({ lineGroups: groups });
  }

  private toggleLoudAssertion(groupId: string, speaker: 'speaker1' | 'speaker2' | 'speaker3', checked: boolean) {
    const groups = this.getGroups();
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return;

    // Only one speaker can have loud assertion per group
    if (checked) {
      group.speaker1.isLoudAssertion = false;
      group.speaker2.isLoudAssertion = false;
      group.speaker3.isLoudAssertion = false;
    }
    group[speaker].isLoudAssertion = checked;

    this.save({ lineGroups: groups });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-mass-panic-debate': DrMassPanicDebateEditor;
  }
}
