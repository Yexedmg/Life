// Worlds: Ratings (⭐) and Money.
import { D, commit } from '../store.js';
import { BLANK, TIER_COLOR, TIERS, uid, CAP } from '../schema.js';
import { page, go, on, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, tierBadge } from '../ui.js';
import { nodePct, ratingsPct, findRating, money, fmtDate, fmtMonth, monthTs, streamPoints, streamValueAt, incomeAt, monthlyIncome, flowing, hourly, goalEta, clamp, sum, r1, leadBar } from '../calc.js';
import { log } from '../game.js';

// ════════ RATINGS ════════
const pot = n => { const p = nodePct(n); return p == null ? '<div class="split dim"><span>not rated yet</span></div>' : `${bar(p, 'pot')}<div class="split dim"><span>${Math.round(p)}% of potential</span><span>${Math.round(100 - p)}% gap</span></div>`; };
function nodeForm(list, n, layer) {
  form({ title: n ? `Edit ${n.name}` : layer === 1 ? 'New category' : 'New sub-part', sub: 'Everything you run — rated S to F.',
    fields: [{ name: 'name', label: 'What is it?', value: n?.name, required: true }, { name: 'rating', label: 'Your honest rating', type: 'tier', value: n?.rating || '' }, { name: 'desc', label: "What's the current setup?", type: 'textarea', value: n?.desc },
      { name: 'isRoutine', label: '⏱ This is a routine', type: 'check', value: !!n?.routine }, { name: 'minutes', label: 'Routine minutes', type: 'number', min: 0, step: 1, value: n?.routine?.minutes ?? '' }],
    onSubmit: v => { const data = { name: v.name, rating: v.rating || null, desc: v.desc, routine: v.isRoutine ? { is: true, minutes: v.minutes || 0 } : null }; if (n) Object.assign(n, data); else list.push({ ...BLANK.rating(), ...data }); },
    onDelete: n ? () => destroy(`${n.name} — cut, with everything under it.`, () => { list.splice(list.indexOf(n), 1); }) : null });
}
const tc = t => `<b style="color:${TIER_COLOR[t]}">${t}</b>`;
const upgHist = it => (it.upgrades.length ? `<div class="panel gold"><div class="pt">◆ PAST UPGRADES</div>${[...it.upgrades].reverse().slice(0, 10).map(u => `<div class="trow"><span>${fmtDate(u.t)}</span><b>${esc(u.fromName)} (${tc(u.fromTier)}) ➜ ${esc(u.toName)} (${tc(u.toTier)}) <em class="up">${money(u.price)}</em></b></div>`).join('')}</div>` : '');
function itemForm(node, it) {
  form({ title: it ? `Edit ${it.name}` : `New item — ${node.name}`,
    fields: [{ name: 'name', label: 'What do you use?', value: it?.name, required: true }, { name: 'tier', label: 'How good is it, really?', type: 'tier', value: it?.tier || 'C' },
      { name: 'later', label: "◇ Add later — planned, don't own it yet", type: 'check', value: it?.later },
      { name: 'upName', label: 'Planned upgrade — what replaces it? (optional)', value: it?.upgrade?.name }, { name: 'upTier', label: 'Upgrade tier', type: 'tier', value: it?.upgrade?.tier || 'S' },
      { name: 'upPrice', label: 'Upgrade price ($)', type: 'number', min: 0, value: it?.upgrade?.price ?? '' }],
    onSubmit: v => { const data = { name: v.name, tier: v.tier || 'C', later: v.later, upgrade: v.upName ? { name: v.upName, tier: v.upTier || 'S', price: v.upPrice || 0 } : null }; if (it) Object.assign(it, data); else node.items.push({ ...BLANK.ratingItem(), ...data }); },
    onDelete: it ? () => destroy(`${it.name} — cut.`, () => { node.items = node.items.filter(x => x !== it); }) : null });
}
function itemSheet(path, id) {
  modal(() => {
    const node = findRating(path), it = node?.items.find(i => i.id === id); if (!it) return null;
    const u = it.upgrade, bal = D.player.stats.money, can = u && bal >= u.price;
    const buy = () => { D.player.stats.money -= u.price; it.upgrades.push({ t: Date.now(), fromName: it.name, fromTier: it.tier, toName: u.name, toTier: u.tier, price: u.price });
      log(`Upgraded ${it.name} (${it.tier}) ➜ ${u.name} (${u.tier}) for ${money(u.price)}`, 'upgrade'); it.name = u.name; it.tier = u.tier; it.later = false; it.upgrade = null; commit(); toast('Upgraded. That gap just closed.'); };
    return `<h2>${esc(it.name)}</h2><p class="msub">${esc(node.name)}${it.later ? ' · ◇ planned, not owned yet' : ''}</p>
      ${u ? `<div class="upg"><div><small>CURRENT</small>${tierBadge(it.tier)}<b>${esc(it.name)}</b></div><i>➜</i><div><small>TARGET</small>${tierBadge(u.tier)}<b>${esc(u.name)}</b></div></div>
        ${term('', [['PRICE', money(u.price), 'gold'], ['YOUR BALANCE', money(bal), can ? 'green' : 'red']])}
        <div class="btns"><button class="btn good" ${can ? on(buy) : 'disabled'}>${can ? `Upgrade — ${money(u.price)}` : 'Not enough $'}</button></div>`
        : `<div class="upg"><div><small>CURRENT</small>${tierBadge(it.tier)}<b>${esc(it.name)}</b></div></div><p class="desc">No upgrade planned. ${it.tier === 'S' ? 'Already at the ceiling.' : 'What would replace it? Edit and plan one.'}</p>`}
      ${upgHist(it)}
      <div class="btns">${it.later ? btn('I own it now', () => { it.later = false; commit(); }, 'good') : ''}${btn('Edit', () => itemForm(node, it))}${btn('Close', closeModal)}</div>`;
  });
}
const nodeRow = (n, path) => `<div class="card" ${on(() => go('ratingdetail', { path }))}><div class="split"><h3>${tierBadge(n.rating)} ${esc(n.name)}</h3><b>→</b></div>${n.routine ? `<div class="chips"><em class="chip cyan">⏱ ${n.routine.minutes} min routine</em></div>` : ''}${pot(n)}</div>`;
page('ratings', {
  title: '⭐ RATINGS',
  render() {
    const p = ratingsPct();
    return `<div class="card hero sh-gold"><small>⭐ EVERYTHING YOU RUN — RATED S TO F, PUSHED TO ITS POTENTIAL</small><div class="count"><b>${p == null ? '—' : Math.round(p) + '%'}</b><span>of potential<br>100% = everything S</span></div>${p == null ? '' : bar(p, 'pot')}</div>
    ${sect('CATEGORIES', '+ Category', () => nodeForm(D.ratings, null, 1))}
    ${D.ratings.map(n => nodeRow(n, [n.id])).join('') || empty('Nothing to rate. What do you run every day?')}`;
  },
});
page('ratingdetail', {
  title: p => findRating(p.path)?.name || 'Rating',
  render({ path }) {
    const n = findRating(path); if (!n) return null;
    const layer = path.length, parentList = layer === 1 ? D.ratings : findRating(path.slice(0, -1)).children;
    const owned = n.items.filter(i => !i.later), later = n.items.filter(i => i.later);
    const itemRow = it => `<div class="row ${it.later ? 'dashed' : ''}" ${on(() => itemSheet(path, it.id))}><div class="ric">${tierBadge(it.tier)}</div><div class="rbody"><b>${esc(it.name)}</b>${it.upgrade ? `<small>➜ ${esc(it.upgrade.name)} (${it.upgrade.tier}) · ${money(it.upgrade.price)}</small>` : it.upgrades.length ? `<small>${it.upgrades.length} past upgrade${it.upgrades.length === 1 ? '' : 's'}</small>` : ''}</div>${it.upgrade ? `<div class="rval ${it.upgrade.price <= D.player.stats.money ? 'green' : 'muted'}">➜</div>` : ''}</div>`;
    return `<div class="card hero sh-gold"><small>LAYER ${layer} ${n.routine ? `· ⏱ ${n.routine.minutes} min routine` : ''}</small><h2>${tierBadge(n.rating)} ${esc(n.name)}</h2>${n.desc ? `<p>${esc(n.desc)}</p>` : ''}${pot(n)}
      <div class="btns">${btn('Edit / rate', () => nodeForm(parentList, n, layer))}</div></div>
    ${layer === 1 ? `${sect('PARTS', '+ Part', () => nodeForm(n.children, null, 2))}${n.children.map(c => nodeRow(c, [...path, c.id])).join('') || empty('No parts yet. Break it down — or just add items below.')}` : ''}
    ${sect('ITEMS', '+ Item', () => itemForm(n))}
    ${owned.map(itemRow).join('') || empty("What's the current setup? Add what you actually use.")}
    ${later.length ? `<div class="benchl">◇ ADD LATER</div>${later.map(itemRow).join('')}` : ''}`;
  },
});

