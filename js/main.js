// LIFE — boot.
import { load } from './store.js';
import './game.js';
import { initUi, render } from './ui.js';
import './pages/home.js';
import './pages/me.js';
import './pages/slots.js';
import './pages/people.js';
import './pages/plan.js';
import './pages/time.js';
import './pages/worlds.js';
import './pages/system.js';

load();
initUi();
render();
// Coming back to the app (lock screen → home screen icon) should show the current state of the day.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.body.classList.contains('modal-open')) render(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
