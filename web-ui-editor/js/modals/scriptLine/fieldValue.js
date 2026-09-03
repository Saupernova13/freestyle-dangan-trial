// A control's value, coerced the way the field wants it.
//
// The inline handlers spelled this per site - `parseFloat(this.value)` here,
// `parseInt(this.value)` there - so the coercion travelled in the markup.
// It travels in `data-number` now, and the reading of it lives here.
export function fieldValue(el) {
  if (el.dataset.number === 'float') return parseFloat(el.value);
  if (el.dataset.number === 'int') return parseInt(el.value, 10);
  return el.value;
}
