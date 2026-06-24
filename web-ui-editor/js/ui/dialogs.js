// Themed replacements for the native alert()/confirm() and a toast helper.
//
// The browser's alert/confirm block the page, can't be styled, and clash with
// the Class Trial theme. These render into #dialogroot (modal confirms/alerts)
// and #toastroot (transient toasts), both of which sit above #modalroot so a
// confirm can appear over an open editor modal.
//
// confirmDialog/alertDialog return Promises so callers can `await` them in
// place of the synchronous native calls.
import { escapeHtml } from '../utils.js';

// Escape text, then turn newlines into <br> so multi-line messages (the old
// alert strings used \n\n) keep their line breaks.
function formatMessage(text) {
  return escapeHtml(String(text)).replace(/\n/g, '<br>');
}

const TOAST_ICONS = {
  success: 'check',
  error: 'alert',
  warning: 'warning',
  info: 'bulb',
};

// Show a transient toast. Returns a function that dismisses it early.
export function showToast(message, opts = {}) {
  const type = opts.type || 'info';
  const duration = opts.duration ?? 3200;
  const root = document.getElementById('toastroot');
  if (!root) return () => {};

  const el = document.createElement('div');
  el.className = `dr-toast dr-toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `
    <span class="dr-toast-icon">${window.icon(TOAST_ICONS[type] || 'bulb', { size: 18 })}</span>
    <span class="dr-toast-msg">${formatMessage(message)}</span>
  `;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));

  let dismissed = false;
  const remove = () => {
    if (dismissed) return;
    dismissed = true;
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 220);
  };

  if (duration > 0) setTimeout(remove, duration);
  el.addEventListener('click', remove);
  return remove;
}

// Core dialog renderer. `buttons` is an array of
// { label, value, class, default?, escapes? }. Resolves with the value of the
// clicked button (or the `escapes` button's value on Esc / backdrop click).
function openDialog({ title, message, icon = 'alert', buttons }) {
  return new Promise((resolve) => {
    const root = document.getElementById('dialogroot');
    if (!root) {
      resolve(undefined);
      return;
    }

    const escapeButton = buttons.find((b) => b.escapes) || buttons[0];

    const buttonsHtml = buttons
      .map(
        (b, i) =>
          `<button class="btn ${b.class || 'btn-secondary'}" data-dialog-index="${i}">${escapeHtml(
            b.label
          )}</button>`
      )
      .join('');

    const wrap = document.createElement('div');
    wrap.className = 'dr-dialog-bg';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = `
      <div class="dr-dialog">
        <div class="dr-dialog-head">
          <span class="dr-dialog-icon">${window.icon(icon, { size: 22 })}</span>
          <h3 class="dr-dialog-title">${escapeHtml(title)}</h3>
        </div>
        ${message ? `<div class="dr-dialog-msg">${formatMessage(message)}</div>` : ''}
        <div class="dr-dialog-actions">${buttonsHtml}</div>
      </div>
    `;
    root.appendChild(wrap);

    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown, true);
      wrap.remove();
      resolve(value);
    };

    wrap.querySelectorAll('[data-dialog-index]').forEach((btn) => {
      btn.addEventListener('click', () => settle(buttons[Number(btn.dataset.dialogIndex)].value));
    });

    // Backdrop click dismisses with the escape button's value.
    wrap.addEventListener('mousedown', (e) => {
      if (e.target === wrap) settle(escapeButton.value);
    });

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(escapeButton.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const def = buttons.find((b) => b.default) || buttons[buttons.length - 1];
        settle(def.value);
      }
    }
    document.addEventListener('keydown', onKeydown, true);

    // Focus the default action so Enter/Space work immediately.
    const defaultIndex = buttons.findIndex((b) => b.default);
    const focusTarget = wrap.querySelector(
      `[data-dialog-index="${defaultIndex >= 0 ? defaultIndex : buttons.length - 1}"]`
    );
    if (focusTarget) focusTarget.focus();
  });
}

// Promise<boolean> replacement for confirm(). Accepts a string or an options
// object.
export function confirmDialog(opts = {}) {
  if (typeof opts === 'string') opts = { message: opts };
  const {
    title = 'Are you sure?',
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = opts;
  return openDialog({
    title,
    message,
    icon: danger ? 'warning' : 'alert',
    buttons: [
      { label: cancelLabel, value: false, class: 'btn-secondary', escapes: true },
      {
        label: confirmLabel,
        value: true,
        class: danger ? 'btn-danger' : 'btn-primary',
        default: true,
      },
    ],
  });
}

// Promise<void> replacement for alert(). Accepts a string or an options object.
export function alertDialog(opts = {}) {
  if (typeof opts === 'string') opts = { message: opts };
  const { title, message = '', okLabel = 'OK', type = 'info' } = opts;
  const icon = type === 'error' ? 'alert' : type === 'warning' ? 'warning' : 'bulb';
  const resolvedTitle = title || (type === 'error' ? 'Error' : 'Notice');
  return openDialog({
    title: resolvedTitle,
    message,
    icon,
    buttons: [{ label: okLabel, value: true, class: 'btn-primary', default: true, escapes: true }],
  }).then(() => undefined);
}
