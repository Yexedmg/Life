// ME — body map, stat grid, the shared "rated element" sheet (body-map stats + platforms), Portal.
import { D, commit } from '../store.js';
import { BLANK, STATS, STAT, CAP, uid } from '../schema.js';
import { page, go, on, esc, form, modal, closeModal, destroy, toast, bar, sect, row, term, empty, btn, tierBadge } from '../ui.js';
import { moveUsage, fmtDate, money, girl, chasers, slottedActivities, weekStats, r1, clamp, ratingsPct, leadBar, vibe, meetBar, currentEra, gaps } from '../calc.js';
import { setLevel, applyEffects, log } from '../game.js';
import { northstarForm } from './home.js';

// ── Rated element: { title, desc, level 0–25, levelUp[], history[] }
const listOf = kind => (kind === 'me' ? D.meStats : D.socialMedia);
const WORDS = { me: { noun: 'part of you', q1: 'What part of you is this?', q2: 'How strong is it right now?' }, sm: { noun: 'platform', q1: 'Which platform?', q2: 'How alive is it right now?' } };

export function elementForm(kind, id) {
  const list = listOf(kind), el = list.find(e => e.id === id), w = WORDS[kind];
  form({
    title: el ? 'Edit ' + w.noun : 'New ' + w.noun,
    fields: [{ name: 'title', label: w.q1, value: el?.title, required: true }, { name: 'level', label: w.q2, type: 'range', min: 0, max: CAP, value: el?.level ?? 0 },
      { name: 'desc', label: "What's the current setup?", type: 'textarea', value: el?.desc }],
    submit: el ? 'Lock it in' : 'Put it on the map',
    onSubmit: v => {
      if (el) { el.title = v.title; el.desc = v.desc; setLevel(el, v.level); }
      else { list.push({ ...BLANK.element(), title: v.title, desc: v.desc, level: v.level, history: [{ t: Date.now(), from: null, to: v.level }] }); log(`New ${w.noun}: ${v.title} at ${v.level}/${CAP}`, 'upgrade'); }
    },
  });
}
export const lastChange = el => { const h = el.history.filter(x => x.from != null).at(-1); return h ? `last ${h.to > h.from ? '↑ +' : '↓ '}${h.to - h.from} · ${fmtDate(h.t)}` : ''; };
export function histHtml(el) {
  const h = [...el.history].reverse();
  return `<div class="panel gold"><div class="pt">◆ PAST UPGRADES</div>${h.length ? h.slice(0, 10).map(x => `<div class="trow"><span>${fmtDate(x.t)}</span><b>${x.from == null ? `started at ${x.to} / ${CAP}` : `${x.from} → ${x.to} / ${CAP} <em class="${x.to > x.from ? 'up' : 'down'}">${x.to > x.from ? '▲ +' : '▼ '}${x.to - x.from}</em>`}</b></div>`).join('') : '<p>No changes yet.</p>'}
    ${h.length > 10 ? `<p>+${h.length - 10} earlier</p>` : ''}</div>`;
}
export function openElement(kind, id) {
  modal(() => {
    const list = listOf(kind), el = list.find(e => e.id === id); if (!el) return null;
    const addMove = () => form({ title: 'Level-up move', sub: 'What exactly gets this to the next level? Write the move.', fields: [{ name: 'text', label: 'The move', required: true, placeholder: 'e.g. Train 3× a week' }],
      submit: 'Write it', onSubmit: v => { el.levelUp.push({ id: uid(), text: v.text }); setTimeout(() => openElement(kind, id)); } });
    return `<h2>${esc(el.title)}</h2>${kind === 'sm' ? '<p class="msub">⚡ FEEDS → ONLINE PRESENCE</p>' : ''}
      <div class="lvlset">${btn('−', () => { setLevel(el, el.level - 1); commit(); })}<div><b>${el.level}</b><span>/ ${CAP}</span></div>${btn('+', () => { setLevel(el, el.level + 1); commit(); }, 'good')}</div>
      ${bar(el.level / CAP * 100, 'cyan')}
      ${el.desc ? `<p class="desc">${esc(el.desc)}</p>` : ''}
      <div class="panel cyan"><div class="pt">⤴ LEVEL UP <button class="sbtn" ${on(addMove)}>+ Move</button></div>
        ${el.levelUp.length ? el.levelUp.map(m => { const u = moveUsage(el.id, m.id);
          return `<div class="move"><span>${esc(m.text)}</span><em class="${u.sched ? 'onc' : ''}">◷ schedule ×${u.sched}</em><em class="${u.alloc ? 'onc' : ''}">▮ time alloc ×${u.alloc}</em>
          <button ${on(() => destroy('Move cut.', () => { el.levelUp = el.levelUp.filter(x => x.id !== m.id); }))}>×</button></div>`; }).join('')
          : '<p>What exactly gets this to the next level? Write the moves.</p>'}</div>
      ${histHtml(el)}
      <div class="btns">${btn('Edit', () => elementForm(kind, id))}${btn('Cut it', () => { closeModal(); destroy(`${el.title} — cut.`, () => { const i = list.indexOf(el); list.splice(i, 1); }); }, 'danger')}${btn('Close', closeModal)}</div>`;
  });
}

