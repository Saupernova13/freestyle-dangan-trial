// Truth bullets view - displays truth bullet list

function renderTruthBulletsView() {
  const grid = document.getElementById('mainGrid');

  if (truthBullets.length === 0) {
    grid.innerHTML = `
      <div id="truthBulletsContainer">
        <div class="script-empty-state">
          <div class="script-empty-icon">🎯</div>
          <h2>No Truth Bullets</h2>
          <p>Create truth bullets that can be used as evidence in debates</p>
          <button class="btn btn-primary script-add-btn" onclick="addTruthBullet()">
            ➕ Add Truth Bullet
          </button>
        </div>
      </div>
    `;
  } else {
    let bulletsHtml = truthBullets.map((bullet, index) =>
      renderTruthBulletBar(bullet, index)
    ).join('');

    grid.innerHTML = `
      <div id="truthBulletsContainer">
        <div class="script-header">
          <h2>Truth Bullets</h2>
          <button class="btn btn-primary" onclick="addTruthBullet()">➕ Add Truth Bullet</button>
        </div>
        <div class="script-lines-container">
          ${bulletsHtml}
        </div>
      </div>
    `;
  }
}

function renderTruthBulletBar(bullet, index) {
  const hasImage = bullet.imageFile;

  return `
    <div class="script-line-bar truth-bullet-bar" data-bullet-id="${bullet.bulletId}">
      <div class="truth-bullet-image">
        ${hasImage ? `<img src="${bullet.imageDataURL || ''}" alt="Bullet image">` : '<span class="no-image">📷</span>'}
      </div>

      <div class="truth-bullet-info">
        <div class="truth-bullet-name">${bullet.name || 'Unnamed Bullet'}</div>
        <div class="truth-bullet-desc">${bullet.description || 'No description'}</div>
        ${bullet.inversedLieBulletName ? `<div class="truth-bullet-lie">Lie: ${bullet.inversedLieBulletName}</div>` : ''}
      </div>

      <button class="script-line-edit"
              onclick="event.stopPropagation(); openTruthBulletModal('${bullet.bulletId}')"
              title="Edit bullet">✏️</button>

      <button class="script-line-delete"
              onclick="event.stopPropagation(); deleteTruthBullet('${bullet.bulletId}')"
              title="Delete bullet">🗑️</button>
    </div>
  `;
}

function generateBulletId() {
  return `tb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function addTruthBullet() {
  const newBullet = {
    bulletId: generateBulletId(),
    name: "",
    description: "",
    imageFile: null,
    inversedLieBulletName: ""
  };
  truthBullets.push(newBullet);
  renderTruthBulletsView();
  openTruthBulletModal(newBullet.bulletId);
}

function deleteTruthBullet(bulletId) {
  if (!confirm('Delete this truth bullet? It will be removed from any debates that reference it.')) {
    return;
  }

  truthBullets = truthBullets.filter(b => b.bulletId !== bulletId);

  // Remove from all minigame selections
  minigames.forEach(mg => {
    if (mg.typeSpecific && mg.typeSpecific.selectedBullets) {
      mg.typeSpecific.selectedBullets = mg.typeSpecific.selectedBullets.filter(id => id !== bulletId);
    }
  });

  renderTruthBulletsView();
  autoSaveTrial();
}
