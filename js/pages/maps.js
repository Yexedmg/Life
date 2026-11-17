// MAPS — your own maps (Home, City…) and the places on them. Places light up with a bubble
// when a slot today, in the ideal day, or right now happens there.
import { D, commit, ui, saveUi } from '../store.js';
import { BLANK } from '../schema.js';
import { page, go, on, onChange, esc, form, modal, closeModal, destroy, toast, sect, empty, btn, tabs, rerender, shrinkImage, setPicture } from '../ui.js';
import { placeStatus } from '../calc.js';

const MODES = ['On foot', 'Bike', 'Public transport']; // ways to get somewhere that are not key items
const getMap = id => D.maps.find(m => m.id === id) || null;

// The bubble next to a marker or card: NOW beats planned today, which beats ideal day.
function bubble(st) {
  if (st.now) return '<em class="bub now">NOW</em>';
  if (st.today.length) return '<em class="bub today" title="Planned today"></em>';
  if (st.ideal.length) return '<em class="bub ideal" title="In your ideal day"></em>';
  return '';
}
const legend = '<p class="maplegend"><em class="bub today"></em> planned today <em class="bub ideal"></em> in your ideal day <em class="bub now">NOW</em> happening now</p>';

function mapForm(m) {
  form({ title: m ? 'Rename map' : 'New map', sub: m ? '' : 'A location with its own places: Home, City, Work…',
    fields: [{ name: 'name', label: 'Name', value: m?.name, required: true, placeholder: 'Home' }],
    submit: 'Save', onSubmit: v => { if (m) m.name = v.name; else { const n = BLANK.lifeMap(v.name); D.maps.push(n); setTimeout(() => go('map', { id: n.id })); } } });
}
function placeForm(m, x) {
  form({ title: x ? 'Edit place' : `New place — ${m.name}`,
    fields: [{ name: 'name', label: 'Name', value: x?.name, required: true, placeholder: m.places.length ? 'Living room' : 'Bedroom' }, { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, value: x?.notes }],
    submit: 'Save', onSubmit: v => {
      if (x) Object.assign(x, v);
      else { const n = m.places.length; m.places.push({ ...BLANK.mapPlace(v.name), notes: v.notes, x: 20 + (n * 29) % 60, y: 22 + (n * 37) % 56 }); }
    } });
}