// ════════ MONEY ════════
// Hand-built SVG line graph. pts: [{t, v, fn?}] — fn makes a point tappable.
function graph(line, { goal, marks = [] } = {}) {
  const t0 = line[0].t, t1 = line.at(-1).t, max = Math.max(1, goal || 0, ...line.map(p => p.v), ...marks.map(p => p.v)) * 1.1;
  const X = t => 40 + (t - t0) / Math.max(1, t1 - t0) * 310, Y = v => 170 - v / max * 150, k = v => (v >= 1000 ? '$' + r1(v / 1000) + 'k' : '$' + Math.round(v));
  const path = line.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  return `<svg class="graph" viewBox="0 0 360 200">${[0, .25, .5, .75, 1].map(f => `<line class="grid" x1="40" x2="350" y1="${Y(max * f)}" y2="${Y(max * f)}"/><text class="tk" x="36" y="${Y(max * f) + 3}" text-anchor="end">${k(max * f)}</text>`).join('')}
    ${[t0, (t0 + t1) / 2, t1].map((t, i) => `<text class="tk" x="${X(t)}" y="190" text-anchor="${['start', 'middle', 'end'][i]}">${fmtMonth(t)}</text>`).join('')}
    ${goal ? `<line class="goal" x1="40" x2="350" y1="${Y(goal)}" y2="${Y(goal)}"/><text class="gl" x="350" y="${Y(goal) - 4}" text-anchor="end">GOAL ${k(goal)}</text>` : ''}
    <path class="area" d="${path} L${X(t1)} 170 L${X(t0)} 170 Z"/><path class="ln" d="${path}"/>
    ${marks.map(p => `<circle class="pt" cx="${X(p.t)}" cy="${Y(p.v)}" r="6" ${p.fn ? on(p.fn) : ''}/>`).join('')}</svg>`;
}
const months = n => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); const o = [Date.now()]; for (let i = 0; i < n; i++) { d.setMonth(d.getMonth() + 1); o.push(d.getTime()); } return o; };
const goalForm = () => form({ title: 'Money goal', sub: 'How much are you chasing?', fields: [{ name: 'goal', label: 'The number ($)', type: 'number', min: 0, value: D.moneyGoal ?? '' }], submit: 'Call it', onSubmit: v => { D.moneyGoal = v.goal || null; } });
const balForm = (title, sign) => form({ title, fields: [{ name: 'n', label: sign ? 'How much? ($)' : "What's actually in the account? ($)", type: 'number', value: sign ? '' : D.player.stats.money, required: true }, ...(sign ? [{ name: 'why', label: 'For what?' }] : [])],
  onSubmit: v => { const s = D.player.stats; if (sign) { s.money += sign * v.n; log(`${sign > 0 ? '+' : '−'}${money(v.n)}${v.why ? ' — ' + v.why : ''}`, 'event'); } else { s.money = v.n; log(`Balance set to ${money(v.n)}`, 'event'); } } });
