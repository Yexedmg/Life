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
const goGap = to => (to[0] === '@northstar' ? northstarForm() : go(to[0], to[1]));
const tile = (label, val, sub, cls, to) => `<div class="stile ${cls}" ${on(() => go(...to))}><small>${label}</small><b>${val}</b><span>${sub}</span></div>`;

page('home', {
  title: () => new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(),
  render() {
    const p = D.player, s = p.stats, need = xpForLevel(p.level), ns = D.northstar, r = D.relationships;
    const one = girl(r.theOne), ch = chasers(), cats = actCats();
    const slots = sum(cats.map(c => c.maxSlots)), filled = sum(cats.map(c => slotted(c).length));
    const rp = ratingsPct(), nn = nowNext(), eta = goalEta(), G = gaps(), all = isCol('home-gaps-all');
    const hard = G.filter(g => g.sev >= 2).length;

    // WHERE YOU'RE HEADED
    const nsDays = ns?.targetDate ? daysTo(ns.targetDate) : null;
    const north = ns ? `<div class="card hero sh-gold" ${on(northstarForm)}><small>✦ NORTHSTAR</small><h2>${esc(ns.text)}</h2>
        ${nsDays != null ? `<div class="count ${nsDays < 0 ? 'red' : ''}"><b>${Math.abs(nsDays)}</b><span>${nsDays < 0 ? 'DAYS OVERDUE' : nsDays === 1 ? 'DAY LEFT' : 'DAYS LEFT'}<br>${fmtDate(dts(ns.targetDate))}</span></div>` : ''}</div>`
      : `<div class="card hero sh-gold dashed" ${on(northstarForm)}><small>✦ NORTHSTAR</small><h2 class="muted">No direction set.</h2><p>Where is all of this going? Tap and call it.</p></div>`;

    const era = currentEra(), nx = nextEra();
    let eraCard;
    if (era) {
      const total = Math.max(1, (dts(era.end) - dts(era.start)) / DAY + 1), passed = clamp((today0() - dts(era.start)) / DAY + 1, 0, total);
      eraCard = `<div class="card" style="border-color:${esc(era.color)}" ${on(() => go('calendar'))}><small>▮ MAIN QUEST · ERA</small><h3>${esc(era.name)}</h3>
        <div class="bar"><i style="width:${passed / total * 100}%;background:${esc(era.color)}"></i></div>
        <div class="split"><span>day ${Math.round(passed)} of ${Math.round(total)}</span><b>${daysTo(era.end)} days left</b></div></div>`;
    } else if (nx) eraCard = `<div class="card" style="border-color:${esc(nx.color)}" ${on(() => go('calendar'))}><small>▮ MAIN QUEST · UP NEXT</small><h3>${esc(nx.name)}</h3><div class="split"><span>${fmtDate(dts(nx.start))}</span><b>starts in ${daysTo(nx.start)} days</b></div></div>`;
    else eraCard = `<div class="card dashed" ${on(() => go('calendar'))}><small>▮ MAIN QUEST</small><p>No era running. Which chapter is this? Tap to name it.</p></div>`;

    const quests = D.manifests.filter(m => !m.achievedAt).slice(0, 3);
    const bd = birthday();

    return `
    <div class="card player sh-cyan" ${on(() => go('totalstats'))}>
      <div class="plv"><small>LEVEL</small><b>${p.level}</b></div>
      <div class="pxp"><div class="split"><span>XP</span><b>${Math.round(p.xp)} / ${need}</b></div>${bar(p.xp / need * 100, 'cyan')}
      <div class="split dim"><span>${G.length ? `${G.length} open gap${G.length === 1 ? '' : 's'}${hard ? ` · ${hard} serious` : ''}` : 'No open gaps'}</span><span>${need - Math.round(p.xp)} to next</span></div></div>
    </div>

    ${north}

    ${sect("WHERE YOU'RE AT")}
    <div class="sgrid">
      ${tile('THE ONE', one ? esc(one.name) : 'EMPTY', one ? `affinity ${one.affinity}/100` : r.commons.length ? `${r.commons.length} common` : 'no girlfriend', one ? 'ok' : 'bad', ['life'])}
      ${tile('IN PLAY', ch.length, ch.length ? `best ${Math.max(...ch.map(g => g.affinity))}/100` : 'nobody chasing', ch.length ? '' : 'bad', ['roster'])}
      ${tile('MONEY', money(s.money), D.moneyGoal ? `${Math.round(clamp(s.money / D.moneyGoal * 100))}% of ${money(D.moneyGoal)}` : 'no goal set', D.moneyGoal ? '' : 'warn', ['money'])}
      ${tile('INCOME', money(monthlyIncome()), '/ month flowing', monthlyIncome() ? '' : 'warn', ['income'])}
      ${tile('VIBE', r1(vibe()) + '%', `of ${r1(vibeCeiling())}% ceiling`, '', ['vibe'])}
      ${tile('LEADS', r1(leadBar()) + '%', `of ${leadCeiling()}% ceiling`, leadBar() ? '' : 'warn', ['leadgen'])}
      ${tile('SETUP', rp == null ? '—' : Math.round(rp) + '%', 'of potential', rp == null ? 'warn' : '', ['ratings'])}
      ${tile('SLOTS', `${filled}/${slots}`, 'activities active', filled ? '' : 'warn', ['activities'])}
    </div>

    ${sect(`THE GAPS${G.length ? ` · ${G.length}` : ''}`, G.length > 5 ? (all ? 'Top 5' : 'Show all') : '', () => toggleCol('home-gaps-all'))}
    ${G.length ? (all ? G : G.slice(0, 5)).map(g => `<div class="gap s${g.sev}" ${on(() => goGap(g.to))}><i>${['◇', '!', '!!', '!!!'][g.sev]}</i><div><b>${esc(g.title)}</b><small>${esc(g.sub)}</small></div><em>→</em></div>`).join('')
      : empty('Nothing missing. Either you are done, or you are not aiming high enough.')}

    ${sect('RIGHT NOW', 'Week', () => go('schedule'))}
    <div class="term">
      ${nn.cur ? `<div class="trow"><span>NOW · ${nn.cur.r.from}–${nn.cur.r.to}</span><b class="green">${esc(nn.cur.e.name)}</b></div>` : `<div class="trow"><span>NOW</span><b class="${nn.count ? '' : 'red'}">${nn.count ? 'free / unplanned' : 'nothing scheduled today'}</b></div>`}
      ${nn.next ? `<div class="trow"><span>NEXT · ${nn.next.r.from}</span><b>${esc(nn.next.e.name)}</b></div>` : ''}
      <div class="trow"><span>TODAY</span><b>${nn.count} planned · ${nn.hours}h of 24h</b></div>
    </div>

    ${sect("WHERE YOU'RE HEADED")}
    ${eraCard}
    ${D.moneyGoal ? `<div class="card" ${on(() => go('money'))}><small>$ MONEY GOAL</small><h3>${money(s.money)} <span class="muted">/ ${money(D.moneyGoal)}</span></h3>${bar(s.money / D.moneyGoal * 100, 'gold')}
      <div class="split"><span>${Math.round(clamp(s.money / D.moneyGoal * 100))}%</span><b class="${eta.never ? 'red' : ''}">${eta.done ? 'REACHED. Raise it.' : eta.never ? 'never, at this income' : 'ETA ' + fmtMonth(eta.date)}</b></div></div>` : ''}
    ${quests.map(m => { const t = tasksOf(m), pr = progress(t), nextT = t.find(x => !x.done);
      return `<div class="card quest" ${on(() => go('manifest'))}><small>◎ SIDE QUEST</small><h3>${esc(m.emoji)} ${esc(m.name)}</h3>${bar(pr, 'green')}
      <div class="split"><span>${nextT ? 'next: ' + esc(nextT.name) : 'no tasks yet'}</span><b>${Math.round(pr)}%</b></div></div>`; }).join('')}
    ${!quests.length ? `<div class="card dashed" ${on(() => go('manifest'))}><small>◎ SIDE QUESTS</small><p>No goals on the board. Tap to set one.</p></div>` : ''}
    ${bd ? `<div class="card" ${on(birthdayForm)}><small>○ BIRTHDAY</small><h3>${bd.today ? 'Today. You turned ' + bd.turning + '.' : `Turning ${bd.turning} in ${bd.days} day${bd.days === 1 ? '' : 's'}`}</h3>${bar(bd.pct, 'pink')}<div class="split dim"><span id="bday-live" data-t="${bd.next}"></span><span>${Math.round(bd.pct)}% of this year of your life is gone</span></div></div>`
      : `<div class="card dashed" ${on(birthdayForm)}><small>○ BIRTHDAY</small><p>Set your birthday. See how much of the year is left.</p></div>`}

    ${sect('TERMINALS')}
    ${row({ icon: '◉', title: 'Lead Generation', desc: 'How you meet people. How opportunity finds you.', val: r1(leadBar()) + '%', fn: () => go('leadgen') })}
    ${row({ icon: '◎', title: 'Manifest', desc: 'Goals → milestones → tasks.', val: D.manifests.filter(m => !m.achievedAt).length, fn: () => go('manifest') })}
    ${row({ icon: '▮', title: 'Calendar', desc: 'Eras. The year at a glance.', fn: () => go('calendar') })}
    ${sect('LOG', 'All', () => go('log'))}
    ${D.log.length ? term('', D.log.slice(0, 5).map(e => [fmtDate(e.t), esc(e.msg)])) : empty('Nothing logged yet. Do something.')}`;
  },
  after() {
    const tick = () => {
      const el = $('#bday-live'); if (!el) return clearInterval(iv);
      let s = Math.max(0, Math.floor((+el.dataset.t - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60);
      el.textContent = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s - m * 60).padStart(2, '0')}`;
    };
    const iv = setInterval(tick, 1000); tick();
  },
});
