// Worlds: Ratings (⭐) and Money (balance and goal only — no career detail).
import { D, commit } from '../store.js';
import { BLANK, TIER_COLOR, TIERS, TIER_VAL, uid, CAP } from '../schema.js';
import { page, go, on, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, tierBadge } from '../ui.js';
import { nodePct, ratingsPct, findRating, money, fmtDate, clamp } from '../calc.js';
import { log, gain } from '../game.js';
import { factorPanel } from './home.js';

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
      log(`Upgraded ${it.name} (${it.tier}) ➜ ${u.name} (${u.tier}) for ${money(u.price)}`, 'upgrade'); gain('looks', 1, u.name); it.name = u.name; it.tier = u.tier; it.later = false; it.upgrade = null; commit(); toast('Upgraded. That gap just closed.'); };
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
    return `${factorPanel('looks')}
    <div class="card hero sh-gold"><small>⭐ EVERYTHING YOU RUN — RATED S TO F, PUSHED TO ITS POTENTIAL</small><div class="count"><b>${p == null ? '—' : Math.round(p) + '%'}</b><span>of potential<br>100% = everything S</span></div>${p == null ? '' : bar(p, 'pot')}</div>
    <div class="card" ${on(() => go('wardrobe'))}><div class="split"><h3>◆ Wardrobe</h3><b>${D.outfits.length} outfit${D.outfits.length === 1 ? '' : 's'} →</b></div>${D.outfits.length ? potBar(outfitPct()) : '<div class="split dim"><span>How many complete outfits do you own?</span></div>'}</div>
    <div class="card" ${on(() => go('keyitems'))}><div class="split"><h3>◆ Key items</h3><b>${D.keyItems.filter(k => k.has).length} / ${D.keyItems.length} →</b></div></div>
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

// ════════ WARDROBE ════════
const OCC = ['Everyday', 'Going out', 'Date', 'Gym', 'Formal', 'Work'];
const outfitPct = () => (D.outfits.length ? D.outfits.reduce((n, o) => n + TIER_VAL[o.tier], 0) / (D.outfits.length * 6) * 100 : null);
const potBar = p => `${bar(p, 'pot')}<div class="split dim"><span>${Math.round(p)}% of potential</span><span>${Math.round(100 - p)}% gap</span></div>`;
function outfitForm(o) {
  form({ title: o ? `Edit ${o.name}` : 'New outfit', sub: 'A complete outfit you can put on and walk out in.',
    fields: [{ name: 'name', label: 'Name it', value: o?.name, required: true, placeholder: 'Black fit, Summer linen…' }, { name: 'tier', label: 'How good is it, really?', type: 'tier', value: o?.tier || 'C' },
      { name: 'occasion', label: 'What is it for?', type: 'seg', value: o?.occasion || '', options: [['', 'Any'], ...OCC.map(x => [x, x])] }, { name: 'pieces', label: "What's in it?", type: 'textarea', value: o?.pieces, placeholder: 'Jacket, tee, trousers, shoes…' }],
    onSubmit: v => { const data = { name: v.name, tier: v.tier || 'C', occasion: v.occasion, pieces: v.pieces }; if (o) Object.assign(o, data); else { D.outfits.push({ ...BLANK.outfit(), ...data }); gain('looks', 1, 'new outfit: ' + v.name); log(`New outfit: ${v.name} (${data.tier})`, 'upgrade'); } },
    onDelete: o ? () => destroy(`${o.name} — out of the wardrobe.`, () => { D.outfits = D.outfits.filter(x => x !== o); }) : null });
}
page('wardrobe', {
  title: 'WARDROBE',
  render() {
    const p = outfitPct(), by = {}; for (const o of D.outfits) (by[o.occasion || 'Any'] ||= []).push(o);
    const order = [...OCC, 'Any'].filter(k => by[k]);
    return `<div class="card hero sh-purple"><small>◆ WARDROBE — outfits you can actually wear</small><div class="count"><b>${D.outfits.length}</b><span>outfit${D.outfits.length === 1 ? '' : 's'}<br>${order.length} occasion${order.length === 1 ? '' : 's'} covered</span></div>${p == null ? '' : potBar(p)}</div>
    <div class="btns">${btn('+ Outfit', () => outfitForm(), 'good')}</div>
    ${order.map(k => `<div class="benchl">${k.toUpperCase()} · ${by[k].length}</div>${by[k].sort((a, b) => TIER_VAL[b.tier] - TIER_VAL[a.tier]).map(o => `<div class="row" ${on(() => outfitForm(o))}><div class="ric">${tierBadge(o.tier)}</div><div class="rbody"><b>${esc(o.name)}</b>${o.pieces ? `<small>${esc(o.pieces)}</small>` : ''}</div></div>`).join('')}`).join('') || empty('Empty wardrobe. How many complete outfits do you own? Add them and rate them.')}
    ${OCC.filter(k => !by[k]).length && D.outfits.length ? `<p class="hint">Nothing for: ${OCC.filter(k => !by[k]).join(', ')}</p>` : ''}`;
  },
});

// ════════ KEY ITEMS ════════
// Crucial equipment. Like a game's key items: you either have it or you don't, and some doors stay shut until you do.
function keyItemForm(k) {
  form({ title: k ? k.name : 'New key item', sub: 'A piece of equipment that changes what you can do.',
    fields: [{ name: 'name', label: 'What is it?', value: k?.name, required: true, placeholder: 'Car, licence, own place…' }, { name: 'icon', label: 'Icon', value: k?.icon || '◆' },
      { name: 'has', label: 'I have it', type: 'check', value: k?.has }, { name: 'transport', label: 'This is a mode of transport', type: 'check', value: k?.transport }, { name: 'detail', label: 'Which one do you have?', value: k?.detail, placeholder: 'VW Polo 2015' }, { name: 'tier', label: 'How good is it, really?', type: 'tier', value: k?.tier || 'C' },
      { name: 'wantName', label: k?.has ? 'The upgrade you want' : 'The one you want', value: k?.wantName, placeholder: 'BMW 1 Series' }, { name: 'wantPrice', label: 'What does it cost? ($)', type: 'number', min: 0, value: k?.wantPrice || '' },
      { name: 'notes', label: 'Notes', type: 'textarea', value: k?.notes }],
    onSubmit: v => { const data = { name: v.name, icon: v.icon || '◆', has: v.has, detail: v.has ? v.detail : '', tier: v.tier || 'C', wantName: v.wantName, wantPrice: Math.max(0, v.wantPrice || 0), notes: v.notes, transport: !!v.transport };
      if (k) { if (v.has && !k.has) data.gotAt = Date.now(); Object.assign(k, data); } else D.keyItems.push({ ...BLANK.keyItem(), ...data, gotAt: v.has ? Date.now() : null }); },
    onDelete: k ? () => destroy(`${k.name} — removed from key items.`, () => { D.keyItems = D.keyItems.filter(x => x !== k); }) : null });
}
function gotKeyItem(k) {
  const snap = JSON.stringify(D.keyItems), what = k.wantName || k.name;
  Object.assign(k, { has: true, detail: k.wantName || k.detail, tier: k.wantName ? 'A' : k.tier, wantName: '', wantPrice: 0, gotAt: Date.now() });
  log(`Key item obtained: ${k.name}${k.detail ? ' — ' + k.detail : ''}`, 'upgrade'); commit();
  toast(`${what} — obtained.`, () => { D.keyItems = JSON.parse(snap); commit(); });
}
page('keyitems', {
  title: 'KEY ITEMS',
  render() {
    const have = D.keyItems.filter(k => k.has), bal = D.player.stats.money;
    const card = k => { const pct = k.wantPrice ? clamp(bal / k.wantPrice * 100) : 0;
      return `<div class="card kitem ${k.has ? 'has' : 'dashed'}"><div class="split" ${on(() => keyItemForm(k))}><h3><i>${esc(k.icon)}</i> ${esc(k.name)}</h3><b class="${k.has ? 'green' : 'red'}">${k.has ? 'OBTAINED' : 'MISSING'}</b></div>
        ${k.has ? `<div class="split dim" ${on(() => keyItemForm(k))}><span>${tierBadge(k.tier)} ${esc(k.detail || 'no detail')}</span><span>${k.gotAt ? fmtDate(k.gotAt) : ''}</span></div>` : ''}
        ${k.wantName || (!k.has && k.wantPrice) ? `<div class="split"><span>${k.has ? 'upgrade' : 'want'}: ${esc(k.wantName || k.name)}</span><b>${k.wantPrice ? money(k.wantPrice) : ''}</b></div>${k.wantPrice ? `${bar(pct, 'gold')}<div class="split dim"><span>${bal >= k.wantPrice ? 'You can afford it.' : money(k.wantPrice - bal) + ' to go'}</span><span>${Math.round(pct)}%</span></div>` : ''}` : ''}
        ${k.notes ? `<p>${esc(k.notes)}</p>` : ''}
        <div class="catfoot"><button class="sbtn ghost" ${on(() => keyItemForm(k))}>✎ Edit</button>${!k.has || k.wantName ? `<button class="sbtn" ${on(() => gotKeyItem(k))}>Got it</button>` : ''}</div></div>`; };
    return `<div class="card hero sh-gold"><small>◆ KEY ITEMS — crucial equipment</small><div class="count"><b>${have.length}</b><span>/ ${D.keyItems.length} obtained</span></div>${bar(D.keyItems.length ? have.length / D.keyItems.length * 100 : 0, 'gold')}</div>
    <div class="btns">${btn('+ Key item', () => keyItemForm(), 'good')}</div>
    ${D.keyItems.map(card).join('') || empty('No key items. What equipment changes what you can do? A car, a licence, your own place.')}`;
  },
});

// ════════ MONEY ════════
const goalForm = () => form({ title: 'Money goal', sub: 'How much are you chasing?', fields: [{ name: 'goal', label: 'The number ($)', type: 'number', min: 0, value: D.moneyGoal ?? '' }], submit: 'Call it', onSubmit: v => { D.moneyGoal = v.goal || null; } });
const balForm = (title, sign) => form({ title, fields: [{ name: 'n', label: sign ? 'How much? ($)' : "What's actually in the account? ($)", type: 'number', value: sign ? '' : D.player.stats.money, required: true }, ...(sign ? [{ name: 'why', label: 'For what?' }] : [])],
  onSubmit: v => { const s = D.player.stats; if (sign) { s.money += sign * v.n; if (sign > 0) gain('money', v.n, v.why); log(`${sign > 0 ? '+' : '−'}${money(v.n)}${v.why ? ' — ' + v.why : ''}`, 'event'); } else { s.money = v.n; log(`Balance set to ${money(v.n)}`, 'event'); } } });
page('money', {
  title: '$ MONEY',
  render() {
    const s = D.player.stats, g = D.moneyGoal;
    return `${factorPanel('money')}
    <div class="card hero sh-gold"><small>$ IN THE ACCOUNT</small><div class="count"><b>${money(s.money)}</b></div></div>
    <div class="btns">${btn('Add', () => balForm('Add money', 1), 'good')}${btn('Spent', () => balForm('Spent', -1), 'warm')}${btn('Set balance', () => balForm('Balance', 0))}</div>
    <div class="card ${g ? '' : 'dashed'}" ${on(goalForm)}><small>$ THE GOAL</small>${g ? `<div class="split"><h3>${money(g)}</h3><b>${Math.round(clamp(s.money / g * 100))}%</b></div>${bar(s.money / g * 100, 'gold')}<div class="split dim"><span>${money(Math.max(0, g - s.money))} to go</span><span>tap to change</span></div>` : '<p>What number are you chasing? Tap to set it.</p>'}</div>`;
  },
});
