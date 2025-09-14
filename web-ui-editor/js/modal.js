// Modal management
let activeIdx = null;
let charFields = {
  name: "",
  surname: "",
  heightM: 1,
  heightCM: 50,
  weight: "",
  chest: "",
  blood: "A",
  dob: "",
  likes: "",
  dislikes: "",
  notes: ""
};
let charSprites = [];
let modalTab = "details";
let modalErr = "";
let modalMsg = "";

function openCharModal(idx) {
  if (!dirHandle) {
    alert("Choose a folder first!");
    return;
  }
  
  activeIdx = idx;
  modalTab = "details";
  modalErr = "";
  modalMsg = "";
  
  let c = cast[idx] || {};
  charFields = {
    name: c.name || "",
    surname: c.surname || "",
    heightM: c.heightM || 1,
    heightCM: c.heightCM || 50,
    weight: c.weight || "",
    chest: c.chest || "",
    blood: c.blood || "A",
    dob: c.dob || "",
    likes: c.likes || "",
    dislikes: c.dislikes || "",
    notes: c.notes || ""
  };
  
  // Load existing sprites if they exist
  if (c.sprites) {
    charSprites = [...c.sprites];
  } else {
    charSprites = Array(appSettings.maxSprites).fill(null);
  }
  
  renderModal();
}

