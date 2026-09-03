// Application entry point, and the whole of it.
//
// Two jobs, in order. First it bridges every module's public functions onto
// `window`, because the rendered HTML uses inline `onclick="..."` handlers;
// modules themselves use imports. Then it boots the app on DOMContentLoaded.
//
// The boot used to live at the top of app.js, which this file imported last -
// so "where does the app start?" had a two-file answer with an implicit
// ordering dependency.
import * as utils from './utils.js';
import * as icons from './ui/icons.js';
import * as dialogs from './ui/dialogs.js';
import * as theme from './ui/theme.js';
import * as settings from './settings.js';
import * as storage from './core/storage.js';
import * as trialAssets from './core/trialAssets.js';
import * as exporter from './export.js';
import * as floatingAddButton from './components/floatingAddButton.js';
import * as spriteMagnifier from './components/spriteMagnifier.js';
import * as characterSearchDropdown from './components/characterSearchDropdown.js';
import * as characterModel from './models/characterModel.js';
import * as castView from './views/castView.js';
import * as viewManager from './views/viewManager.js';
import * as truthBulletsView from './views/truthBulletsView.js';
import * as minigameView from './views/minigameView.js';
import * as nonstopDebateEditor from './views/minigames/nonstopDebateEditor.js';
import * as listDragReorder from './views/minigames/listDragReorder.js';
import * as voiceLineField from './views/minigames/voiceLineField.js';
import * as logicDiveEditor from './views/minigames/logicDiveEditor.js';
import * as debateScrumEditor from './views/minigames/debateScrumEditor.js';
import * as massPanicDebateEditor from './views/minigames/massPanicDebateEditor.js';
import * as hangmansGambitEditor from './views/minigames/hangmansGambitEditor.js';
import * as modalCoordinator from './modals/modalCoordinator.js';
import * as characterModal from './modals/characterModal.js';
import * as truthBulletModal from './modals/truthBulletModal.js';
import * as scriptLineModal from './modals/scriptLineModal.js';
import * as app from './app.js';

// Named imports for the boot below. These are not bridged onto window: they
// are called here and nowhere else.
import { state } from './core/state.js';
import { initHistory } from './core/history.js';
import { initKeyboardActivation, initUndoRedoShortcut } from './ui/a11y.js';
import { initModalBehaviors } from './ui/modalBehaviors.js';

const modules = [
  utils,
  icons,
  dialogs,
  theme,
  settings,
  storage,
  trialAssets,
  exporter,
  floatingAddButton,
  spriteMagnifier,
  characterSearchDropdown,
  characterModel,
  castView,
  viewManager,
  truthBulletsView,
  minigameView,
  nonstopDebateEditor,
  listDragReorder,
  voiceLineField,
  logicDiveEditor,
  debateScrumEditor,
  massPanicDebateEditor,
  hangmansGambitEditor,
  modalCoordinator,
  characterModal,
  truthBulletModal,
  scriptLineModal,
  app,
];

for (const mod of modules) {
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === 'function') {
      if (name in window && window[name] !== value) {
        // Whichever module loads last would silently win the global.
        console.error(`Duplicate global handler name: ${name}`);
      }
      window[name] = value;
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // The editor had no unload handler of any kind, so closing the tab inside
  // the 600 ms debounce window - or at any point after a save started failing
  // - threw the work away without a word. The browser decides what prompt to
  // show; all a handler can do is ask for one. Registered here rather than at
  // module scope so importing this module does not require a DOM.
  window.addEventListener('beforeunload', (e) => {
    if (!storage.hasPendingWrites()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  theme.initializeTheme();

  // Nothing after this point runs if an initialiser throws, and there is no
  // window.onerror to catch it, so the settings load reports failure instead:
  // a corrupt localStorage value used to leave a permanently blank editor.
  if (!settings.loadSettings()) {
    settings.clearStoredSettings();
    dialogs.alertDialog({
      title: 'Settings reset',
      type: 'warning',
      message:
        'Your saved editor settings could not be read and have been reset to ' +
        'their defaults. Your trials are unaffected.',
    });
  }

  spriteMagnifier.initSpriteMagnifier();
  characterSearchDropdown.initCharacterSearchDropdown();
  initModalBehaviors();
  initKeyboardActivation();
  viewManager.renderActiveView();

  document.getElementById('trialNameInput').addEventListener('input', (e) => {
    state.trialName = e.target.value.trim();
    exporter.updateExportButtonState();
    storage.scheduleAutoSave();
  });

  // skipHistory keeps the restore itself from being recorded as a new edit.
  initHistory(() => {
    document.getElementById('trialNameInput').value = state.trialName;
    viewManager.renderActiveView();
    floatingAddButton.updateFloatingAddButton();
    exporter.updateExportButtonState();
    storage.autoSaveTrial({ skipHistory: true });
  });

  initUndoRedoShortcut();
});
