// The single sanctioned innerHTML sink; eslint bans raw assignments
// everywhere else, so every HTML write stays greppable.
//
// Callers must escape interpolated data with escapeHtml() from utils.js — a
// missed escape is an XSS hole as soon as someone opens a foreign trial file.
export function setHtml(el, html) {
  if (el) el.innerHTML = html;
}
