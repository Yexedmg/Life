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
import { parseRange, todayKey, taken, pillarTime, pillarRate, factorActive, lastGain, gainSum, weekStats, weekGain, totalGain } from '../calc.js';

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
function factorRow(p) {
  const on_ = factorActive(p.key), cells = factorCells(p.key), tg = p.key !== 'time' && D.targets[p.key];
  return `<div class="fac ${on_ ? 'on' : 'off'}" style="--c:${p.color}" ${on(() => (p.key === 'time' ? go('schedule') : factorSheet(p.key)))}>
    <div class="fh"><span>${p.key === 'girls' ? GIRL + ' ' : ''}${p.label.toUpperCase()}</span><em>${on_ ? 'ACTIVE' : 'INACTIVE'}</em></div>
    <div class="fc">${cells.map(c => `<div><b>${c[0]}</b><small>${c[1]}</small></div>`).join('')}</div>
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

page('home', {
  title: 'HOME',
  render() {
    const p = D.player, need = xpForLevel(p.level), ns = D.northstar, era = currentEra();
    const bd = birthday(), nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null, quests = D.manifests.filter(m => !m.achievedAt), adv = D.adventures.filter(a => !a.doneAt).sort((a, b) => (a.when || '9999').localeCompare(b.when || '9999'));
    const all = [...PILLARS, TIME], active = all.filter(f => factorActive(f.key)).length;
    return `
    <div class="sect"><span>YOUR LIFE</span><span>${active} / ${all.length} active</span></div>
    ${allocBar()}
    ${all.map(factorRow).join('')}
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

    <div class="sect"><span>KEY ITEMS</span><span>${D.keyItems.filter(k => k.has).length} / ${D.keyItems.length}</span></div>
    <div class="kstrip" ${on(() => go('keyitems'))}>${D.keyItems.map(k => `<div class="${k.has ? 'has' : ''}"><i>${esc(k.icon)}</i><span>${esc(k.name)}</span></div>`).join('') || '<p>No key items yet.</p>'}</div>

    ${sect('QUESTS', quests.length ? 'All' : '+ Quest', () => go('manifest'))}
    ${quests.slice(0, 4).map(m => { const t = tasksOf(m), pr = progress(t), next = t.find(x => !x.done);
      return `<div class="quest" ${on(() => go('manifest'))}><div class="split"><b>${esc(m.emoji)} ${esc(m.name)}</b><span>${Math.round(pr)}%</span></div>${bar(pr, 'green')}${storyNow(m.story) ? `<p class="qdesc">${esc(storyNow(m.story))}</p>` : ''}${next ? `<small>▸ ${esc(next.name)}</small>` : ''}</div>`; }).join('')
      || empty('No quests. What are you going after?')}
    ${sect('EXPERIENCES', adv.length ? 'All' : '+ Experience', () => go('adventures'))}
    ${adv.slice(0, 3).map(a => `<div class="quest" ${on(() => go('adventures'))}><div class="split"><b>✧ ${esc(a.name)}</b><span>${a.when ? (daysTo(a.when) < 0 ? 'overdue' : daysTo(a.when) === 0 ? 'today' : 'in ' + daysTo(a.when) + 'd') : ''}</span></div></div>`).join('') || empty('Nothing you want to live yet. Add one.')}`;
  },
});
