// Planning: Manifest, Eras + Calendar, Abilities, World map + Next Moves.
import { D, commit, ui } from '../store.js';
import { BLANK, ERA_COLORS, CAP, PILLARS, DAYS } from '../schema.js';
import { page, go, on, onChange, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, isCol, toggleCol, setUi, tabs, shrinkImage, setPicture } from '../ui.js';
import { findMapPlace, todayKey, waitingExp, birthday, eraStatus, dts, daysTo, fmtDate, tasksOf, progress, MONTHS, iso, today0, scopes, findActivity, findLeadItem, curBorough, sum } from '../calc.js';
import { addXP, applyEffects, log, fxText, gain } from '../game.js';
import { birthdayForm } from './home.js';
import { storyBlock, storyNow } from '../story.js';
import { reqPanel, lockTag } from '../reqs.js';

// ── Manifest
// pillar: preset the life factor when the quest is started from that factor; after: runs once it is saved.
export function goalForm(m, pillar = '', after) {
  form({ title: m ? 'Edit quest' : 'New quest', sub: "Set a goal, detach, and do your best on what's required.",
    fields: [{ name: 'name', label: 'What do you want?', value: m?.name, required: true }, { name: 'emoji', label: 'Tag', value: m?.emoji || '◎' },
      { name: 'pillar', label: 'Which part of life is it for?', type: 'seg', value: m ? m.pillar : pillar, options: [['', 'None'], ...PILLARS.map(p => [p.key, p.short])] }],
    submit: m ? 'Lock it in' : 'Call it',
    onSubmit: v => { if (m) Object.assign(m, v); else D.manifests.push({ ...BLANK.manifest(), ...v }); if (after) setTimeout(after); },
    onDelete: m ? () => destroy(`"${m.name}" — dropped.`, () => { D.manifests = D.manifests.filter(x => x !== m); }) : null, del: 'Drop it' });
}
const nameForm = (title, label, obj, list, blank, after) => form({ title, fields: [{ name: 'name', label, value: obj?.name, required: true }],
  onSubmit: v => { if (obj) obj.name = v.name; else list.push({ ...blank(), name: v.name }); after?.(); },
  onDelete: obj ? () => destroy(`"${obj.name}" — cut.`, () => { list.splice(list.indexOf(obj), 1); }) : null });
function toggleTask(m, t) {
  t.done = !t.done;
  const all = tasksOf(m);
  if (all.length && all.every(x => x.done) && !m.achievedAt) { m.achievedAt = Date.now(); log(`🎯 Goal "${m.name}" ACHIEVED!`, 'manifest'); addXP(50, `goal: ${m.name}`); toast(`🎯 Goal "${m.name}" ACHIEVED!`); }
  commit();
}
page('manifest', {
  title: 'MANIFEST',
  render() {
    const goal = m => { const all = tasksOf(m), pr = progress(all), closed = isCol(m.id);
      const col = PILLARS.find(p => p.key === m.pillar);
      return `<div class="card ${m.achievedAt ? 'sh-green' : ''}" ${col ? `style="border-left:4px solid ${col.color}"` : ''}><div class="cathead" ${on(() => toggleCol(m.id))}><b>${esc(m.emoji)} ${esc(m.name)} ${m.achievedAt ? '' : lockTag(m)}</b><span>${Math.round(pr)}%</span><i>${closed ? '▸' : '▾'}</i></div>${bar(pr, 'green')}
      ${m.achievedAt ? `<div class="split dim"><span>🎯 ACHIEVED</span><span>${fmtDate(m.achievedAt)}</span></div>` : ''}
      ${closed ? (storyNow(m.story) ? `<p class="qdesc">${esc(storyNow(m.story))}</p>` : '') : `${storyBlock(m.story, m.id, m.name)}${m.achievedAt ? '' : reqPanel(m)}${m.milestones.map(ms => { const mp = progress(ms.tasks), mc = isCol(ms.id), done = ms.tasks.length && mp === 100;
        return `<div class="ms"><div class="mshead"><span ${on(() => toggleCol(ms.id))}>${mc ? '▸' : '▾'} ${done ? '✓ ' : ''}${esc(ms.name)}</span><em>${ms.tasks.filter(t => t.done).length}/${ms.tasks.length}</em>
          <button class="sbtn ghost" ${on(() => nameForm('Edit milestone', 'Milestone', ms, m.milestones, BLANK.milestone))}>✎</button><button class="sbtn" ${on(() => nameForm('New task', "What's required?", null, ms.tasks, BLANK.task, () => { m.achievedAt = null; }))}>+ Task</button></div>
          ${mc ? '' : ms.tasks.map(t => `<div class="task ${t.done ? 'done' : ''}"><button ${on(() => toggleTask(m, t))}>${t.done ? '■' : '□'}</button><span ${on(() => toggleTask(m, t))}>${esc(t.name)}</span><button class="x" ${on(() => nameForm('Edit task', 'Task', t, ms.tasks, BLANK.task))}>✎</button></div>`).join('') || '<p class="hint">No tasks. What does this milestone actually require?</p>'}</div>`; }).join('')}
        <div class="catfoot"><button class="sbtn ghost" ${on(() => goalForm(m))}>✎ Goal</button><button class="sbtn" ${on(() => nameForm('New milestone', 'A checkpoint on the way', null, m.milestones, BLANK.milestone))}>+ Milestone</button></div>`}</div>`; };
    const open = D.manifests.filter(m => !m.achievedAt), done = D.manifests.filter(m => m.achievedAt);
    return `<div class="card hero"><small>◎ SIDE QUESTS</small><p>Set a goal, detach, and do your best on what's required.</p></div>
    ${sect('INFORMATION')}<textarea class="info" rows="3" placeholder="Rules and notes that apply across every goal." ${onChange(v => { D.manifestInfo = v; commit(); })}>${esc(D.manifestInfo)}</textarea>
    ${sect(`QUESTS · ${open.length}`, '+ Quest', () => goalForm())}
    ${[...PILLARS, { key: '', label: 'No factor', color: 'var(--muted)' }].map(p => { const g = open.filter(m => (m.pillar || '') === p.key);
      return g.length ? `<div class="fgroup" style="color:${p.color}">${esc(p.label.toUpperCase())} · ${g.length}</div>${g.map(goal).join('')}` : ''; }).join('') || empty('No quests. What do you want? Call it.')}
    ${done.length ? sect(`ACHIEVED · ${done.length}`) + done.map(goal).join('') : ''}`;
  },
});

