import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Minigame } from '../../domain/minigame-types.js';
import { MINIGAME_TYPE_LABELS, type MinigameType } from '../../domain/constants.js';
import { editorStyles } from '../shared/editor-styles.js';

@customElement('dr-stub-editor')
export class DrStubEditor extends LitElement {
  @property({ attribute: false }) minigame!: Minigame;

  static styles = editorStyles;

  render() {
    const label = MINIGAME_TYPE_LABELS[this.minigame.gameType as MinigameType] ?? this.minigame.gameType;

    return html`
      <div class="empty-state">
        ${label} editor is not yet implemented. This minigame type is pending Godot integration.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-stub-editor': DrStubEditor;
  }
}
