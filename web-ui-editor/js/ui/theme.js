// The Class Trial UI is dark-only by design.

// A no-op, kept so any lingering inline handler stays harmless.
export function toggleTheme() {}

export function initializeTheme() {
  document.body.setAttribute('data-theme', 'dark');
}
