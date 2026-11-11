// LIFE — ui. Router, modal, forms, toast, and the small HTML components every page shares.
// No inline handlers anywhere: on(fn) registers a closure and returns a data attribute.
import { D, commit, hooks, snapshot, replace, ui, saveUi } from './store.js';
import { xpForLevel } from './calc.js';
import { STATS, TIERS, TIER_COLOR } from './schema.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);

// ── Handler registry (view scope + modal scope)
const H = { v: new Map(), m: new Map() };
let scope = 'v', hn = 0;
export function on(fn) { const id = scope + (++hn); H[scope].set(id, fn); return `data-h="${id}"`; }
export function onChange(fn) { const id = scope + (++hn); H[scope].set(id, fn); return `data-c="${id}"`; }
const find = id => H.v.get(id) || H.m.get(id);

// ── Router
const pages = {};
export const page = (name, def) => { pages[name] = def; };
const ROOTS = ['lifestyle', 'schedule', 'home', 'portal', 'me'];
let stack = [{ page: 'home', params: {} }], last = null;
try { const s = JSON.parse(sessionStorage.getItem('life-nav') || 'null'); if (Array.isArray(s) && s.length) stack = s; } catch {}
const keepNav = () => { try { sessionStorage.setItem('life-nav', JSON.stringify(stack)); } catch {} };

export function go(p, params = {}) {
  if (ROOTS.includes(p)) return tab(p);
  stack.at(-1).scroll = $('#view').scrollTop;
  stack.push({ page: p, params }); if (stack.length > 30) stack.splice(1, 1);
  try { history.pushState(null, ''); } catch {}
  render();
}
export function tab(p) { stack = [{ page: p, params: {} }]; render(); }
export function back() { if (stack.length > 1) stack.pop(); else stack = [{ page: 'home', params: {} }]; render(); }

export function render() {
  let cur = stack.at(-1), def = pages[cur.page];
  scope = 'v'; H.v.clear();
  let body = null;
  if (def) { try { body = def.render(cur.params); } catch (e) { console.error(e); body = `<div class="empty">This page broke: ${esc(e.message)}</div>`; } }
  if (body == null) { // target is gone (deleted, undone) → fall back
    if (stack.length > 1) { stack.pop(); return render(); }
    stack = [{ page: 'home', params: {} }]; return render();
  }
  const view = $('#view'), keep = last === cur ? view.scrollTop : (cur.scroll || 0);
  const p = D.player, need = xpForLevel(p.level), title = typeof def.title === 'function' ? def.title(cur.params) : def.title;
  $('#top').innerHTML = `${stack.length > 1 ? `<button class="back" ${on(back)}>←</button>` : '<span class="logo">LIFE</span>'}
    <h1>${esc(title || '')}</h1>
    <button class="lvl" ${on(() => go('totalstats'))}><b>LV ${p.level}</b><i><u style="width:${Math.min(100, p.xp / need * 100)}%"></u></i></button>`;
  view.innerHTML = body; view.scrollTop = keep; last = cur;
  const root = stack[0].page;
  document.querySelectorAll('#dock button').forEach(b => b.classList.toggle('active', b.dataset.tab === root));
  keepNav();
  def.after?.(view, cur.params);
}
export const rerender = () => { render(); if (modalFn && !modalStatic) drawModal(false); };
hooks.render = rerender;

// ── Modal (bottom sheet). Takes a builder so it can redraw itself after every commit.
let modalFn = null, modalStatic = false, formCtx = null;
export function modal(fn, opts = {}) { modalFn = fn; modalStatic = !!opts.static; formCtx = null; drawModal(true); }
function drawModal(first) {
  scope = 'm'; H.m.clear();
  let html = null; try { html = modalFn(); } catch (e) { console.error(e); }
  scope = 'v';
  if (html == null) return closeModal();
  const c = $('#modal-content'), st = c.scrollTop;
  c.innerHTML = html; c.scrollTop = first ? 0 : st;
  document.body.classList.add('modal-open');
}
export function closeModal() { modalFn = null; formCtx = null; H.m.clear(); document.body.classList.remove('modal-open'); }
export const modalOpen = () => !!modalFn;

