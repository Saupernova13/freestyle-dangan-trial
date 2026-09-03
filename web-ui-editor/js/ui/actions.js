// Behaviour for generated markup, bound once per event type.
//
// The editor builds its DOM by string interpolation, and every control used to
// carry an inline `onclick="deleteScriptLine('${line.id}')"`. That has two
// costs. It puts trial-derived values inside executable attribute strings, so
// the render sites are safe only for as long as the id validation gate holds -
// the browser decodes HTML entities before it evaluates, so escaping does not
// help there. And it forces every handler onto `window`, because an inline
// attribute can only reach a global.
//
// So: values go into escaped `data-*` attributes, the element names its
// behaviour in `data-on-<event>`, and one delegated listener per event type
// looks the name up here. viewManager.js's trial-hub list is the pattern this
// generalises.
//
// Delegated rather than re-bound after each render, because these views
// re-render constantly - a per-element listener would have to be reattached
// every time, and a missed reattach is a dead control with nothing to see.

// "click:deleteScriptLine" -> (element, event) => void
const HANDLERS = new Map();
const listening = new Set();

// focus and blur do not bubble, so a document listener never sees them in the
// bubble phase. Capture does reach the document, and the dispatch below finds
// the element from event.target either way.
const CAPTURE_ONLY = new Set(['focus', 'blur']);

function dispatch(eventType, event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;
  // The innermost element that claims the event wins, which is what the
  // `onclick="event.stopPropagation()"` attributes used to arrange by hand.
  const el = target.closest(`[data-on-${eventType}], [data-stop-${eventType}]`);
  if (!el) return;
  const name = el.getAttribute(`data-on-${eventType}`);
  if (!name) return; // a stop marker: claims the event, deliberately does nothing

  const handler = HANDLERS.get(`${eventType}:${name}`);
  if (!handler) {
    // A typo in generated markup is otherwise a control that does nothing.
    console.error(`No handler registered for data-on-${eventType}="${name}"`);
    return;
  }
  handler(el, event);
}

// `handlers` is { actionName: (element, event) => ... }. The element carries
// its arguments in dataset; a form control carries its value in `.value`.
export function registerActions(eventType, handlers) {
  for (const [name, handler] of Object.entries(handlers)) {
    const key = `${eventType}:${name}`;
    if (HANDLERS.has(key) && HANDLERS.get(key) !== handler) {
      console.error(`Duplicate action name: ${key}`);
    }
    HANDLERS.set(key, handler);
  }
  if (!listening.has(eventType) && typeof document !== 'undefined') {
    document.addEventListener(eventType, (event) => dispatch(eventType, event), {
      capture: CAPTURE_ONLY.has(eventType),
    });
    listening.add(eventType);
  }
}

// For tests and for the wiring tripwire: which actions exist.
export function registeredActions() {
  return new Set(HANDLERS.keys());
}
