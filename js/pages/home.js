// HOME — the pause screen. The major factors of your life, each ACTIVE or INACTIVE, and your quest list.
import { D } from '../store.js';
import { page, go, on, esc, form, bar, sect, row, term, empty, $, isCol, toggleCol } from '../ui.js';
import { xpForLevel, girl, chasers, money, vibe, vibeCeiling, leadBar, leadCeiling, ratingsPct, actCats, slotted, sum, nowNext, currentEra, nextEra,
  daysTo, dts, DAY, today0, clamp, fmtDate, tasksOf, progress, birthday, r1 } from '../calc.js';
import { destroy, GIRL } from '../ui.js';
import { DAYS, PILLARS, CAP, ACTIVE_DAYS } from '../schema.js';
import { commit } from '../store.js';
import { modal, closeModal, toast, btn } from '../ui.js';
import { gain } from '../game.js';
import { allocBar } from './time.js';
import { storyBlock, storyNow } from '../story.js';
import { waitingExp, parseRange, todayKey, taken, pillarTime, pillarRate, factorActive, lastGain, gainSum, weekStats, weekGain, totalGain, engineHours } from '../calc.js';

export function northstarForm() {
  const n = D.northstar;
  form({
    title: 'Northstar', sub: 'One sentence. The direction everything else serves. Call your shot.',
    fields: [{ name: 'text', label: 'Where is all of this going?', type: 'textarea', value: n?.text, required: true, placeholder: 'e.g. Financially free, in the best shape of my life, with her.' },
      { name: 'targetDate', label: 'Deadline (optional)', type: 'date', value: n?.targetDate || '' }],
    submit: 'Call it',
    onSubmit: v => { D.northstar = { text: v.text, targetDate: v.targetDate || null, updatedAt: Date.now() }; },
    onDelete: n ? () => destroy('Northstar wiped.', () => { D.northstar = null; }) : null, del: 'Wipe it',
  });
}
// Principles: how you see the journey, in your own words. Nothing shows on Home until you write one.
function principleForm(x) {
  form({ title: x ? 'Edit principle' : 'New principle', fields: [{ name: 'text', label: 'Your principle', type: 'textarea', rows: 3, value: x?.text, required: true, placeholder: 'Life is like a Pokémon adventure.' }],
    submit: 'Save', onSubmit: v => { if (x) x.text = v.text; else D.principles.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: v.text }); setTimeout(principlesSheet); } });
}
export function principlesSheet() {
  modal(() => `<h2>Principles</h2><p class="msub">How you see the journey. Tap one to change its wording.</p>
    ${D.principles.map(x => `<div class="move"><span ${on(() => principleForm(x))}>${esc(x.text)}</span><button ${on(() => destroy('Principle removed.', () => { D.principles = D.principles.filter(y => y.id !== x.id); }))}>×</button></div>`).join('')}
    <div class="btns">${btn('+ Principle', () => principleForm(), 'good')}${btn('Close', closeModal)}</div>`);
}
const principlesCard = () => (D.principles.length ? `<div class="princ" ${on(principlesSheet)}><small>❖ PRINCIPLES</small>${D.principles.map(x => `<b>${esc(x.text)}</b>`).join('')}</div>` : '');
export function birthdayForm() {
  form({ title: 'Birthday', sub: 'The clock is running either way.', fields: [{ name: 'birthday', label: 'When were you born?', type: 'date', value: D.settings.birthday }],
    onSubmit: v => { D.settings.birthday = v.birthday; } });
}
const TIME = { key: 'time', label: 'Time', short: 'Time', color: '#F4F4F4' };
const LOG = {
  social: ['+ Social experience', 'Social experiences — went out, met people, hung out', 'How many?'], girls: ['+ Got with a girl', 'Girls you got with', 'How many?'],
  money: ['+ Money earned', 'Money earned', 'How much? ($)'], looks: ['+ Grooming / upgrade done', 'Looks: what you did', 'How many?'], health: ['+ Workout done', 'Health: what you did', 'How many sessions?'],
};
const OPEN = { social: ['social'], girls: ['life'], money: ['money'], looks: ['ratings'], health: ['stat', { key: 'health' }] };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// Each factor on the pause screen: this week, all-time total, and where it stands right now.
function factorCells(key) {
  const s = D.player.stats, u = key === 'money' ? money : n => r1(n);
  if (key === 'time') { const n = nowNext(), t = pillarTime(); return [[`${n.hours}h`, 'planned today'], [`${t.total}h`, 'planned this week'], [`${Math.round(t.total / 168 * 100)}%`, 'of the week']]; }
  const tg = D.targets[key], wk = weekGain(key);
  const now = key === 'social' ? [D.friends.length, 'in your circle'] : key === 'girls' ? [taken(), taken() === 1 ? 'girlfriend' : 'girlfriends'] : key === 'money' ? [money(s.money), 'in the account']
    : key === 'looks' ? [`${r1(s.looks)}/${CAP}`, 'looks stat'] : [`${r1(s.health)}/${CAP}`, 'health stat'];
  return [[tg ? `${u(wk)}<i>/${u(tg)}</i>` : u(wk), 'this week'], [u(totalGain(key)), key === 'money' ? 'earned total' : 'in total'], now];
}
// Needs attention: a mark you set yourself on a life factor. It stays until you clear it.
const attnMark = key => { const x = D.attention[key]; return x ? `<div class="attn"><i></i><span>needs attention</span>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div>` : ''; };
function attnPanel(key, reopen) {
  const x = D.attention[key];
  const edit = () => form({ title: 'Needs attention', sub: 'Why does this need attention? Optional.', fields: [{ name: 'note', label: 'Note', type: 'textarea', rows: 2, value: x?.note || '', placeholder: "Haven't trained in two weeks." }],
    submit: 'Save', onSubmit: v => { D.attention[key] = { note: v.note, since: x?.since || Date.now() }; setTimeout(reopen); } });
  return `<div class="attnp ${x ? 'on' : ''}"><div class="split"><b>${x ? '● Needs attention' : '○ Needs attention'}</b><button class="sbtn ${x ? 'ghost' : ''}" ${on(() => { if (x) delete D.attention[key]; else D.attention[key] = { note: '', since: Date.now() }; commit(); })}>${x ? 'Clear' : 'Mark'}</button></div>
    ${x ? `<div class="split dim"><span ${on(edit)}>${x.note ? esc(x.note) : '+ Add a note'}</span><span>since ${fmtDate(x.since)}</span></div>` : ''}</div>`;
}
function engineRow(p) {
  const e = engineHours(), pct = e.limit ? Math.min(100, e.week / e.limit * 100) : 0;
  return `<div class="fac ${e.over ? 'off over' : 'on'}" style="--c:${p.color}" ${on(engineSheet)}>
    <div class="fh"><span>${p.label.toUpperCase()}</span><em>${e.over ? 'OVER LIMIT' : 'WITHIN LIMIT'}</em></div>
    <div class="fc"><div><b>${r1(e.week)}h<i>/${r1(e.limit)}h</i></b><small>this week</small></div><div><b>${Math.round(e.share)}%</b><small>of planned time</small></div><div><b>${r1(e.today)}h</b><small>today</small></div></div>
    ${attnMark('engine')}
    ${storyNow(D.factorStory.engine) ? `<p class="qdesc">${esc(storyNow(D.factorStory.engine))}</p>` : ''}
    <div class="bar"><i style="width:${pct}%;background:${e.over ? 'var(--red)' : p.color}"></i></div></div>`;
}
function engineSheet() {
  modal(() => {
    const p = PILLARS.find(x => x.key === 'engine'), e = engineHours(), step = d => { D.engineLimit = Math.max(0.5, Math.min(168, r1(D.engineLimit + d))); commit(); };
    return `<h2>${esc(p.label)}</h2><p class="msub">System work. Counted from the Engine time slots in your week.</p>
      ${attnPanel('engine', engineSheet)}
      ${storyBlock(D.factorStory.engine, 'f-engine', p.label, engineSheet)}
      <div class="fstate ${e.over ? 'off' : 'on'}"><b>${e.over ? 'OVER LIMIT' : 'WITHIN LIMIT'}</b><span>${e.over ? `${r1(e.week - e.limit)}h over this week` : `${r1(e.limit - e.week)}h left this week`}</span></div>
      ${term('THIS WEEK', [['PLANNED', `${r1(e.week)}h of ${r1(e.limit)}h`, e.over ? 'red' : ''], ['SHARE OF PLANNED TIME', `${Math.round(e.share)}%`], ['TODAY', `${r1(e.today)}h`]])}
      <div class="panel"><div class="pt">WEEKLY LIMIT</div><div class="lvlset">${btn('−', () => step(-1))}<div><b>${r1(D.engineLimit)}</b><span>h / week</span></div>${btn('+', () => step(1), 'good')}</div></div>
      <div class="btns">${btn('Open the week', () => { closeModal(); go('schedule'); })}${btn('Close', closeModal)}</div>`;
  });
}
function factorRow(p) {
  if (p.key === 'engine') return engineRow(p);
  const on_ = factorActive(p.key), cells = factorCells(p.key), tg = p.key !== 'time' && D.targets[p.key];
  return `<div class="fac ${on_ ? 'on' : 'off'}" style="--c:${p.color}" ${on(() => (p.key === 'time' ? go('schedule') : factorSheet(p.key)))}>
    <div class="fh"><span>${p.key === 'girls' ? GIRL + ' ' : ''}${p.label.toUpperCase()}</span><em>${on_ ? 'ACTIVE' : 'INACTIVE'}</em></div>
    <div class="fc">${cells.map(c => `<div><b>${c[0]}</b><small>${c[1]}</small></div>`).join('')}</div>
    ${p.key !== 'time' ? attnMark(p.key) : ''}
    ${p.key !== 'time' && storyNow(D.factorStory[p.key]) ? `<p class="qdesc">${esc(storyNow(D.factorStory[p.key]))}</p>` : ''}
    ${tg ? `<div class="bar"><i style="width:${Math.min(100, weekGain(p.key) / tg * 100)}%;background:${p.color}"></i></div>` : ''}</div>`;
}
function factorSheet(key) {
  modal(() => {
    const p = PILLARS.find(x => x.key === key), r = pillarRate(key), t = pillarTime(), unit = key === 'money' ? money : n => r1(n), act = factorActive(key), last = lastGain(key);
    const recent = D.gains.filter(g => g.pillar === key).slice(-5).reverse(), [btnLabel, title, q] = LOG[key];
    const tg = D.targets[key], wk = weekGain(key), weeks = [7, 6, 5, 4, 3, 2, 1, 0].map(b => weekGain(key, b)), wmax = Math.max(1, tg, ...weeks);
    const setup = () => form({ title: `${p.short} — target and history`, sub: "What's necessary per week? And how many did you already have before this app?",
      fields: [{ name: 'target', label: key === 'money' ? 'Weekly target ($) — 0 for none' : 'Weekly target — 0 for none', type: 'number', min: 0, value: tg || '' },
        { name: 'base', label: key === 'money' ? 'Earned before the app ($)' : 'How many before the app?', type: 'number', min: 0, value: D.baseline[key] || '' }],
      onSubmit: v => { D.targets[key] = Math.max(0, v.target || 0); D.baseline[key] = Math.max(0, v.base || 0); setTimeout(() => factorSheet(key)); } });
    const logForm = () => form({ title, sub: 'Log it when it really happened. The dates give you the rate per week and per month.',
      fields: [{ name: 'n', label: q, type: 'number', min: 0, value: key === 'money' ? '' : 1, required: true }, { name: 'note', label: 'Note (optional)' }],
      submit: 'Log it', onSubmit: v => { if (!(v.n > 0)) { toast('More than zero.'); return false; } gain(key, v.n, v.note); if (key === 'money') D.player.stats.money += v.n; setTimeout(() => factorSheet(key)); } });
    return `<h2>${esc(p.label)}</h2>
      ${attnPanel(key, () => factorSheet(key))}
      ${storyBlock(D.factorStory[key], 'f-' + key, p.label, () => factorSheet(key))}
      <div class="fstate ${act ? 'on' : 'off'}"><b>${act ? 'ACTIVE' : 'INACTIVE'}</b><span>${last ? 'last logged ' + fmtDate(last) : 'nothing ever logged'} · active means something real in the last ${ACTIVE_DAYS} days${key === 'girls' ? ', or a girlfriend / recurring girl' : ''}</span></div>
      ${term('YOUR NUMBERS', [['THIS WEEK', tg ? `${unit(wk)} / ${unit(tg)}` : unit(wk), tg && wk >= tg ? 'green' : ''], ['LAST WEEK', unit(weekGain(key, 1))], ['PER WEEK · 4-week average', unit(r.perWeek)], ['LAST 30 DAYS', unit(r.month)], ['IN TOTAL', unit(totalGain(key)), 'gold'], ['SHARE OF PLANNED TIME', `${Math.round(t.pct(key))}% · ${t.h[key]}h of ${t.total}h`]])}
      <div class="panel"><div class="pt">WEEK BY WEEK${tg ? ` · target ${unit(tg)}` : ''}</div><div class="wkbars">${weeks.map((v, i) => `<div><i style="height:${Math.max(3, v / wmax * 100)}%;background:${tg && v >= tg ? 'var(--green)' : p.color};opacity:${i === 7 ? 1 : .55}"></i><small>${i === 7 ? 'now' : '-' + (7 - i)}</small></div>`).join('')}</div></div>
      <div class="btns">${btn(tg ? `Weekly target: ${unit(tg)}` : 'Set a weekly target', setup)}</div>
      ${key === 'girls' ? `<div class="panel"><div class="pt">RECURRING GIRLS — you set this</div><div class="lvlset">${btn('−', () => { D.girlsRecurring = Math.max(0, D.girlsRecurring - 1); commit(); })}<div><b>${D.girlsRecurring}</b></div>${btn('+', () => { D.girlsRecurring++; commit(); }, 'good')}</div></div>` : ''}
      <div class="btns">${btn(btnLabel, logForm, 'good')}</div>
      <div class="panel"><div class="pt">LAST LOGGED</div>${recent.map(g => `<div class="move"><span>${fmtDate(g.t)} · ${key === 'money' ? money(g.amount) : '+' + g.amount}${g.note ? ' · ' + esc(g.note) : ''}</span><button ${on(() => destroy('Entry removed.', () => { D.gains = D.gains.filter(x => x.id !== g.id); if (key === 'money') D.player.stats.money -= g.amount; }))}>×</button></div>`).join('') || '<p>Nothing logged yet.</p>'}</div>
      <div class="btns">${btn('Open ' + p.short, () => { closeModal(); go(...OPEN[key]); })}${btn('Close', closeModal)}</div>`;
  });
}

