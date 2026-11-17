// INSPIRATION — a great day you lived (a holiday…), told as moments, and the pieces of it
// you bring into normal life: as an experience, a thing to do at a place, an ideal-day block, or a principle.
import { D, commit } from '../store.js';
import { BLANK, SLOT_COLORS, uid } from '../schema.js';
import { page, go, on, onChange, esc, form, modal, closeModal, destroy, toast, sect, empty, btn, shrinkImage, setPicture } from '../ui.js';
import { fmtDate, dts, findMapPlace } from '../calc.js';
import { principlesSheet } from './home.js';

const getInspo = id => D.inspirations.find(x => x.id === id) || null;

// Where a used moment went, if that thing still exists.
function useTarget(u) {
  if (u.kind === 'experience') { const a = D.adventures.find(x => x.id === u.ref); return a && { label: 'Experience', open: () => go('experience', { id: a.id }) }; }
  if (u.kind === 'place') { const f = findMapPlace(u.ref); return f && f.place.todo.some(t => t.id === u.todo) && { label: f.place.name, open: () => go('map', { id: f.map.id }) }; }
  if (u.kind === 'ideal') { for (const t of D.timeAllocs) if (t.slots.some(s => s.id === u.ref)) return { label: 'Ideal day', open: () => { D.currentTimeAllocId = t.id; go('future'); } }; return null; }
  if (u.kind === 'principle') return D.principles.some(p => p.id === u.ref) && { label: 'Principle', open: principlesSheet };
  return null;
}

function inspoForm(x) {
  form({ title: x ? `Edit ${x.title}` : 'New inspiration', sub: x ? '' : 'A day worth learning from. Tell it, then pull pieces of it into normal life.',
    fields: [{ name: 'title', label: 'What was it?', value: x?.title, required: true, placeholder: 'Holiday, Spain' }, { name: 'date', label: 'When? (optional)', type: 'date', value: x?.date || '' },
      { name: 'description', label: 'What happened', type: 'textarea', rows: 5, value: x?.description, placeholder: 'We went out eating, got invited back to his place…' },
      { name: 'good', label: 'What made it good', type: 'textarea', rows: 2, value: x?.good, placeholder: 'Saying yes. Generous hosts. More than one thing in a day.' }],
    submit: x ? 'Save' : 'Add it',
    onSubmit: v => { if (x) Object.assign(x, v); else { const n = { ...BLANK.inspiration(), ...v }; D.inspirations.push(n); setTimeout(() => go('inspo', { id: n.id })); } },
    onDelete: x ? () => { destroy(`${x.title} — deleted.`, () => { D.inspirations = D.inspirations.filter(y => y !== x); }); go('inspiration'); } : null, del: 'Delete' });
}
function momentForm(x, m) {
  form({ title: m ? 'Edit moment' : 'New moment', fields: [{ name: 'text', label: 'What happened', value: m?.text, required: true, placeholder: 'Golf the next morning' }],
    submit: 'Save', onSubmit: v => { if (m) m.text = v.text; else x.moments.push({ id: uid(), text: v.text, uses: [] }); },
    onDelete: m ? () => destroy('Moment removed.', () => { x.moments = x.moments.filter(y => y !== m); }) : null, del: 'Remove' });
}
const moveMoment = (x, i, d) => { const j = i + d; if (j < 0 || j >= x.moments.length) return; [x.moments[i], x.moments[j]] = [x.moments[j], x.moments[i]]; commit(); };

// Use it: bring a moment into normal life.
function useIt(x, m) {
  const done = (u, msg) => { m.uses.push(u); closeModal(); commit(); toast(msg); };
  const places = D.maps.flatMap(mp => mp.places.map(p => ({ group: mp.name, id: p.id, name: p.name })));
  modal(() => `<h2>Use it</h2><p class="msub">“${esc(m.text)}” — bring it into normal life as…</p>
    <div class="row" ${on(() => { const a = { ...BLANK.adventure(), name: m.text }; D.adventures.push(a); done({ kind: 'experience', ref: a.id }, 'Added to Experiences.'); })}><div class="ric">✧</div><div class="rbody"><b>An experience</b><small>Something to live, with steps and a date</small></div></div>
    <div class="row" ${on(() => {
      if (!places.length) return toast('Make a map with a place first (Menu → World → Maps).');
      form({ title: 'A thing to do at a place', fields: [{ name: 'place', label: 'Where?', type: 'select', value: places[0].id, options: D.maps.filter(mp => mp.places.length).map(mp => ({ group: mp.name, options: mp.places.map(p => [p.id, p.name]) })) },
        { name: 'text', label: 'Thing to do', value: m.text, required: true }],
        submit: 'Add', onSubmit: v => { const f = findMapPlace(v.place); if (!f) return false; const t = { id: uid(), text: v.text }; f.place.todo.push(t); m.uses.push({ kind: 'place', ref: f.place.id, todo: t.id }); toast(`Added to ${f.place.name}.`); } });
    })}><div class="ric">⌖</div><div class="rbody"><b>A thing to do at a place</b><small>On one of your maps</small></div></div>
    <div class="row" ${on(() => {
      const ta = D.timeAllocs.find(t => t.id === D.currentTimeAllocId) || D.timeAllocs[0];
      form({ title: `Part of your ideal day — ${ta.name}`, fields: [{ name: 'title', label: 'Block', value: m.text, required: true }, { name: 'start', label: 'From', type: 'time', required: true }, { name: 'end', label: 'Until', type: 'time', required: true }],
        submit: 'Add', onSubmit: v => { if (v.end <= v.start) { toast('It has to end after it starts.'); return false; } const s = { ...BLANK.timeSlot(), title: v.title, start: v.start, end: v.end, color: SLOT_COLORS[ta.slots.length % SLOT_COLORS.length] }; ta.slots.push(s); m.uses.push({ kind: 'ideal', ref: s.id }); toast('Added to your ideal day.'); } });
    })}><div class="ric">➜</div><div class="rbody"><b>Part of your ideal day</b><small>A block with a time</small></div></div>
    <div class="row" ${on(() => {
      form({ title: 'A principle', sub: 'What does this moment teach you?', fields: [{ name: 'text', label: 'Principle', type: 'textarea', rows: 2, value: m.text, required: true }],
        submit: 'Add', onSubmit: v => { const p = { id: uid(), text: v.text }; D.principles.push(p); m.uses.push({ kind: 'principle', ref: p.id }); toast('Added to your Principles.'); } });
    })}><div class="ric">❖</div><div class="rbody"><b>A principle</b><small>A line you live by</small></div></div>
    <div class="btns">${btn('Never mind', closeModal)}</div>`);
}

