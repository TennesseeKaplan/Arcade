// Keep native browser gestures off gameplay controls that read pointer events.
const guarded = new WeakSet();

export function protectControlSurface(root) {
  if (!root || guarded.has(root)) return;
  guarded.add(root);
  root.classList.add('arcade-control-surface');
  const cancel = event => {
    if (event.cancelable) event.preventDefault();
  };
  for (const type of ['touchstart', 'touchmove', 'gesturestart', 'dblclick', 'contextmenu', 'selectstart']) {
    root.addEventListener(type, cancel, { passive: false });
  }
}
