// The slot engine's three faces: Activities, Lead Generation, The Entity. One board component for all.
import { D, commit } from '../store.js';
import { BLANK, DIFFS, ROIS, ROI_TIER, ROI_COLOR, GAIN, STAT, LEAD_MAX_STARS, LEADS_PER_STAR } from '../schema.js';
import { page, go, on, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, isCol, toggleCol, fold } from '../ui.js';
import { actCats, actSections, leadMethods, slotted, isSlotted, slottedActivities, slotHours, sum, parseRange, fxKeys, itemGain, methodGain, leadBar, leadCeiling,
  leadStars, totalLeads, methodRoi, compGain, vibe, vibeCeiling, actVibe, r1, balance, curBorough, scopeOwner } from '../calc.js';
import { slotItem, unslot, setMaxSlots, removeItem, doActivity, fxText } from '../game.js';

// ── Generic board: N slots + bench. tile(item) renders, open(item) is the tap action.
export function slotBoard(c, { tile, open }) {
  const bench = c.inventory.filter(i => !isSlotted(c, i.id));
  const pick = idx => {
    if (!bench.length) return toast('Bench is empty. Add something first.');
    modal(() => `<h2>Slot ${idx + 1}</h2><p class="msub">What earns this slot?</p>${c.inventory.filter(i => !isSlotted(c, i.id)).map(it => `<div class="tile" ${on(() => { slotItem(c, it.id, idx); closeModal(); commit(); })}>${tile(it)}</div>`).join('')}<div class="btns">${btn('Never mind', closeModal)}</div>`);
  };
  return `<div class="slots">${c.slots.map((id, i) => { const it = id && c.inventory.find(x => x.id === id);
      return it ? `<div class="slot filled" ${on(() => open(it))}>${tile(it)}</div>` : `<div class="slot" ${on(() => pick(i))}><span>＋ SLOT ${i + 1} — EMPTY</span></div>`; }).join('')}</div>
    ${bench.length ? `<div class="benchl">BENCH · ${bench.length}</div><div class="bench">${bench.map(it => `<div class="tile" ${on(() => open(it))}>${tile(it)}</div>`).join('')}</div>` : ''}`;
}
const stepper = (label, val, set, min, max) => `<div class="stepper"><span>${label}</span><button ${on(() => { if (val > min) { set(val - 1); commit(); } })}>−</button><b>${val}</b><button ${on(() => { if (val < max) { set(val + 1); commit(); } })}>+</button></div>`;
const slotBtns = (c, id) => (isSlotted(c, id) ? btn('Take it off', () => { unslot(c, id); commit(); }, 'warm') : btn('Slot it →', () => { if (slotItem(c, id)) commit(); }, 'good'));

// ════════ ACTIVITIES ════════
const KIND = { expansion: ['▲', 'Expansion'], maintenance: ['■', 'Maintenance'], cost: ['●', 'Cost'] };
const abilitiesFor = id => D.abilities.filter(a => a.assignments.some(x => x.itemId === id));
const abChips = id => abilitiesFor(id).map(a => `<em class="chip ${a.unlocked ? 'gold' : 'off'}">◈ ${esc(a.name)}</em>`).join('');
const actTile = it => `<div class="tl"><b><i class="k-${it.kind}">${KIND[it.kind]?.[0] || '■'}</i> ${esc(it.name)}</b><span>${it.realm === 'synthetic' ? '◇' : '⬢'}${it.time ? ' ' + esc(it.time) : ''}</span></div>
  <div class="chips"><em class="chip">+${it.xp} XP</em>${it.meetBonus ? `<em class="chip pink">meet +${it.meetBonus}</em>` : ''}${it.leadgen ? '<em class="chip gold">⚡ leads</em>' : ''}${fxText(it.statEffects) ? `<em class="chip cyan">${fxText(it.statEffects)}</em>` : ''}${abChips(it.id)}</div>`;