page('inspiration', {
  title: 'INSPIRATION',
  render() {
    const list = [...D.inspirations].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
    return `<div class="card hero sh-gold"><small>✦ INSPIRATION — great days, brought home</small><p>Keep a day you loved, moment by moment, and pull pieces of it into your normal life.</p></div>
    <div class="btns">${btn('+ Inspiration', () => inspoForm(), 'good')}</div>
    ${list.map(x => { const used = x.moments.filter(m => m.uses.some(useTarget)).length;
      return `<div class="row" ${on(() => go('inspo', { id: x.id }))}><div class="rbody"><b>${esc(x.title)}</b><small>${[x.date ? fmtDate(dts(x.date)) : '', `${x.moments.length} moment${x.moments.length === 1 ? '' : 's'}`, used ? `${used} used` : '', x.img ? '▣ photo' : ''].filter(Boolean).join(' · ')}</small></div><div class="rarr">→</div></div>`; }).join('')
      || empty('Nothing yet. Think of a day you loved — a holiday, a night out — and write it down.')}`;
  },
});

page('inspo', {
  title: p => (getInspo(p.id)?.title || 'Inspiration').toUpperCase(),
  render({ id }) {
    const x = getInspo(id); if (!x) return null;
    const photo = `<label class="btn">${x.img ? 'Change photo' : '+ Photo'}<input type="file" accept="image/*" hidden ${onChange((_, el) => shrinkImage(el.files[0], 800, 0.75).then(d => setPicture(x, 'img', d), msg => toast(msg)))}></label>${x.img ? btn('Remove photo', () => destroy('Photo removed.', () => { x.img = ''; })) : ''}`;
    return `${x.img ? `<img class="exphero" src="${x.img}" alt="">` : ''}
    <div class="card sh-gold"><small>✦ INSPIRATION${x.date ? ' · ' + fmtDate(dts(x.date)) : ''}</small><h2>${esc(x.title)}</h2>${x.description ? `<p class="lesson">${esc(x.description)}</p>` : ''}</div>
    <div class="sect"><span>MOMENTS</span><button class="sbtn" ${on(() => momentForm(x))}>+ Moment</button></div>
    ${x.moments.map((m, i) => { const used = m.uses.map(u => [u, useTarget(u)]).filter(([, t]) => t);
      return `<div class="moment"><div class="mtop"><i class="sn">${i + 1}</i><span ${on(() => momentForm(x, m))}>${esc(m.text)}</span>
        <button class="x mv" ${i ? '' : 'disabled'} ${on(() => moveMoment(x, i, -1))} aria-label="Move up">↑</button><button class="x mv" ${i < x.moments.length - 1 ? '' : 'disabled'} ${on(() => moveMoment(x, i, 1))} aria-label="Move down">↓</button></div>
        <div class="mbot">${used.map(([, t]) => `<em class="usedtag" ${on(t.open)}>USED · ${esc(t.label)} →</em>`).join('')}<button class="sbtn ghost" ${on(() => useIt(x, m))}>Use it</button></div></div>`; }).join('')
      || empty('No moments yet. Break the day into what happened, in order.')}
    <div class="panel"><div class="pt">WHAT MADE IT GOOD</div>${x.good ? `<p class="lesson" ${on(() => inspoForm(x))}>${esc(x.good)}</p>` : `<p ${on(() => inspoForm(x))}>Nothing written yet. Tap to write it.</p>`}</div>
    <div class="btns">${photo}${btn('Edit', () => inspoForm(x))}</div>`;
  },
});