// ── Body map
const SPOTS = [[/inner|organi[sz]ation|mind|mental|focus|discipline/i, 200, 34], [/circle|friends|network|crew/i, 220, 88], [/social/i, 140, 88], [/health|energy|sleep/i, 172, 118],
  [/physique|fitness|body|gym|muscle|strength/i, 120, 150], [/money|finance|wealth|income|cash/i, 240, 180], [/lifestyle|style|routine/i, 165, 300]];
const FALLBACK = [[180, 150], [200, 210], [160, 240], [196, 330], [180, 90]];
function spot(el, i) {
  if (el.mapX != null && el.mapY != null) return [el.mapX, el.mapY];
  for (const [re, x, y] of SPOTS) if (re.test(el.title)) return [x, y];
  return FALLBACK[i % FALLBACK.length];
}
const BODY = 'M180 66 C166 66 158 72 146 78 C124 86 112 96 108 122 L98 204 C96 218 112 222 115 208 L127 142 L130 214 L123 304 L119 394 C118 408 142 410 144 396 L171 246 L180 238 L189 246 L216 396 C218 410 242 408 241 394 L237 304 L230 214 L233 142 L245 208 C248 222 264 218 262 204 L252 122 C248 96 236 86 214 78 C202 72 194 66 180 66 Z';
function bodyMap() {
  const pts = D.meStats.map((el, i) => { const [x, y] = spot(el, i); return { el, x, y }; });
  const place = (list, left) => {
    list.sort((a, b) => a.y - b.y);
    const gap = Math.min(60, 380 / Math.max(1, list.length)), y0 = 210 - gap * (list.length - 1) / 2;
    return list.map((p, i) => {
      const ly = y0 + i * gap, lx = left ? 6 : 354, t = p.el.title.length > 13 ? p.el.title.slice(0, 12) + '…' : p.el.title;
      return `<line class="lead" x1="${left ? 6 : 354}" y1="${ly + 15}" x2="${left ? 84 : 276}" y2="${ly + 15}"/><line class="lead" x1="${left ? 84 : 276}" y1="${ly + 15}" x2="${p.x}" y2="${p.y}"/>
        <g data-el="${p.el.id}" class="lbl"><text x="${lx}" y="${ly - 2}" text-anchor="${left ? 'start' : 'end'}">${esc(t)}</text>
        <text class="lv" x="${lx}" y="${ly + 11}" text-anchor="${left ? 'start' : 'end'}">${p.el.level}/${CAP}</text></g>`;
    }).join('');
  };
  return `<svg id="bodymap" viewBox="0 0 360 420"><circle class="body" cx="180" cy="38" r="24"/><path class="body" d="${BODY}"/>
    ${place(pts.filter(p => p.x < 180), true)}${place(pts.filter(p => p.x >= 180), false)}
    ${pts.map(p => `<circle class="dot" data-el="${p.el.id}" cx="${p.x}" cy="${p.y}" r="9"/>`).join('')}</svg>`;
}
function bindMap(view) {
  const svg = view.querySelector('#bodymap'); if (!svg) return;
  const toSvg = e => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return [clamp(p.x, 100, 260), clamp(p.y, 12, 408)]; };
  svg.querySelectorAll('[data-el]').forEach(node => {
    const id = node.dataset.el, isDot = node.classList.contains('dot');
    let start = null, moved = false;
    node.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; moved = false; if (isDot) node.setPointerCapture(e.pointerId); });
    node.addEventListener('pointermove', e => {
      if (!start || !isDot) return;
      if (!moved && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) return;
      moved = true; const [x, y] = toSvg(e); node.setAttribute('cx', x); node.setAttribute('cy', y); node.classList.add('drag');
    });
    node.addEventListener('pointerup', e => {
      if (!start) return; start = null;
      if (moved) { const el = D.meStats.find(x => x.id === id), [x, y] = toSvg(e); el.mapX = Math.round(x); el.mapY = Math.round(y); commit(); } // drag-guard: a drag never opens the sheet
      else openElement('me', id);
    });
    node.addEventListener('pointercancel', () => { start = null; });
  });
}

page('me', {
  title: 'STATUS',
  render() {
    const s = D.player.stats, r = D.relationships, one = girl(r.theOne);
    return `<div class="statgrid">${STATS.map(st => `<div class="stat" ${on(() => go('stat', { key: st.key }))}><i>${st.icon}</i><span>${st.label}</span><b>${st.key === 'money' ? money(s.money) : `${r1(s[st.key])}<em>/${CAP}</em>`}</b>${st.key === 'money' ? '' : bar(s[st.key] / CAP * 100, st.key === 'fear' ? 'red' : 'cyan')}</div>`).join('')}</div>
    ${sect('BODY MAP', '+ Stat', () => elementForm('me'))}
    <div class="card mapcard sh-purple">${bodyMap()}${D.meStats.length ? '<p class="hint">Drag a dot to pin it. Tap to open.</p>' : '<p class="hint">Nothing on the map yet. What are the parts of you? Tap + Stat.</p>'}</div>`;
  },
  after: bindMap,
});