function etaText() { const e = goalEta(); return !e ? 'no goal' : e.done ? 'REACHED' : e.never ? 'never, at this income' : `${fmtMonth(e.date)} · ${e.months} mo`; }

page('money', {
  title: '$ MONEY',
  render() {
    const s = D.player.stats, g = D.moneyGoal, e = goalEta(), soc = D.meStats.filter(m => /money|financ|wealth|income|cash/i.test(m.title));
    return `<div class="card hero sh-gold ${g ? '' : 'dashed'}" ${on(goalForm)}><small>$ THE GOAL</small>${g ? `<div class="count"><b>${money(g)}</b><span>${Math.round(clamp(s.money / g * 100))}% there<br>${money(Math.max(0, g - s.money))} to go</span></div>${bar(s.money / g * 100, 'gold')}` : '<h2 class="muted">What number are you chasing?</h2><p>Tap to set it.</p>'}</div>
    ${term('BALANCE', [['IN THE ACCOUNT', money(s.money), 'gold'], ['GOAL ETA', etaText(), e?.never ? 'red' : '']])}
    <div class="btns">${btn('Got paid', () => balForm('Got paid', 1), 'good')}${btn('Spent', () => balForm('Spent', -1), 'warm')}${btn('Set balance', () => balForm('Balance', 0))}</div>
    ${row({ icon: '$', title: 'Income', desc: `${flowing().length} flowing · ${D.incomes.length - flowing().length} possible`, val: money(monthlyIncome()) + '<em>/mo</em>', fn: () => go('income') })}`;
  },
});
function incomeForm(i, status = 'active') {
  form({ title: i ? `Edit ${i.title}` : status === 'possible' ? 'Possible stream' : 'New income stream',
    fields: [{ name: 'title', label: 'Where does it come from?', value: i?.title, required: true }, { name: 'amount', label: `$ per month${(i?.status || status) === 'possible' ? ' — if it lands' : ''}`, type: 'number', min: 0, value: i?.amount ?? '' },
      { name: 'hoursPerWeek', label: 'Hours per week it costs you', type: 'number', min: 0, value: i?.hoursPerWeek ?? '' }, { name: 'desc', label: 'Notes', type: 'textarea', value: i?.desc }],
    onSubmit: v => { const data = { title: v.title, amount: v.amount || 0, hoursPerWeek: v.hoursPerWeek || 0, desc: v.desc }; if (i) Object.assign(i, data); else D.incomes.push({ ...BLANK.income(), ...data, status }); },
    onDelete: i ? () => destroy(`${i.title} — cut.`, () => { D.incomes = D.incomes.filter(x => x !== i); }) : null });
}
const streamRow = i => { const h = hourly(i); return `<div class="row ${i.status === 'possible' ? 'dashed' : ''}" ${on(() => go('incomedetail', { id: i.id }))}><div class="rbody"><b>${esc(i.title)}</b><small>${i.hoursPerWeek}h / week${h != null ? ` · ${money(h)}/h effective` : ''}${i.projections.length ? ` · ${i.projections.length} milestone${i.projections.length === 1 ? '' : 's'}` : ''}</small></div><div class="rval">${money(i.amount)}<em>/mo</em></div><div class="rarr">→</div></div>`; };
page('income', {
  title: 'INCOME',
  render() {
    const flow = flowing(), poss = D.incomes.filter(i => i.status === 'possible'), mi = monthlyIncome(), e = goalEta(), now = Date.now();
    const ts = months(e?.months ? Math.min(60, Math.max(12, e.months + 3)) : 24);
    return `${term('SUMMARY', [['PER MONTH', money(mi), 'green'], ['PER YEAR', money(mi * 12)], ['HOURS INVESTED', sum(flow.map(i => i.hoursPerWeek)) + 'h / week'],
      ['IF POSSIBLES LAND', '+' + money(sum(poss.map(i => i.amount))) + ' / mo', 'gold'], ['GOAL', etaText(), e?.never ? 'red' : '']])}
    ${flow.length ? `<div class="card"><small>PROJECTED INCOME / MONTH</small>${graph(ts.map(t => ({ t, v: incomeAt(t, now) })))}</div>` : ''}
    ${sect('FLOWING', '+ Stream', () => incomeForm())}
    ${flow.map(streamRow).join('') || empty('Nothing is flowing. Where does money come from?')}
    ${sect('POSSIBLE STREAMS', '+ Possible', () => incomeForm(null, 'possible'))}
    ${poss.map(streamRow).join('') || empty('What could pay you that does not yet?')}`;
  },
});
page('incomedetail', {
  title: p => D.incomes.find(i => i.id === p.id)?.title || 'Stream',
  render({ id }) {
    const i = D.incomes.find(x => x.id === id); if (!i) return null;
    const h = hourly(i), now = Date.now(), pts = streamPoints(i, now), end = Math.max(pts.at(-1).t, months(12).at(-1));
    const projForm = p => form({ title: p ? 'Edit milestone' : 'Projection milestone', sub: 'Where will this stream be, and when? Call your shot.',
      fields: [{ name: 'date', label: 'Month', type: 'month', value: p?.date, required: true }, { name: 'amount', label: '$ per month by then', type: 'number', min: 0, value: p?.amount ?? '', required: true }, { name: 'when', label: 'What has to happen?', value: p?.when }],
      submit: 'Call it', onSubmit: v => { if (monthTs(v.date) <= Date.now()) { toast('That month is already gone. Pick a future one.'); return false; } if (p) Object.assign(p, v); else i.projections.push({ id: uid(), ...v }); },
      onDelete: p ? () => destroy('Milestone cut.', () => { i.projections = i.projections.filter(x => x !== p); }) : null });
    const line = [...new Set([now, ...months(Math.ceil((end - now) / 2.63e9)), ...pts.map(p => p.t)])].filter(t => t <= end).sort((a, b) => a - b).map(t => ({ t, v: streamValueAt(i, t, now) }));
    const future = i.projections.filter(p => monthTs(p.date) > now).sort((a, b) => a.date.localeCompare(b.date));
    return `<div class="card hero ${i.status === 'possible' ? 'dashed' : 'sh-green'}"><small>$ ${i.status === 'possible' ? 'POSSIBLE STREAM — not flowing yet' : 'FLOWING'}</small><div class="count"><b>${money(i.amount)}</b><span>/ month<br>${money(i.amount * 12)} / year</span></div>${i.desc ? `<p>${esc(i.desc)}</p>` : ''}
      <div class="btns">${i.status === 'possible' ? btn('It landed', () => { i.status = 'active'; log(`${i.title} landed — ${money(i.amount)}/mo flowing`, 'event'); commit(); toast('It landed — start flowing.'); }, 'good') : ''}${btn('Edit', () => incomeForm(i))}</div></div>
    ${term('', [['HOURS / WEEK', i.hoursPerWeek + 'h'], ['EFFECTIVE HOURLY', h == null ? '—' : money(h) + ' / h', 'green']])}
    ${sect('PROJECTION', '+ Milestone', () => projForm())}
    <div class="card">${graph(line, { marks: pts.slice(1).map(p => ({ t: p.t, v: p.a, fn: () => projForm(i.projections.find(x => x.id === p.id)) })) })}</div>
    ${future.map(p => `<div class="row" ${on(() => projForm(p))}><div class="rbody"><b>${fmtMonth(monthTs(p.date))}</b><small>${esc(p.when || '')}</small></div><div class="rval">${money(p.amount)}<em>/mo</em></div></div>`).join('') || empty('No milestones. Where will this stream be in six months? Call your shot.')}`;
  },
});