const loadPicture = (m, file) => shrinkImage(file, 1000, 0.78).then(data => setPicture(m, 'bg', data, 'Background set.'), msg => toast(msg));
function mapSettings(id) {
  modal(() => {
    const m = getMap(id); if (!m) return null;
    return `<h2>${esc(m.name)}</h2><p class="msub">${m.places.length} place${m.places.length === 1 ? '' : 's'}</p>
      <div class="panel"><div class="pt">BACKGROUND</div><p>${m.bg ? 'A picture is set behind the drawn map.' : 'A blank dark canvas. Upload a floor plan or a city screenshot to place markers on.'}</p>
        <div class="btns"><label class="btn">${m.bg ? 'Change picture' : 'Upload picture'}<input type="file" accept="image/*" hidden ${onChange((_, el) => loadPicture(m, el.files[0]))}></label>
        ${m.bg ? btn('Remove picture', () => { m.bg = ''; commit(); }) : ''}</div></div>
      <div class="btns">${btn('Rename', () => mapForm(m))}${btn('Delete map', () => { closeModal(); destroy(`${m.name} — deleted, with its places.`, () => { D.maps = D.maps.filter(x => x !== m); }); go('maps'); }, 'danger')}${btn('Close', closeModal)}</div>`;
  });
}
function transportPicker(m) {
  modal(() => {
    const have = new Set(m.transport.map(t => t.keyItemId || t.label)), keys = D.keyItems.filter(k => k.transport);
    const opt = (label, kid) => have.has(kid || label) ? '' : `<div class="row" ${on(() => { m.transport.push({ id: Date.now().toString(36), label: kid ? '' : label, keyItemId: kid || null }); closeModal(); commit(); })}><div class="rbody"><b>${esc(label)}</b>${kid ? `<small>key item${D.keyItems.find(k => k.id === kid)?.has ? '' : ' · missing'}</small>` : ''}</div></div>`;
    return `<h2>Getting to ${esc(m.name)}</h2><p class="msub">How do you get there?</p>
      ${MODES.map(x => opt(x)).join('')}${keys.map(k => opt(k.name, k.id)).join('')}
      ${!keys.length ? '<p class="hint">Mark a key item as a mode of transport (Key items → Edit) and it shows up here.</p>' : ''}
      <div class="btns">${btn('Close', closeModal)}</div>`;
  });
}
function todoForm(m, x, reopen) {
  form({ title: x ? `Things to do — ${x.name}` : 'New thing to do', sub: 'Something you can do there.',
    fields: [...(x ? [] : [{ name: 'place', label: 'Where?', type: 'select', value: m.places[0]?.id || '', options: m.places.map(p => [p.id, p.name]) }]),
      { name: 'text', label: 'What can you do there?', value: '', required: true, placeholder: 'Host friends, read, train…' }],
    submit: 'Add', onSubmit: v => { const p = x || m.places.find(q => q.id === v.place); if (!p) return false; p.todo.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: v.text }); if (reopen) setTimeout(reopen); } });
}
const todoRows = (m, x, reopen) => x.todo.map(t => `<div class="move tdo"><span>${esc(t.text)}</span><button ${on(() => destroy('Removed.', () => { x.todo = x.todo.filter(y => y !== t); }))}>×</button></div>`).join('');
function placeSheet(mapId, placeId) {
  modal(() => {
    const m = getMap(mapId), x = m?.places.find(p => p.id === placeId); if (!x) return null;
    const st = placeStatus(x.id), line = (t, a, b) => `<div class="trow"><span>${esc(a)}</span><b>${esc(b)}</b></div>`;
    return `<h2>${esc(x.name)} ${bubble(st)}</h2><p class="msub">${esc(m.name)}</p>
      ${x.notes ? `<p class="desc">${esc(x.notes)}</p>` : ''}
      <div class="panel"><div class="pt">THINGS TO DO <button class="sbtn" ${on(() => todoForm(m, x, () => placeSheet(mapId, placeId)))}>+ Add</button></div>${todoRows(m, x) || '<p>Nothing listed yet. What can you do here?</p>'}</div>
      <div class="panel"><div class="pt">TODAY HERE</div>${st.today.length ? st.today.map(e => line(0, e.time, e.name)).join('') : '<p>Nothing planned here today.</p>'}</div>
      <div class="panel"><div class="pt">IDEAL DAY HERE</div>${st.ideal.length ? st.ideal.map(s => line(0, `${s.start}–${s.end}`, s.title)).join('') : '<p>Not part of your ideal day.</p>'}</div>
      <p class="hint">Give a slot a place in Plan or Ideal day (the "Where?" field) and it shows up here.</p>
      <div class="btns">${btn('Edit', () => placeForm(m, x))}${btn('Remove', () => { closeModal(); destroy(`${x.name} — removed from ${m.name}.`, () => { m.places = m.places.filter(p => p !== x); }); }, 'danger')}${btn('Close', closeModal)}</div>`;
  });
}

page('maps', {
  title: 'MAPS',
  render() {
    return `${D.maps.map(m => { const st = m.places.map(x => placeStatus(x.id)), now = st.some(s => s.now), today = st.filter(s => s.today.length).length;
      return `<div class="card mapcard2" ${on(() => go('map', { id: m.id }))}><div class="split"><h3>⌖ ${esc(m.name)}</h3><b>${now ? '<em class="bub now">NOW</em>' : ''}→</b></div>
        <div class="split dim"><span>${m.places.length} place${m.places.length === 1 ? '' : 's'}</span><span>${today ? `${today} with plans today` : ''}</span></div></div>`; }).join('') || empty('No maps yet. Make one for each location: Home, City…')}
    <div class="btns">${btn('+ Map', () => mapForm(), 'good')}</div>`;
  },
});

