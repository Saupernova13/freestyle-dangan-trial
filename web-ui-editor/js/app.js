// Main application logic
const BLOCK_COUNT = 17;
const blockNames = [...Array(16)].map((_, i) => `Student ${String(i + 1).padStart(2, '0')}`).concat(['Headmaster']);
let cast = Array(BLOCK_COUNT).fill(null);
let trialName = "";
let dirHandle = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeTheme();
  loadSettings();
  renderCastGrid();
  
  // Trial name input handler
  document.getElementById('trialNameInput').addEventListener('input', e => {
    trialName = e.target.value.trim();
    autoSaveTrial();
  });
});

async function chooseTrialDir() {
  try {
    showLoader(true);
    let dH = await window.showDirectoryPicker({ id: 'dr-trial-dir', mode: 'readwrite' });
    dirHandle = dH;
    renderDirDisplay(dirHandle);
    
    let files = [];
    for await (const entry of dirHandle.values()) files.push(entry.name);
    
    if (files.includes("trial.json")) {
      const file = await dirHandle.getFileHandle("trial.json").then(fh => fh.getFile());
      const data = JSON.parse(await file.text());
      trialName = data.trialName || "";
      document.getElementById('trialNameInput').value = trialName;
      cast = data.cast.map(x => x || null);
      
      let charsDir = await dirHandle.getDirectoryHandle("Characters", { create: false }).catch(() => null);
      if (charsDir) {
        for (let i = 0; i < cast.length; i++) {
          if (cast[i]) {
            let charDirName = (cast[i].name + "_" + cast[i].surname).replace(/[^a-zA-Z0-9_\- ]/g, '_');
            let cd = await charsDir.getDirectoryHandle(charDirName, { create: false }).catch(() => null);
            
            if (cd) {
              cast[i].sprites = [];
              // Load all sprites (use current max setting or default to 25)
              const spriteCount = appSettings.maxSprites;
              for (let j = 1; j <= spriteCount; j++) {
                try {
                  let f = await cd.getFileHandle(`sprite_${String(j).padStart(2, '0')}.png`).then(fh => fh.getFile());
                  let b64 = await fileToDataUrl(f);
                  cast[i].sprites.push({ dataURL: b64, fname: f.name, blob: f });
                } catch {
                  cast[i].sprites.push(null);
                }
              }
            } else {
              cast[i].sprites = Array(appSettings.maxSprites).fill(null);
            }
          }
        }
      }
    } else {
      trialName = "";
      document.getElementById('trialNameInput').value = "";
      cast = Array(BLOCK_COUNT).fill(null);
      await dirHandle.getDirectoryHandle('Characters', { create: true });
    }
    
    showLoader(false);
    renderCastGrid();
  } catch (err) {
    console.log(err);
    showLoader(false);
  }
}

function renderCastGrid() {
  const grid = document.getElementById('mainGrid');
  grid.innerHTML = '';
  
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const c = cast[i];
    const div = document.createElement('div');
    div.className = 'cast-block';
    div.setAttribute('tabindex', 0);
    div.setAttribute('data-filled', c ? "1" : "0");
    div.onclick = () => dirHandle ? openCharModal(i) : null;
    
    if (c) {
      // Character exists - show sprite and name
      let spriteHtml = '';
      if (c.sprites && c.sprites[0] && c.sprites[0].dataURL) {
        spriteHtml = `<img src="${c.sprites[0].dataURL}" class="blk-ppic" alt="Character sprite">`;
      } else {
        spriteHtml = `<div class="blk-ppic" style="display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">No Image</div>`;
      }
      
      div.innerHTML = `
        ${spriteHtml}
        <div class="cast-name">${c.name || ""} ${c.surname || ""}</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `;
    } else {
      // Empty slot - show plus and default name
      div.innerHTML = `
        <div class="blk-plus">+</div>
        <div class="cast-name">No Character</div>
        <div class="cast-block-title">${blockNames[i]}</div>
      `;
    }
    
    grid.appendChild(div);
  }
}

async function autoSaveTrial() {
  if (!dirHandle) return;
  
  let vals = cast.map(c => c ? {
    name: c.name || "",
    surname: c.surname || "",
    heightM: c.heightM,
    heightCM: c.heightCM,
    weight: c.weight,
    chest: c.chest,
    blood: c.blood,
    dob: c.dob,
    likes: c.likes,
    dislikes: c.dislikes,
    notes: c.notes
  } : null);
  
  let trialJs = { trialName, cast: vals };
  let fHandle = await dirHandle.getFileHandle("trial.json", { create: true });
  let wr = await fHandle.createWritable();
  await wr.write(JSON.stringify(trialJs, null, 2));
  await wr.close();
}