// ── Experiences (stored as `adventures`): things you want to live, not tasks to finish
function adventureForm(a) {
  form({ title: a ? `Edit ${a.name}` : 'New experience', sub: 'Something you want to experience. Put it here so it stops being a maybe.',
    fields: [{ name: 'name', label: 'What do you want to live?', value: a?.name, required: true, placeholder: 'Christmas market' },
      { name: 'when', label: 'When? (optional)', type: 'date', value: a?.when || '' }, { name: 'withWho', label: 'With who? (optional)', value: a?.withWho },
      { name: 'placeId', label: 'Where? (optional)', type: 'select', value: a?.placeId || '', options: [['', '— Nowhere in particular —'], ...D.maps.filter(m => m.places.length).map(m => ({ group: m.name, options: m.places.map(x => [x.id, x.name]) }))] },
      { name: 'pillar', label: 'Which part of life does it feed?', type: 'seg', value: a?.pillar || '', options: [['', 'None'], ...PILLARS.map(p => [p.key, p.short])] },
      { name: 'notes', label: 'Notes', type: 'textarea', value: a?.notes },
      { name: 'regret', label: 'This is a regret — something I missed out on', type: 'check', value: a?.regret },
      { name: 'lesson', label: "What I'd do differently", type: 'textarea', rows: 2, value: a?.lesson, showIf: 'regret' }],
    submit: a ? 'Lock it in' : 'Put it on the list',
    onSubmit: v => { if (a) Object.assign(a, v); else D.adventures.push({ ...BLANK.adventure(), ...v }); },
    onDelete: a ? () => destroy(`"${a.name}" — dropped.`, () => { D.adventures = D.adventures.filter(x => x !== a); }) : null, del: 'Drop it' });
}
const addPhoto = (a, file) => shrinkImage(file, 800, 0.75).then(data => setPicture(a, 'img', data), msg => toast(msg));
const photoBtnsBig = a => `<label class="btn">${a.img ? 'Change photo' : '+ Photo'}<input type="file" accept="image/*" hidden ${onChange((_, el) => addPhoto(a, el.files[0]))}></label>${a.img ? btn('Remove photo', () => destroy('Photo removed.', () => { a.img = ''; })) : ''}`;
function liveIt(a) {
  a.doneAt = Date.now();
  if (a.pillar && a.pillar !== 'money') gain(a.pillar, 1, a.name);
  log(`Lived it: ${a.name}`, 'manifest'); addXP(15, a.name); commit(); toast(`${a.name} — lived. +15 XP`);
}
const stepsOf = a => (a.steps.length ? `${a.steps.filter(t => t.done).length}/${a.steps.length} steps` : '');
const whenText = a => { if (!a.when) return 'no date yet'; const d = daysTo(a.when); return `${fmtDate(dts(a.when))} · ${d < 0 ? -d + 'd ago' : d === 0 ? 'today' : 'in ' + d + 'd'}`; };
page('adventures', {
  title: 'EXPERIENCES',
  render() {
    const gone = D.adventures.filter(a => !a.doneAt && a.regret && a.regretState === 'gone');
    const open = waitingExp().sort((a, b) => (a.when || '9999').localeCompare(b.when || '9999')), done = D.adventures.filter(a => a.doneAt).sort((a, b) => b.doneAt - a.doneAt);
    const meta = a => { const col = PILLARS.find(p => p.key === a.pillar);
      return [whenText(a), a.withWho ? 'with ' + esc(a.withWho) : '', col ? `<span style="color:${col.color}">${col.short}</span>` : '', stepsOf(a)].filter(Boolean).join(' · '); };
    const tag = a => (a.regret ? `<em class="rtag">REGRET${a.doneAt ? ' · redeemed' : a.regretState ? '' : ' · undecided'}</em>` : '') + (a.doneAt ? '' : lockTag(a));
    const regrets = D.adventures.filter(a => a.regret), rtab = ui.expTab === 'regrets';
    const rrow = (a, cls = '') => `<div class="row ${cls}" ${on(() => go('experience', { id: a.id }))}><div class="rbody"><b>${esc(a.name)}</b>${a.lesson ? `<small>${esc(a.lesson)}</small>` : `<small>${a.doneAt ? 'lived ' + fmtDate(a.doneAt) : whenText(a)}</small>`}</div><div class="rarr">→</div></div>`;
    const rgroup = (title, list, cls) => (list.length ? sect(`${title} · ${list.length}`) + list.map(a => rrow(a, cls)).join('') : '');
    return `<div class="card hero sh-gold"><small>✧ EXPERIENCES — things you want to live</small><div class="count"><b>${open.length}</b><span>waiting<br>${done.length} lived</span></div></div>
    <div class="btns">${btn('+ Experience', () => adventureForm(), 'good')}${btn(`✦ Inspiration${D.inspirations.length ? ' · ' + D.inspirations.length : ''}`, () => go('inspiration'))}</div>
    ${tabs([['all', 'All'], ['regrets', `Regrets${regrets.length ? ' · ' + regrets.length : ''}`]], rtab ? 'regrets' : 'all', k => setUi('expTab', k))}
    ${rtab ? `${rgroup('UNDECIDED', regrets.filter(a => !a.doneAt && !a.regretState))}${rgroup('STILL POSSIBLE', regrets.filter(a => !a.doneAt && a.regretState === 'possible'))}${rgroup('REDEEMED', regrets.filter(a => a.doneAt))}${rgroup('GONE', regrets.filter(a => !a.doneAt && a.regretState === 'gone'), 'gone')}
    ${regrets.length ? '' : empty('No regrets written down. Missed out on something? Add it as an experience and switch on “This is a regret”.')}` : `
    ${open.map(a => `<div class="row" ${on(() => go('experience', { id: a.id }))}><div class="rbody"><b>${esc(a.name)} ${tag(a)}</b><small>${meta(a)}</small>${a.steps.length ? bar(a.steps.filter(t => t.done).length / a.steps.length * 100, 'green') : ''}</div><div class="rarr">→</div></div>`).join('') || empty('Nothing on the list. What do you want to experience? A Christmas market, a trip, a night you will remember.')}
    ${done.length ? sect(`LIVED · ${done.length}`) + done.map(a => `<div class="row" ${on(() => go('experience', { id: a.id }))}><div class="ric">✓</div><div class="rbody"><b>${esc(a.name)} ${tag(a)}</b><small>${fmtDate(a.doneAt)}${a.withWho ? ' · with ' + esc(a.withWho) : ''}</small></div><div class="rarr">→</div></div>`).join('') : ''}
    ${gone.length ? sect(`REGRETS · GONE · ${gone.length}`) + gone.map(a => `<div class="row gone" ${on(() => go('experience', { id: a.id }))}><div class="rbody"><b>${esc(a.name)}</b>${a.lesson ? `<small>${esc(a.lesson)}</small>` : ''}</div><div class="rarr">→</div></div>`).join('') : ''}
    `}`;
  },
});

