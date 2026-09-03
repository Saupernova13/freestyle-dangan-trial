// The single sanctioned innerHTML sink; eslint bans raw assignments elsewhere.
//
// Callers must escape interpolated data with escapeHtml() from utils.js - a
// missed escape is an XSS hole the moment someone opens a foreign trial file.
export function setHtml(el, html) {
  if (el) el.innerHTML = html;
}
