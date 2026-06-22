// Theme management
//
// The Class Trial UI is dark-only by design, so there is no longer a
// light theme to toggle to. `toggleTheme` is kept as a no-op so any
// lingering inline handler stays harmless, and init just pins dark.

export function toggleTheme() {
  // intentionally a no-op: the editor ships a single, deliberate dark theme.
}

export function initializeTheme() {
  document.body.setAttribute('data-theme', 'dark');
}
