// Application entry point, and the whole of it.
//
// It imports every module - which is what runs their registerActions() calls,
// so the delegated handlers exist before anything renders - and then boots the
// app on DOMContentLoaded.
//
// It used to do a third thing: bridge every module's public functions onto
// `window`, because the rendered HTML wired its controls with inline
// `onclick="..."` attributes and an inline attribute can only reach a global.
// The markup names its behaviour in data-on-<event> now, so nothing needs the
// globals and the bridge is gone.
//
// The boot used to live at the top of app.js, which this file imported last -
// so "where does the app start?" had a two-file answer with an implicit
// ordering dependency.
import './utils.js';
import './ui/icons.js';
import './ui/theme.js';
import './views/castView.js';
import './views/truthBulletsView.js';
import './views/minigames/nonstopDebateEditor.js';
import './views/minigames/listDragReorder.js';
import './views/minigames/logicDiveEditor.js';
import './views/minigames/debateScrumEditor.js';
import './views/minigames/massPanicDebateEditor.js';
import './views/minigames/hangmansGambitEditor.js';
import './modals/modalCoordinator.js';
import './modals/characterModal.js';
import './modals/truthBulletModal.js';
import './modals/scriptLineModal.js';
import './modals/scriptLine/audioTab.js';
import './modals/scriptLine/cameraTab.js';
import './modals/scriptLine/dialogueBoxTab.js';
import './modals/scriptLine/effectsTab.js';
import './modals/scriptLine/highlightingTab.js';
import './modals/scriptLine/spriteTab.js';

import { state } from './core/state.js';
import { initHistory } from './core/history.js';
import { updateFloatingAddButton } from './components/floatingAddButton.js';
import { initSpriteMagnifier } from './components/spriteMagnifier.js';
import { initCharacterSearchDropdown } from './components/characterSearchDropdown.js';
import { autoSaveTrial, hasPendingWrites, scheduleAutoSave } from './core/storage.js';
import { updateExportButtonState } from './export.js';
import { clearStoredSettings, loadSettings } from './settings.js';
import { alertDialog } from './ui/dialogs.js';
import { initializeTheme } from './ui/theme.js';
import { initKeyboardActivation, initUndoRedoShortcut } from './ui/a11y.js';
import { initModalBehaviors } from './ui/modalBehaviors.js';
import { renderActiveView } from './views/viewManager.js';

document.addEventListener('DOMContentLoaded', function () {
  // The editor had no unload handler of any kind, so closing the tab inside
  // the 600 ms debounce window - or at any point after a save started failing
  // - threw the work away without a word. The browser decides what prompt to
  // show; all a handler can do is ask for one. Registered here rather than at
  // module scope so importing this module does not require a DOM.
  window.addEventListener('beforeunload', (e) => {
    if (!hasPendingWrites()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  initializeTheme();

  // Nothing after this point runs if an initialiser throws, and there is no
  // window.onerror to catch it, so the settings load reports failure instead:
  // a corrupt localStorage value used to leave a permanently blank editor.
  if (!loadSettings()) {
    clearStoredSettings();
    alertDialog({
      title: 'Settings reset',
      type: 'warning',
      message:
        'Your saved editor settings could not be read and have been reset to ' +
        'their defaults. Your trials are unaffected.',
    });
  }

  initSpriteMagnifier();
  initCharacterSearchDropdown();
  initModalBehaviors();
  initKeyboardActivation();
  renderActiveView();

  document.getElementById('trialNameInput').addEventListener('input', (e) => {
    state.trialName = e.target.value.trim();
    updateExportButtonState();
    scheduleAutoSave();
  });

  // skipHistory keeps the restore itself from being recorded as a new edit.
  initHistory(() => {
    document.getElementById('trialNameInput').value = state.trialName;
    renderActiveView();
    updateFloatingAddButton();
    updateExportButtonState();
    autoSaveTrial({ skipHistory: true });
  });

  initUndoRedoShortcut();
});
