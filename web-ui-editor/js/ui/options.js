// The one <option> list builder. Every <select> in the editor renders through
// it, so escaping and the disabled rule are decided once.
//
// Nine call sites spelled `${x === v ? 'selected' : ''}` inline and they did
// not agree: most escaped the label, none escaped the value, and two had grown
// their own disabled-with-a-suffix convention. A <select> is the control that
// misreports most quietly - an option the browser cannot match leaves the
// first entry showing, so the author reads a value the trial does not hold.
//
// An item is { value, label, title, disabled, suffix }; only value and label
// are required. `suffix` is appended to the visible label but not to the
// value, for notes like " (already selected)" that are not part of the data.
//
// DOM-free: it returns markup for setHtml() or a template literal to place.
import { escapeHtml } from '../utils.js';

// The editor stores several of its enums as { value: label } tables, which the
// validators derive their accepted values from. Rendering straight from the
// table is what keeps the two in step.
export function renderLabelOptions(labels, selected) {
  return renderOptions(
    Object.entries(labels).map(([value, label]) => ({ value, label })),
    selected
  );
}

export function renderOptions(items, selected) {
  return items
    .map((item) => {
      const isSelected = item.value === selected;
      // The selected entry is never disabled. A disabled option cannot be
      // submitted back, so disabling the current value would make the control
      // report something the line does not hold the moment anything else on
      // the form is edited.
      const disabled = Boolean(item.disabled) && !isSelected;
      const attrs =
        ` value="${escapeHtml(item.value)}"` +
        (item.title ? ` title="${escapeHtml(item.title)}"` : '') +
        (isSelected ? ' selected' : '') +
        (disabled ? ' disabled' : '');
      return `<option${attrs}>${escapeHtml(`${item.label}${item.suffix || ''}`)}</option>`;
    })
    .join('');
}
