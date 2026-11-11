// System: Total Stats, Log, Save / Load.
import { D, commit, replace, snapshot, ui } from '../store.js';
import { STATS, CAP, VERSION, defaults } from '../schema.js';
import { page, go, on, onChange, esc, toast, bar, sect, term, empty, btn, tabs, setUi, destroy, modal, closeModal, $ } from '../ui.js';
import { balance, xpForLevel, money, r1, MONTHS, fmtDate, vibe } from '../calc.js';

page('totalstats', {
  title: 'TOTAL STATS',
  render() {
    const p = D.player, s = p.stats, b = balance(), need = xpForLevel(p.level);
    return `<div class="card hero sh-cyan"><small>LEVEL</small><div class="count"><b>${p.level}</b><span>${Math.round(p.xp)} / ${need} XP<br>${need - Math.round(p.xp)} to level ${p.level + 1}</span></div>${bar(p.xp / need * 100, 'cyan')}</div>
    ${sect('BALANCE — what your slots say about you')}
    <div class="card"><div class="tri"><i class="k-expansion" style="flex:${b.expansion || 0.001}"></i><i class="k-maintenance" style="flex:${b.maintenance || 0.001}"></i><i class="k-cost" style="flex:${b.cost || 0.001}"></i></div>
      <div class="chips"><em class="chip k-expansion">▲ ${b.expansion} expansion · ${Math.round(b.expPct)}%</em><em class="chip k-maintenance">■ ${b.maintenance} maintenance · ${Math.round(b.mntPct)}%</em><em class="chip k-cost">● ${b.cost} cost · ${Math.round(b.costPct)}%</em></div>
      <p class="verdict">${b.verdict}</p></div>
    ${sect('STATS')}
    <div class="panel">${STATS.map(st => `<div class="wrow" ${on(() => go('stat', { key: st.key }))}><div class="split"><span>${st.icon} ${st.label}</span><b>${st.key === 'money' ? money(s.money) : `${r1(s[st.key])} / ${CAP}`}</b></div>${st.key === 'money' ? '' : bar(s[st.key] / CAP * 100, st.key === 'fear' ? 'red' : 'cyan')}</div>`).join('')}</div>
    ${term('ABILITIES', [['UNLOCKED', D.abilities.filter(a => a.unlocked).length, 'gold'], ['LOCKED', D.abilities.filter(a => !a.unlocked).length]])}
    <div class="btns">${btn('Abilities', () => go('abilities'))}${btn('The Entity', () => go('vibe'))}</div>`;
  },
});

const mkey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}`; };
page('log', {
  title: 'LOG',
  render() {
    const keys = [...new Set(D.log.map(e => mkey(e.t)))];
    if (!keys.length) return empty('Nothing logged yet. The log fills itself when you do things.');
    const k = keys.includes(ui.logMonth) ? ui.logMonth : keys[0], es = D.log.filter(e => mkey(e.t) === k), n = tag => es.filter(e => e.tag === tag).length;
    const xp = es.filter(e => e.tag === 'xp').reduce((a, e) => a + (+(/^\+(\d+)/.exec(e.msg)?.[1]) || 0), 0);
    const label = x => { const [y, m] = x.split('-'); return `${MONTHS[+m].slice(0, 3)} '${y.slice(2)}`; };
    return `${tabs(keys.slice(0, 12).map(x => [x, label(x)]), k, x => setUi('logMonth', x))}
    ${term('RECAP', [['XP GAINED', '+' + xp, 'green'], ['ACTIVITIES DONE', n('activity')], ['PEOPLE MET', n('meet')], ['REJECTIONS', n('meet-miss')], ['DATES / HANGOUTS', n('date')], ['RELATIONSHIP MOVES', n('relationship')], ['UPGRADES', n('upgrade')], ['GOALS ACHIEVED', n('manifest')]])}
    ${sect(`EVENTS · ${es.length}`)}
    <div class="term">${es.map(e => `<div class="trow log t-${e.tag}"><span>${fmtDate(e.t)}</span><b>${esc(e.msg)}</b></div>`).join('')}</div>`;
  },
});

page('saveload', {
  title: 'SAVE / LOAD',
  render() {
    const size = Math.round(snapshot().length / 1024 * 10) / 10;
    const exportIt = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' })); a.download = `life-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast('Exported. Keep it somewhere safe.'); };
    const load = text => { let raw; try { raw = JSON.parse(text); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw 0; } catch { return toast("That's not a LIFE save. Nothing changed."); }
      const snap = snapshot(); replace(raw); toast('Imported.', () => replace(snap)); };
    const paste = () => modal(() => `<h2>Paste a save</h2><p class="msub">Works with exports from this app and from the old build.</p><textarea id="paste" rows="8" placeholder="{ ... }"></textarea>
      <div class="btns">${btn('Load it', () => { const t = $('#paste').value; closeModal(); load(t); }, 'good')}${btn('Never mind', closeModal)}</div>`, { static: true });
    return `${term('THIS SAVE', [['SIZE', size + ' KB'], ['SCHEMA', 'v' + VERSION], ['STORED', 'on this device only'], ['LOG ENTRIES', D.log.length]])}
    <p class="desc">Your life lives in this browser's storage. Clearing site data wipes it. Export regularly — and to move it to another device, export there and import here.</p>
    ${sect('EXPORT')}<div class="btns">${btn('Export JSON', exportIt, 'good')}${btn('Copy to clipboard', () => navigator.clipboard?.writeText(JSON.stringify(D)).then(() => toast('Copied.'), () => toast('Clipboard blocked. Use Export.')))}</div>
    ${sect('IMPORT')}<div class="btns"><label class="btn">Import file<input type="file" accept=".json,application/json" hidden ${onChange((_, el) => { const f = el.files[0]; if (f) f.text().then(load); })}></label>${btn('Paste JSON', paste)}</div>
    ${sect('SETTINGS')}${term('', [['BIRTHDAY', D.settings.birthday || 'not set']])}
    <div class="btns"><label class="btn">Set birthday<input type="date" class="inl" value="${esc(D.settings.birthday)}" ${onChange(v => { D.settings.birthday = v; commit(); })}></label></div>
    ${sect('DANGER')}<div class="btns">${btn('Reset all data', () => { if (confirm('Wipe everything and start from level 1?')) destroy('Everything wiped.', () => replaceQuiet()); }, 'danger')}</div>`;
  },
});
function replaceQuiet() { const d = defaults(); for (const k of Object.keys(D)) delete D[k]; Object.assign(D, d); }
