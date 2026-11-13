// HOME — the pause menu. Where you're at, where you're headed, what's missing.
import { D } from '../store.js';
import { page, go, on, esc, form, bar, sect, row, term, empty, $, isCol, toggleCol } from '../ui.js';
import { xpForLevel, gaps, girl, chasers, money, vibe, vibeCeiling, leadBar, leadCeiling, ratingsPct, actCats, slotted, sum, nowNext, currentEra, nextEra,
  daysTo, dts, DAY, today0, clamp, fmtDate, tasksOf, progress, birthday, r1 } from '../calc.js';
import { destroy, GIRL } from '../ui.js';
import { DAYS, PILLARS } from '../schema.js';
import { commit } from '../store.js';
import { modal, closeModal, toast, btn } from '../ui.js';
import { gain } from '../game.js';
import { allocBar } from './time.js';
import { parseRange, todayKey, taken, pillarTime, pillarRate } from '../calc.js';

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
export const goGap = to => (to[0] === '@northstar' ? northstarForm() : go(to[0], to[1]));
const rateText = (key, r) => (key === 'money' ? `+${money(r.month)} / month` : key === 'girls' ? `${r1(r.perWeek)} / week` : `+${r1(r.month)} / month`);
function pillarCard(p) {
  const t = pillarTime(), r = pillarRate(p.key), s = D.player.stats;
  const main = p.key === 'money' ? [money(s.money), 'in the account'] : p.key === 'social' ? [D.friends.length, 'in your circle'] : [D.girlsRecurring, 'recurring'];
  return `<div class="pil" style="--c:${p.color}" ${on(() => pillarSheet(p.key))}>
    <div class="ph"><span>${p.key === 'girls' ? GIRL + ' ' : ''}${p.label.toUpperCase()}</span><em>${Math.round(t.pct(p.key))}% of time</em></div>
    <div class="pm"><b>${main[0]}</b><span>${main[1]}</span><strong>${rateText(p.key, r)}</strong></div>
    <div class="bar"><i style="width:${t.pct(p.key)}%;background:${p.color}"></i></div></div>`;
}
function pillarSheet(key) {
  modal(() => {
    const p = PILLARS.find(x => x.key === key), r = pillarRate(key), t = pillarTime(), unit = key === 'money' ? money : n => r1(n);
    const recent = D.gains.filter(g => g.pillar === key).slice(-5).reverse();
    const logForm = () => form({ title: key === 'money' ? 'Money earned' : key === 'girls' ? 'Girls you got with' : 'New people in your network',
      sub: 'Log it when it happens. The app works out the rate per week and per month from the dates.',
      fields: [{ name: 'n', label: key === 'money' ? 'How much? ($)' : 'How many?', type: 'number', min: 0, value: key === 'money' ? '' : 1, required: true }, { name: 'note', label: 'Note (optional)' }],
      submit: 'Log it', onSubmit: v => { if (!(v.n > 0)) { toast('More than zero.'); return false; } gain(key, v.n, v.note); if (key === 'money') D.player.stats.money += v.n; setTimeout(() => pillarSheet(key)); } });
    return `<h2>${esc(p.label)}</h2>
      ${term('WHAT IT EARNS YOU', [['LAST 7 DAYS', unit(r.week)], ['PER WEEK · 4-week average', unit(r.perWeek), 'gold'], ['PER MONTH · last 30 days', unit(r.month), 'gold'], ['SHARE OF PLANNED TIME', `${Math.round(t.pct(key))}% · ${t.h[key]}h of ${t.total}h`]])}
      ${key === 'girls' ? `<div class="panel"><div class="pt">RECURRING GIRLS — you set this</div><div class="lvlset">${btn('−', () => { D.girlsRecurring = Math.max(0, D.girlsRecurring - 1); commit(); })}<div><b>${D.girlsRecurring}</b></div>${btn('+', () => { D.girlsRecurring++; commit(); }, 'good')}</div></div>` : ''}
      <div class="btns">${btn(key === 'money' ? '+ Money earned' : key === 'girls' ? '+ Got with a girl' : '+ New contact', logForm, 'good')}</div>
      <div class="panel"><div class="pt">LAST LOGGED</div>${recent.map(g => `<div class="move"><span>${fmtDate(g.t)} · ${key === 'money' ? money(g.amount) : '+' + g.amount}${g.note ? ' · ' + esc(g.note) : ''}</span><button ${on(() => destroy('Entry removed.', () => { D.gains = D.gains.filter(x => x.id !== g.id); if (key === 'money') D.player.stats.money -= g.amount; }))}>×</button></div>`).join('') || '<p>Nothing logged yet.</p>'}</div>
      <div class="btns">${btn('Open ' + p.short, () => { closeModal(); go(key === 'money' ? 'money' : key === 'girls' ? 'life' : 'social'); })}${btn('Close', closeModal)}</div>`;
  });
}

page('home', {
  title: 'HOME',
  render() {
    const p = D.player, s = p.stats, need = xpForLevel(p.level), ns = D.northstar, r = D.relationships;
    const one = girl(r.theOne), ch = chasers(), nn = nowNext(), G = gaps(), era = currentEra();
    const nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null;
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

    ${PILLARS.map(pillarCard).join('')}
    ${allocBar()}`;
  },
});

page('gaps', {
  title: 'TO DO',
  render() {
    const G = gaps();
    return G.map(g => `<div class="gap s${g.sev}" ${on(() => goGap(g.to))}><i>${['◇', '!', '!!', '!!!'][g.sev]}</i><div><b>${esc(g.title)}</b><small>${esc(g.sub)}</small></div><em>→</em></div>`).join('') || empty('Nothing missing. Either you are done, or you are not aiming high enough.');
  },
});
