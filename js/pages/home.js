// HOME — the pause menu. Where you're at, where you're headed, what's missing.
import { D } from '../store.js';
import { page, go, on, esc, form, bar, sect, row, term, empty, $, isCol, toggleCol } from '../ui.js';
import { xpForLevel, gaps, girl, chasers, money, vibe, vibeCeiling, leadBar, leadCeiling, ratingsPct, actCats, slotted, sum, nowNext, currentEra, nextEra,
  daysTo, dts, DAY, today0, clamp, goalEta, fmtMonth, fmtDate, tasksOf, progress, birthday, r1, monthlyIncome } from '../calc.js';
import { destroy, GIRL } from '../ui.js';
import { DAYS } from '../schema.js';
import { parseRange, todayKey, taken } from '../calc.js';

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
const hm = m => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
function timeCard() {
  const n = new Date(), m = n.getHours() * 60 + n.getMinutes(), left = 1440 - m;
  const es = D.schedule[todayKey()].map(e => ({ e, r: parseRange(e.time) })).filter(x => x.r).sort((a, b) => a.r.start - b.r.start);
  const inside = r => (r.start <= r.end ? m >= r.start && m < r.end : m >= r.start || m < r.end);
  const cur = es.find(x => inside(x.r)), rest = es.filter(x => x.r.start > m);
  return `<div class="timecard" ${on(() => go('schedule'))}>
    <small>◷ TIME · ${DAYS.indexOf(todayKey()) >= 0 ? todayKey().toUpperCase() : ''}</small>
    <div class="tleft"><b>${hm(left)}</b><span>left today</span></div>${bar(m / 1440 * 100, 'gold')}
    <div class="tnow"><span>NOW</span><b>${cur ? `${esc(cur.e.name)} <em>until ${cur.r.to}</em>` : 'Unplanned'}</b></div>
    ${rest.slice(0, 4).map(x => `<div class="trow"><span>${x.r.from}</span><b>${esc(x.e.name)}</b></div>`).join('')}
    ${!es.length ? '<p>Nothing planned today. Tap to plan it.</p>' : !rest.length && !cur ? '<p>Nothing else planned today.</p>' : ''}
  </div>`;
}
const vit = (icon, label, val, sub, pct, cls, to) => `<div class="vit ${cls}" ${on(() => go(...to))}><div class="vh"><i>${icon}</i><span>${label}</span></div><b>${val}</b>${pct != null ? bar(pct, cls === 'bad' ? 'red' : 'cyan') : ''}<small>${sub}</small></div>`;

page('home', {
  title: 'HOME',
  render() {
    const p = D.player, s = p.stats, need = xpForLevel(p.level), ns = D.northstar, r = D.relationships;
    const one = girl(r.theOne), ch = chasers(), nn = nowNext(), G = gaps(), era = currentEra();
    const nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null;
    const best = ch.length ? [...ch].sort((a, b) => b.affinity - a.affinity)[0] : null;
    const gf = vit(GIRL, 'GIRLFRIENDS', taken(), `${ch.length} in play`, null, taken() ? '' : 'bad', ['life']);
    const qs = D.manifests.filter(m => !m.achievedAt);
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

    <div class="vgrid">
      ${gf}
      ${vit('$', 'MONEY', money(s.money), D.moneyGoal ? `goal ${money(D.moneyGoal)}` : 'no goal set', D.moneyGoal ? s.money / D.moneyGoal * 100 : null, D.moneyGoal ? '' : 'warn', ['money'])}
      ${vit('✦', 'VIBE', r1(vibe()) + '%', `ceiling ${r1(vibeCeiling())}%`, vibeCeiling() ? vibe() / vibeCeiling() * 100 : 0, '', ['vibe'])}
      ${vit('◎', 'QUESTS', qs.length, qs[0] ? esc(qs[0].name) : 'no goals set', null, qs.length ? '' : 'warn', ['manifest'])}
    </div>

    ${timeCard()}`;
  },
});

page('gaps', {
  title: 'TO DO',
  render() {
    const G = gaps();
    return G.map(g => `<div class="gap s${g.sev}" ${on(() => goGap(g.to))}><i>${['◇', '!', '!!', '!!!'][g.sev]}</i><div><b>${esc(g.title)}</b><small>${esc(g.sub)}</small></div><em>→</em></div>`).join('') || empty('Nothing missing. Either you are done, or you are not aiming high enough.');
  },
});
