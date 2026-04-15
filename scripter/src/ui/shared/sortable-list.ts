import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export interface ReorderEvent {
  fromIndex: number;
  toIndex: number;
}

/**
 * <dr-sortable-list> — generic drag-and-drop reorderable list.
 *
 * Replaces 4 copy-pasted drag-drop implementations from the old codebase:
 * - app.js:170-235 (script lines)
 * - nonstopDebateEditor.js:498-561 (dialogue lines)
 * - debateScrumEditor.js (arguments)
 * - logicDiveEditor.js (questions)
 *
 * Usage: Provide items via property. The component renders slot-based children
 * with drag handles. Emits 'reorder' event with {fromIndex, toIndex}.
 */
@customElement('dr-sortable-list')
export class DrSortableList extends LitElement {
  @property({ type: Number }) itemCount = 0;
  @state() private dragIndex: number | null = null;
  @state() private dropTarget: number | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .drop-zone {
      height: 4px;
      transition: height 0.15s ease, background 0.15s ease;
      border-radius: 2px;
    }

    .drop-zone.active {
      height: 8px;
      background: var(--primary, #6366f1);
    }

    ::slotted(*) {
      cursor: grab;
    }

    ::slotted(.dragging) {
      opacity: 0.5;
    }
  `;

  render() {
    const items = [];
    for (let i = 0; i <= this.itemCount; i++) {
      if (i > 0) {
        items.push(html`<slot name="item-${i - 1}"></slot>`);
      }
      items.push(html`
        <div
          class="drop-zone ${this.dropTarget === i ? 'active' : ''}"
          @dragover=${(e: DragEvent) => this.onDragOver(e, i)}
          @dragleave=${() => this.onDragLeave()}
          @drop=${(e: DragEvent) => this.onDrop(e, i)}
        ></div>
      `);
    }
    return html`${items}`;
  }

  handleDragStart(index: number) {
    this.dragIndex = index;
  }

  handleDragEnd() {
    this.dragIndex = null;
    this.dropTarget = null;
  }

  private onDragOver(e: DragEvent, position: number) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.dropTarget = position;
  }

  private onDragLeave() {
    this.dropTarget = null;
  }

  private onDrop(e: DragEvent, position: number) {
    e.preventDefault();
    e.stopPropagation();
    this.dropTarget = null;

    if (this.dragIndex === null) return;
    if (position === this.dragIndex || position === this.dragIndex + 1) {
      this.dragIndex = null;
      return;
    }

    this.dispatchEvent(new CustomEvent<ReorderEvent>('reorder', {
      detail: { fromIndex: this.dragIndex, toIndex: position },
    }));

    this.dragIndex = null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dr-sortable-list': DrSortableList;
  }
}
