// The single sanctioned innerHTML sink. Raw `el.innerHTML = ...` assignments
// are banned by eslint (no-restricted-syntax) everywhere except this file, so
// every HTML write in the codebase funnels through here and is greppable.
//
// Callers are responsible for escaping interpolated data with escapeHtml()
// from utils.js — a missed escape is an XSS hole the moment someone opens a
// trial file they didn't author.
export function setHtml(el, html) {
  if (el) el.innerHTML = html;
}
