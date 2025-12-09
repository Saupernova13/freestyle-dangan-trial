// Utility functions
function showLoader(on) {
  document.getElementById('loaderOverlay').classList.toggle('visible', !!on);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    let fr = new FileReader();
    fr.onload = _ => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function renderDirDisplay(dH) {
  document.getElementById('dirDisplay').innerText = dH ? `📂 ${dH.name}` : "";
}