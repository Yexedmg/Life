// Worlds: Ratings (⭐) and Money (balance and goal only — no career detail).
import { D, commit } from '../store.js';
import { BLANK, TIER_COLOR, TIERS, uid, CAP } from '../schema.js';
import { page, go, on, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, tierBadge } from '../ui.js';
import { nodePct, ratingsPct, findRating, money, fmtDate, clamp } from '../calc.js';
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
const goalForm = () => form({ title: 'Money goal', sub: 'How much are you chasing?', fields: [{ name: 'goal', label: 'The number ($)', type: 'number', min: 0, value: D.moneyGoal ?? '' }], submit: 'Call it', onSubmit: v => { D.moneyGoal = v.goal || null; } });
const balForm = (title, sign) => form({ title, fields: [{ name: 'n', label: sign ? 'How much? ($)' : "What's actually in the account? ($)", type: 'number', value: sign ? '' : D.player.stats.money, required: true }, ...(sign ? [{ name: 'why', label: 'For what?' }] : [])],
  onSubmit: v => { const s = D.player.stats; if (sign) { s.money += sign * v.n; log(`${sign > 0 ? '+' : '−'}${money(v.n)}${v.why ? ' — ' + v.why : ''}`, 'event'); } else { s.money = v.n; log(`Balance set to ${money(v.n)}`, 'event'); } } });
page('money', {
  title: '$ MONEY',
  render() {
    const s = D.player.stats, g = D.moneyGoal;
    return `<div class="card hero sh-gold"><small>$ IN THE ACCOUNT</small><div class="count"><b>${money(s.money)}</b></div></div>
    <div class="btns">${btn('Add', () => balForm('Add money', 1), 'good')}${btn('Spent', () => balForm('Spent', -1), 'warm')}${btn('Set balance', () => balForm('Balance', 0))}</div>
    <div class="card ${g ? '' : 'dashed'}" ${on(goalForm)}><small>$ THE GOAL</small>${g ? `<div class="split"><h3>${money(g)}</h3><b>${Math.round(clamp(s.money / g * 100))}%</b></div>${bar(s.money / g * 100, 'gold')}<div class="split dim"><span>${money(Math.max(0, g - s.money))} to go</span><span>tap to change</span></div>` : '<p>What number are you chasing? Tap to set it.</p>'}</div>`;
  },
});
