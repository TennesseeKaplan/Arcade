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
export function createController(root, { keys = {}, dpad = false, joystick = false, buttons = [], onDirection, onAction } = {}) {
  const keyboard = new Set();
  const pointers = new Map();
  const actions = new Map();
  let stickPointer = null;
  let stickVector = [0, 0];
  let centerStick = () => {};

  function track(button, action) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, action);
      if (directions[action]) onDirection?.(...directions[action]);
      else onAction?.(action);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => pointers.delete(event.pointerId));
    }
  }

  root.classList.add('arcade-controller');
  if (joystick) {
    const stick = document.createElement('div');
    stick.className = 'arcade-joystick';
    stick.setAttribute('role', 'group');
    stick.setAttribute('aria-label', 'Movement joystick');
    const knob = document.createElement('span');
    stick.append(knob);
    root.append(stick);
    centerStick = () => {
      stickPointer = null;
      stickVector = [0, 0];
      knob.style.transform = '';
    };
    function steer(event) {
      const bounds = stick.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      const distance = Math.hypot(x, y);
      const radius = bounds.width * .27;
      const strength = Math.min(1, Math.max(0, (distance - 5) / radius));
      const scale = distance ? strength / distance : 0;
      stickVector = [x * scale, y * scale];
      knob.style.transform = 'translate(' + stickVector[0]*radius + 'px,' + stickVector[1]*radius + 'px)';
    }
    stick.addEventListener('pointerdown', event => {
      if (stickPointer !== null) return;
      event.preventDefault();
      stickPointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      steer(event);
    });
    stick.addEventListener('pointermove', event => {
      if (event.pointerId === stickPointer) steer(event);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      stick.addEventListener(type, event => {
        if (event.pointerId === stickPointer) centerStick();
      });
    }
  } else if (dpad) {
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
    button.addEventListener('click', event => {
      if (event.detail === 0 && !event.pointerType) onAction?.(action);
    });
    actions.set(action, button);
    bank.append(button);
  }
  root.append(bank);

  document.addEventListener('keydown', event => {
    if (!Object.hasOwn(keys, event.code) ||
        event.target.closest('button, input, textarea, select, [contenteditable]')) return;
    event.preventDefault();
    keyboard.add(event.code);
    if (!event.repeat && !directions[keys[event.code]]) onAction?.(keys[event.code]);
  });
  document.addEventListener('keyup', event => keyboard.delete(event.code));
  function reset() {
    keyboard.clear();
    centerStick();
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
      if (stickPointer !== null) return stickVector;
      const touchDirection = [...pointers.values()].findLast(action => directions[action]);
      if (touchDirection) return directions[touchDirection];
      const x = Number(down('right')) - Number(down('left'));
      const y = Number(down('down')) - Number(down('up'));
      const length = Math.max(1, Math.hypot(x, y));
      return [x / length, y / length];
    },
    setActionLabel(action, label) {
      const button = actions.get(action);
      if (!button) return;
      const caption = button.querySelector('span');
      const face = caption ? button.firstChild.textContent : '';
      (caption || button).textContent = label;
      button.setAttribute('aria-label', face ? face + ', ' + label.toLowerCase() : label);
    },
    showActions(visibleActions) {
      pointers.clear();
      for (const [action, button] of actions) button.hidden = !visibleActions.includes(action);
      bank.hidden = visibleActions.length === 0;
    },
  };
}
