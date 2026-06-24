// View manager - handles switching between different views
import { renderScriptEditor } from '../app.js';
import { updateFloatingAddButton } from '../components/floatingAddButton.js';
import { state } from '../core/state.js';
import { renderCastGrid } from './castView.js';
import { renderMinigameDetails } from './minigameView.js';
import { renderTruthBulletsView } from './truthBulletsView.js';

export function switchView(viewName) {
  state.activeView = viewName;
  updateNavSelection();
  renderActiveView();
  updateFloatingAddButton(); // Update floating button for new view
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

  // The editor reads and writes trial folders through the File System Access
  // API, which only Chromium-based browsers implement. Fail with a clear
  // explanation rather than a confusing error the moment the user clicks.
  if (!window.showDirectoryPicker) {
    mainGrid.innerHTML = `
      <div class="welcome-screen">
        <div class="script-empty-icon">${window.icon('warning', { size: 56 })}</div>
        <h2>This browser isn't supported</h2>
        <p>The editor saves trials directly to a folder on disk using the File
        System Access API, which only Chromium browsers implement. Please open
        this editor in <strong>Chrome, Edge, or Opera</strong>.</p>
      </div>
    `;
    return;
  }

  if (!state.dirHandle) {
    mainGrid.innerHTML = `
      <div class="welcome-screen">
        <h2>Welcome to the Class Trial Editor</h2>
        <p>To get started, choose a folder to store your trial data.</p>
        <button class="btn btn-primary" onclick="chooseTrialDir()">${window.icon('folder')} Choose Folder</button>
      </div>
    `;
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
