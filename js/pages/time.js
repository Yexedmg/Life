// TIME: Time Allocation (the ideal day), the weekly schedule + analytics, and Lifestyles.
import { D, commit, ui } from '../store.js';
import { BLANK, DAYS, STAT, SLOT_COLORS, PILLARS } from '../schema.js';
import { onChange, page, go, on, esc, form, destroy, toast, bar, sect, row, term, empty, btn, tabs, setUi, isCol, toggleCol, fold } from '../ui.js';
import { MODE, dayBrackets, entryMode, dayPart, weekStats, parseRange, toMin, todayKey, actCats, elements, resolveMove, findActivity, lifestyleContrib, lifestyleRank, r1, sum, pillarTime, fmtDate, dts, daysTo, entryPillar, findMapPlace } from '../calc.js';
import { log } from '../game.js';

const placeOptions = () => [['', '— Nowhere in particular —'], ...D.maps.filter(m => m.places.length).map(m => ({ group: m.name, options: m.places.map(x => [x.id, x.name]) }))];
const moveOptions = () => elements().filter(x => x.el.levelUp.length).map(x => ({ group: `⤴ ${x.el.title}`, options: x.el.levelUp.map(m => [`m|${x.el.id}|${m.id}`, m.text]) }));
const refOf = v => { const [t, a, b] = (v || '').split('|'); return t === 'm' ? { statId: a, moveId: b } : null; };

