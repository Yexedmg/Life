// RIGHT NOW — three things to do right now, side by side at the top of Home.
// You fill each slot: the next step of a quest or experience, or something in your own words.
// Done ticks the linked step too, and frees the slot.
import { D, commit } from './store.js';
import { PILLARS } from './schema.js';
import { on, esc, form, modal, closeModal, toast, btn, go } from './ui.js';
import { tasksOf } from './calc.js';
import { isReady } from './reqs.js';
import { toggleTask } from './pages/plan.js';

// What a slot points at, if that still exists: { owner, item, color, open }
function target(s) {
  if (s.kind === 'quest') { const m = D.manifests.find(x => x.id === s.id), t = m && tasksOf(m).find(x => x.id === s.ref);
    return t && { owner: m, item: t, done: t.done, color: PILLARS.find(p => p.key === m.pillar)?.color, open: () => go('quest', { id: m.id }) }; }
  if (s.kind === 'exp') { const a = D.adventures.find(x => x.id === s.id), t = a && a.steps.find(x => x.id === s.ref);
    return t && { owner: a, item: t, done: t.done, color: PILLARS.find(p => p.key === a.pillar)?.color, open: () => go('experience', { id: a.id }) }; }
  return null;
}
const taken = () => new Set(D.rightNow.filter(Boolean).map(s => s.ref).filter(Boolean));

// The next undone step of every open quest and experience that is ready (nothing still required).
function options() {
  const used = taken(), out = [];
  for (const m of D.manifests) if (!m.achievedAt && isReady(m)) { const t = tasksOf(m).find(x => !x.done); if (t && !used.has(t.id)) out.push({ text: t.name, kind: 'quest', id: m.id, ref: t.id, from: `${m.emoji} ${m.name}`, pillar: m.pillar }); }
  for (const a of D.adventures) if (!a.doneAt && isReady(a)) { const t = a.steps.find(x => !x.done); if (t && !used.has(t.id)) out.push({ text: t.text, kind: 'exp', id: a.id, ref: t.id, from: `✧ ${a.name}`, pillar: a.pillar }); }
  return out;
}
const put = (i, s) => { D.rightNow[i] = s; closeModal(); commit(); };
const ownForm = (i, cur) => form({ title: 'Right now', sub: 'One thing. Small enough to start now.', fields: [{ name: 'text', label: 'What is it?', value: cur?.kind === 'own' ? cur.text : '', required: true, placeholder: 'Text Daan about Saturday' }],
  submit: 'Put it in', onSubmit: v => { D.rightNow[i] = { text: v.text, kind: 'own', id: '', ref: '' }; } });

function pick(i) {
  const opts = options();
  modal(() => `<h2>Right now</h2><p class="msub">Pick the next step of a quest or experience, or write your own.</p>
    ${opts.map((o, n) => { const c = PILLARS.find(p => p.key === o.pillar)?.color;
      return `<div class="row" ${c ? `style="border-left:4px solid ${c}"` : ''} ${on(() => put(i, { text: o.text, kind: o.kind, id: o.id, ref: o.ref }))}><div class="rbody"><b>${esc(o.text)}</b><small>${esc(o.from)}</small></div></div>`; }).join('')
      || '<p class="hint">No ready quest or experience has a next step left. Write your own.</p>'}
    <div class="btns">${btn('+ My own', () => ownForm(i), 'good')}${btn('Never mind', closeModal)}</div>`);
}

function done(i) {
  const s = D.rightNow[i], t = target(s), was = t ? t.item.done : false, ach = t && s.kind === 'quest' ? t.owner.achievedAt : null;
  if (t && !t.done) { if (s.kind === 'quest') toggleTask(t.owner, t.item); else t.item.done = true; }
  D.rightNow[i] = null; closeModal(); commit();
  toast(`Done: ${s.text}`, () => { D.rightNow[i] = s; if (t && !was) { t.item.done = false; if (s.kind === 'quest') t.owner.achievedAt = ach; } commit(); });
}

function slotSheet(i) {
  const s = D.rightNow[i], t = target(s);
  modal(() => `<h2>${esc(s.text)}</h2>${t ? `<p class="msub">${esc(s.kind === 'quest' ? `${t.owner.emoji} ${t.owner.name}` : `✧ ${t.owner.name}`)}</p>` : ''}
    <div class="btns">${btn('✓ Done', () => done(i), 'good')}</div>
    <div class="btns">${t ? btn(s.kind === 'quest' ? 'Open the quest' : 'Open the experience', () => { closeModal(); t.open(); }) : ''}${btn('Change', () => (s.kind === 'own' && !t ? ownForm(i, s) : pick(i)))}</div>
    <div class="btns">${btn('Take it out', () => put(i, null))}${btn('Close', closeModal)}</div>`);
}

export function rightNow() {
  const cell = (s, i) => {
    if (!s) return `<div class="rn empty" ${on(() => pick(i))}><i>+</i></div>`;
    const t = target(s), kind = s.kind === 'quest' && t ? 'QUEST' : s.kind === 'exp' && t ? 'EXPERIENCE' : 'MINE';
    return `<div class="rn ${t?.done ? 'done' : ''}" style="--c:${t?.color || 'var(--line)'}" ${on(() => slotSheet(i))}><small>${kind}</small><b>${esc(s.text)}</b></div>`;
  };
  return `<div class="sect"><span>RIGHT NOW</span></div><div class="rnrow">${D.rightNow.map(cell).join('')}</div>`;
}
