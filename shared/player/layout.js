const storageKey = 'arcade-dark-mode';
const toggle = document.querySelector('[data-arcade-theme]');
let dark = false;
try { dark = localStorage.getItem(storageKey) === 'true'; } catch {}
function render() {
  document.documentElement.classList.toggle('arcade-dark', dark);
  document.documentElement.classList.toggle('bp5-dark', dark);
  if (toggle) {
    toggle.textContent = dark ? 'Light Mode' : 'Dark Mode';
    toggle.setAttribute('aria-pressed', String(dark));
  }
}
toggle?.addEventListener('click', () => {
  dark = !dark;
  try { localStorage.setItem(storageKey, String(dark)); } catch {}
  render();
});
render();
