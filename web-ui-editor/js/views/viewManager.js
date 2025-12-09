// View manager - handles switching between different views

function switchView(viewName) {
  activeView = viewName;
  updateNavSelection();
  renderActiveView();
}

function updateNavSelection() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const itemView = item.getAttribute('data-view');
    if (itemView === activeView) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function renderActiveView() {
  const mainGrid = document.getElementById('mainGrid');
  if (!mainGrid) return;

  if (!dirHandle) {
    mainGrid.innerHTML = `
      <div class="welcome-screen">
        <h2>Welcome to Danganronpa Cast Manager</h2>
        <p>To get started, choose a folder to store your trial data.</p>
        <button class="btn btn-primary" onclick="chooseTrialDir()">📁 Choose Folder</button>
      </div>
    `;
    return;
  }

  if (activeView === 'cast') {
    renderCastGrid();
  } else if (activeView === 'script') {
    renderScriptEditor();
  } else if (activeView === 'truthBullets') {
    renderTruthBulletsView();
  } else if (activeView === 'minigames') {
    renderMinigameDetails();
  }
}