page('stat', {
  title: p => STAT[p.key]?.label || 'Stat',
  render({ key }) {
    const st = STAT[key]; if (!st) return null;
    const s = D.player.stats, v = s[key], feeders = slottedActivities().filter(a => a.item.statEffects[key]);
    const hrs = weekStats(D.schedule).week.byStat[key] || 0;
    const adj = n => btn(n > 0 ? '+' + n : n, () => { applyEffects({ [key]: n }); commit(); }, n > 0 ? 'good' : '');
    const setMoney = () => form({ title: 'Balance', sub: "What's actually in the account?", fields: [{ name: 'money', label: 'Balance ($)', type: 'number', value: s.money, required: true }], onSubmit: x => { s.money = x.money; log(`Balance set to ${money(x.money)}`, 'event'); } });
    return `<div class="card hero sh-cyan"><small>${st.icon} ${st.label.toUpperCase()}</small><div class="count"><b>${key === 'money' ? money(v) : r1(v)}</b>${key === 'money' ? '' : `<span>/ ${CAP}<br>${Math.round(v / CAP * 100)}% of ceiling</span>`}</div>
      ${key === 'money' ? '' : bar(v / CAP * 100, key === 'fear' ? 'red' : 'cyan')}<p>${st.desc}</p></div>
    ${key === 'vibe' ? row({ icon: '✦', title: 'The Entity', desc: 'Vibe is computed there. Raise the parts.', val: r1(vibe()) + '%', fn: () => go('vibe') })
      : key === 'money' ? `<div class="btns">${btn('Set balance', setMoney, 'good')}${btn('Money world', () => go('money'))}</div>`
      : `${sect('ADJUST — be honest')}<div class="btns">${adj(-1)}${adj(1)}</div>`}
    ${sect('WHAT FEEDS IT')}
    ${feeders.length ? feeders.map(a => row({ icon: esc(a.cat.emoji), title: esc(a.item.name), desc: esc(a.cat.name), val: (a.item.statEffects[key] > 0 ? '+' : '') + a.item.statEffects[key], fn: () => go('activities') })).join('') : empty(key === 'vibe' ? 'Vibe is the mean of your lead bar and every Entity component.' : `No slotted activity moves ${st.label}. Slot one that does.`)}
    ${key !== 'vibe' ? term('', [['SCHEDULED THIS WEEK', hrs + 'h']]) : ''}`;
  },
});

// ── MENU — every area, grouped, one tap away
page('portal', {
  title: 'MENU',
  render() {
    const s = D.player.stats, one = girl(D.relationships.theOne), rp = ratingsPct(), open = D.manifests.filter(m => !m.achievedAt).length;
    const t = (icon, label, sub, to, params) => `<div class="mt" ${on(() => go(to, params))}><i>${icon}</i><b>${label}</b><small>${sub}</small></div>`;
    const grp = (title, tiles) => `<div class="mg"><span>${title}</span><div class="mgrid">${tiles.join('')}</div></div>`;
    return grp('PEOPLE', [
      t('♥', 'Relationships', one ? esc(one.name) : 'Slot 1 empty', 'life'), t('≡', 'Roster', `${D.girls.length} girl${D.girls.length === 1 ? '' : 's'} · ${D.friends.length} friend${D.friends.length === 1 ? '' : 's'}`, 'roster'),
      t('!', 'Meet', `${Math.round(meetBar())}% meet bar`, 'meet'), t('⌘', 'Social media', `${D.socialMedia.length} platforms`, 'socialmedia')])
    + grp('GROW', [
      t('▲', 'Activities', 'slots & bench', 'activities'), t('◉', 'Lead gen', r1(leadBar()) + '% bar', 'leadgen'),
      t('✦', 'The Entity', r1(vibe()) + '% vibe', 'vibe'), t('◈', 'Lifestyles', `${D.lifestyles.length} builds`, 'lifestyle'),
      t('★', 'Abilities', `${D.abilities.filter(a => a.unlocked).length}/${D.abilities.length} unlocked`, 'abilities')])
    + grp('GOALS', [
      t('◎', 'Quests', `${open} open`, 'manifest'), t('!', 'To do', `${gaps().length} items`, 'gaps'), t('▮', 'Calendar', currentEra() ? esc(currentEra().name) : 'eras & year', 'calendar'),
      `<div class="mt" ${on(northstarForm)}><i>✧</i><b>Northstar</b><small>${D.northstar ? 'set' : 'not set'}</small></div>`])
    + grp('WORLDS', [
      t('$', 'Money', money(s.money), 'money'), t('⭐', 'Ratings', rp == null ? 'not rated' : Math.round(rp) + '% potential', 'ratings'), t('⬢', 'World map', 'cities & moves', 'world')])
    + grp('SYSTEM', [
      t('Σ', 'Total stats', `level ${D.player.level}`, 'totalstats'), t('≣', 'Log', `${D.log.length} entries`, 'log'), t('⇅', 'Save / load', 'backup & import', 'saveload')]);
  },
});
