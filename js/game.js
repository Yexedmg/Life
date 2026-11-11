// LIFE — game. Mutations and the integrity pass that runs on every commit.
import { D, hooks } from './store.js';
import { BLANK, CAP, DAYS, STAT } from './schema.js';
import { xpForLevel, clamp, scopes, resolveMove, findActivity, findLeadItem, roiForLevel, vibe } from './calc.js';
import { toast, banner } from './ui.js';

export function log(msg, tag = 'event') { D.log.unshift({ t: Date.now(), msg, tag }); if (D.log.length > 500) D.log.length = 500; }

export function addXP(amount, reason) {
  const p = D.player; p.xp += amount;
  log(`+${amount} XP — ${reason}`, 'xp');
  let up = false;
  while (p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; up = true; }
  if (up) { log(`LEVEL UP — now level ${p.level}`, 'meta'); banner('LEVEL UP', `LEVEL ${p.level}`); }
}
export function applyEffects(fx) {
  const s = D.player.stats;
  for (const [k, v] of Object.entries(fx || {})) {
    if (!STAT[k] || k === 'vibe') continue;
    s[k] = k === 'money' ? s[k] + v : clamp(Math.round((s[k] + v) * 10) / 10, 0, CAP);
  }
}
export const fxText = fx => Object.entries(fx || {}).filter(([k, v]) => v && STAT[k]).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT[k].icon}`).join('  ');

export function doActivity(item) {
  applyEffects(item.statEffects);
  log(`Did: ${item.name}${fxText(item.statEffects) ? '  ' + fxText(item.statEffects) : ''}`, 'activity');
  addXP(item.xp || 5, item.name);
  toast(`${item.name} — done. +${item.xp || 5} XP`);
}

// ── Generic slot engine: activities, lead methods and Entity components all run on this.
export function slotItem(c, id, idx) {
  const at = c.slots.indexOf(id); if (at >= 0) c.slots[at] = null;
  if (idx == null) idx = c.slots.indexOf(null);
  if (idx < 0) { toast('No free slot. Take something off first.'); return false; }
  c.slots[idx] = id; return true;
}
export function unslot(c, id) { const at = c.slots.indexOf(id); if (at >= 0) c.slots[at] = null; }
export function setMaxSlots(c, n) {
  c.maxSlots = clamp(n, 1, 10);
  c.slots = c.slots.slice(0, c.maxSlots); while (c.slots.length < c.maxSlots) c.slots.push(null);
}
export function removeItem(c, id) { unslot(c, id); c.inventory = c.inventory.filter(i => i.id !== id); }

// ── Rated element (body-map stat / platform): history is append-only, and only on real change.
export function setLevel(el, to) {
  to = clamp(Math.round(to), 0, CAP);
  if (to === el.level) return;
  el.history.push({ t: Date.now(), from: el.level, to });
  log(`${el.title}: ${el.level} → ${to} / ${CAP}`, 'upgrade');
  el.level = to;
}

// ── Relationships: girl.status is the truth; D.relationships is derived in integrity().
export function setStatus(g, status) {
  if (status === 'TheOne') for (const o of D.girls) if (o.status === 'TheOne' && o !== g) o.status = 'Sidelined';
  g.status = status;
}

// ── Integrity: one place that repairs every reference and re-derives every mirror.
function cleanSlots(c) {
  const seen = new Set();
  c.slots = c.slots.slice(0, c.maxSlots).map(id => (id && !seen.has(id) && c.inventory.some(i => i.id === id) ? (seen.add(id), id) : null));
  while (c.slots.length < c.maxSlots) c.slots.push(null);
}
function syncLifestyleLeads(s) { // activity.leadgen → mirrored item in the "Lifestyle" method
  const src = s.activityCategories.flatMap(c => c.inventory.filter(i => i.leadgen));
  let m = s.leadgen.methods.find(x => x.id === 'lm-lifestyle');
  if (!m) { if (!src.length) return; m = BLANK.method('lm-lifestyle', 'Lifestyle', '◈', 2, 15); s.leadgen.methods.push(m); }
  m.inventory = m.inventory.filter(li => !li.sourceActivityId || src.some(a => a.id === li.sourceActivityId));
  for (const a of src) {
    const li = m.inventory.find(x => x.sourceActivityId === a.id);
    if (li) li.name = a.name;
    else m.inventory.push({ ...BLANK.leadItem(), id: 'li-mirror-' + a.id, name: a.name, difficulty: 'medium', roi: 'medium', sourceActivityId: a.id });
  }
}
function syncOnlinePresence() { // platform level → ROI of its mirrored item in "Online Presence"
  let m = D.leadgen.methods.find(x => x.id === 'lm-online');
  if (!m) { if (!D.socialMedia.length) return; m = BLANK.method('lm-online', 'Online Presence', '⌘', 2, 10); D.leadgen.methods.push(m); }
  m.inventory = m.inventory.filter(li => !li.sourcePlatformId || D.socialMedia.some(p => p.id === li.sourcePlatformId));
  for (const p of D.socialMedia) {
    const li = m.inventory.find(x => x.sourcePlatformId === p.id);
    if (li) { li.name = p.title; li.roi = roiForLevel(p.level); }
    else m.inventory.push({ ...BLANK.leadItem(), id: 'sm-mirror-' + p.id, name: p.title, difficulty: 'medium', roi: roiForLevel(p.level), sourcePlatformId: p.id });
  }
}
export function integrity() {
  const W = D.world, boroughs = W.cities.flatMap(c => c.boroughs);
  if (!boroughs.some(b => b.id === W.mainBoroughId)) W.mainBoroughId = boroughs[0]?.id || null;
  if (!boroughs.some(b => b.id === W.currentBoroughId)) W.currentBoroughId = W.mainBoroughId;
  W.currentCityId = W.cities.find(c => c.boroughs.some(b => b.id === W.currentBoroughId))?.id || W.cities[0]?.id || '';

  let one = null;
  for (const g of D.girls) if (g.status === 'TheOne') { if (one) g.status = 'Sidelined'; else one = g.id; }
  D.relationships = { theOne: one, commons: D.girls.filter(g => g.status === 'Common').map(g => g.id), sidelined: D.girls.filter(g => g.status === 'Sidelined').map(g => g.id) };

  for (const s of scopes()) syncLifestyleLeads(s);
  syncOnlinePresence();
  for (const s of scopes()) {
    for (const c of s.activityCategories) { cleanSlots(c); if (c.sectionId && !s.activitySections.some(x => x.id === c.sectionId)) c.sectionId = null; }
    for (const m of s.leadgen.methods) cleanSlots(m);
  }
  for (const c of D.vibeComponents) cleanSlots(c);

  const fixWeek = w => { for (const d of DAYS) for (const e of w[d]) {
    if (e.activityItemId && !findActivity(e.activityItemId)) { e.activityItemId = null; e.catId = null; }
    if (e.levelUpRef && !resolveMove(e.levelUpRef)) delete e.levelUpRef;
  } };
  fixWeek(D.schedule);
  for (const l of D.lifestyles) { fixWeek(l.schedule); l.activities = l.activities.filter(a => findActivity(a.activityItemId)); }
  if (!D.timeAllocs.length) D.timeAllocs.push(BLANK.timeAlloc());
  if (!D.timeAllocs.some(t => t.id === D.currentTimeAllocId)) D.currentTimeAllocId = D.timeAllocs[0].id;
  for (const t of D.timeAllocs) for (const s of t.slots) if (s.levelUpRef && !resolveMove(s.levelUpRef)) delete s.levelUpRef;
  for (const a of D.abilities) a.assignments = a.assignments.filter(x => (x.type === 'activity' ? findActivity(x.itemId) : findLeadItem(x.itemId)));
  if (!D.lifestyles.some(l => l.id === D.activeLifestyleId)) D.activeLifestyleId = null;
  for (const m of D.nextMoves) if (m.city && !W.cities.some(c => c.id === m.city)) m.city = null;

  D.player.stats.vibe = Math.round(clamp(vibe(), 0, CAP)); // derived. never set anywhere else.
}
hooks.integrity = integrity;
