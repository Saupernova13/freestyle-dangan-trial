// Application entry point.
//
// Bridges every module's public functions onto `window`, because the rendered
// HTML uses inline `onclick="..."` handlers. Modules themselves use imports.
import * as utils from './utils.js';
import * as icons from './ui/icons.js';
import * as dialogs from './ui/dialogs.js';
import * as theme from './ui/theme.js';
import * as settings from './settings.js';
import * as storage from './core/storage.js';
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
import * as logicDiveEditor from './views/minigames/logicDiveEditor.js';
import * as debateScrumEditor from './views/minigames/debateScrumEditor.js';
import * as massPanicDebateEditor from './views/minigames/massPanicDebateEditor.js';
import * as hangmansGambitEditor from './views/minigames/hangmansGambitEditor.js';
import * as modalCoordinator from './modals/modalCoordinator.js';
import * as characterModal from './modals/characterModal.js';
import * as truthBulletModal from './modals/truthBulletModal.js';
import * as scriptLineModal from './modals/scriptLineModal.js';
import * as app from './app.js';

const modules = [
  utils,
  icons,
  dialogs,
  theme,
  settings,
  storage,
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
