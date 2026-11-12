// HOME — the pause menu. Where you're at, where you're headed, what's missing.
import { D } from '../store.js';
import { page, go, on, esc, form, bar, sect, row, term, empty, $, isCol, toggleCol } from '../ui.js';
import { xpForLevel, gaps, girl, chasers, money, vibe, vibeCeiling, leadBar, leadCeiling, ratingsPct, actCats, slotted, sum, nowNext, currentEra, nextEra,
  daysTo, dts, DAY, today0, clamp, goalEta, fmtMonth, fmtDate, tasksOf, progress, birthday, r1, monthlyIncome } from '../calc.js';
import { destroy } from '../ui.js';

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
const sevName = ['NOTE', 'WATCH', 'SERIOUS', 'CRITICAL'];
const vit = (icon, label, val, sub, pct, cls, to) => `<div class="vit ${cls}" ${on(() => go(...to))}><div class="vh"><i>${icon}</i><span>${label}</span></div><b>${val}</b>${pct != null ? bar(pct, cls === 'bad' ? 'red' : 'cyan') : ''}<small>${sub}</small></div>`;

page('home', {
  title: 'HOME',
  render() {
    const p = D.player, s = p.stats, need = xpForLevel(p.level), ns = D.northstar, r = D.relationships;
    const one = girl(r.theOne), ch = chasers(), nn = nowNext(), G = gaps(), era = currentEra();
    const nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null;
    const best = ch.length ? [...ch].sort((a, b) => b.affinity - a.affinity)[0] : null;
    const gf = one ? vit('♥', 'GIRLFRIEND', esc(one.name), `affinity ${one.affinity}/100`, one.affinity, 'ok', ['life'])
      : r.commons.length ? vit('♥', 'GIRLFRIEND', `${r.commons.length} common`, 'no one in Slot 1', null, '', ['life'])
      : vit('♥', 'GIRLFRIEND', '0', best ? `closest: ${esc(best.name)} ${best.affinity}/100` : 'nobody in play', best ? best.affinity : 0, 'bad', ['life']);
    const g = G[0];
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
      ${vit('◷', 'TODAY', nn.cur ? esc(nn.cur.e.name) : nn.count ? 'Free now' : 'Nothing', nn.next ? `next ${nn.next.r.from} ${esc(nn.next.e.name)}` : `${nn.count} planned`, null, nn.count ? '' : 'bad', ['schedule'])}
    </div>

    ${g ? `<div class="gaphero s${g.sev}" ${on(() => goGap(g.to))}><small>${sevName[g.sev]} · BIGGEST GAP</small><h2>${esc(g.title)}</h2><p>${esc(g.sub)}</p><span>FIX IT →</span></div>
      ${G.length > 1 ? `<button class="more" ${on(() => go('gaps'))}>${G.length - 1} more gap${G.length === 2 ? '' : 's'} →</button>` : ''}`
      : `<div class="gaphero s0"><small>ALL CLEAR</small><h2>Nothing missing.</h2><p>Either you are done, or you are not aiming high enough.</p></div>`}`;
  },
});

page('gaps', {
  title: 'GAPS',
  render() {
    const G = gaps();
    return G.map(g => `<div class="gap s${g.sev}" ${on(() => goGap(g.to))}><i>${['◇', '!', '!!', '!!!'][g.sev]}</i><div><b>${esc(g.title)}</b><small>${esc(g.sub)}</small></div><em>→</em></div>`).join('') || empty('Nothing missing. Either you are done, or you are not aiming high enough.');
  },
});