function activityForm(cat, it) {
  const r = parseRange(it?.time);
  form({
    title: it ? 'Edit activity' : `New activity — ${cat.name}`,
    fields: [{ name: 'name', label: 'What do you actually do?', value: it?.name, required: true },
      { name: 'from', label: 'From', type: 'time', value: r?.from || '' }, { name: 'to', label: 'Until', type: 'time', value: r?.to || '' },
      { name: 'kind', label: 'Does it grow you, hold you, or cost you?', type: 'seg', value: it?.kind || 'maintenance', options: Object.entries(KIND).map(([k, v]) => [k, `${v[0]} ${v[1]}`]) },
      { name: 'realm', label: 'Realm', type: 'seg', value: it?.realm || 'real', options: [['real', '⬢ Real'], ['synthetic', '◇ Synthetic']] },
      { name: 'meetBonus', label: 'Meet bonus — does it put you near people?', type: 'range', min: 0, max: 15, value: it?.meetBonus ?? 0 },
      { name: 'xp', label: 'XP per Do', type: 'number', min: 1, max: 50, step: 1, value: it?.xp ?? 5 },
      { name: 'leadgen', label: '⚡ Generates leads (mirrors into Lead Gen)', type: 'check', value: it?.leadgen },
      { name: 'statEffects', label: 'Stat effects per Do', type: 'fx', value: it?.statEffects || {} }],
    onSubmit: v => {
      if ((v.from || v.to) && !(v.from && v.to)) { toast('Both times, or neither.'); return false; }
      const data = { name: v.name, time: v.from ? `${v.from}–${v.to}` : '', kind: v.kind || 'maintenance', realm: v.realm || 'real', meetBonus: v.meetBonus || 0, xp: Math.max(1, Math.min(50, v.xp || 5)), leadgen: v.leadgen, statEffects: v.statEffects };
      if (it) Object.assign(it, data); else cat.inventory.push({ ...BLANK.activity(), ...data });
    },
  });
}
function activitySheet(catId, id) {
  modal(() => {
    const cat = actCats().find(c => c.id === catId), it = cat?.inventory.find(i => i.id === id); if (!it) return null;
    const move = () => form({ title: 'Move to category', fields: [{ name: 'to', label: 'Where does it belong?', type: 'select', value: cat.id, options: actCats().map(c => [c.id, c.name]) }],
      onSubmit: v => { const to = actCats().find(c => c.id === v.to); if (to && to !== cat) { removeItem(cat, it.id); to.inventory.push(it); } } });
    return `<h2>${esc(it.name)}</h2><p class="msub">${esc(cat.emoji)} ${esc(cat.name)} · ${isSlotted(cat, id) ? 'SLOTTED' : 'on the bench'}</p>
      ${term('', [['KIND', `${KIND[it.kind][0]} ${KIND[it.kind][1]}`], ['REALM', it.realm === 'synthetic' ? '◇ Synthetic' : '⬢ Real'], ['TIME', it.time ? `${esc(it.time)} · ${parseRange(it.time)?.hours}h` : '—'],
        ['MEET BONUS', `${it.meetBonus} / 15`], ['XP PER DO', it.xp], ['EFFECTS', fxText(it.statEffects) || '—'], ['VIBE WHEN SLOTTED', '+' + r1(actVibe(it))], ['LEADS', it.leadgen ? '⚡ feeds Lifestyle method' : '—']])}
      ${abChips(id) ? `<div class="chips">${abChips(id)}</div>` : ''}
      <div class="btns">${btn('Do it', () => { doActivity(it); commit(); }, 'good')}${slotBtns(cat, id)}${btn('Edit', () => activityForm(cat, it))}${btn('Move', move)}
      ${btn('Cut it', () => { closeModal(); destroy(`${it.name} — cut.`, () => removeItem(cat, id)); }, 'danger')}${btn('Close', closeModal)}</div>`;
  });
}
function categoryForm(cat) {
  const secs = actSections();
  form({
    title: cat ? 'Edit category' : 'New category',
    fields: [{ name: 'name', label: 'Name', value: cat?.name, required: true }, { name: 'emoji', label: 'Tag', value: cat?.emoji || '[···]', placeholder: '[SPT]' },
      { name: 'maxSlots', label: 'Slots', type: 'range', min: 1, max: 10, value: cat?.maxSlots ?? 2 },
      { name: 'sectionId', label: 'Section', type: 'select', value: cat?.sectionId || '', options: [['', '— Ungrouped —'], ...secs.map(s => [s.id, s.name])] }],
    onSubmit: v => { if (cat) { Object.assign(cat, { name: v.name, emoji: v.emoji, sectionId: v.sectionId || null }); setMaxSlots(cat, v.maxSlots); } else actCats().push({ ...BLANK.category(v.name, v.emoji || '[···]', v.maxSlots), sectionId: v.sectionId || null }); },
    onDelete: cat ? () => destroy(`${cat.name} — cut, with everything in it.`, () => { const l = actCats(); l.splice(l.indexOf(cat), 1); }) : null,
  });
}
function sectionForm(sec) {
  const secs = actSections();
  form({ title: sec ? 'Edit section' : 'New section', fields: [{ name: 'name', label: 'Name', value: sec?.name, required: true, placeholder: 'Main, Side, Career…' }],
    onSubmit: v => { if (sec) sec.name = v.name; else secs.push({ ...BLANK.section(), name: v.name }); },
    onDelete: sec ? () => destroy(`Section ${sec.name} — cut. Its categories are ungrouped.`, () => { secs.splice(secs.indexOf(sec), 1); }) : null });
}
const moveSec = (sec, d) => { const l = actSections(), i = l.indexOf(sec), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; commit(); };

