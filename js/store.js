// LIFE — store. One state object D, one commit path: integrity → save → render.
import { normalize, SAVE_KEY, LEGACY_KEY, UI_KEY } from './schema.js';

export let D = null;
export const hooks = { render() {}, integrity() {} };

const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function load() {
  D = normalize(read(SAVE_KEY) ?? read(LEGACY_KEY));
  hooks.integrity();
  save();
}
export function save() { write(SAVE_KEY, D); }
export function commit() { hooks.integrity(); save(); hooks.render(); }
export const snapshot = () => JSON.stringify(D);
export function replace(raw) { D = normalize(typeof raw === 'string' ? JSON.parse(raw) : raw); commit(); }

// UI-only state (collapsed panels, active tabs) lives OUTSIDE the save blob.
export const ui = { collapsed: {}, ...(read(UI_KEY) || {}) };
export const saveUi = () => write(UI_KEY, ui);