// Quests and experiences in full: used by the third page of Home and by the Quests & Experiences page.
const questsBody = () => {
    const quests = D.manifests.filter(m => !m.achievedAt), exp = waitingExp().sort((x, y) => (x.when || '9999').localeCompare(y.when || '9999'));
    return `<div class="qcard" ${on(() => go('manifest'))}><div class="qrow"><b>◎ Quests</b><span>${quests.length} open</span></div><em>All quests →</em></div>
    ${quests.slice(0, 4).map(m => { const t = tasksOf(m), pr = progress(t), next = t.find(x => !x.done);
      return `<div class="quest" ${on(() => go('manifest'))}><div class="split"><b>${esc(m.emoji)} ${esc(m.name)}</b><span>${Math.round(pr)}%</span></div>${bar(pr, 'green')}${storyNow(m.story) ? `<p class="qdesc">${esc(storyNow(m.story))}</p>` : ''}${next ? `<small>▸ ${esc(next.name)}</small>` : ''}</div>`; }).join('') || empty('No quests. What are you going after?')}
    <div class="qcard" ${on(() => go('adventures'))}><div class="qrow"><b>✧ Experiences</b><span>${exp.length} waiting</span></div><em>All experiences →</em></div>
    ${exp.slice(0, 5).map(a => `<div class="quest" ${on(() => go('experience', { id: a.id }))}><div class="split"><b>✧ ${esc(a.name)}</b><span>${a.when ? (daysTo(a.when) < 0 ? 'overdue' : daysTo(a.when) === 0 ? 'today' : 'in ' + daysTo(a.when) + 'd') : ''}</span></div></div>`).join('') || empty('Nothing you want to live yet.')}`;
};

