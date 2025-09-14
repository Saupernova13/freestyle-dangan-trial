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

// Theme management
function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  
  const themeIcon = document.querySelector('.theme-icon');
  themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  
  localStorage.setItem('theme', newTheme);
}

// Load saved theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  document.querySelector('.theme-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}