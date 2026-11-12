// TIME: Time Allocation (the ideal day), the weekly schedule + analytics, and Lifestyles.
import { D, commit, ui } from '../store.js';
import { BLANK, DAYS, STAT, SLOT_COLORS } from '../schema.js';
import { page, go, on, esc, form, destroy, toast, bar, sect, row, term, empty, btn, tabs, setUi, isCol, toggleCol, fold } from '../ui.js';
import { weekStats, parseRange, toMin, todayKey, actCats, elements, resolveMove, findActivity, lifestyleContrib, lifestyleRank, r1, sum } from '../calc.js';
import { log } from '../game.js';

const moveOptions = () => elements().filter(x => x.el.levelUp.length).map(x => ({ group: `⤴ ${x.el.title}`, options: x.el.levelUp.map(m => [`m|${x.el.id}|${m.id}`, m.text]) }));
const refOf = v => { const [t, a, b] = (v || '').split('|'); return t === 'm' ? { statId: a, moveId: b } : null; };

// ── Weekly schedule entry
function entryForm(schedule, day, e) {
  const r = parseRange(e?.time), cur = e?.activityItemId ? `a|${e.catId}|${e.activityItemId}` : e?.levelUpRef ? `m|${e.levelUpRef.statId}|${e.levelUpRef.moveId}` : '';
  form({
    title: e ? 'Edit entry' : `${day.toUpperCase()} — add`,
    fields: [{ name: 'src', label: 'What is it?', type: 'select', value: cur, options: [['', '— Custom (name it below) —'],
      ...actCats().filter(c => c.inventory.length).map(c => ({ group: c.name, options: c.inventory.map(i => [`a|${c.id}|${i.id}`, i.name + (i.time ? ` (${i.time})` : '')]) })), ...moveOptions()] },
      { name: 'name', label: 'Custom name', value: cur ? '' : e?.name }, { name: 'from', label: 'From (empty = the activity\'s own time)', type: 'time', value: r?.from || '' }, { name: 'to', label: 'Until', type: 'time', value: r?.to || '' }],
    submit: 'Paint it',
    onSubmit: v => {
      const [t, a, b] = v.src.split('|'), f = t === 'a' ? findActivity(b) : null, mv = t === 'm' ? resolveMove({ statId: a, moveId: b }) : null;
      let time = v.from && v.to ? `${v.from}–${v.to}` : '';
      if (!time && f?.item.time) time = f.item.time;
      const name = f ? f.item.name : mv ? mv.move.text : v.name;
      if (!name) { toast('Name it, or pick something.'); return false; }
      if (!parseRange(time) || v.from && v.from === v.to) { toast('From and until — both, and not the same.'); return false; }
      const data = { time, name, catId: f ? a : null, activityItemId: f ? b : null };
      if (e) { Object.assign(e, data); delete e.levelUpRef; if (mv) e.levelUpRef = refOf(v.src); }
      else schedule[day].push({ ...BLANK.entry(), ...data, ...(mv ? { levelUpRef: refOf(v.src) } : {}) });
    },
    onDelete: e ? () => destroy('Entry cut.', () => { schedule[day] = schedule[day].filter(x => x !== e); }) : null,
  });
}
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
const statChips = stats => stats.map(s => `<em class="chip cyan">${STAT[s].icon} ${STAT[s].label}</em>`).join('');

