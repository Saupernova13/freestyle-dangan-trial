// @vitest-environment jsdom
//
// openDialog binds Enter on document in the capture phase, so it runs ahead of
// the bubble-phase handlers the rest of the app uses. With the destructive
// button holding both the focus and that binding, an Enter meant for something
// else landed on it: arrowing through the script-line type <select> fires
// change, which opens the "this clears the line's current content" confirm,
// and the Enter meant to commit the select wiped the line.
import { beforeEach, describe, expect, it } from 'vitest';
import { confirmDialog } from '../js/ui/dialogs.js';

function mountDialogRoot() {
  document.body.innerHTML = '<div id="dialogroot"></div>';
  window.icon = () => '';
}

function pressEnter() {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

function buttonLabels() {
  return [...document.querySelectorAll('[data-dialog-index]')].map((b) => b.textContent);
}

beforeEach(mountDialogRoot);

describe('confirmDialog', () => {
  it('answers no to Enter when the action is destructive', async () => {
    const answer = confirmDialog({ message: 'Delete it?', danger: true, confirmLabel: 'Delete' });
    pressEnter();
    expect(await answer).toBe(false);
  });

  it('focuses Cancel, not the destructive button', async () => {
    const answer = confirmDialog({ message: 'Delete it?', danger: true, confirmLabel: 'Delete' });
    expect(document.activeElement.textContent).toBe('Cancel');
    pressEnter();
    await answer;
  });

  it('still answers yes to Enter for an ordinary confirm', async () => {
    // Non-destructive dialogs keep their convenience: Enter means proceed.
    const answer = confirmDialog({ message: 'Continue?', confirmLabel: 'Continue' });
    expect(document.activeElement.textContent).toBe('Continue');
    pressEnter();
    expect(await answer).toBe(true);
  });

  it('still answers no to Escape either way', async () => {
    const answer = confirmDialog({ message: 'Delete it?', danger: true });
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await answer).toBe(false);
  });

  it('keeps the destructive action reachable by click', async () => {
    const answer = confirmDialog({ message: 'Delete it?', danger: true, confirmLabel: 'Delete' });
    expect(buttonLabels()).toEqual(['Cancel', 'Delete']);
    document.querySelectorAll('[data-dialog-index]')[1].click();
    expect(await answer).toBe(true);
  });
});
