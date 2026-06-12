// Application entry point.
//
// Imports every module (wiring their imports/exports together) and bridges
// the public functions onto `window`, because the rendered HTML uses inline
// `onclick="..."` handlers which resolve through the global scope.
//
// Modules call each other through explicit imports; the window bridge exists
// only for the inline handlers in generated markup and index.html.
import * as utils from './utils.js';
import * as theme from './ui/theme.js';
import * as settings from './settings.js';
import * as storage from './core/storage.js';
import * as exporter from './export.js';
import * as floatingAddButton from './components/floatingAddButton.js';
import * as spriteMagnifier from './components/spriteMagnifier.js';
import * as characterModel from './models/characterModel.js';
import * as castView from './views/castView.js';
import * as viewManager from './views/viewManager.js';
import * as truthBulletsView from './views/truthBulletsView.js';
import * as minigameView from './views/minigameView.js';
import * as nonstopDebateEditor from './views/minigames/nonstopDebateEditor.js';
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
  theme,
  settings,
  storage,
  exporter,
  floatingAddButton,
  spriteMagnifier,
  characterModel,
  castView,
  viewManager,
  truthBulletsView,
  minigameView,
  nonstopDebateEditor,
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
        // Two modules exporting the same name is exactly the class of bug the
        // module conversion is meant to prevent — fail loudly in dev.
        console.error(`Duplicate global handler name: ${name}`);
      }
      window[name] = value;
    }
  }
}