function renderModal() {
  let root = document.getElementById("modalroot");
  root.innerHTML = `
    <div class="dr-modal-bg">
      <div class="dr-modal">
        <button class="dr-close" onclick="closeModal()">&times;</button>
        <div class="dr-tabs">
          <button class="dr-tab${modalTab === 'details' ? ' active' : ''}" onclick="switchModalTab('details')">Character Details</button>
          <button class="dr-tab${modalTab === 'sprites' ? ' active' : ''}" onclick="switchModalTab('sprites')">Sprites</button>
        </div>
        <div id="dr-tab-content">${modalTab === 'details' ? renderDetailsTab() : renderSpritesTab()}</div>
        <div class="dr-btn-row">
          <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="trySaveChar()" ${(!dirHandle) ? "disabled" : ""}>Save Character</button>
        </div>
        ${modalErr ? `<div class="dr-err">${modalErr}</div>` : ""}
        ${modalMsg ? `<div class="dr-success">${modalMsg}</div>` : ""}
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById("modalroot").innerHTML = "";
  activeIdx = null;
}

function switchModalTab(tab) {
  modalTab = tab;
  modalErr = "";
  modalMsg = "";
  renderModal();
}

function fieldUpdate(field, val) {
  charFields[field] = val;
}

function renderDetailsTab() {
  return `<form class="dr-form" onsubmit="event.preventDefault();">
    <div class="dr-fg-row">
      <div class="dr-fg-field">
          <label>First Name</label>
          <input required value="${charFields.name || ''}" onchange="fieldUpdate('name',this.value)" oninput="fieldUpdate('name',this.value)">
      </div>
      <div class="dr-fg-field">
          <label>Last Name</label>
          <input required value="${charFields.surname || ''}" onchange="fieldUpdate('surname',this.value)" oninput="fieldUpdate('surname',this.value)">
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
          <label>Date of Birth</label>
          <input type="date" required value="${charFields.dob || ''}" onchange="fieldUpdate('dob',this.value)" oninput="fieldUpdate('dob',this.value)">
      </div>
      <div class="dr-fg-field">
        <label>Blood Type</label>
        <select required onchange="fieldUpdate('blood',this.value)">
          <option${charFields.blood === "A" ? ' selected' : ''}>A</option>
          <option${charFields.blood === "B" ? ' selected' : ''}>B</option>
          <option${charFields.blood === "O" ? ' selected' : ''}>O</option>
          <option${charFields.blood === "AB" ? ' selected' : ''}>AB</option>
          <option${charFields.blood === "Unknown" ? ' selected' : ''}>Unknown</option>
        </select>
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Height</label>
        <div class="dr-fg-field input2">
          <input type="number" min="0.9" max="2.5" step="0.01" value="${charFields.heightM || ''}" onchange="fieldUpdate('heightM',this.value)" oninput="fieldUpdate('heightM',this.value)">
          <span>m</span>
          <input type="number" min="0" max="99" step="1" value="${charFields.heightCM || ''}" onchange="fieldUpdate('heightCM',this.value)" oninput="fieldUpdate('heightCM',this.value)">
          <span>cm</span>
        </div>
      </div>
      <div class="dr-fg-field">
        <label>Weight (kg)</label>
        <input type="number" min="0" max="300" required value="${charFields.weight || ''}" onchange="fieldUpdate('weight',this.value)" oninput="fieldUpdate('weight',this.value)">
      </div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Chest (cm)</label>
        <input type="number" min="0" max="200" required value="${charFields.chest || ''}" onchange="fieldUpdate('chest',this.value)" oninput="fieldUpdate('chest',this.value)">
      </div>
      <div class="dr-fg-field"></div>
    </div>
    <div class="dr-fg-row">
      <div class="dr-fg-field">
        <label>Likes</label>
        <textarea required onchange="fieldUpdate('likes',this.value)" oninput="fieldUpdate('likes',this.value)">${charFields.likes || ''}</textarea>
      </div>
      <div class="dr-fg-field">
        <label>Dislikes</label>
        <textarea required onchange="fieldUpdate('dislikes',this.value)" oninput="fieldUpdate('dislikes',this.value)">${charFields.dislikes || ''}</textarea>
      </div>
    </div>
    <div class="dr-fg-row single">
      <div class="dr-fg-field">
        <label>Notes</label>
        <textarea required onchange="fieldUpdate('notes',this.value)" oninput="fieldUpdate('notes',this.value)">${charFields.notes || ''}</textarea>
      </div>
    </div>
  </form>`;
}

function renderSpritesTab() {
  return `
    <div class="dr-form">
      <button class="btn btn-primary dr-sprslot-bulk" type="button" onclick="bulkImportSprites()">📁 Bulk Import All ${appSettings.maxSprites} Sprites</button>
      <div class="dr-sprgrid">
        ${charSprites.map((spr, i) =>
    `<div class="dr-sprslot" onclick="triggerSpriteInput(${i})">
            <input type="file" accept="image/*" id="sprite_inp_${i}" onchange="spriteUpload(event,${i})">
            ${spr ?
        `<img src="${spr.dataURL}" alt="Sprite ${i + 1}"><span class="dr-sprslot-num">#${i + 1}</span>`
        : `<span style="color: var(--text-tertiary);">+<br><small>Sprite #${i + 1}</small></span>`
      }
          </div>`
  ).join("")}
      </div>
      <p style="font-size: 0.875rem; color: var(--text-tertiary); margin-top: 1rem;">
        Upload images in any format. They will be automatically processed and saved as PNG files.
      </p>
    </div>
  `;
}

function spriteUpload(e, idx) {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  charSprites[idx] = { dataURL: url, fname: file.name, blob: file };
  renderModal();
}

function triggerSpriteInput(i) {
  document.getElementById(`sprite_inp_${i}`).click();
}

function bulkImportSprites() {
  let inp = document.createElement("input");
  inp.type = 'file';
  inp.accept = "image/*";
  inp.multiple = true;
  
  inp.onchange = e => {
    let files = Array.from(inp.files);
    if (files.length !== appSettings.maxSprites) {
      modalErr = `Please select exactly ${appSettings.maxSprites} images.`;
      renderModal();
      return;
    }
    
    files.forEach((f, idx) => {
      let url = URL.createObjectURL(f);
      charSprites[idx] = { dataURL: url, fname: f.name, blob: f };
      if (idx === appSettings.maxSprites - 1) renderModal();
    });
  };
  
  inp.click();
}

async function trySaveChar() {
  let missingF = !charFields.name || !charFields.surname || !charFields.weight || !charFields.chest
    || !charFields.dob || !charFields.likes || !charFields.dislikes || !charFields.notes;
  let badh = isNaN(parseFloat(charFields.heightM)) || isNaN(parseInt(charFields.heightCM));
  let allSprites = charSprites.length === appSettings.maxSprites && charSprites.every(s => s && s.blob);
  
  if (missingF || badh || !allSprites) {
    modalErr = "";
    if (missingF || badh) modalErr += "All fields must be filled correctly.<br>";
    if (!allSprites) modalErr += `All ${appSettings.maxSprites} sprites must be uploaded.`;
    renderModal();
    return;
  }
  
  if (!dirHandle) {
    modalErr = "Choose a folder first!";
    renderModal();
    return;
  }
  
  showLoader(true);
  
  let charDirname = (charFields.name + "_" + charFields.surname).replace(/[^a-zA-Z0-9_\- ]/g, '_');
  let charsDir = await dirHandle.getDirectoryHandle("Characters", { create: true });
  let charDir = await charsDir.getDirectoryHandle(charDirname, { create: true });
  
  let charJson = { ...charFields, height: `${charFields.heightM}m ${charFields.heightCM}cm` };
  let writer = await charDir.getFileHandle("character.json", { create: true }).then(fh => fh.createWritable());
  await writer.write(JSON.stringify(charJson, null, 2));
  await writer.close();
  
  for (let k = 0; k < appSettings.maxSprites; k++) {
    let s = charSprites[k];
    if (!s || !s.blob) continue;
    let sw = await charDir.getFileHandle(`sprite_${String(k + 1).padStart(2, '0')}.png`, { create: true }).then(fh => fh.createWritable());
    await sw.write(s.blob);
    await sw.close();
  }
  
  cast[activeIdx] = { ...charFields, sprites: [...charSprites] };
  await autoSaveTrial();
  
  showLoader(false);
  closeModal();
  renderCastGrid();
}