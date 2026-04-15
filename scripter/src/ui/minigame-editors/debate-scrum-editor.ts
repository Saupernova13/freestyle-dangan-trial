import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { TrialStore } from '../../store/trial-store.js';
import type { DebateScrum, DebateScrumArgument } from '../../domain/minigame-types.js';
import { MAX_DEBATE_SCRUM_ARGUMENTS } from '../../domain/constants.js';
import { generateId } from '../../domain/ids.js';
import { editorStyles } from '../shared/editor-styles.js';

@customElement('dr-debate-scrum')
export class DrDebateScrumEditor extends LitElement {
  @property({ attribute: false }) store!: TrialStore;
  @property({ attribute: false }) minigame!: DebateScrum;

  static styles = [
    editorStyles,
    css`
      .argument-card {
        background: var(--bg-secondary, #f9fafb);
        border: 1px solid var(--border-primary, #e5e7eb);
        border-radius: var(--radius, 8px);
        padding: 1rem;
        margin-bottom: 0.75rem;
      }

      .side-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
        padding: 0.15rem 0.5rem;
        border-radius: 3px;
        display: inline-block;
      }

      .side-opposition {
        background: #fef2f2;
        color: #dc2626;
      }

      .side-defense {
        background: #eff6ff;
        color: #2563eb;
      }

      .side-section {
        margin-bottom: 0.75rem;
      }

      .keywords-input {
        font-size: 0.8rem;
        color: var(--text-tertiary);
      }
    `,
  ];

