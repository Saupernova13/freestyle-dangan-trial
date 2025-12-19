// Truth Bullet modal for editing bullet details

let activeBulletId = null;
let bulletFields = {
  name: "",
  description: "",
  imageFile: null,
  imageBlob: null,
  inversedLieBulletName: ""
};

function openTruthBulletModal(bulletId) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }

  activeBulletId = bulletId;
  bulletModalErr = "";
  bulletModalMsg = "";

  const bullet = truthBullets.find(b => b.bulletId === bulletId);
  if (!bullet) {
    alert("Truth bullet not found!");
    return;
  }

  bulletFields = {
    name: bullet.name || "",
    description: bullet.description || "",
    imageFile: bullet.imageFile || null,
    imageBlob: null,
    inversedLieBulletName: bullet.inversedLieBulletName || ""
  };

  renderTruthBulletModal();
}

function renderTruthBulletModal() {
  const root = document.getElementById("modalroot");
  const bullet = truthBullets.find(b => b.bulletId === activeBulletId);

  const hasImage = bulletFields.imageFile !== null;

  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeTruthBulletModal()">&times;</button>

        <div class="dr-modal-content">
          <div class="dr-form">
            <h3>Truth Bullet Configuration</h3>

            <div class="dr-fg-row single">
              <div class="dr-fg-field">
                <label>Bullet Name:</label>
                <input type="text"
                       value="${bulletFields.name}"
                       oninput="updateBulletField('name', this.value)"
                       placeholder="E.g., Bloody Knife">
              </div>
            </div>

            <div class="dr-fg-row single">
              <div class="dr-fg-field">
                <label>Description:</label>
                <textarea rows="3"
                          oninput="updateBulletField('description', this.value)"
                          placeholder="Describe this evidence...">${bulletFields.description}</textarea>
              </div>
            </div>

            <div class="dr-fg-row single">
              <div class="dr-fg-field">
                <label>Inversed Lie Bullet Name:</label>
                <input type="text"
                       value="${bulletFields.inversedLieBulletName}"
                       oninput="updateBulletField('inversedLieBulletName', this.value)"
                       placeholder="E.g., Clean Knife">
                <small style="color: var(--text-tertiary);">Name when converted to a lie</small>
              </div>
            </div>

            <div class="dr-fg-row">
              <div class="dr-fg-field">
                <label>Bullet Image:</label>
                ${hasImage ? `
                  <div class="bullet-image-preview">
                    <img src="${bullet.imageDataURL || ''}" alt="Bullet image">
                    <button class="btn btn-secondary" onclick="clearBulletImage()">🗑️ Remove Image</button>
                  </div>
                ` : `
                  <div class="bullet-image-empty">
                    <p>No image uploaded</p>
                  </div>
                `}
                <input type="file" accept="image/*" id="bulletImageInput"
                       onchange="handleBulletImageUpload(event)" style="display: none;">
                <button class="btn btn-primary" onclick="triggerBulletImageInput()">
                  📁 ${hasImage ? 'Replace' : 'Upload'} Image
                </button>
              </div>
            </div>
          </div>
        </div>

        ${bulletModalErr ? `<div class="dr-err">${bulletModalErr}</div>` : ""}
        ${bulletModalMsg ? `<div class="dr-success">${bulletModalMsg}</div>` : ""}

        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeTruthBulletModal()">Cancel</button>
          <button class="btn btn-primary" onclick="saveTruthBullet()">Save Bullet</button>
        </div>
      </div>
    </div>
  `;
}

function updateBulletField(field, value) {
  bulletFields[field] = value;
}

function triggerBulletImageInput() {
  document.getElementById('bulletImageInput').click();
}

function handleBulletImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    bulletModalErr = "Please select a valid image file.";
    renderTruthBulletModal();
    return;
  }

  bulletFields.imageFile = file.name;
  bulletFields.imageBlob = file;

  // Create data URL for immediate preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const bullet = truthBullets.find(b => b.bulletId === activeBulletId);
    if (bullet) {
      bullet.imageDataURL = e.target.result;
      renderTruthBulletModal();
    }
  };
  reader.readAsDataURL(file);

  bulletModalErr = "";
  renderTruthBulletModal();
}

function clearBulletImage() {
  bulletFields.imageFile = null;
  bulletFields.imageBlob = null;
  const bullet = truthBullets.find(b => b.bulletId === activeBulletId);
  if (bullet) {
    bullet.imageDataURL = null;
  }
  renderTruthBulletModal();
}

function closeTruthBulletModal() {
  document.getElementById("modalroot").innerHTML = "";
  activeBulletId = null;
}

async function saveTruthBullet() {
  const bullet = truthBullets.find(b => b.bulletId === activeBulletId);
  if (!bullet) {
    alert("Bullet not found!");
    closeTruthBulletModal();
    return;
  }

  if (!bulletFields.name.trim()) {
    bulletModalErr = "Please enter a bullet name.";
    renderTruthBulletModal();
    return;
  }

  try {
    showLoader(true);

    // Handle image upload
    if (bulletFields.imageBlob) {
      const bulletsDir = await dirHandle.getDirectoryHandle("TruthBullets", { create: true });
      const imageFileName = `${bullet.bulletId}.${bulletFields.imageBlob.name.split('.').pop()}`;
      const imageFileHandle = await bulletsDir.getFileHandle(imageFileName, { create: true });
      const writable = await imageFileHandle.createWritable();
      await writable.write(bulletFields.imageBlob);
      await writable.close();

      bullet.imageFile = imageFileName;

      // Store data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        bullet.imageDataURL = e.target.result;
      };
      reader.readAsDataURL(bulletFields.imageBlob);
    } else if (bulletFields.imageFile === null && bullet.imageFile) {
      // Image was cleared, remove the file
      try {
        const bulletsDir = await dirHandle.getDirectoryHandle("TruthBullets", { create: false });
        await bulletsDir.removeEntry(bullet.imageFile);
      } catch (e) {
        console.warn("Could not remove image file:", e);
      }
      bullet.imageFile = null;
      bullet.imageDataURL = null;
    }

    bullet.name = bulletFields.name;
    bullet.description = bulletFields.description;
    bullet.inversedLieBulletName = bulletFields.inversedLieBulletName;

    await autoSaveTrial();

    showLoader(false);
    closeTruthBulletModal();
    renderTruthBulletsView();

  } catch (error) {
    console.error("Error saving truth bullet:", error);
    showLoader(false);
    bulletModalErr = "Failed to save: " + error.message;
    renderTruthBulletModal();
  }
}