// One renderer for the global schedule AND every lifestyle's own schedule.
export function weekPanel(schedule, key) {
  const day = DAYS.includes(ui['day-' + key]) ? ui['day-' + key] : todayKey(), st = weekStats(schedule), d = st.days[day], W = st.week;
  const group = (title, by, detail, label) => { const keys = Object.keys(by).sort((a, b) => by[b] - by[a]);
    return `<div class="panel"><div class="pt">${title}</div>${keys.map(k => { const id = `wk-${key}-${title}-${k}`, open = isCol(id), ds = [...new Set(detail[k].map(a => a.day))];
      return `<div class="wrow" ${on(() => toggleCol(id))}><div class="split"><span>${open ? '▾' : '▸'} ${esc(label(k))}</span><b>${by[k]}h · ${pct(by[k], W.hours)}%</b></div>${bar(pct(by[k], W.hours), 'cyan')}
        <div class="chips">${ds.map(x => `<em class="chip">${x}</em>`).join('')}</div>${open ? detail[k].map(a => `<div class="trow"><span>${a.day} · ${esc(a.name)}</span><b>${a.hrs}h</b></div>`).join('') : ''}</div>`; }).join('') || '<p>Nothing yet.</p>'}</div>`; };
  return `${tabs(DAYS.map(k => [k, `${k.toUpperCase()}${k === todayKey() ? '•' : ''}`]), day, k => setUi('day-' + key, k))}
    ${d.acts.map(a => `<div class="row" ${on(() => entryForm(schedule, day, a.e))}><div class="ric time">${esc(parseRange(a.e.time)?.from || '')}<br><small>${esc(parseRange(a.e.time)?.to || '')}</small></div><div class="rbody"><b>${esc(a.name)}</b>
      <small>${esc(a.cat)}${a.e.levelUpRef ? ` · ⤴ levels up ${esc(resolveMove(a.e.levelUpRef)?.el.title || '')}` : ''}</small></div><div class="rval">${a.hrs}h</div></div>`).join('') || empty(`Empty ${day.toUpperCase()} — tap '+ Add' and decide what this day is for.`)}
    <div class="btns">${btn('+ Add', () => entryForm(schedule, day), 'good')}</div>
    ${fold('wk-' + key, `Week analytics · ${W.hours}h planned`, () => `${sect('WEEK OVERVIEW')}
    <div class="wdays">${DAYS.map(k => { const x = st.days[k];
      return `<div class="wday ${k === day ? 'active' : ''}" ${on(() => setUi('day-' + key, k))}><b>${k.toUpperCase()}</b><div class="dots">${'●'.repeat(Math.min(x.acts.length, 8)) || '○'}</div><span>${x.acts.length} · ${x.hours}h</span>
        ${Object.keys(x.byStat).map(s => `<small>${STAT[s].icon} ${pct(x.byStat[s], x.hours)}%</small>`).join('')}<em>${Math.max(0, 24 - x.hours)}h free</em></div>`; }).join('')}</div>
    ${sect(`${day.toUpperCase()} — BREAKDOWN`)}
    <div class="panel"><div class="split"><span>SCHEDULED</span><b>${d.hours}h / 24h</b></div>${bar(pct(d.hours, 24), 'green')}
      ${d.acts.map(a => `<div class="trow"><span>${esc(a.e.time)} · ${esc(a.name)} ${statChips(a.stats)}</span><b>${a.hrs}h · ${pct(a.hrs, 24)}%</b></div>`).join('')}
      <div class="trow"><span>Not Scheduled — Free/Unplanned</span><b class="muted">${Math.max(0, 24 - d.hours)}h · ${pct(Math.max(0, 24 - d.hours), 24)}%</b></div></div>
    ${sect(`WEEKLY TOTAL · ${W.hours}h of 168h`)}
    ${group('BY STAT', W.byStat, W.statDetail, k => `${STAT[k].icon} ${STAT[k].label}`)}${group('BY CATEGORY', W.byCat, W.catDetail, k => k)}`)}`;
}

