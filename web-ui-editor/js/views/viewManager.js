// Switches the main grid between the editor views and the welcome hub.
import { renderScriptEditor } from '../app.js';
import { updateFloatingAddButton } from '../components/floatingAddButton.js';
import { state } from '../core/state.js';
import {
  listOpfsTrialFolders,
  readOpfsFileText,
  supportsFsPicker,
  supportsOpfs,
} from '../core/opfs.js';
import { escapeHtml } from '../utils.js';
import { renderCastGrid } from './castView.js';
import { renderMinigameDetails } from './minigameView.js';
import { renderTruthBulletsView } from './truthBulletsView.js';

import { setHtml } from '../ui/dom.js';
export function switchView(viewName) {
  state.activeView = viewName;
  updateNavSelection();
  renderActiveView();
  updateFloatingAddButton();
}

export function updateNavSelection() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    const itemView = item.getAttribute('data-view');
    if (itemView === state.activeView) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

export function renderActiveView() {
  const mainGrid = document.getElementById('mainGrid');
  if (!mainGrid) return;

  if (!state.dirHandle) {
    renderWelcomeHub(mainGrid);
    return;
  }

  if (state.activeView === 'cast') {
    renderCastGrid();
  } else if (state.activeView === 'script') {
    renderScriptEditor();
  } else if (state.activeView === 'truthBullets') {
    renderTruthBulletsView();
  } else if (state.activeView === 'minigames') {
    renderMinigameDetails();
  }
}

// Trial picker: the on-disk folder picker on Chromium, browser storage
// wherever OPFS exists.
function renderWelcomeHub(mainGrid) {
  const hasPicker = supportsFsPicker();
  const hasOpfs = supportsOpfs();

  if (!hasPicker && !hasOpfs) {
    setHtml(
      mainGrid,
      `
      <div class="welcome-screen">
        <div class="script-empty-icon">${window.icon('warning', { size: 56 })}</div>
        <h2>This browser isn't supported</h2>
        <p>The editor needs either the File System Access API or the Origin
        Private File System. Please use a current version of Chrome, Edge,
        Firefox, or Safari.</p>
      </div>
    `
    );
    return;
  }

  setHtml(
    mainGrid,
    `
    <div class="welcome-screen welcome-hub">
      <h2>Class Trial Editor</h2>
      <p>Open a trial to start editing, or create a new one.</p>

      <div class="hub-options">
        ${
          hasPicker
            ? `<div class="hub-card">
                 <div class="hub-card-icon">${window.icon('folder', { size: 28 })}</div>
                 <h3>Folder on disk</h3>
                 <p>Edit a trial folder on your computer. Changes save in place.</p>
                 <button class="btn btn-primary" data-on-click="chooseTrialDir">Open folder…</button>
               </div>`
            : ''
        }
        ${
          hasOpfs
            ? `<div class="hub-card">
                 <div class="hub-card-icon">${window.icon('layers', { size: 28 })}</div>
                 <h3>Browser storage</h3>
                 <p>Store trials inside this browser. Move them between machines with Export / Import.</p>
                 <div class="hub-card-actions">
                   <button class="btn btn-primary" data-on-click="newOpfsTrial">${window.icon('plus')} New trial</button>
                   <button class="btn btn-secondary" data-on-click="triggerImportTrial">${window.icon('upload')} Import .drtrial</button>
                 </div>
               </div>`
            : ''
        }
      </div>

      ${hasOpfs ? `<div class="hub-trials" id="hubTrials"></div>` : ''}
    </div>
  `
  );

  if (hasOpfs) populateHubTrials();
}

export async function populateHubTrials() {
  const container = document.getElementById('hubTrials');
  if (!container) return;

  let folders;
  try {
    folders = await listOpfsTrialFolders();
  } catch (err) {
    // "Zero trials" and "I could not read the trial directory" used to render
    // identically - nothing at all. Every trial the user had ever made looked
    // gone, and the obvious responses (make a new one, clear site data to "fix"
    // it) are the two that actually destroy the work. The data was untouched;
    // one enumeration call failed.
    console.error('Could not list saved trials:', err);
    setHtml(
      container,
      `
      <h3 class="hub-trials-title">Saved in this browser</h3>
      <p class="hub-trials-error">
        ${window.icon('alert', { size: 16 })}
        Could not read browser storage${err && err.name ? ` (${escapeHtml(err.name)})` : ''}.
        Your saved trials are probably still there - reload the page before
        creating or importing anything.
      </p>
    `
    );
    return;
  }
  if (folders.length === 0) {
    setHtml(container, '');
    return;
  }

  // Display name comes from trial.json; the folder slug is the fallback.
  const rows = await Promise.all(
    folders.map(async (folder) => {
      let name = folder;
      const txt = await readOpfsFileText(folder, 'trial.json');
      if (txt) {
        try {
          const j = JSON.parse(txt);
          if (j.trialName) name = j.trialName;
        } catch {
          /* keep folder name */
        }
      }
      return { folder, name };
    })
  );

  // Folder names go in data attributes and come back via .dataset, never
  // interpolated into inline JS: the browser decodes entities before it
  // evaluates, so escaping alone would not be enough.
  setHtml(
    container,
    `
    <h3 class="hub-trials-title">Saved in this browser</h3>
    <ul class="hub-trial-list">
      ${rows
        .map(
          (r) => `
        <li class="hub-trial-row">
          <button class="hub-trial-open" data-folder="${escapeHtml(r.folder)}"
                  data-on-click="openOpfsTrialByName">
            ${window.icon('script', { size: 16 })}
            <span class="hub-trial-name">${escapeHtml(r.name)}</span>
          </button>
          <button class="hub-trial-delete" title="Delete trial" data-folder="${escapeHtml(r.folder)}"
                  data-on-click="deleteOpfsTrialAndRefresh">
            ${window.icon('trash', { size: 15 })}
          </button>
        </li>`
        )
        .join('')}
    </ul>
  `
  );

}
