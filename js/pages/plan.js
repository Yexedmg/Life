// Planning: Manifest, Eras + Calendar, Abilities, World map + Next Moves.
import { D, commit, ui } from '../store.js';
import { BLANK, ERA_COLORS, CAP } from '../schema.js';
import { page, go, on, onChange, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, isCol, toggleCol, setUi } from '../ui.js';
import { eraStatus, dts, daysTo, fmtDate, tasksOf, progress, MONTHS, iso, today0, scopes, findActivity, findLeadItem, curBorough, sum } from '../calc.js';
import { addXP, applyEffects, log, fxText } from '../game.js';

// ── Manifest
function goalForm(m) {
  form({ title: m ? 'Edit goal' : 'New goal', sub: "Set a goal, detach, and do your best on what's required.",
    fields: [{ name: 'name', label: 'What do you want?', value: m?.name, required: true }, { name: 'emoji', label: 'Tag', value: m?.emoji || '◎' }],
    submit: m ? 'Lock it in' : 'Call it',
    onSubmit: v => { if (m) Object.assign(m, v); else D.manifests.push({ ...BLANK.manifest(), ...v }); },
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
      return `<div class="card ${m.achievedAt ? 'sh-green' : ''}"><div class="cathead" ${on(() => toggleCol(m.id))}><b>${esc(m.emoji)} ${esc(m.name)}</b><span>${Math.round(pr)}%</span><i>${closed ? '▸' : '▾'}</i></div>${bar(pr, 'green')}
      ${m.achievedAt ? `<div class="split dim"><span>🎯 ACHIEVED</span><span>${fmtDate(m.achievedAt)}</span></div>` : ''}
      ${closed ? '' : `${m.milestones.map(ms => { const mp = progress(ms.tasks), mc = isCol(ms.id), done = ms.tasks.length && mp === 100;
        return `<div class="ms"><div class="mshead"><span ${on(() => toggleCol(ms.id))}>${mc ? '▸' : '▾'} ${done ? '✓ ' : ''}${esc(ms.name)}</span><em>${ms.tasks.filter(t => t.done).length}/${ms.tasks.length}</em>
          <button class="sbtn ghost" ${on(() => nameForm('Edit milestone', 'Milestone', ms, m.milestones, BLANK.milestone))}>✎</button><button class="sbtn" ${on(() => nameForm('New task', "What's required?", null, ms.tasks, BLANK.task, () => { m.achievedAt = null; }))}>+ Task</button></div>
          ${mc ? '' : ms.tasks.map(t => `<div class="task ${t.done ? 'done' : ''}"><button ${on(() => toggleTask(m, t))}>${t.done ? '■' : '□'}</button><span ${on(() => toggleTask(m, t))}>${esc(t.name)}</span><button class="x" ${on(() => nameForm('Edit task', 'Task', t, ms.tasks, BLANK.task))}>✎</button></div>`).join('') || '<p class="hint">No tasks. What does this milestone actually require?</p>'}</div>`; }).join('')}
        <div class="catfoot"><button class="sbtn ghost" ${on(() => goalForm(m))}>✎ Goal</button><button class="sbtn" ${on(() => nameForm('New milestone', 'A checkpoint on the way', null, m.milestones, BLANK.milestone))}>+ Milestone</button></div>`}</div>`; };
    const open = D.manifests.filter(m => !m.achievedAt), done = D.manifests.filter(m => m.achievedAt);
    return `<div class="card hero"><small>◎ SIDE QUESTS</small><p>Set a goal, detach, and do your best on what's required.</p></div>
    ${sect('INFORMATION')}<textarea class="info" rows="3" placeholder="Rules and notes that apply across every goal." ${onChange(v => { D.manifestInfo = v; commit(); })}>${esc(D.manifestInfo)}</textarea>
    ${sect(`GOALS · ${open.length}`, '+ Goal', () => goalForm())}
    ${open.map(goal).join('') || empty('No goals. What do you want? Call it.')}
    ${done.length ? sect(`ACHIEVED · ${done.length}`) + done.map(goal).join('') : ''}`;
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
    cells += `<i class="${cls}" ${e ? `style="background:${esc(e.color)};color:#12172B"` : ''}>${d}</i>`;
  }
  return `<div class="cmonth"><b>${MONTHS[m].slice(0, 3).toUpperCase()}</b><div class="cgrid"><u>M</u><u>T</u><u>W</u><u>T</u><u>F</u><u>S</u><u>S</u>${cells}</div></div>`;
}
page('calendar', {
  title: 'CALENDAR',
  render() {
    const now = new Date().getFullYear(), years = [...new Set([now, ...D.eras.flatMap(e => { const a = +e.start.slice(0, 4), b = +e.end.slice(0, 4), o = []; for (let y = a; y <= b; y++) o.push(y); return o; })])].sort();
    const y = years.includes(ui.calYear) ? ui.calYear : now, order = { current: 0, planned: 1, past: 2 };
    const eras = [...D.eras].sort((a, b) => order[eraStatus(a)] - order[eraStatus(b)] || dts(a.start) - dts(b.start));
    return `${sect('ERAS — MAIN QUEST', '+ Era', () => eraForm())}
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