// One experience: its photo, and the steps it takes to get there.
// Step → week: a step becomes a slot in Plan, with the experience's category and place, so it shows up when it's time.
const DAYN = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const stepSlot = t => t.slot && D.schedule[t.slot.day]?.find(e => e.id === t.slot.id);
const slotTag = t => { const e = stepSlot(t); return e ? `<em class="wktag" ${on((_, ev) => { ev.stopPropagation(); setUi('day-main', t.slot.day); go('schedule'); })}>${DAYN[t.slot.day]} ${esc(e.time.split(/[–-]/)[0])}</em>` : ''; };
function stepToWeek(a, t) {
  const e = stepSlot(t), r = e && e.time.split(/[–-]/);
  form({ title: e ? 'Move in your week' : 'Put in my week', sub: `“${t.text}” becomes a slot in Plan${findMapPlace(a.placeId) ? ' at ' + findMapPlace(a.placeId).place.name : ''}.`,
    fields: [{ name: 'day', label: 'Which day?', type: 'seg', value: t.slot?.day || todayKey(), options: DAYS.map(d => [d, DAYN[d]]) },
      { name: 'from', label: 'From', type: 'time', value: r?.[0] || '', required: true }, { name: 'to', label: 'Until', type: 'time', value: r?.[1] || '', required: true }],
    submit: e ? 'Move it' : 'Put it in', onSubmit: v => {
      if (!v.day) { toast('Pick a day.'); return false; } if (v.from === v.to) { toast('From and until — not the same.'); return false; }
      if (e) D.schedule[t.slot.day] = D.schedule[t.slot.day].filter(x => x !== e);
      const n = { ...BLANK.entry(), time: `${v.from}–${v.to}`, name: t.text, pillar: a.pillar || '', placeId: a.placeId || '' };
      D.schedule[v.day].push(n); t.slot = { day: v.day, id: n.id }; toast(`In your week: ${DAYN[v.day]} ${v.from}.`);
    },
    onDelete: e ? () => destroy('Taken out of your week.', () => { D.schedule[t.slot.day] = D.schedule[t.slot.day].filter(x => x !== e); t.slot = null; }) : null, del: 'Take it out' });
}
// Steps are in order: 1, 2, 3. Move one up or down to change the order.
const moveStep = (a, i, d) => { const j = i + d; if (j < 0 || j >= a.steps.length) return; [a.steps[i], a.steps[j]] = [a.steps[j], a.steps[i]]; commit(); };
function stepForm(a, t) {
  form({ title: t ? 'Edit step' : 'New step', sub: t ? '' : `What does it take to get to ${a.name}?`, fields: [{ name: 'text', label: 'The step', value: t?.text, required: true, placeholder: 'Pick a date, ask Daan, book the train…' }],
    submit: 'Save', onSubmit: v => { if (t) t.text = v.text; else a.steps.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: v.text, done: false }); },
    onDelete: t ? () => destroy('Step removed.', () => { a.steps = a.steps.filter(x => x !== t); }) : null, del: 'Remove' });
}
page('experience', {
  title: p => (D.adventures.find(a => a.id === p.id)?.name || 'Experience').toUpperCase(),
  render({ id }) {
    const a = D.adventures.find(x => x.id === id); if (!a) return null;
    const next = a.steps.findIndex(t => !t.done), col = PILLARS.find(p => p.key === a.pillar), n = a.steps.filter(t => t.done).length, pct = a.steps.length ? n / a.steps.length * 100 : 0;
    return `${a.img ? `<img class="exphero" src="${a.img}" alt="">` : ''}
    <div class="card ${a.doneAt ? 'sh-green' : 'sh-gold'}"><small>${a.doneAt ? `✓ LIVED · ${fmtDate(a.doneAt)}` : '✧ EXPERIENCE'}${a.regret ? ` · <span class="rtag">REGRET${a.doneAt ? ' · REDEEMED' : ''}</span>` : ''}</small><h2>${esc(a.name)}</h2>
      ${findMapPlace(a.placeId) ? `<div class="split"><span class="plink" ${on(() => go('map', { id: findMapPlace(a.placeId).map.id }))}>⌖ ${esc(findMapPlace(a.placeId).place.name)} · ${esc(findMapPlace(a.placeId).map.name)} →</span></div>` : ''}
      <div class="split dim"><span>${whenText(a)}${a.withWho ? ' · with ' + esc(a.withWho) : ''}</span><span>${col ? `<b style="color:${col.color}">${col.short}</b>` : ''}</span></div>
      ${a.notes ? `<p>${esc(a.notes)}</p>` : ''}</div>
    ${a.regret ? `<div class="panel regretp"><div class="pt">REGRET</div>
      ${a.doneAt ? '<p>You missed it once, then you lived it.</p>' : `<div class="split"><span>Can it still happen?</span></div><div class="seg rseg">${[['possible', 'Still possible'], ['gone', 'Gone']].map(([k, l]) => `<label ${on(() => { a.regretState = a.regretState === k ? '' : k; commit(); })}><span class="${a.regretState === k ? 'sel' : ''}">${l}</span></label>`).join('')}</div>`}
      <div class="pt" style="margin-top:10px">WHAT I'D DO DIFFERENTLY</div>${a.lesson ? `<p class="lesson" ${on(() => adventureForm(a))}>${esc(a.lesson)}</p>` : `<p ${on(() => adventureForm(a))}>Nothing written yet. Tap to write it.</p>`}</div>` : ''}
    ${a.doneAt ? '' : reqPanel(a)}
    <div class="sect"><span>STEPS TO GET THERE${a.steps.length ? ` · ${n}/${a.steps.length}` : ''}</span><button class="sbtn" ${on(() => stepForm(a))}>+ Step</button></div>
    ${a.steps.length ? `<div class="tline">${a.steps.map((t, i) => `<div class="tl-i ${t.done ? 'done' : ''} ${i === next ? 'next' : ''}">
        <button class="tl-dot" ${on(() => { t.done = !t.done; commit(); })} aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${t.done ? '✓' : i + 1}</button>
        <div class="tl-body"><span ${on(() => { t.done = !t.done; commit(); })}>${esc(t.text)}</span>
          <div class="tl-meta">${i === next ? '<em class="nexttag">NEXT</em>' : ''}${slotTag(t)}</div>
          <div class="tl-ctl"><button class="x wk" ${on(() => stepToWeek(a, t))} aria-label="Put in my week">◷</button><button class="x mv" ${i ? '' : 'disabled'} ${on(() => moveStep(a, i, -1))} aria-label="Move up">↑</button><button class="x mv" ${i < a.steps.length - 1 ? '' : 'disabled'} ${on(() => moveStep(a, i, 1))} aria-label="Move down">↓</button><button class="x" ${on(() => stepForm(a, t))} aria-label="Edit step">✎</button></div></div></div>`).join('')}
      <div class="tl-i goal ${a.doneAt ? 'done' : ''}"><span class="tl-dot">✧</span><div class="tl-body"><span>${esc(a.name)}</span><div class="tl-meta"><small>${a.doneAt ? 'lived ' + fmtDate(a.doneAt) : whenText(a)}</small></div></div></div></div>`
      : empty('No steps yet. What does it take to get there?')}
    <div class="btns">${photoBtnsBig(a)}${btn('Edit', () => adventureForm(a))}${a.doneAt ? btn('Not lived yet', () => { a.doneAt = null; commit(); }) : btn('Lived it', () => liveIt(a), 'good')}</div>`;
  },
});


// ── Eras + Calendar
function eraForm(e) {
  form({ title: e ? 'Edit era' : 'New era', sub: 'A chapter. A sprint. Name it and date it.',
    fields: [{ name: 'name', label: 'What is this chapter called?', value: e?.name, required: true }, { name: 'start', label: 'Starts', type: 'date', value: e?.start || iso(Date.now()), required: true },
      { name: 'end', label: 'Ends', type: 'date', value: e?.end, required: true }, { name: 'color', label: 'Colour', type: 'color', value: e?.color || ERA_COLORS[D.eras.length % ERA_COLORS.length], options: ERA_COLORS.map(c => [c, c]) }],
    onSubmit: v => { if (v.end < v.start) { toast('It ends before it starts. Fix the dates.'); return false; } if (e) Object.assign(e, v); else D.eras.push({ ...BLANK.era(), ...v }); },
    onDelete: e ? () => destroy(`Era "${e.name}" — wiped.`, () => { D.eras = D.eras.filter(x => x !== e); }) : null, del: 'Wipe it' });
}
function monthGrid(y, m) {
  const first = new Date(y, m, 1), n = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7, t0 = today0();
  let cells = '<i></i>'.repeat(lead);
  for (let d = 1; d <= n; d++) {
    const t = new Date(y, m, d).getTime(), s = iso(t), hit = D.eras.filter(e => e.start <= s && e.end >= s);
    const e = hit[0], cls = [t === t0 ? 'today' : '', e && e.start === s ? 'first' : '', e && e.end === s ? 'last' : '', hit.length > 1 ? 'multi' : ''].join(' ');
    cells += `<i class="${cls}" ${e ? `style="background:${esc(e.color)};color:#000"` : ''}>${d}</i>`;
  }
  return `<div class="cmonth"><b>${MONTHS[m].slice(0, 3).toUpperCase()}</b><div class="cgrid"><u>M</u><u>T</u><u>W</u><u>T</u><u>F</u><u>S</u><u>S</u>${cells}</div></div>`;
}
page('calendar', {
  title: 'CALENDAR',
  render() {
    const now = new Date().getFullYear(), years = [...new Set([now, ...D.eras.flatMap(e => { const a = +e.start.slice(0, 4), b = +e.end.slice(0, 4), o = []; for (let y = a; y <= b; y++) o.push(y); return o; })])].sort();
    const y = years.includes(ui.calYear) ? ui.calYear : now, order = { current: 0, planned: 1, past: 2 };
    const eras = [...D.eras].sort((a, b) => order[eraStatus(a)] - order[eraStatus(b)] || dts(a.start) - dts(b.start));
    const bd = birthday();
    return `${bd ? `<div class="card" ${on(birthdayForm)}><small>○ BIRTHDAY</small><h3>${bd.today ? 'Today. You turned ' + bd.turning + '.' : `Turning ${bd.turning} in ${bd.days} day${bd.days === 1 ? '' : 's'}`}</h3>${bar(bd.pct, 'pink')}<div class="split dim"><span>${Math.round(bd.pct)}% of this year of your life is gone</span></div></div>` : `<div class="card dashed" ${on(birthdayForm)}><small>○ BIRTHDAY</small><p>Set your birthday. See how much of the year is left.</p></div>`}
    ${sect('ERAS — MAIN QUEST', '+ Era', () => eraForm())}
    ${eras.map(e => { const st = eraStatus(e);
      return `<div class="row" style="border-left:8px solid ${esc(e.color)}" ${on(() => eraForm(e))}><div class="rbody"><b>${esc(e.name)}</b><small>${fmtDate(dts(e.start))} → ${fmtDate(dts(e.end))}</small></div><div class="rval ${st === 'current' ? 'green' : 'muted'}">${st === 'current' ? daysTo(e.end) + 'd left' : st === 'planned' ? 'in ' + daysTo(e.start) + 'd' : 'past'}</div></div>`; }).join('') || empty('No eras. Which chapter of your life is this? Name it, date it.')}
    <div class="sect"><span>THE YEAR</span><select ${onChange(v => setUi('calYear', +v))}>${years.map(x => `<option ${x === y ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="cyear">${MONTHS.map((_, m) => monthGrid(y, m)).join('')}</div>`;
  },
});

// ── Abilities
function allItems() {
  const acts = [], leads = [];
  for (const s of scopes()) {
    for (const c of s.activityCategories) for (const i of c.inventory) acts.push(['activity|' + c.id + '|' + i.id, `${c.name} — ${i.name}`]);
    for (const m of s.leadgen.methods) for (const i of m.inventory) leads.push(['leadmethod|' + m.id + '|' + i.id, `${m.name} — ${i.name}`]);
  }
  return [{ group: 'Activities', options: acts }, { group: 'Lead sources', options: leads }];
}
function abilityForm(a) {
  form({ title: a ? 'Edit ability' : 'New ability', sub: 'Something you can do — or will be able to.',
    fields: [{ name: 'name', label: 'The ability', value: a?.name, required: true, placeholder: 'Defend yourself in a fight' }, { name: 'desc', label: 'What does having it mean?', type: 'textarea', value: a?.desc }],
    onSubmit: v => { if (a) Object.assign(a, v); else D.abilities.push({ ...BLANK.ability(), ...v }); },
    onDelete: a ? () => destroy(`${a.name} — cut.`, () => { D.abilities = D.abilities.filter(x => x !== a); }) : null });
}
page('abilities', {
  title: 'ABILITIES',
  render() {
    const assign = a => { const opts = allItems(); if (!opts.some(g => g.options.length)) return toast('Nothing to attach it to yet. Add activities first.');
      form({ title: `Attach — ${a.name}`, sub: 'You gain the ability by doing the things it is attached to.', fields: [{ name: 'ref', label: 'What builds it?', type: 'select', options: opts.filter(g => g.options.length) }], submit: 'Attach',
        onSubmit: v => { const [type, methodId, itemId] = v.ref.split('|'); if (!a.assignments.some(x => x.itemId === itemId)) a.assignments.push({ type, methodId, itemId }); } }); };
    const un = D.abilities.filter(a => a.unlocked).length;
    return `<div class="card hero sh-gold"><small>◈ ABILITIES</small><div class="count"><b>${un}</b><span>/ ${D.abilities.length} unlocked</span></div></div>
    ${sect('LIST', '+ Ability', () => abilityForm())}
    ${D.abilities.map(a => `<div class="card ${a.unlocked ? 'sh-gold' : ''}"><div class="split"><h3>${a.unlocked ? '◈' : '◇'} ${esc(a.name)}</h3><b class="${a.unlocked ? 'gold' : 'muted'}">${a.unlocked ? 'UNLOCKED' : 'LOCKED'}</b></div>${a.desc ? `<p>${esc(a.desc)}</p>` : ''}
      <div class="chips">${a.assignments.map(x => { const f = x.type === 'activity' ? findActivity(x.itemId) : findLeadItem(x.itemId);
        return `<em class="chip cyan" ${on(() => { a.assignments = a.assignments.filter(y => y !== x); commit(); })}>${esc(f?.item.name || '?')} ×</em>`; }).join('') || '<em class="chip off">attached to nothing</em>'}</div>
      <div class="catfoot"><button class="sbtn ghost" ${on(() => abilityForm(a))}>✎</button><button class="sbtn ghost" ${on(() => assign(a))}>+ Attach</button>
      <button class="sbtn" ${on(() => { a.unlocked = !a.unlocked; if (a.unlocked) log(`Ability unlocked: ${a.name}`, 'meta'); commit(); })}>${a.unlocked ? 'Lock' : 'Unlock'}</button></div></div>`).join('') || empty('No abilities. What should you be able to do? Name it, then attach it to what builds it.')}`;
  },
});

// ── World
const unlocked = c => sum(c.boroughs.map(b => { const o = b.id === D.world.mainBoroughId ? D : b; return o.activityCategories.reduce((n, x) => n + x.inventory.length, 0) + o.leadgen.methods.reduce((n, x) => n + x.inventory.length, 0) + b.places.length; }));
function moveForm() {
  form({ title: 'Next move', sub: 'One concrete action. What does it change?', fields: [{ name: 'name', label: 'The move', required: true },
    { name: 'city', label: 'Where?', type: 'select', value: '', options: [['', '— Anywhere —'], ...D.world.cities.map(c => [c.id, c.name])] }, { name: 'statEffects', label: 'What it changes when you execute', type: 'fx', value: {} }],
    onSubmit: v => { D.nextMoves.push({ ...BLANK.nextMove(), name: v.name, city: v.city || null, statEffects: v.statEffects }); } });
}
const cityForm = c => form({ title: c ? 'Edit city' : 'New city', fields: [{ name: 'name', label: 'City', value: c?.name, required: true }],
  onSubmit: v => { if (c) c.name = v.name; else D.world.cities.push({ ...BLANK.city(), name: v.name, boroughs: [{ ...BLANK.borough(), name: 'Center' }] }); },
  onDelete: c && D.world.cities.length > 1 ? () => destroy(`${c.name} — off the map.`, () => { D.world.cities = D.world.cities.filter(x => x !== c); }) : null, del: 'Take it off' });
page('world', {
  title: 'WORLD',
  render() {
    const b = curBorough();
    return `<div class="card sh-green"><small>⬢ YOU ARE IN</small><h3>${esc(b?.name || 'Nowhere')}${b && b.id === D.world.mainBoroughId ? ' ★' : ''}</h3><p>${b && b.id !== D.world.mainBoroughId ? 'This borough runs its own activities and lead methods.' : 'Your main borough. Global activities and lead methods live here.'}</p></div>
    ${sect('CITIES', '+ City', () => cityForm())}
    <div class="grid2">${D.world.cities.map(c => `<div class="qa tall" ${on(() => go('citydetail', { id: c.id }))}><i>⬢</i><b>${esc(c.name)}</b><small>${c.boroughs.length} boroughs · ${sum(c.boroughs.map(x => x.places.length))} places<br>${unlocked(c)} unlocked</small></div>`).join('')}</div>
    ${sect('NEXT MOVES', '+ Move', moveForm)}
    ${D.nextMoves.map(m => `<div class="card"><div class="split"><h3>${esc(m.name)}</h3><b>${esc(D.world.cities.find(c => c.id === m.city)?.name || '')}</b></div><div class="chips"><em class="chip cyan">${fxText(m.statEffects) || 'no stat change'}</em><em class="chip">+10 XP</em></div>
      <div class="catfoot"><button class="sbtn ghost" ${on(() => destroy('Move dropped.', () => { D.nextMoves = D.nextMoves.filter(x => x !== m); }))}>Drop it</button>
      <button class="sbtn" ${on(() => { applyEffects(m.statEffects); log(`Executed: ${m.name}`, 'world'); addXP(10, m.name); D.nextMoves = D.nextMoves.filter(x => x !== m); commit(); toast('Executed. +10 XP'); })}>Execute</button></div></div>`).join('') || empty('No moves queued. What is the next concrete thing?')}`;
  },
});
page('citydetail', {
  title: p => D.world.cities.find(c => c.id === p.id)?.name || 'City',
  render({ id }) {
    const c = D.world.cities.find(x => x.id === id); if (!c) return null;
    const W = D.world, total = W.cities.reduce((n, x) => n + x.boroughs.length, 0);
    const boroughForm = b => form({ title: b ? 'Edit borough' : 'New borough', fields: [{ name: 'name', label: 'Borough', value: b?.name, required: true }],
      onSubmit: v => { if (b) b.name = v.name; else c.boroughs.push({ ...BLANK.borough(), name: v.name }); },
      onDelete: b && total > 1 && b.id !== W.mainBoroughId ? () => destroy(`${b.name} — off the map, with its activities.`, () => { c.boroughs = c.boroughs.filter(x => x !== b); }) : null, del: 'Take it off' });
    const placeForm = (b, p) => form({ title: p ? 'Edit place' : `New place — ${b.name}`, fields: [{ name: 'name', label: 'Place', value: p?.name, required: true }, { name: 'type', label: 'Type', value: p?.type, placeholder: 'gym, bar, café…' }, { name: 'notes', label: 'Notes', type: 'textarea', value: p?.notes }],
      submit: p ? 'Lock it in' : 'Put it on the map', onSubmit: v => { if (p) Object.assign(p, v); else b.places.push({ ...BLANK.place(), ...v }); },
      onDelete: p ? () => destroy(`${p.name} — off the map.`, () => { b.places = b.places.filter(x => x !== p); }) : null, del: 'Take it off' });
    return `<div class="btns">${btn('+ Borough', () => boroughForm(), 'good')}${btn('Edit city', () => cityForm(c))}</div>
    ${c.boroughs.map(b => `<div class="sect"><span>${b.id === W.mainBoroughId ? '★ ' : ''}${esc(b.name)}${b.id === W.currentBoroughId ? ' · YOU ARE HERE' : ''}</span><span class="secbtns"><button class="sbtn ghost" ${on(() => boroughForm(b))}>✎</button><button class="sbtn" ${on(() => placeForm(b))}>+ Place</button></span></div>
      <div class="btns">${b.id !== W.currentBoroughId ? btn('Be here', () => { W.currentBoroughId = b.id; log(`Moved to ${b.name}`, 'world'); commit(); }, 'good') : ''}${b.id !== W.mainBoroughId ? btn('Make main ★', () => { if (!confirm(`Make ${b.name} your main borough? Your global activities will show there instead.`)) return; W.mainBoroughId = b.id; commit(); }) : ''}</div>
      ${b.places.map(p => `<div class="row"><button class="vis ${p.visited ? 'on' : ''}" ${on(() => { p.visited = !p.visited; commit(); })}>${p.visited ? '■' : '□'}</button><div class="rbody" ${on(() => placeForm(b, p))}><b>${esc(p.name)}</b><small>${esc([p.type, p.notes].filter(Boolean).join(' · ')) || (p.visited ? 'visited' : 'not visited yet')}</small></div></div>`).join('') || empty('Nothing on the map yet.')}`).join('')}`;
  },
});
