const editable = 'input, textarea, [contenteditable]:not([contenteditable="false"])';
const interactive = editable + ', a, button, select, label, summary, [role="button"]';
const hasTouch = navigator.maxTouchPoints > 0;

function matchesAncestor(node, selector) {
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest(selector));
}

// Leave game buttons and links on their existing native tap path.
document.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch' && !matchesAncestor(event.target, interactive)) {
    event.preventDefault();
  }
}, { capture: true });

if (hasTouch) {
  for (const type of ['selectstart', 'contextmenu']) {
    document.addEventListener(type, event => {
      if (!matchesAncestor(event.target, editable)) event.preventDefault();
    }, { capture: true });
  }

  // Some WebKit selection gestures skip the cancellable selectstart event.
  document.addEventListener('selectionchange', () => {
    const selection = document.getSelection();
    if (selection && !selection.isCollapsed && !matchesAncestor(selection.anchorNode, editable)) {
      selection.removeAllRanges();
    }
  });
}