// ── Time Allocation
const curAlloc = () => D.timeAllocs.find(t => t.id === D.currentTimeAllocId) || D.timeAllocs[0];
function slotForm(ta, s) {
  const cur = s?.levelUpRef ? `m|${s.levelUpRef.statId}|${s.levelUpRef.moveId}` : '';
  form({
    title: s ? 'Edit block' : 'Paint a block', sub: 'The ideal shape of this kind of day.',
    fields: [{ name: 'title', label: 'What is this time for?', value: s?.title }, { name: 'start', label: 'From', type: 'time', value: s?.start }, { name: 'end', label: 'Until', type: 'time', value: s?.end },
      { name: 'color', label: 'Colour', type: 'color', value: s?.color || SLOT_COLORS[ta.slots.length % SLOT_COLORS.length], options: SLOT_COLORS.map(c => [c, c]) },
      { name: 'ref', label: '⤴ Level-up move (optional — fills the title)', type: 'select', value: cur, options: [['', '— None —'], ...moveOptions()] }],
    submit: 'Paint it',
    onSubmit: v => {
      const ref = refOf(v.ref), title = v.title || (ref && resolveMove(ref)?.move.text);
      if (!title) { toast('Give it a title.'); return false; }
      if (!v.start || !v.end) { toast('Both times. From and until.'); return false; }
      if (toMin(v.end) <= toMin(v.start)) { toast('It has to end after it starts.'); return false; }
      const data = { title, start: v.start, end: v.end, color: v.color || SLOT_COLORS[0] };
      if (s) { Object.assign(s, data); delete s.levelUpRef; if (ref) s.levelUpRef = ref; } else ta.slots.push({ ...BLANK.timeSlot(), ...data, ...(ref ? { levelUpRef: ref } : {}) });
    },
    onDelete: s ? () => destroy('Block wiped.', () => { ta.slots = ta.slots.filter(x => x !== s); }) : null, del: 'Wipe it',
  });
}
function strip(ta) {
  const X = m => 10 + m / 1440 * 340, slots = [...ta.slots].sort((a, b) => toMin(a.start) - toMin(b.start));
  return `<svg class="strip" viewBox="0 0 360 170"><rect class="track" x="10" y="118" width="340" height="28"/>
    ${[0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => `<line class="tick" x1="${X(h * 60)}" y1="${h % 6 ? 146 : 114}" x2="${X(h * 60)}" y2="${h % 6 ? 151 : 154}"/>${h % 6 ? '' : `<text class="tk" x="${X(h * 60)}" y="166" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${h === 24 ? '23:59' : h + ':00'}</text>`}`).join('')}
    ${slots.map((s, i) => { const x1 = X(toMin(s.start)), x2 = X(toMin(s.end)), cx = (x1 + x2) / 2, ly = 18 + (i % 3) * 32, t = (s.levelUpRef ? '⤴ ' : '') + (s.title.length > 16 ? s.title.slice(0, 15) + '…' : s.title);
      return `<g ${on(() => slotForm(ta, s))}><rect x="${x1}" y="118" width="${Math.max(2, x2 - x1)}" height="28" fill="${esc(s.color)}"/><line x1="${cx}" y1="${ly + 16}" x2="${cx}" y2="118" stroke="${esc(s.color)}" stroke-width="1.5"/><circle cx="${cx}" cy="118" r="3" fill="${esc(s.color)}"/>
        <text x="${Math.max(40, Math.min(320, cx))}" y="${ly}" text-anchor="middle" fill="${esc(s.color)}" class="sl">${esc(t)}</text><text x="${Math.max(40, Math.min(320, cx))}" y="${ly + 11}" text-anchor="middle" class="st">${esc(s.start)}–${esc(s.end)}</text></g>`; }).join('')}</svg>`;
}
const allocForm = ta => form({ title: ta ? 'Edit day type' : 'New day type', fields: [{ name: 'name', label: 'What kind of day?', value: ta?.name, required: true, placeholder: 'Work day, Weekend, Monk day…' }],
  onSubmit: v => { if (ta) ta.name = v.name; else { const n = BLANK.timeAlloc(v.name); D.timeAllocs.push(n); D.currentTimeAllocId = n.id; } },
  onDelete: ta && D.timeAllocs.length > 1 ? () => destroy(`${ta.name} — wiped.`, () => { D.timeAllocs = D.timeAllocs.filter(x => x !== ta); }) : null, del: 'Wipe it' });

page('schedule', {
  title: 'PLAN',
  render() {
    const ta = curAlloc(), hrs = sum(ta.slots.map(s => (toMin(s.end) - toMin(s.start)) / 60));
    return `${sect('TIME ALLOCATION — THE IDEAL DAY', '+ Day type', () => allocForm())}
    ${tabs(D.timeAllocs.map(t => [t.id, esc(t.name)]), ta.id, id => { D.currentTimeAllocId = id; commit(); })}
    <div class="card sh-cyan">${strip(ta)}${ta.slots.length ? `<div class="split dim"><span>${ta.slots.length} blocks</span><span>${r1(hrs)}h painted · ${r1(24 - hrs)}h open</span></div>` : `<p class="hint">Empty day — tap '+ Add' and paint your perfect one.</p>`}
      <div class="catfoot"><button class="sbtn ghost" ${on(() => allocForm(ta))}>✎ ${esc(ta.name)}</button><button class="sbtn" ${on(() => slotForm(ta))}>+ Add</button></div></div>
    ${sect('THE ACTUAL WEEK')}
    ${weekPanel(D.schedule, 'main')}`;
  },
});

// ── Lifestyle
const SOURCE = [[/school|class|social/i, 'Socialising/Networking'], [/sport|combat/i, 'Physical Training'], [/groom/i, 'Self-Care/Appearance']];
const sourceLabel = name => SOURCE.find(([re]) => re.test(name))?.[1] || name;
const lifestyleForm = l => form({ title: l ? 'Edit lifestyle' : 'New lifestyle', sub: 'A team composition for your life. A build.',
  fields: [{ name: 'name', label: 'Name the build', value: l?.name, required: true, placeholder: 'Monk mode, Summer, Grind…' }, { name: 'emoji', label: 'Icon', value: l?.emoji || '◈' }],
  onSubmit: v => { if (l) Object.assign(l, v); else D.lifestyles.push({ ...BLANK.lifestyle(), ...v }); },
  onDelete: l ? () => destroy(`${l.name} — wiped.`, () => { D.lifestyles = D.lifestyles.filter(x => x !== l); }) : null, del: 'Wipe it' });
