// Themed, awaitable replacements for alert()/confirm(), plus toasts.
//
// Renders into #dialogroot and #toastroot, which sit above #modalroot so a
// confirm can appear over an open editor modal.
import { escapeHtml } from '../utils.js';

import { setHtml } from './dom.js';
// Escapes first, so the <br> substitution can't inject markup.
function formatMessage(text) {
  return escapeHtml(String(text)).replace(/\n/g, '<br>');
}

const TOAST_ICONS = {
  success: 'check',
  error: 'alert',
  warning: 'warning',
  info: 'bulb',
};

// Returns a function that dismisses the toast early.
export function showToast(message, opts = {}) {
  const type = opts.type || 'info';
  const duration = opts.duration ?? 3200;
  const root = document.getElementById('toastroot');
  if (!root) return () => {};

  const el = document.createElement('div');
  el.className = `dr-toast dr-toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  setHtml(
    el,
    `
    <span class="dr-toast-icon">${window.icon(TOAST_ICONS[type] || 'bulb', { size: 18 })}</span>
    <span class="dr-toast-msg">${formatMessage(message)}</span>
  `
  );
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

// `buttons`: { label, value, class, default?, escapes? }. Resolves with the
// clicked button's value, or the `escapes` one on Esc / backdrop click.
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
    setHtml(
      wrap,
      `
      <div class="dr-dialog">
        <div class="dr-dialog-head">
          <span class="dr-dialog-icon">${window.icon(icon, { size: 22 })}</span>
          <h3 class="dr-dialog-title">${escapeHtml(title)}</h3>
        </div>
        ${message ? `<div class="dr-dialog-msg">${formatMessage(message)}</div>` : ''}
        <div class="dr-dialog-actions">${buttonsHtml}</div>
      </div>
    `
    );
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

    // Focus the default action so Enter/Space work without a click first.
    const defaultIndex = buttons.findIndex((b) => b.default);
    const focusTarget = wrap.querySelector(
      `[data-dialog-index="${defaultIndex >= 0 ? defaultIndex : buttons.length - 1}"]`
    );
    if (focusTarget) focusTarget.focus();
  });
}

// Promise<boolean>. Takes a string or an options object.
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
    // On a danger dialog Cancel takes the focus and the Enter binding. Enter is
    // caught by a keydown listener registered on document in the capture
    // phase, so it runs ahead of the bubble-phase handlers the rest of the app
    // uses. An Enter meant for something else - committing a <select> whose
    // change event opened this very dialog, for instance - would otherwise
    // land on the destructive button. Destroying data should need a deliberate
    // click or an explicit Tab.
    buttons: [
      {
        label: cancelLabel,
        value: false,
        class: 'btn-secondary',
        escapes: true,
        default: danger,
      },
      {
        label: confirmLabel,
        value: true,
        class: danger ? 'btn-danger' : 'btn-primary',
        default: !danger,
      },
    ],
  });
}

// Promise<void>. Takes a string or an options object.
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

// Resolves with the trimmed value, or null on cancel, dismiss, or blank.
export function promptDialog(opts = {}) {
  const {
    title = 'Enter a value',
    message = '',
    label = '',
    value = '',
    placeholder = '',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
  } = opts;

  return new Promise((resolve) => {
    const root = document.getElementById('dialogroot');
    if (!root) {
      resolve(null);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'dr-dialog-bg';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    setHtml(
      wrap,
      `
      <div class="dr-dialog">
        <div class="dr-dialog-head">
          <span class="dr-dialog-icon">${window.icon('edit', { size: 22 })}</span>
          <h3 class="dr-dialog-title">${escapeHtml(title)}</h3>
        </div>
        ${message ? `<div class="dr-dialog-msg">${formatMessage(message)}</div>` : ''}
        <label class="dr-dialog-field">
          ${label ? `<span>${escapeHtml(label)}</span>` : ''}
          <input type="text" class="dr-dialog-input" value="${escapeHtml(value)}"
                 placeholder="${escapeHtml(placeholder)}">
        </label>
        <div class="dr-dialog-actions">
          <button class="btn btn-secondary" data-act="cancel">${escapeHtml(cancelLabel)}</button>
          <button class="btn btn-primary" data-act="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `
    );
    root.appendChild(wrap);
    const input = wrap.querySelector('.dr-dialog-input');

    let settled = false;
    const settle = (val) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown, true);
      wrap.remove();
      resolve(val);
    };
    const accept = () => settle(input.value.trim() || null);

    wrap.querySelector('[data-act="cancel"]').addEventListener('click', () => settle(null));
    wrap.querySelector('[data-act="ok"]').addEventListener('click', accept);
    wrap.addEventListener('mousedown', (e) => {
      if (e.target === wrap) settle(null);
    });

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        accept();
      }
    }
    document.addEventListener('keydown', onKeydown, true);

    input.focus();
    input.select();
  });
}
