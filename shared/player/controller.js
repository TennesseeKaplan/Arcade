const directions = {
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
  down: [0, 1],
};
const arrows = { up: '↑', left: '←', right: '→', down: '↓' };
export const movementKeys = {
  ArrowUp: 'up', ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
  KeyW: 'up', KeyA: 'left', KeyD: 'right', KeyS: 'down',
};

// Button definitions specify a game action, visible label, and optional face letter.
export function createController(root, { keys = {}, dpad = false, buttons = [], onDirection } = {}) {
  const keyboard = new Set();
  const pointers = new Map();
  const actions = new Map();

  function track(button, action) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, action);
      if (directions[action]) onDirection?.(...directions[action]);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => pointers.delete(event.pointerId));
    }
  }

  root.classList.add('arcade-controller');
  if (dpad) {
    const pad = document.createElement('div');
    pad.className = 'arcade-dpad';
    pad.setAttribute('role', 'group');
    pad.setAttribute('aria-label', 'Four-way movement');
    for (const [direction, arrow] of Object.entries(arrows)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.direction = direction;
      button.setAttribute('aria-label', direction[0].toUpperCase() + direction.slice(1));
      button.textContent = arrow;
      track(button, direction);
      pad.append(button);
    }
    root.append(pad);
  }

  const bank = document.createElement('div');
  bank.className = 'arcade-action-buttons';
  for (const { action, label, face } of buttons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.setAttribute('aria-label', face ? face + ', ' + label.toLowerCase() : label);
    if (face) {
      const caption = document.createElement('span');
      caption.textContent = label;
      button.append(face, caption);
    } else {
      button.textContent = label;
    }
    track(button, action);
    actions.set(action, button);
    bank.append(button);
  }
  root.append(bank);

  document.addEventListener('keydown', event => {
    if (!Object.hasOwn(keys, event.code) ||
        event.target.closest('button, input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    keyboard.add(event.code);
  });
  document.addEventListener('keyup', event => keyboard.delete(event.code));
  function reset() {
    keyboard.clear();
    pointers.clear();
  }
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) reset();
  });

  const down = action => [...keyboard].some(code => keys[code] === action) ||
    [...pointers.values()].includes(action);

  return {
    down,
    movement() {
      const touchDirection = [...pointers.values()].findLast(action => directions[action]);
      if (touchDirection) return directions[touchDirection];
      const x = Number(down('right')) - Number(down('left'));
      const y = Number(down('down')) - Number(down('up'));
      const length = Math.max(1, Math.hypot(x, y));
      return [x / length, y / length];
    },
    showActions(visibleActions) {
      pointers.clear();
      for (const [action, button] of actions) button.hidden = !visibleActions.includes(action);
      bank.hidden = visibleActions.length === 0;
    },
  };
}
