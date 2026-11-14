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
import { parseRange, todayKey, taken, pillarTime, pillarRate, factorActive, lastGain, gainSum, weekStats } from '../calc.js';

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
  social: ['+ New contact', 'New people in your network', 'How many?'], girls: ['+ Got with a girl', 'Girls you got with', 'How many?'],
  money: ['+ Money earned', 'Money earned', 'How much? ($)'], looks: ['+ Grooming / upgrade done', 'Looks: what you did', 'How many?'], health: ['+ Workout done', 'Health: what you did', 'How many sessions?'],
};
const OPEN = { social: ['social'], girls: ['life'], money: ['money'], looks: ['ratings'], health: ['stat', { key: 'health' }] };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// What each factor shows on the pause screen: [big value, small line]
function factorFacts(key) {
  const s = D.player.stats, r = key === 'time' ? null : pillarRate(key), t = pillarTime(), share = key === 'time' ? '' : ` · ${Math.round(t.pct(key))}% of time`;
  if (key === 'social') return [D.friends.length, `in your circle · +${r1(r.month)} / month${share}`];
  if (key === 'girls') return [taken(), `${taken() === 1 ? 'girlfriend' : 'girlfriends'} · ${D.girlsRecurring} recurring · ${r1(r.perWeek)} / week${share}`];
  if (key === 'money') return [money(s.money), `+${money(r.month)} / month${share}`];
  if (key === 'looks') { const p = ratingsPct(); return [`${r1(s.looks)}/${CAP}`, `${p == null ? 'setup not rated' : 'setup ' + Math.round(p) + '% of potential'}${share}`]; }
  if (key === 'health') return [`${r1(s.health)}/${CAP}`, `${plural(r1(r.week), 'session')} this week${share}`];
  const n = nowNext(); return [`${n.hours}h`, `planned today · ${t.total}h this week`];
}
function factorRow(p) {
  const on_ = factorActive(p.key), [val, sub] = factorFacts(p.key);
  return `<div class="fac ${on_ ? 'on' : 'off'}" style="--c:${p.color}" ${on(() => (p.key === 'time' ? go('schedule') : factorSheet(p.key)))}>
    <div class="fh"><span>${p.key === 'girls' ? GIRL + ' ' : ''}${p.label.toUpperCase()}</span><em>${on_ ? 'ACTIVE' : 'INACTIVE'}</em></div>
    <div class="fm"><b>${val}</b><small>${sub}</small></div></div>`;
}
function factorSheet(key) {
  modal(() => {
    const p = PILLARS.find(x => x.key === key), r = pillarRate(key), t = pillarTime(), unit = key === 'money' ? money : n => r1(n), act = factorActive(key), last = lastGain(key);
    const recent = D.gains.filter(g => g.pillar === key).slice(-5).reverse(), [btnLabel, title, q] = LOG[key];
    const logForm = () => form({ title, sub: 'Log it when it really happened. The dates give you the rate per week and per month.',
      fields: [{ name: 'n', label: q, type: 'number', min: 0, value: key === 'money' ? '' : 1, required: true }, { name: 'note', label: 'Note (optional)' }],
      submit: 'Log it', onSubmit: v => { if (!(v.n > 0)) { toast('More than zero.'); return false; } gain(key, v.n, v.note); if (key === 'money') D.player.stats.money += v.n; setTimeout(() => factorSheet(key)); } });
    return `<h2>${esc(p.label)}</h2>
      <div class="fstate ${act ? 'on' : 'off'}"><b>${act ? 'ACTIVE' : 'INACTIVE'}</b><span>${last ? 'last logged ' + fmtDate(last) : 'nothing ever logged'} · active means something real in the last ${ACTIVE_DAYS} days${key === 'girls' ? ', or a girlfriend / recurring girl' : ''}</span></div>
      ${term('THE NUMBERS', [['LAST 7 DAYS', unit(r.week)], ['PER WEEK · 4-week average', unit(r.perWeek), 'gold'], ['PER MONTH · last 30 days', unit(r.month), 'gold'], ['SHARE OF PLANNED TIME', `${Math.round(t.pct(key))}% · ${t.h[key]}h of ${t.total}h`]])}
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
    const nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null, quests = D.manifests.filter(m => !m.achievedAt);
    const all = [...PILLARS, TIME], active = all.filter(f => factorActive(f.key)).length;
    return `
    <div class="hud-player" ${on(() => go('totalstats'))}>
      <div class="lv"><small>LEVEL</small><b>${p.level}</b></div>
      <div class="xp"><div class="split"><span>EXPERIENCE</span><b>${Math.round(p.xp)} / ${need}</b></div>${bar(p.xp / need * 100, 'cyan')}</div>
    </div>

    <div class="north ${ns ? '' : 'none'}" ${on(northstarForm)}>
      <small>✦ NORTHSTAR${era ? ` · ${esc(era.name).toUpperCase()}` : ''}</small>
      <b>${ns ? esc(ns.text) : 'No direction set. Tap to call it.'}</b>
      ${nsDays != null ? `<em class="${nsDays < 0 ? 'red' : ''}">${Math.abs(nsDays)} days ${nsDays < 0 ? 'overdue' : 'left'}</em>` : ''}
    </div>

    <div class="sect"><span>YOUR LIFE</span><span>${active} / ${all.length} active</span></div>
    ${all.map(factorRow).join('')}

    ${sect('QUESTS', quests.length ? 'All' : '+ Quest', () => go('manifest'))}
    ${quests.slice(0, 4).map(m => { const t = tasksOf(m), pr = progress(t), next = t.find(x => !x.done);
      return `<div class="quest" ${on(() => go('manifest'))}><div class="split"><b>${esc(m.emoji)} ${esc(m.name)}</b><span>${Math.round(pr)}%</span></div>${bar(pr, 'green')}${next ? `<small>▸ ${esc(next.name)}</small>` : ''}</div>`; }).join('')
      || empty('No quests. What are you going after?')}`;
  },
});