page('home', {
  title: 'HOME',
  render() {
    const p = D.player, need = xpForLevel(p.level), ns = D.northstar, era = currentEra();
    const bd = birthday(), nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null, quests = D.manifests.filter(m => !m.achievedAt), openQ = quests.length, waitE = waitingExp().length, adv = D.adventures.filter(a => !a.doneAt).sort((a, b) => (a.when || '9999').localeCompare(b.when || '9999'));
    const all = [...PILLARS, TIME], counted = all.filter(f => !f.limit), active = counted.filter(f => factorActive(f.key)).length, attnN = PILLARS.filter(f => D.attention[f.key]).length; // Engine has a limit, not an active state
    return `
    <div class="carousel" id="hcar">
      <section class="slide">
        <div class="sect"><span>YOUR LIFE</span><span>${active} / ${counted.length} active${attnN ? ` · <b class="attnc">${attnN} need${attnN === 1 ? 's' : ''} attention</b>` : ''}</span></div>
        ${allocBar()}
        ${all.map(factorRow).join('')}
      </section>
      <section class="slide">
        <div class="sect"><span>KEY ITEMS</span><span>${D.keyItems.filter(k => k.has).length} / ${D.keyItems.length}</span></div>
    <div class="kgrid" ${on(() => go('keyitems'))}>${D.keyItems.map(k => `<div class="${k.has ? 'has' : ''}"><i>${esc(k.icon)}</i><span>${esc(k.name)}</span></div>`).join('') || '<p>No key items yet.</p>'}</div>
      </section>
      <section class="slide">
        <div class="sect"><span>QUESTS &amp; EXPERIENCES</span><span>${openQ} open · ${waitE} waiting</span></div>
        ${questsBody()}
      </section>
    </div>
    <div class="dots"><i class="on"></i><i></i><i></i></div>

    <div class="hud-player" ${on(() => go('totalstats'))}>
      <div class="lv"><small>LEVEL</small><b>${p.level}</b></div>
      <div class="xp"><div class="split"><span>EXPERIENCE</span><b>${Math.round(p.xp)} / ${need}</b></div>${bar(p.xp / need * 100, 'cyan')}</div>
      <div class="lv age" ${on((_, e) => { e.stopPropagation(); birthdayForm(); })}><small>AGE</small><b>${bd ? bd.age : '–'}</b><em>${bd ? (bd.today ? 'birthday today' : `${bd.days}d to ${bd.turning}`) : 'tap to set'}</em></div>
    </div>
    <div class="north ${ns ? '' : 'none'}" ${on(northstarForm)}>
      <small>✦ NORTHSTAR${era ? ` · ${esc(era.name).toUpperCase()}` : ''}</small>
      <b>${ns ? esc(ns.text) : 'No direction set. Tap to call it.'}</b>
      ${nsDays != null ? `<em class="${nsDays < 0 ? 'red' : ''}">${Math.abs(nsDays)} days ${nsDays < 0 ? 'overdue' : 'left'}</em>` : ''}
    </div>
    ${principlesCard()}

    `;
  },
  after(view) {
    const c = view.querySelector('#hcar'), dots = view.querySelectorAll('.dots i'); if (!c) return;
    const upd = () => { const i = Math.round(c.scrollLeft / Math.max(1, c.clientWidth)); dots.forEach((d, n) => d.classList.toggle('on', n === i)); };
    c.addEventListener('scroll', upd, { passive: true }); upd();
  },
});

page('questlog', {
  title: 'QUESTS & EXPERIENCES',
  render() {
    return questsBody();
  },
});