function catCard(cat) {
  const n = slotted(cat).length, closed = cat.inventory.length ? isCol(cat.id) : !isCol('open-' + cat.id), tid = cat.inventory.length ? cat.id : 'open-' + cat.id;
  return `<div class="card cat"><div class="cathead" ${on(() => toggleCol(tid))}><b>${esc(cat.emoji)} ${esc(cat.name)}</b><span class="${n ? '' : 'red'}">${n}/${cat.maxSlots}</span><i>${closed ? '▸' : '▾'}</i></div>
    ${closed ? '' : `${slotBoard(cat, { tile: actTile, open: it => activitySheet(cat.id, it.id) })}
    <div class="catfoot"><button class="sbtn ghost" ${on(() => categoryForm(cat))}>✎ Edit</button><button class="sbtn" ${on(() => activityForm(cat))}>+ Item</button></div>`}</div>`;
}
page('activities', {
  title: 'ACTIVITIES',
  render() {
    const cats = actCats(), secs = actSections(), total = sum(cats.map(c => c.maxSlots)), filled = sum(cats.map(c => slotted(c).length)), b = balance(), bor = curBorough();
    const kinds = { expansion: 0, maintenance: 0, cost: 0 }; for (const a of slottedActivities()) kinds[a.item.kind]++;
    const loose = cats.filter(c => !c.sectionId);
    return `<div class="card sh-cyan"><div class="split"><h3>${filled} / ${total} slots filled${scopeOwner() !== D ? ` · ${esc(bor.name)}` : ''}</h3><b>${r1(slotHours())}h</b></div>${bar(total ? filled / total * 100 : 0, 'cyan')}
      <p>${b.verdict}</p></div>
    <div class="btns">${btn('+ Category', () => categoryForm(), 'good')}${btn('+ Section', () => sectionForm())}</div>
    ${secs.map((sec, i) => { const mine = cats.filter(c => c.sectionId === sec.id), closed = isCol(sec.id);
      return `<div class="sect"><span ${on(() => toggleCol(sec.id))}>${closed ? '▸' : '▾'} ${esc(sec.name)} · ${mine.length}</span><span class="secbtns">${i > 0 ? `<button class="sbtn ghost" ${on(() => moveSec(sec, -1))}>↑</button>` : ''}${i < secs.length - 1 ? `<button class="sbtn ghost" ${on(() => moveSec(sec, 1))}>↓</button>` : ''}<button class="sbtn ghost" ${on(() => sectionForm(sec))}>✎</button></span></div>
      ${closed ? '' : mine.map(catCard).join('') || empty('Empty section. Edit a category to move it here.')}`; }).join('')}
    ${secs.length && loose.length ? sect('UNGROUPED') : ''}${loose.map(catCard).join('')}
    ${!cats.length ? empty('No categories. What are the areas of your week? Tap + Category.') : ''}`;
  },
});

// ════════ LEAD GENERATION ════════
const star = on => `<svg class="star ${on ? 'on' : ''}" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z"/></svg>`;
const stars = (n, max = LEAD_MAX_STARS) => `<div class="stars">${Array.from({ length: max }, (_, i) => star(i < n)).join('')}</div>`;
const gainTile = maxGain => it => `<div class="tl" style="--c:${ROI_COLOR[it.roi]}"><b><i class="roi">◆</i> ${esc(it.name)}${it.sourceActivityId || it.sourcePlatformId ? ' <em class="chip gold">⚡ mirror</em>' : ''}</b><span class="gain">+${itemGain(it, maxGain)}%</span></div>
  <div class="chips"><em class="chip" style="color:${ROI_COLOR[it.roi]}">${ROI_TIER[it.roi]} · ${it.roi} ROI</em><em class="chip">${it.difficulty}</em>${it.leads != null ? `<em class="chip gold">${it.leads} leads · ${leadStars(it.leads)}/${LEAD_MAX_STARS}★</em>` : ''}${abChips(it.id)}</div>`;
