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
  updateFloatingAddButton();  // Update floating button for new view
}

export function updateNavSelection() {
  document.querySelectorAll('.nav-item').forEach(item => {
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
    mainGrid.innerHTML = `
      <div class="welcome-screen">
        <h2>Welcome to Danganronpa Cast Manager</h2>
        <p>To get started, choose a folder to store your trial data.</p>
        <button class="btn btn-primary" onclick="chooseTrialDir()">📁 Choose Folder</button>
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