  render() {
    const args = this.minigame.typeSpecific.arguments;
    const cast = this.store.api.getCast().filter(Boolean) as NonNullable<ReturnType<typeof this.store.api.getCharacter>>[];

    return html`
      <div class="section">
        <h3>Debate Arguments (${args.length}/${MAX_DEBATE_SCRUM_ARGUMENTS})</h3>
        <p class="help-text">Create paired opposition and defense statements. Keywords are comma-separated.</p>

        ${args.length === 0
          ? html`<div class="empty-state">No arguments yet. Click "Add Argument" to get started.</div>`
          : args
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((arg, i) => this.renderArgument(arg, i, cast))}

        ${args.length < MAX_DEBATE_SCRUM_ARGUMENTS
          ? html`
              <div class="actions-row">
                <button class="btn btn-primary" @click=${this.addArgument}>+ Add Argument</button>
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderArgument(
    arg: DebateScrumArgument,
    index: number,
    cast: { id: string; name: string; surname: string }[],
  ) {
    return html`
      <div class="argument-card">
        <div class="card-header">
          <span class="card-number">Argument #${index + 1}</span>
          <div style="display:flex;gap:0.25rem;">
            <button class="btn-icon" @click=${() => this.moveArgument(arg.argumentId, -1)} title="Move up" aria-label="Move up">&#9650;</button>
            <button class="btn-icon" @click=${() => this.moveArgument(arg.argumentId, 1)} title="Move down" aria-label="Move down">&#9660;</button>
            <button class="btn-icon" @click=${() => this.deleteArgument(arg.argumentId)} title="Delete" aria-label="Delete argument">&#128465;</button>
          </div>
        </div>

        <!-- Opposition -->
        <div class="side-section">
          <span class="side-label side-opposition">Opposition</span>
          <div class="form-row">
            <div class="form-group">
              <label>Character</label>
              <select
                class="form-input"
                .value=${arg.oppositionCharacterId}
                @change=${(e: Event) => this.updateField(arg.argumentId, 'oppositionCharacterId', (e.target as HTMLSelectElement).value)}
              >
                <option value="">None</option>
                ${cast.map(c => html`<option value=${c.id} ?selected=${c.id === arg.oppositionCharacterId}>${c.name} ${c.surname}</option>`)}
              </select>
            </div>
            <div class="form-group">
              <label>Keywords</label>
              <input
                type="text"
                class="form-input"
                .value=${arg.oppositionKeywords.join(', ')}
                @change=${(e: Event) => this.updateKeywords(arg.argumentId, 'oppositionKeywords', (e.target as HTMLInputElement).value)}
                placeholder="word1, word2, ..."
              />
            </div>
          </div>
          <div class="form-group">
            <label>Statement</label>
            <textarea
              class="form-input"
              rows="2"
              .value=${arg.oppositionStatement}
              @change=${(e: Event) => this.updateField(arg.argumentId, 'oppositionStatement', (e.target as HTMLTextAreaElement).value)}
              placeholder="Opposition statement..."
            ></textarea>
          </div>
        </div>

        <!-- Defense -->
        <div class="side-section">
          <span class="side-label side-defense">Defense</span>
          <div class="form-row">
            <div class="form-group">
              <label>Character</label>
              <select
                class="form-input"
                .value=${arg.defenseCharacterId}
                @change=${(e: Event) => this.updateField(arg.argumentId, 'defenseCharacterId', (e.target as HTMLSelectElement).value)}
              >
                <option value="">None</option>
                ${cast.map(c => html`<option value=${c.id} ?selected=${c.id === arg.defenseCharacterId}>${c.name} ${c.surname}</option>`)}
              </select>
            </div>
            <div class="form-group">
              <label>Keywords</label>
              <input
                type="text"
                class="form-input"
                .value=${arg.defenseKeywords.join(', ')}
                @change=${(e: Event) => this.updateKeywords(arg.argumentId, 'defenseKeywords', (e.target as HTMLInputElement).value)}
                placeholder="word1, word2, ..."
              />
            </div>
          </div>
          <div class="form-group">
            <label>Statement</label>
            <textarea
              class="form-input"
              rows="2"
              .value=${arg.defenseStatement}
              @change=${(e: Event) => this.updateField(arg.argumentId, 'defenseStatement', (e.target as HTMLTextAreaElement).value)}
              placeholder="Defense statement..."
            ></textarea>
          </div>
        </div>
      </div>
    `;
  }

  // ---- Mutations ----

  private getArgs(): DebateScrumArgument[] {
    return [...this.minigame.typeSpecific.arguments];
  }

  private save(args: DebateScrumArgument[]) {
    this.store.api.updateMinigame(this.minigame.gameId, {
      typeSpecific: { arguments: args },
    } as Partial<DebateScrum>);
  }

  private addArgument() {
    const args = this.getArgs();
    args.push({
      argumentId: generateId('arg'),
      order: args.length,
      oppositionStatement: '',
      oppositionCharacterId: '',
      oppositionAudioFile: null,
      oppositionKeywords: [],
      defenseStatement: '',
      defenseCharacterId: '',
      defenseAudioFile: null,
      defenseKeywords: [],
    });
    this.save(args);
  }

  private deleteArgument(argumentId: string) {
    const args = this.getArgs().filter(a => a.argumentId !== argumentId);
    args.forEach((a, i) => (a.order = i));
    this.save(args);
  }

  private moveArgument(argumentId: string, direction: -1 | 1) {
    const args = this.getArgs().sort((a, b) => a.order - b.order);
    const idx = args.findIndex(a => a.argumentId === argumentId);
    const target = idx + direction;
    if (target < 0 || target >= args.length) return;
    [args[idx], args[target]] = [args[target], args[idx]];
    args.forEach((a, i) => (a.order = i));
    this.save(args);
  }

  private updateField(argumentId: string, field: keyof DebateScrumArgument, value: string) {
    const args = this.getArgs();
    const arg = args.find(a => a.argumentId === argumentId);
    if (!arg) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (arg as any)[field] = value;
    this.save(args);
  }

  private updateKeywords(argumentId: string, field: 'oppositionKeywords' | 'defenseKeywords', value: string) {
    const args = this.getArgs();
    const arg = args.find(a => a.argumentId === argumentId);
    if (!arg) return;
    arg[field] = value.split(',').map(k => k.trim()).filter(Boolean);
    this.save(args);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-debate-scrum': DrDebateScrumEditor;
  }
}
