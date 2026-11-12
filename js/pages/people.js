// People: roster, relationship slots, meet, and the Social world.
import { D, commit, ui } from '../store.js';
import { BLANK, CAP } from '../schema.js';
import { page, go, on, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, tabs, setUi, fold } from '../ui.js';
import { girl, chasers, taken, meetBar, meetParts, expectedRarity, vibe, vibeCeiling, leadBar, r1, leadMethods } from '../calc.js';
import { addXP, applyEffects, log, setStatus } from '../game.js';
import { openElement, elementForm, lastChange } from './me.js';

const rar = n => `<span class="rar r${n}">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
const STATUS = { Talking: 'Talking', Dating: 'Dating', Common: 'Common', TheOne: 'THE ONE', Sidelined: 'Sidelined' };

function girlForm(g, preset = {}) {
  form({
    title: g ? `Edit ${g.name}` : 'Who did you meet?', sub: g ? '' : 'Real people only. This is a mirror, not a game of pretend.',
    fields: [{ name: 'name', label: 'Name', value: g?.name, required: true }, { name: 'origin', label: 'Where did you meet?', value: g?.origin ?? preset.origin ?? '' },
      { name: 'rarity', label: 'Rarity — how rare is she, honestly?', type: 'seg', value: g?.rarity || 3, options: [1, 2, 3, 4, 5].map(n => [n, n + '★']) },
      { name: 'affinity', label: 'Affinity — how into you is she?', type: 'range', min: 0, max: 100, value: g?.affinity ?? 10 },
      { name: 'looksLikeYou', label: "Looks-like-you — fit with who you are (shows after 3 dates)", type: 'range', min: 0, max: 100, value: g?.looksLikeYou ?? 50 },
      { name: 'notes', label: 'Notes', type: 'textarea', value: g?.notes }],
    submit: g ? 'Lock it in' : 'Add her',
    onSubmit: v => {
      v.rarity = +v.rarity || 3;
      if (g) Object.assign(g, v);
      else { D.girls.push({ ...BLANK.girl(), ...v }); log(`Met ${v.name} (${v.rarity}★)${v.origin ? ' — ' + v.origin : ''}`, 'meet'); addXP(5 + v.rarity * 4, `met ${v.name}`); }
    },
  });
}
function girlSheet(id) {
  modal(() => {
    const g = girl(id); if (!g) return null;
    const act = (label, fn, cls) => btn(label, () => { fn(); commit(); }, cls);
    const active = g.status === 'Talking' || g.status === 'Dating';
    const gate = (ok, label, why, fn, cls) => (ok ? act(label, fn, cls) : `<button class="btn" disabled>${label}<small>${why}</small></button>`);
    return `<h2>${esc(g.name)}</h2><p class="msub">${rar(g.rarity)} · ${STATUS[g.status]}${g.origin ? ' · ' + esc(g.origin) : ''}</p>
      <div class="split"><span>AFFINITY</span><b>${g.affinity} / 100</b></div>${bar(g.affinity, 'pink')}
      <div class="split"><span>LOOKS-LIKE-YOU</span><b>${g.dates >= 3 ? g.looksLikeYou + ' / 100' : `? — ${3 - g.dates} more date${3 - g.dates === 1 ? '' : 's'}`}</b></div>${bar(g.dates >= 3 ? g.looksLikeYou : 0, 'purple')}
      ${term('', [['DATES', g.dates], ['MET', new Date(g.createdAt).toLocaleDateString('en-GB')]])}
      ${g.notes ? `<p class="desc">${esc(g.notes)}</p>` : ''}
      <div class="btns">
        ${act('Hung out', () => { g.affinity = Math.min(100, g.affinity + 6); applyEffects({ social: 1, charm: 1 }); log(`Hung out with ${g.name}`, 'date'); addXP(4, `hung out with ${g.name}`); }, 'good')}
        ${act('Went on a date', () => { g.affinity = Math.min(100, g.affinity + 12); g.dates++; if (g.status === 'Talking') g.status = 'Dating'; applyEffects({ charm: 1 }); log(`Date #${g.dates} with ${g.name}`, 'date'); addXP(8, `date with ${g.name}`); }, 'good')}
        ${act('−5', () => { g.affinity = Math.max(0, g.affinity - 5); })}${act('+5', () => { g.affinity = Math.min(100, g.affinity + 5); })}
      </div><div class="btns">
        ${active ? gate(g.affinity >= 60, 'Make it official', 'needs affinity 60', () => { setStatus(g, 'Common'); log(`${g.name} — official. Slot 2.`, 'relationship'); addXP(25, `${g.name} said yes`); }, 'warm') : ''}
        ${g.status !== 'TheOne' && g.status !== 'Sidelined' ? gate(g.affinity >= 90 && g.looksLikeYou >= 70, 'She is The One', 'needs affinity 90 + looks-like-you 70', () => { setStatus(g, 'TheOne'); log(`${g.name} is THE ONE. Slot 1.`, 'relationship'); addXP(80, `${g.name} — The One`); }, 'warm') : ''}
        ${g.status !== 'Sidelined' ? act('Sideline', () => { setStatus(g, 'Sidelined'); log(`${g.name} sidelined`, 'relationship'); }) : act('Bring back', () => setStatus(g, 'Talking'))}
        ${btn('Edit', () => girlForm(g))}${btn('Release', () => { closeModal(); destroy(`${g.name} — released.`, () => { D.girls = D.girls.filter(x => x.id !== id); }); }, 'danger')}${btn('Close', closeModal)}
      </div>`;
  });
}
const girlCard = g => `<div class="row" data-name="${esc(g.name.toLowerCase())}" ${on(() => girlSheet(g.id))}><div class="rbody"><b>${esc(g.name)} ${rar(g.rarity)}</b><small>${STATUS[g.status]} · ${g.dates} date${g.dates === 1 ? '' : 's'}${g.origin ? ' · ' + esc(g.origin) : ''}</small>${bar(g.affinity, 'pink')}</div><div class="rval">${g.affinity}<em>/100</em></div></div>`;

function friendForm(f) {
  form({ title: f ? `Edit ${f.name}` : 'New friend', fields: [{ name: 'name', label: 'Name', value: f?.name, required: true }, { name: 'origin', label: 'Where from?', value: f?.origin },
    { name: 'rarity', label: 'Social star — how much do they open up your world?', type: 'seg', value: f?.rarity || 3, options: [1, 2, 3, 4, 5].map(n => [n, n + '★']) }, { name: 'notes', label: 'Notes', type: 'textarea', value: f?.notes }],
    onSubmit: v => { v.rarity = +v.rarity || 3; if (f) Object.assign(f, v); else { D.friends.push({ ...BLANK.friend(), ...v }); log(`New friend: ${v.name} (${v.rarity}★)`, 'friend'); } },
    onDelete: f ? () => destroy(`${f.name} — dropped.`, () => { D.friends = D.friends.filter(x => x !== f); }) : null, del: 'Drop' });
}
function friendSheet(id) {
  modal(() => {
    const f = D.friends.find(x => x.id === id); if (!f) return null;
    return `<h2>${esc(f.name)}</h2><p class="msub">${rar(f.rarity)}${f.origin ? ' · ' + esc(f.origin) : ''} · +${f.rarity * 0.5} Meet bar</p>${f.notes ? `<p class="desc">${esc(f.notes)}</p>` : ''}
      <div class="btns">${btn('Hung out', () => { applyEffects({ social: f.rarity, charm: 1 }); log(`Hung out with ${f.name}`, 'friend'); addXP(3 + f.rarity, `time with ${f.name}`); commit(); toast(`+${f.rarity} social`); }, 'good')}${btn('Edit', () => friendForm(f))}${btn('Close', closeModal)}</div>`;
  });
}

page('girls', {
  title: 'GIRLS',
  render() {
    const ch = chasers().length, r = D.relationships, one = girl(r.theOne);
    return `<div class="card hero sh-pink"><small>♦ ${one ? 'SLOT 1 — ' + esc(one.name).toUpperCase() : 'SLOT 1 — EMPTY'}</small><div class="count"><b>${ch} : 1</b><span>girls in play<br>${taken() ? taken() + ' slot' + (taken() === 1 ? '' : 's') + ' filled' : 'no girlfriend'}</span></div></div>
    ${row({ icon: '✦', title: 'The Entity', desc: 'Your overall magnetism.', val: r1(vibe()) + '%', fn: () => go('vibe') })}
    ${row({ icon: '≡', title: 'Roster', desc: `${D.girls.length} girls · ${D.friends.length} friends`, fn: () => go('roster') })}
    ${row({ icon: '♦', title: 'Life', desc: 'Relationship slots, chasers, sidelined.', val: one ? '1' : '<span class="red">EMPTY</span>', fn: () => go('life') })}
    ${row({ icon: '!', title: 'Meet', desc: 'Meet bar. Log your approaches.', val: Math.round(meetBar()) + '%', fn: () => go('meet') })}
    ${row({ icon: '◉', title: 'Lead Generation', desc: 'Where they come from.', val: r1(leadBar()) + '%', fn: () => go('leadgen') })}`;
  },
});
page('roster', {
  title: 'ROSTER',
  render() {
    const t = ui.rosterTab || 'girls';
    const girls = [...D.girls].sort((a, b) => b.rarity - a.rarity || b.affinity - a.affinity), friends = [...D.friends].sort((a, b) => b.rarity - a.rarity);
    return `${tabs([['girls', `Girls · ${girls.length}`], ['friends', `Friends · ${friends.length}`]], t, k => setUi('rosterTab', k))}
    <input id="rsearch" type="search" placeholder="Search…" autocomplete="off">
    ${t === 'girls' ? `${girls.map(girlCard).join('') || empty('Empty roster. Nobody to chase, nobody chasing. Go meet someone, then put her here.')}<div class="btns">${btn('+ I met someone', () => girlForm(), 'good')}</div>`
      : `${friends.map(f => `<div class="row" data-name="${esc(f.name.toLowerCase())}" ${on(() => friendSheet(f.id))}><div class="rbody"><b>${esc(f.name)} ${rar(f.rarity)}</b><small>${esc(f.origin || 'friend')}</small></div><div class="rval">+${f.rarity * 0.5}<em> meet</em></div></div>`).join('') || empty('No circle on record. Who are your people?')}<div class="btns">${btn('+ Friend', () => friendForm(), 'good')}</div>`}`;
  },
  after(view) {
    const s = view.querySelector('#rsearch');
    s?.addEventListener('input', () => view.querySelectorAll('[data-name]').forEach(r => { r.style.display = r.dataset.name.includes(s.value.toLowerCase()) ? '' : 'none'; }));
  },
});
page('life', {
  title: 'LIFE',
  render() {
    const r = D.relationships, one = girl(r.theOne), ch = chasers().sort((a, b) => b.affinity - a.affinity);
    const list = ids => ids.map(girl).filter(Boolean).map(girlCard).join('');
    return `<div class="card hero sh-pink"><small>♦ THE RATIO</small><div class="count"><b>${ch.length} : 1</b><span>girls chasing you</span></div></div>
    ${sect('SLOT 1 — THE ONE')}
    ${one ? girlCard(one) : `<div class="slot big"><span>EMPTY</span><small>${ch.length ? 'Affinity 90 + looks-like-you 70 gets someone here. Who is closest?' : "Nobody's even in play. This doesn't fill itself."}</small></div>`}
    ${sect('SLOT 2 — THE COMMONS')}
    ${list(r.commons) || empty('Empty. Affinity 60 makes it official.')}
    ${sect(`CHASERS · ${ch.length}`, '+ Met someone', () => girlForm())}
    ${ch.map(girlCard).join('') || empty('Nobody talking, nobody dating. Leads first: go generate.')}
    ${r.sidelined.length ? sect(`SIDELINED · ${r.sidelined.length}`) + list(r.sidelined) : ''}`;
  },
});
page('meet', {
  title: 'MEET',
  render() {
    const p = meetBar(), s = D.player.stats, st = D.player.streaks;
    const landed = () => { applyEffects({ boldness: 2, fear: -1 }); st.coldApproach++; log(`Cold approach landed. Streak ${st.coldApproach}.`, 'meet'); addXP(5, 'approach landed'); commit(); girlForm(null, { origin: 'Cold approach' }); };
    const missed = () => { applyEffects({ fear: 2 }); st.coldApproach = 0; log('Cold approach — rejected. Streak reset.', 'meet-miss'); addXP(2, 'you still walked up'); commit(); toast('Fear +2. You still did it. Go again.'); };
    return `<div class="card hero sh-green"><small>! MEET BAR — how likely the right one notices</small><div class="count"><b>${Math.round(p)}%</b><span>can pass 100<br>expect ${expectedRarity(p)}★</span></div>${bar(p, 'green')}</div>
    ${sect('COLD APPROACH — log it the moment it happens')}
    <div class="card"><div class="split"><span>STREAK</span><b>${st.coldApproach}</b></div><div class="split"><span>BOLDNESS vs FEAR</span><b class="${s.fear > s.boldness ? 'red' : 'green'}">${r1(s.boldness)} vs ${r1(s.fear)}</b></div>
      <div class="btns">${btn('It landed', landed, 'good')}${btn('Got rejected', missed, 'warm')}</div></div>
    ${fold('meet', 'What moves the bar', () => term('', meetParts().map(([l, v]) => [l, (v >= 0 ? '+' : '') + r1(v), v < 0 ? 'red' : v > 0 ? 'green' : ''])))}`;
  },
});

// ── Social world
page('social', {
  title: 'SOCIAL',
  render() {
    const soc = D.meStats.filter(m => /social|circle|friend/i.test(m.title)), ev = leadMethods().find(m => m.id === 'lm-event');
    const area = (i, t, d, fn) => `<div class="qa tall" ${on(fn)}><i>${i}</i><b>${t}</b><small>${d}</small></div>`;
    return `<div class="grid2">
      ${area('♦', 'Girls', `${D.girls.length} on the roster`, () => go('girls'))}
      ${area('⌘', 'Social life', `${D.socialMedia.length} platforms`, () => go('socialmedia'))}
      ${area('●', 'Circle', `${D.friends.length} friends`, () => { ui.rosterTab = 'friends'; go('roster'); })}
      ${area('!', 'Meet', `${Math.round(meetBar())}% meet bar`, () => go('meet'))}
      ${area('◉', 'Events & Parties', 'Host. Be the reason people gather.', () => (ev ? go('leadmethod', { id: ev.id }) : go('leadgen')))}
    </div>
    ${sect('YOUR SOCIAL STATS')}
    ${soc.length ? term('', soc.map(m => [esc(m.title), `${m.level} / ${CAP}`])) : empty('No body-map stat named social / circle / friends yet.')}`;
  },
});
page('socialmedia', {
  title: 'SOCIAL MEDIA',
  render() {
    return `${sect('PLATFORMS', '+ Platform', () => elementForm('sm'))}
    ${D.socialMedia.map(p => `<div class="card" ${on(() => openElement('sm', p.id))}><div class="split"><h3>${esc(p.title)}</h3><b>${p.level} / ${CAP}</b></div>${bar(p.level / CAP * 100, 'cyan')}
      ${p.desc ? `<p>${esc(p.desc)}</p>` : ''}<div class="split dim"><span>⚡ FEEDS → ONLINE PRESENCE</span><span>${lastChange(p)}</span></div></div>`).join('') || empty('No platforms. Which accounts are you actually building? How alive are they?')}`;
  },
});