const matrixFields = it => [{ name: 'name', label: 'What is it?', value: it?.name, required: true },
  { name: 'difficulty', label: 'How hard is it to run?', type: 'seg', value: it?.difficulty || 'easy', options: DIFFS.map(d => [d, d]) },
  { name: 'roi', label: 'What does it return?', type: 'seg', value: it?.roi || 'medium', options: ROIS.map(r => [r, r]) }];
const matrixTable = () => `<div class="panel"><div class="pt">GAIN MATRIX · difficulty × ROI</div><table class="mx"><tr><th></th>${ROIS.map(r => `<th style="color:${ROI_COLOR[r]}">${r.replace('medium', 'med').replace('very-', 'v.')}</th>`).join('')}</tr>
  ${DIFFS.map(d => `<tr><th>${d}</th>${ROIS.map(r => `<td>${GAIN[d][r]}</td>`).join('')}</tr>`).join('')}</table></div>`;

function methodForm(m) {
  form({ title: m ? 'Edit method' : 'New lead method', sub: 'A way you meet people or generate opportunity.',
    fields: [{ name: 'name', label: 'Name', value: m?.name, required: true }, { name: 'emoji', label: 'Icon', value: m?.emoji || '◉' },
      ...(m ? [] : [{ name: 'maxSlots', label: 'Slots', type: 'range', min: 1, max: 10, value: 2 }, { name: 'maxGain', label: 'Max gain % per item', type: 'range', min: 1, max: 30, value: 15 }])],
    onSubmit: v => { if (m) Object.assign(m, { name: v.name, emoji: v.emoji }); else leadMethods().push(BLANK.method(undefined, v.name, v.emoji || '◉', v.maxSlots, v.maxGain)); },
    onDelete: m ? () => destroy(`${m.name} — cut.`, () => { const l = leadMethods(); l.splice(l.indexOf(m), 1); }) : null });
}
function leadSheet(mid, id) {
  modal(() => {
    const m = leadMethods().find(x => x.id === mid), it = m?.inventory.find(i => i.id === id); if (!it) return null;
    const mirror = it.sourceActivityId || it.sourcePlatformId, add = n => btn(n > 0 ? '+' + n : n, () => { it.leads = Math.max(0, it.leads + n); commit(); }, n > 0 ? 'good' : '');
    return `<h2>${esc(it.name)}</h2><p class="msub" style="color:${ROI_COLOR[it.roi]}">${ROI_TIER[it.roi]} · ${it.difficulty} / ${it.roi} ROI → +${itemGain(it, m.maxGain)}% (cap ${m.maxGain}%)</p>
      <div class="panel gold"><div class="pt">LEADS · ${it.leads} · ${leadStars(it.leads)}/${LEAD_MAX_STARS}★</div>${stars(leadStars(it.leads))}<p>${LEADS_PER_STAR - it.leads % LEADS_PER_STAR} more to the next star.</p><div class="btns">${add(-1)}${add(1)}${add(10)}</div></div>
      ${mirror ? `<p class="desc">⚡ Mirrored from ${it.sourceActivityId ? 'an activity' : 'a social platform'}. It follows its source.</p>` : ''}
      <div class="btns">${slotBtns(m, id)}${mirror ? '' : btn('Edit', () => form({ title: 'Edit lead source', fields: matrixFields(it), onSubmit: v => Object.assign(it, { name: v.name, difficulty: v.difficulty, roi: v.roi }) }))}
      ${btn('Cut it', () => { if (mirror) return toast(it.sourceActivityId ? "Toggle 'Generates Leads' off on the activity to remove this." : 'Remove the platform in Social Media to remove this.'); closeModal(); destroy(`${it.name} — cut.`, () => removeItem(m, id)); }, 'danger')}${btn('Close', closeModal)}</div>`;
  });
}
page('leadgen', {
  title: 'LEAD GENERATION',
  render() {
    const ms = leadMethods(), lb = leadBar(), tl = totalLeads();
    return `<div class="card hero sh-pink"><small>◉ LEAD BAR — the mean of everything slotted</small><div class="count"><b>${r1(lb)}%</b><span>of ${leadCeiling()}% ceiling<br>a weak item lowers it</span></div>${bar(lb / leadCeiling() * 100, 'pink')}</div>
    <div class="card sh-gold"><small>POTENTIAL LEADS · 20 leads = 1 star</small><div class="split"><h3>${tl} leads</h3><b>${leadStars(tl)}/${LEAD_MAX_STARS}★</b></div>${stars(leadStars(tl))}</div>
    ${sect('METHODS', '+ Method', () => methodForm())}
    ${ms.map(m => { const roi = methodRoi(m), n = slotted(m).length;
      return `<div class="row" ${on(() => go('leadmethod', { id: m.id }))}><div class="ric">${esc(m.emoji)}</div><div class="rbody"><b>${esc(m.name)}</b><small>${n}/${m.maxSlots} slotted · ${m.inventory.length} in inventory${roi ? ` · <span style="color:${ROI_COLOR[roi]}">${ROI_TIER[roi]}</span>` : ''}</small></div><div class="rval ${n ? '' : 'muted'}">+${r1(methodGain(m))}%</div><div class="rarr">→</div></div>`; }).join('') || empty('No methods. How do you meet people?')}
    ${fold('matrix', 'How gain is calculated', matrixTable)}`;
  },
});
page('leadmethod', {
  title: p => leadMethods().find(m => m.id === p.id)?.name || 'Method',
  render({ id }) {
    const m = leadMethods().find(x => x.id === id); if (!m) return null;
    const edit = isCol('edit-' + id), auto = id === 'lm-lifestyle' || id === 'lm-online';
    const addItem = () => form({ title: `New lead source — ${m.name}`, fields: matrixFields(), onSubmit: v => { m.inventory.push({ ...BLANK.leadItem(), name: v.name, difficulty: v.difficulty, roi: v.roi }); } });
    return `<div class="card sh-pink"><small>${esc(m.emoji)} METHOD · max gain ${m.maxGain}% per item</small><div class="split"><h3>+${r1(methodGain(m))}%</h3><b>${slotted(m).length}/${m.maxSlots} slotted</b></div>${bar(methodGain(m) / m.maxGain * 100, 'pink')}
      <div class="split dim"><span>${sum(m.inventory.map(i => i.leads))} leads</span><span>${leadStars(sum(m.inventory.map(i => i.leads)))}/${LEAD_MAX_STARS}★</span></div></div>
    ${auto ? `<p class="desc">⚡ ${id === 'lm-online' ? 'Your social platforms mirror in here — their level sets the ROI.' : "Activities marked 'Generates Leads' mirror in here."}</p>` : ''}
    ${sect('SLOTS', edit ? '✓ Done' : '✎ Edit', () => toggleCol('edit-' + id))}
    ${edit ? `<div class="card">${stepper('SLOTS', m.maxSlots, v => setMaxSlots(m, v), 1, 10)}${stepper('MAX GAIN %', m.maxGain, v => { m.maxGain = v; }, 1, 30)}<div class="btns">${btn('+ Lead source', addItem, 'good')}${btn('Rename / cut method', () => methodForm(m))}</div></div>` : ''}
    ${slotBoard(m, { tile: gainTile(m.maxGain), open: it => leadSheet(id, it.id) })}
    ${!m.inventory.length ? empty('Nothing in this method yet.') : ''}
    <div class="btns">${btn('+ Lead source', addItem, 'good')}</div>`;
  },
});