// ── Forms: declare fields, get typed values back.
export function form({ title, sub, fields, submit = 'Lock it in', onSubmit, onDelete, del = 'Cut it' }) {
  modal(() => `<form class="form" novalidate><h2>${esc(title)}</h2>${sub ? `<p class="msub">${esc(sub)}</p>` : ''}
    ${fields.map(field).join('')}
    <div class="btns"><button type="submit" class="btn good">${esc(submit)}</button>
    ${onDelete ? `<button type="button" class="btn danger" ${on(() => { closeModal(); onDelete(); })}>${esc(del)}</button>` : ''}
    <button type="button" class="btn" ${on(closeModal)}>Never mind</button></div></form>`, { static: true });
  formCtx = { fields, onSubmit };
}
const opt = (o, v) => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? 'selected' : ''}>${esc(o[1])}</option>`;
const seg = (f, v, inner) => `<div class="seg ${f.type}">${f.options.map(o => `<label><input type="radio" name="${f.name}" value="${esc(o[0])}" ${String(o[0]) === String(v) ? 'checked' : ''}>${inner(o)}</label>`).join('')}</div>`;
function field(f) {
  const v = f.value ?? '', lab = f.label ? `<label class="fl">${esc(f.label)}</label>` : '', ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  switch (f.type) {
    case 'textarea': return `${lab}<textarea name="${f.name}" rows="${f.rows || 3}" ${ph}>${esc(v)}</textarea>`;
    case 'number': return `${lab}<input type="number" inputmode="decimal" name="${f.name}" value="${esc(v)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 'any'}" ${ph}>`;
    case 'range': return `${lab}<div class="rng"><input type="range" name="${f.name}" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${esc(v === '' ? f.min : v)}"><output>${esc(v === '' ? f.min : v)}</output><em>/ ${f.max}</em></div>`;
    case 'select': return `${lab}<select name="${f.name}">${f.options.map(o => (o.group ? `<optgroup label="${esc(o.group)}">${o.options.map(x => opt(x, v)).join('')}</optgroup>` : opt(o, v))).join('')}</select>`;
    case 'seg': return lab + seg(f, v, o => `<span>${esc(o[1])}</span>`);
    case 'tier': return lab + seg({ ...f, options: TIERS.map(t => [t, t]) }, v, o => `<span style="--c:${TIER_COLOR[o[0]]}">${o[0]}</span>`);
    case 'color': return lab + seg(f, v, o => `<span style="background:${esc(o[0])}"></span>`);
    case 'check': return `<label class="chk"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
    case 'fx': return `${lab}<div class="fxgrid">${STATS.filter(s => s.key !== 'vibe').map(s => `<label><span>${s.icon} ${s.label}</span><input type="number" step="1" data-fx="${s.key}" value="${esc(v[s.key] || '')}" placeholder="0"></label>`).join('')}</div>`;
    default: return `${lab}<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${ph} ${f.type === 'text' || !f.type ? 'autocomplete="off"' : ''}>`;
  }
}
function readForm(el, fields) {
  const v = {};
  for (const f of fields) {
    if (f.type === 'fx') { v[f.name] = {}; el.querySelectorAll('[data-fx]').forEach(i => { const n = Math.round(+i.value); if (n) v[f.name][i.dataset.fx] = n; }); continue; }
    if (['seg', 'tier', 'color'].includes(f.type)) { v[f.name] = el.querySelector(`[name="${f.name}"]:checked`)?.value ?? ''; continue; }
    const i = el.querySelector(`[name="${f.name}"]`);
    v[f.name] = f.type === 'check' ? i.checked : f.type === 'number' || f.type === 'range' ? (i.value === '' ? null : +i.value) : i.value.trim();
  }
  return v;
}

// ── Toast / undo / banner
export function toast(msg, undo) {
  const box = $('#toasts'), t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = `<span>${esc(msg)}</span>`;
  if (undo) { const b = document.createElement('button'); b.textContent = 'UNDO'; b.onclick = () => { t.remove(); undo(); }; t.append(b); }
  box.append(t); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.remove(), undo ? 7000 : 2800);
}
// Every destructive action goes through here: do it now, offer undo.
export function destroy(label, fn) {
  const snap = snapshot(); fn(); commit();
  toast(label, () => { replace(snap); toast('Brought back.'); });
}
export function banner(big, small) {
  const b = $('#banner'); b.innerHTML = `<div><b>${esc(big)}</b><span>${esc(small)}</span></div>`;
  b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 2500);
}

// ── Collapsibles (UI state, not save data)
export const isCol = id => !!ui.collapsed[id];
export const toggleCol = id => { if (ui.collapsed[id]) delete ui.collapsed[id]; else ui.collapsed[id] = 1; saveUi(); rerender(); };
export const setUi = (k, v) => { ui[k] = v; saveUi(); rerender(); };

// ── Components (callers escape user text)
export const sect = (title, btn, fn) => `<div class="sect"><span>${title}</span>${btn ? `<button class="sbtn" ${on(fn)}>${btn}</button>` : ''}</div>`;
export const bar = (pct, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct || 0))}%"></i></div>`;
export const row = ({ icon = '', title, desc = '', val = '', cls = '', fn }) => `<div class="row ${cls}" ${fn ? on(fn) : ''}>${icon !== '' ? `<div class="ric">${icon}</div>` : ''}<div class="rbody"><b>${title}</b>${desc ? `<small>${desc}</small>` : ''}</div>${val !== '' ? `<div class="rval">${val}</div>` : ''}${fn ? '<div class="rarr">→</div>' : ''}</div>`;
export const term = (title, rows) => `<div class="term">${title ? `<div class="tt">${title}</div>` : ''}${rows.map(([l, v, c = '']) => `<div class="trow"><span>${l}</span><b class="${c}">${v}</b></div>`).join('')}</div>`;
export const empty = t => `<div class="empty">${t}</div>`;
export const tierBadge = t => (t ? `<span class="tier" style="--c:${TIER_COLOR[t]}">${t}</span>` : '<span class="tier none">–</span>');
export const tabs = (items, active, fn) => `<div class="tabs">${items.map(([k, l]) => `<button class="${k === active ? 'active' : ''}" ${on(() => fn(k))}>${l}</button>`).join('')}</div>`;
export const btn = (label, fn, cls = '') => `<button type="button" class="btn ${cls}" ${on(fn)}>${label}</button>`;

// ── Global delegation
export function initUi() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-h]'); if (!el) return;
    const fn = find(el.dataset.h); if (fn) fn(el, e);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-c]'); if (!el) return;
    const fn = find(el.dataset.c); if (fn) fn(el.type === 'checkbox' ? el.checked : el.value, el);
  });
  document.addEventListener('input', e => { if (e.target.type === 'range' && e.target.nextElementSibling?.tagName === 'OUTPUT') e.target.nextElementSibling.textContent = e.target.value; });
  document.addEventListener('submit', e => {
    e.preventDefault(); if (!formCtx) return;
    const { fields, onSubmit } = formCtx, v = readForm(e.target, fields);
    for (const f of fields) if (f.required && (v[f.name] === '' || v[f.name] == null)) return toast(`${f.label || f.name} — you left it empty.`);
    if (onSubmit(v) === false) return;
    closeModal(); commit();
  });
  $('#modal-backdrop').addEventListener('click', closeModal);
  document.querySelectorAll('#dock button').forEach(b => b.addEventListener('click', () => { closeModal(); tab(b.dataset.tab); }));
  window.addEventListener('popstate', () => { if (modalFn) { closeModal(); try { history.pushState(null, ''); } catch {} } else if (stack.length > 1) back(); });
}