page('map', {
  title: p => 'MAP · ' + (getMap(p.id)?.name || '').toUpperCase(),
  render({ id }) {
    const m = getMap(id); if (!m) return null;
    const view = ui['mapview-' + id] === 'list' ? 'list' : 'map', st = Object.fromEntries(m.places.map(x => [x.id, placeStatus(x.id)]));
    const chips = m.transport.map(t => { const k = t.keyItemId && D.keyItems.find(x => x.id === t.keyItemId), missing = k && !k.has;
      return `<em class="chip ${missing ? 'miss' : 'cyan'}" ${on(() => destroy('Removed.', () => { m.transport = m.transport.filter(x => x !== t); }))}>${esc(k ? k.name : t.label)}${missing ? ' · missing' : ''} ×</em>`; }).join('');
    return `<div class="split getthere"><span>GETTING THERE</span><button class="sbtn ghost" ${on(() => transportPicker(m))}>+ Transport</button></div>
    <div class="chips">${chips || '<em class="chip off">not set</em>'}</div>
    ${tabs([['map', 'Map'], ['list', 'Cards']], view, k => { ui['mapview-' + id] = k; saveUi(); rerender(); })}
    ${view === 'map' ? `<div class="mapc" data-map="${id}" ${m.bg ? `style="background-image:url('${m.bg}')"` : ''}>
        ${m.places.map(x => `<div class="mk" data-place="${x.id}" style="left:${x.x}%;top:${x.y}%"><i></i><span>${esc(x.name)}</span>${bubble(st[x.id])}</div>`).join('')}
        ${!m.places.length ? '<p class="hint mapempty">No places yet. Tap + Place.</p>' : ''}</div>
        ${m.places.length ? '<p class="hint">Drag a marker to move it. Tap it to open.</p>' : ''}`
      : `${m.places.map(x => { const s = st[x.id];
          return `<div class="row" ${on(() => placeSheet(id, x.id))}><div class="rbody"><b>${esc(x.name)} ${bubble(s)}</b><small>${s.today.length ? s.today.map(e => esc(e.time.split(/[–-]/)[0]) + ' ' + esc(e.name)).join(' · ') : s.ideal.length ? 'in your ideal day' : x.todo.length ? `${x.todo.length} thing${x.todo.length === 1 ? '' : 's'} to do` : esc(x.notes || 'nothing planned')}</small></div><div class="rarr">→</div></div>`; }).join('') || empty('No places yet. Tap + Place.')}`}
    ${legend}
    <div class="sect"><span>THINGS TO DO</span>${m.places.length ? `<button class="sbtn" ${on(() => todoForm(m))}>+ Add</button>` : ''}</div>
    ${m.places.filter(x => x.todo.length).map(x => `<div class="todog"><b ${on(() => placeSheet(id, x.id))}>${esc(x.name)} ${bubble(st[x.id])}</b>${todoRows(m, x)}</div>`).join('') || empty(m.places.length ? 'Nothing listed yet. What can you do at each place?' : 'Add a place first.')}
    <div class="btns">${btn('+ Place', () => placeForm(m), 'good')}${btn('Map settings', () => mapSettings(id))}</div>`;
  },
  after(view, { id }) {
    const box = view.querySelector('.mapc'), m = getMap(id); if (!box || !m) return;
    box.querySelectorAll('.mk').forEach(mk => {
      let start = null, moved = false;
      const pct = e => { const r = box.getBoundingClientRect(); return [Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)), Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))]; };
      mk.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; moved = false; mk.setPointerCapture(e.pointerId); });
      mk.addEventListener('pointermove', e => {
        if (!start) return; if (!moved && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6) return;
        moved = true; const [x, y] = pct(e); mk.style.left = x + '%'; mk.style.top = y + '%'; mk.classList.add('drag');
      });
      mk.addEventListener('pointerup', e => {
        if (!start) return; start = null; const x = m.places.find(p => p.id === mk.dataset.place); if (!x) return;
        if (moved) { const [px, py] = pct(e); x.x = Math.round(px * 10) / 10; x.y = Math.round(py * 10) / 10; commit(); } // a drag never opens the sheet
        else placeSheet(id, x.id);
      });
      mk.addEventListener('pointercancel', () => { start = null; });
    });
  },
});