// ════════ THE ENTITY ════════
function compForm(c) {
  form({ title: c ? 'Edit component' : 'New component', sub: 'A part of your overall magnetism.',
    fields: [{ name: 'name', label: 'Name', value: c?.name, required: true }, { name: 'emoji', label: 'Icon', value: c?.emoji || '✦' }, { name: 'desc', label: 'What does it measure?', type: 'textarea', value: c?.desc }],
    onSubmit: v => { if (c) Object.assign(c, v); else D.vibeComponents.push({ ...BLANK.component(undefined, v.name, v.emoji || '✦', v.desc) }); },
    onDelete: c ? () => destroy(`${c.name} — cut.`, () => { D.vibeComponents.splice(D.vibeComponents.indexOf(c), 1); }) : null });
}
function compSheet(cid, id) {
  modal(() => {
    const c = D.vibeComponents.find(x => x.id === cid), it = c?.inventory.find(i => i.id === id); if (!it) return null;
    return `<h2>${esc(it.name)}</h2><p class="msub" style="color:${ROI_COLOR[it.roi]}">${ROI_TIER[it.roi]} · ${it.difficulty} / ${it.roi} ROI → +${itemGain(it, c.maxGain)}%</p>
      <div class="btns">${slotBtns(c, id)}${btn('Edit', () => form({ title: 'Edit input', fields: matrixFields(it), onSubmit: v => Object.assign(it, { name: v.name, difficulty: v.difficulty, roi: v.roi }) }))}
      ${btn('Cut it', () => { closeModal(); destroy(`${it.name} — cut.`, () => removeItem(c, id)); }, 'danger')}${btn('Close', closeModal)}</div>`;
  });
}
page('vibe', {
  title: 'THE ENTITY',
  render() {
    const v = vibe(), ceil = vibeCeiling(), lb = leadBar();
    return `<div class="card hero sh-purple"><small>✦ THE ENTITY — your overall magnetism</small><div class="count"><b>${r1(v)}%</b><span>of ${r1(ceil)}% ceiling<br>mean of every part below</span></div>${bar(v / ceil * 100, 'purple')}</div>
    ${sect('BREAKDOWN', '+ Component', () => compForm())}
    <div class="row" ${on(() => go('leadgen'))}><div class="ric">◉</div><div class="rbody"><b>Lead bar</b><small>How you meet people</small>${bar(lb / leadCeiling() * 100, 'pink')}</div><div class="rval">${r1(lb)}<em>/${leadCeiling()}%</em></div><div class="rarr">→</div></div>
    ${D.vibeComponents.map(c => { const g = compGain(c);
      return `<div class="row" ${on(() => go('vibecomp', { id: c.id }))}><div class="ric">${esc(c.emoji)}</div><div class="rbody"><b>${esc(c.name)}</b><small>${slotted(c).length}/${c.maxSlots} slotted${c.id === 'vc-vibe' ? ` · ${slottedActivities().length} activities feeding` : ''}</small>${bar(g / c.maxGain * 100, 'purple')}</div><div class="rval">${r1(g)}<em>/${c.maxGain}%</em></div><div class="rarr">→</div></div>`; }).join('')}`;
  },
});
page('vibecomp', {
  title: p => D.vibeComponents.find(c => c.id === p.id)?.name || 'Component',
  render({ id }) {
    const c = D.vibeComponents.find(x => x.id === id); if (!c) return null;
    const g = compGain(c), edit = isCol('edit-' + id), acts = slottedActivities();
    const addItem = () => form({ title: `New input — ${c.name}`, sub: 'Something you do or own that raises this.', fields: matrixFields(), onSubmit: v => { c.inventory.push({ ...BLANK.compItem(), name: v.name, difficulty: v.difficulty, roi: v.roi }); } });
    return `<div class="card sh-purple"><small>${esc(c.emoji)} COMPONENT</small><div class="split"><h3>${r1(g)}%</h3><b>of ${c.maxGain}% max</b></div>${bar(g / c.maxGain * 100, 'purple')}${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div>
    ${sect('SLOTS', edit ? '✓ Done' : '✎ Edit', () => toggleCol('edit-' + id))}
    ${edit ? `<div class="card">${stepper('SLOTS', c.maxSlots, v => setMaxSlots(c, v), 1, 10)}${stepper('MAX GAIN %', c.maxGain, v => { c.maxGain = v; }, 1, 30)}<div class="btns">${btn('Rename / cut component', () => compForm(c))}</div></div>` : ''}
    ${slotBoard(c, { tile: gainTile(c.maxGain), open: it => compSheet(id, it.id) })}
    <div class="btns">${btn('+ Input', addItem, 'good')}</div>
    ${id === 'vc-vibe' ? `${sect('FED BY YOUR SLOTTED ACTIVITIES', 'Activities', () => go('activities'))}
      ${acts.length ? term('1 + meet×0.5 + stats×0.3 each', [...acts.map(a => [esc(a.item.name), '+' + r1(actVibe(a.item)), 'green']), ['TOTAL BONUS', '+' + r1(sum(acts.map(a => actVibe(a.item))))]]) : empty('No slotted activities. Slot real activities and this rises on its own.')}` : ''}`;
  },
});