page('lifestyle', {
  title: 'LIFESTYLE',
  render() {
    const rk = lifestyleRank();
    return `${row({ icon: '▲', title: 'Activities', desc: 'Slots, categories, the bench. What you actually do.', fn: () => go('activities') })}
    ${row({ icon: '●', title: 'Social', desc: 'Girls, circle, platforms, meet.', fn: () => go('social') })}
    ${sect('LIFESTYLES — RANKED', '+ Lifestyle', () => lifestyleForm())}
    ${rk.map(({ l, score }, i) => `<div class="card ${l.id === D.activeLifestyleId ? 'sh-green' : ''}" ${on(() => go('lifestyledetail', { id: l.id }))}><div class="split"><h3>${esc(l.emoji)} ${esc(l.name)}</h3><b>#${i + 1}${i === 0 && rk.length > 1 ? ' · Highest score' : ''}</b></div>
      <div class="split dim"><span>${l.activities.length} activities${l.id === D.activeLifestyleId ? ' · <span class="green">ACTIVE</span>' : ''}</span><span>score ${r1(score)}</span></div>${bar(rk[0].score ? score / rk[0].score * 100 : 0, 'green')}</div>`).join('') || empty('No lifestyles. Compose one: which activities make up the life you want to run?')}`;
  },
});
page('lifestyledetail', {
  title: p => D.lifestyles.find(l => l.id === p.id)?.name || 'Lifestyle',
  render({ id }) {
    const l = D.lifestyles.find(x => x.id === id); if (!l) return null;
    const c = lifestyleContrib(l), rank = lifestyleRank().findIndex(x => x.l === l) + 1, active = D.activeLifestyleId === id;
    const add = () => { const opts = actCats().map(cat => ({ group: cat.name, options: cat.inventory.filter(i => !l.activities.some(a => a.activityItemId === i.id)).map(i => [`${cat.id}|${i.id}`, i.name]) })).filter(g => g.options.length);
      if (!opts.length) return toast('No activities left to add. Create some on the Activities page.');
      form({ title: 'Add to the build', fields: [{ name: 'ref', label: 'Which activity?', type: 'select', options: opts }], submit: 'Add',
        onSubmit: v => { const [catId, itemId] = v.ref.split('|'), cat = actCats().find(x => x.id === catId); l.activities.push({ id: BLANK.task().id, activityItemId: itemId, catId, sourceLabel: sourceLabel(cat?.name || ''), subLabel: cat?.name || '' }); } }); };
    const groups = {}; for (const a of l.activities) (groups[a.sourceLabel] ||= []).push(a);
    return `<div class="card hero ${active ? 'sh-green' : 'sh-cyan'}"><small>${esc(l.emoji)} LIFESTYLE · #${rank} of ${D.lifestyles.length}${active ? ' · ACTIVE' : ''}</small><div class="count"><b>${r1(c.total)}</b><span>TOTAL SCORE<br>${l.activities.length} activities</span></div>
      <div class="btns">${active ? btn('Deactivate', () => { D.activeLifestyleId = null; commit(); }) : btn('Run this lifestyle', () => { D.activeLifestyleId = id; log(`Lifestyle active: ${l.name}`, 'meta'); commit(); }, 'good')}${btn('Edit', () => lifestyleForm(l))}</div></div>
    ${sect('THE BUILD', '+ Activity', add)}
    ${Object.entries(groups).map(([label, list]) => `<div class="benchl">${esc(label)}</div>${list.map(a => { const f = findActivity(a.activityItemId);
      return `<div class="row"><div class="rbody"><b>${esc(f.item.name)}</b><small>${esc(f.cat.name)}${f.item.time ? ' · ' + esc(f.item.time) : ''}</small></div><button class="sbtn ghost" ${on(() => { l.activities = l.activities.filter(x => x !== a); commit(); })}>×</button></div>`; }).join('')}`).join('') || empty('Empty build. Add the activities this life is made of.')}
    ${sect('CONTRIBUTION BREAKDOWN')}
    ${c.rows.length ? `<div class="panel">${c.rows.map(([k, v]) => `<div class="wrow"><div class="split"><span>${esc(k)}</span><b class="${v < 0 ? 'red' : 'green'}">${v > 0 ? '+' : ''}${r1(v)} · ${pct(Math.abs(v), c.total)}%</b></div>${bar(pct(Math.abs(v), c.total), v < 0 ? 'red' : 'green')}</div>`).join('')}</div>` : empty('Nothing contributes yet.')}
    ${sect('ITS OWN WEEK')}
    ${weekPanel(l.schedule, id)}`;
  },
});