// ── Weekly schedule entry
function entryForm(schedule, day, e) {
  const r = parseRange(e?.time), cur = e?.activityItemId ? `a|${e.catId}|${e.activityItemId}` : e?.levelUpRef ? `m|${e.levelUpRef.statId}|${e.levelUpRef.moveId}` : '';
  form({
    title: e ? 'Edit entry' : `${day.toUpperCase()} — add`,
    fields: [{ name: 'src', label: 'What is it?', type: 'select', value: cur, options: [['', '— Custom (name it below) —'],
      ...actCats().filter(c => c.inventory.length).map(c => ({ group: c.name, options: c.inventory.map(i => [`a|${c.id}|${i.id}`, i.name + (i.time ? ` (${i.time})` : '')]) })), ...moveOptions()] },
      { name: 'name', label: 'Custom name', value: cur ? '' : e?.name },
      { name: 'placeId', label: 'Where?', type: 'select', value: e?.placeId || '', options: placeOptions() },
      { name: 'pillar', label: 'Which category is it?', type: 'seg', value: e?.pillar || '', options: [['', 'None'], ...PILLARS.map(p => [p.key, p.short])] },
      { name: 'mode', label: 'Work or play?', type: 'seg', value: e?.mode || '', options: [['work', 'Work'], ['play', 'Play']] }, { name: 'from', label: 'From (empty = the activity\'s own time)', type: 'time', value: r?.from || '' }, { name: 'to', label: 'Until', type: 'time', value: r?.to || '' }],
    submit: 'Save',
    onSubmit: v => {
      const [t, a, b] = v.src.split('|'), f = t === 'a' ? findActivity(b) : null, mv = t === 'm' ? resolveMove({ statId: a, moveId: b }) : null;
      let time = v.from && v.to ? `${v.from}–${v.to}` : '';
      if (!time && f?.item.time) time = f.item.time;
      const name = f ? f.item.name : mv ? mv.move.text : v.name;
      if (!name) { toast('Name it, or pick something.'); return false; }
      if (!v.mode) { toast('Work or play? Pick one.'); return false; }
      if (!parseRange(time) || v.from && v.from === v.to) { toast('From and until — both, and not the same.'); return false; }
      const data = { time, name, catId: f ? a : null, activityItemId: f ? b : null, pillar: v.pillar || '', placeId: v.placeId || '', mode: v.mode || '' };
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
  const blocks = d.acts.filter(a => parseRange(a.e.time)).map(a => { const r = parseRange(a.e.time), pl = PILLARS.find(p => p.key === entryPillar(a.e));
    return { title: a.name, start: r.start, end: r.end, from: r.from, to: r.to, label: `${r.from}–${r.to}`, hrs: a.hrs, color: pl ? pl.color : '#9A9A9A', tag: pl ? pl.short : '', mode: entryMode(a.e), fn: () => entryForm(schedule, day, a.e),
      sub: [findMapPlace(a.e.placeId) ? '⌖ ' + esc(findMapPlace(a.e.placeId).place.name) : '', a.cat !== 'Custom' ? esc(a.cat) : '', a.e.levelUpRef ? `⤴ ${esc(resolveMove(a.e.levelUpRef)?.el.title || '')}` : ''].filter(Boolean).join(' · ') }; });
  return `${tabs(DAYS.map(k => [k, `${k.toUpperCase()}${k === todayKey() ? '•' : ''}`]), day, k => setUi('day-' + key, k))}
    ${dayView(blocks, `Empty ${day.toUpperCase()} — tap '+ Add' and decide what this day is for.`, () => entryForm(schedule, day), dayBrackets(day), wpPanel(st, day))}
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

// Where the planned week goes, split across the three pillars.
// Hours per part of life: planned per week, and per month. The week repeats, so a month is the week × 52 / 12 (4.33 weeks).
const WEEKS_PER_MONTH = 52 / 12;
const hh = n => (n ? `${r1(n)}h` : '–');
export function hoursTable(schedule = D.schedule) {
  const t = pillarTime(schedule); if (!t.total) return '';
  const rows = [...PILLARS.map(p => [p.short, t.h[p.key], p.color]), ['Untagged', t.h.other, '#6E6E6E']].filter(r => r[1]);
  const free = Math.max(0, 168 - t.total);
  return `<div class="hours"><div class="hrow head"><span>HOURS</span><span>week</span><span>month</span></div>
    ${rows.map(([l, h, c]) => `<div class="hrow"><span><i style="background:${c}"></i>${l}</span><b>${hh(h)}</b><b>${hh(h * WEEKS_PER_MONTH)}</b></div>`).join('')}
    <div class="hrow total"><span>Planned</span><b>${hh(t.total)}</b><b>${hh(t.total * WEEKS_PER_MONTH)}</b></div>
    <div class="hrow dim"><span>Unplanned</span><b>${hh(free)}</b><b>${hh(free * WEEKS_PER_MONTH)}</b></div>
    <p class="hint">A month is your week × 4.33.</p></div>`;
}
export function allocBar(schedule = D.schedule) {
  const t = pillarTime(schedule), parts = [...PILLARS.map(p => [p.short, t.h[p.key], p.color]), ['Untagged', t.h.other, '#4A4A4A']];
  if (!t.total) return `<div class="alloc none"><small>PLANNED THIS WEEK</small><p>Nothing planned this week, so there is nothing to split yet.</p></div>`;
  return `<div class="alloc"><small>${t.total}h planned this week</small><div class="abar">${parts.filter(x => x[1]).map(x => `<i class="saber" style="flex:${x[1]};background:${x[2]};color:${x[2]}"></i>`).join('')}</div>
    <div class="aleg">${parts.map(x => `<span><i style="background:${x[2]}"></i>${x[0]} <b>${Math.round(x[1] / t.total * 100)}%</b></span>`).join('')}</div></div>`;
}

// ── Time Allocation
const curAlloc = () => D.timeAllocs.find(t => t.id === D.currentTimeAllocId) || D.timeAllocs[0];
function slotForm(ta, s) {
  const cur = s?.levelUpRef ? `m|${s.levelUpRef.statId}|${s.levelUpRef.moveId}` : '';
  form({
    title: s ? 'Edit block' : 'Add a block', sub: 'The ideal shape of this kind of day.',
    fields: [{ name: 'title', label: 'What is this time for?', value: s?.title }, { name: 'start', label: 'From', type: 'time', value: s?.start }, { name: 'end', label: 'Until', type: 'time', value: s?.end },
      { name: 'placeId', label: 'Where?', type: 'select', value: s?.placeId || '', options: placeOptions() },
      { name: 'pillar', label: 'Which category is it?', type: 'seg', value: s?.pillar || '', options: [['', 'None'], ...PILLARS.map(p => [p.key, p.short])] },
      { name: 'color', label: 'Colour (only used with no category)', type: 'color', value: s?.color || SLOT_COLORS[ta.slots.length % SLOT_COLORS.length], options: SLOT_COLORS.map(c => [c, c]) },
      { name: 'ref', label: '⤴ Level-up move (optional — fills the title)', type: 'select', value: cur, options: [['', '— None —'], ...moveOptions()] }],
    submit: 'Save',
    onSubmit: v => {
      const ref = refOf(v.ref), title = v.title || (ref && resolveMove(ref)?.move.text);
      if (!title) { toast('Give it a title.'); return false; }
      if (!v.start || !v.end) { toast('Both times. From and until.'); return false; }
      if (toMin(v.end) <= toMin(v.start)) { toast('It has to end after it starts.'); return false; }
      const data = { title, start: v.start, end: v.end, color: v.color || SLOT_COLORS[0], pillar: v.pillar || '', placeId: v.placeId || '' };
      if (s) { Object.assign(s, data); delete s.levelUpRef; if (ref) s.levelUpRef = ref; } else ta.slots.push({ ...BLANK.timeSlot(), ...data, ...(ref ? { levelUpRef: ref } : {}) });
    },
    onDelete: s ? () => destroy('Block wiped.', () => { ta.slots = ta.slots.filter(x => x !== s); }) : null, del: 'Wipe it',
  });
}
// One picture for any day, lived or wanted: a 24-hour bar with labelled blocks.
// brackets: the day's work / play parts, drawn as brackets above the strip (only for the real week).
function dayStrip(blocks, brackets) {
  const X = m => 10 + m / 1440 * 340, list = [...blocks].sort((a, b) => a.start - b.start), top = brackets ? 24 : 0;
  const br = (brackets || []).map(b => { const c = MODE[b.mode].color, x1 = X(b.start) + 1.5, x2 = X(b.end) - 1.5, w = x2 - x1;
    return `<g class="brk"><path d="M${x1} 18 V12 H${x2} V18" stroke="${c}" fill="none" stroke-width="1.5"/>${w > 30 ? `<text x="${(x1 + x2) / 2}" y="8" text-anchor="middle" fill="${c}">${MODE[b.mode].label.toUpperCase()}${w > 90 ? ` ${Math.floor(b.start / 60)}–${b.end === 1440 ? 24 : Math.floor(b.end / 60)}` : ''}</text>` : ''}</g>`; }).join('');
  return `<svg class="strip" viewBox="0 0 360 ${170 + top}">${br}<g transform="translate(0 ${top})"><rect class="track" x="10" y="118" width="340" height="28"/>
    ${[0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => `<line class="tick" x1="${X(h * 60)}" y1="${h % 6 ? 146 : 114}" x2="${X(h * 60)}" y2="${h % 6 ? 151 : 154}"/>${h % 6 ? '' : `<text class="tk" x="${X(h * 60)}" y="166" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${h === 24 ? '23:59' : h + ':00'}</text>`}`).join('')}
    ${list.map((s, i) => { const end = s.end <= s.start ? 1440 : s.end, x1 = X(s.start), x2 = X(end), cx = (x1 + x2) / 2, ly = 18 + (i % 3) * 32, t = s.title.length > 16 ? s.title.slice(0, 15) + '…' : s.title;
      return `<g ${on(s.fn)}><rect x="${x1}" y="118" width="${Math.max(2, x2 - x1)}" height="28" fill="${esc(s.color)}"/><line x1="${cx}" y1="${ly + 16}" x2="${cx}" y2="118" stroke="${esc(s.color)}" stroke-width="1.5"/><circle cx="${cx}" cy="118" r="3" fill="${esc(s.color)}"/>
        ${s.mode ? `<rect x="${x1}" y="146" width="${Math.max(2, x2 - x1)}" height="3" fill="${MODE[s.mode].color}"/>` : ''}
        <text x="${Math.max(40, Math.min(320, cx))}" y="${ly}" text-anchor="middle" fill="${esc(s.color)}" class="sl">${esc(t)}</text><text x="${Math.max(40, Math.min(320, cx))}" y="${ly + 11}" text-anchor="middle" class="st">${esc((s.tag ? s.tag.toUpperCase() + ' · ' : '') + s.label)}</text></g>`; }).join('')}</g></svg>`;
}
// …and one list under it. Same rows for both.
const dayRows = blocks => [...blocks].sort((a, b) => a.start - b.start).map(s => `<div class="row dayrow" style="--c:${esc(s.color)}" ${on(s.fn)}><div class="ric time" style="color:${esc(s.color)}">${esc(s.from)}<br><small>${esc(s.to)}</small></div><div class="rbody"><b>${esc(s.title)}${s.mode ? ` <em class="mtag" style="--m:${MODE[s.mode].color}">${MODE[s.mode].label.toUpperCase()}</em>` : ''}</b>${s.sub ? `<small>${s.sub}</small>` : ''}</div><div class="rval">${s.hrs}h</div></div>`).join('');
// Work and play: time allocated (activities you set to work / play) against time available (the length of that part of the day).
const bracketHrs = (day, m) => sum(dayBrackets(day).filter(b => b.mode === m).map(b => (b.end - b.start) / 60));
const modeAlloc = (acts, m) => sum(acts.filter(a => entryMode(a.e) === m).map(a => a.hrs));
function wpPanel(st, day) {
  const line = (m, alloc, avail) => { const over = alloc > avail, c = MODE[m].color;
    return `<div class="wpl"><div class="split"><span style="color:${c}">${MODE[m].label.toUpperCase()}</span><b class="${over ? 'red' : ''}">${r1(alloc)}h <i>of ${r1(avail)}h</i>${over ? ` · ${r1(alloc - avail)}h over` : ` · ${r1(avail - alloc)}h free`}</b></div>
      <div class="bar"><i style="width:${avail ? Math.min(100, alloc / avail * 100) : alloc ? 100 : 0}%;background:${over ? 'var(--red)' : c}"></i></div></div>`; };
  const wk = m => [sum(DAYS.map(k => modeAlloc(st.days[k].acts, m))), sum(DAYS.map(k => bracketHrs(k, m)))];
  return `<div class="wpp"><div class="pt">${day.toUpperCase()} · ALLOCATED VS AVAILABLE</div>${['work', 'play'].map(m => line(m, modeAlloc(st.days[day].acts, m), bracketHrs(day, m))).join('')}
    <div class="pt">THIS WEEK</div>${['work', 'play'].map(m => line(m, ...wk(m))).join('')}</div>`;
}
const dayView = (blocks, emptyText, onAdd, brackets, extra = '') => `<div class="card dayc">${dayStrip(blocks, brackets)}${extra}<div class="split dim"><span>${blocks.length} block${blocks.length === 1 ? '' : 's'}</span><span>${r1(sum(blocks.map(x => x.hrs)))}h filled · ${r1(24 - sum(blocks.map(x => x.hrs)))}h open</span></div></div>
  ${dayRows(blocks) || empty(emptyText)}
  <div class="btns">${btn('+ Add', onAdd, 'good')}</div>`;
const allocForm = ta => form({ title: ta ? 'Edit day type' : 'New day type', fields: [{ name: 'name', label: 'What kind of day?', value: ta?.name, required: true, placeholder: 'Work day, Weekend, Monk day…' }],
  onSubmit: v => { if (ta) ta.name = v.name; else { const n = BLANK.timeAlloc(v.name); D.timeAllocs.push(n); D.currentTimeAllocId = n.id; } },
  onDelete: ta && D.timeAllocs.length > 1 ? () => destroy(`${ta.name} — wiped.`, () => { D.timeAllocs = D.timeAllocs.filter(x => x !== ta); }) : null, del: 'Wipe it' });

// WORK & PLAY — the two day parts. Income work in set hours, then play. Shown in the top bar, always running.
const DNAME = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const hrs = p => { const m = t => +t.slice(0, 2) * 60 + +t.slice(3); return (m(p.to) - m(p.from)) / 60; };
export const workWeek = () => sum(DAYS.filter(d => D.dayParts[d].work).map(d => hrs(D.dayParts[d])));
page('dayparts', {
  title: 'WORK & PLAY',
  render() {
    const dp = dayPart(), h = s => `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m`, wk = workWeek();
    const set = (d, k) => onChange(v => { const p = D.dayParts[d], old = p[k]; p[k] = v; if (p.from >= p.to) { p[k] = old; toast('Work has to end after it starts.'); } commit(); });
    return `<div class="card hero ${dp.part === 'work' ? '' : 'sh-green'}"><small>◐ RIGHT NOW</small><div class="count"><b>${dp.part === 'before' ? 'WORK' : dp.part.toUpperCase()}</b><span>${dp.part === 'before' ? `starts in ${h(dp.left)}` : `${h(dp.left)} left`}</span></div>
      <p>Income work in its hours. When work is over, it's play.</p></div>
    ${sect(`YOUR WEEK · ${r1(wk)}h work`)}
    ${DAYS.map(d => { const p = D.dayParts[d];
      return `<div class="dprow ${p.work ? 'on' : ''}"><b>${DNAME[d]}</b>
        <label class="chk"><input type="checkbox" ${p.work ? 'checked' : ''} ${set(d, 'work')}><span>Work</span></label>
        ${p.work ? `<span class="dpt"><input type="time" value="${p.from}" ${set(d, 'from')}><i>–</i><input type="time" value="${p.to}" ${set(d, 'to')}></span>` : '<span class="dpplay">all play</span>'}</div>`; }).join('')}`;
  },
});

page('schedule', {
  title: 'PLAN',
  render() {
    return `${allocBar()}
    ${hoursTable()}
    ${weekPanel(D.schedule, 'main')}`;
  },
});

// IDEAL DAY — the day you are aiming to live, and the key items it needs.
page('future', {
  title: 'IDEAL DAY',
  render() {
    const ta = curAlloc(), want = D.keyItems.filter(k => !k.has || k.wantName);
    const blocks = ta.slots.map(x => ({ title: (x.levelUpRef ? '⤴ ' : '') + x.title, start: toMin(x.start), end: toMin(x.end), from: x.start, to: x.end, label: `${x.start}–${x.end}`, hrs: r1((toMin(x.end) - toMin(x.start)) / 60), color: PILLARS.find(p => p.key === x.pillar)?.color || x.color, tag: PILLARS.find(p => p.key === x.pillar)?.short || '', fn: () => slotForm(ta, x), sub: findMapPlace(x.placeId) ? '⌖ ' + esc(findMapPlace(x.placeId).place.name) : '' }));
    return `<div class="sect"><span>YOUR IDEAL DAY</span><span class="secbtns"><button class="sbtn ghost" ${on(() => allocForm(ta))}>✎</button><button class="sbtn" ${on(() => allocForm())}>+ Day type</button></span></div>
    ${D.timeAllocs.length > 1 ? tabs(D.timeAllocs.map(t => [t.id, esc(t.name)]), ta.id, id => { D.currentTimeAllocId = id; commit(); }) : ''}
    ${dayView(blocks, 'Empty day — tap \'+ Add\' and set your ideal day.', () => slotForm(ta))}
    ${sect('KEY ITEMS FOR THIS DAY', 'Key items', () => go('keyitems'))}
    ${want.map(k => row({ icon: esc(k.icon), title: esc(k.wantName || k.name), desc: k.has ? `today: ${esc(k.detail || k.name)}` : 'today: not yet', val: k.wantPrice ? '$' + Math.round(k.wantPrice).toLocaleString('en-US') : '', fn: () => go('keyitems') })).join('') || empty('Every key item obtained, and no upgrade named.')}`;
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
