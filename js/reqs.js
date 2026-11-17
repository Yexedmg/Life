// Requirements: what has to be in place before a move (a quest or an experience) can be made.
// Written in your own words and ticked off by you. A move with none open is READY; otherwise LOCKED.
import { commit } from './store.js';
import { uid } from './schema.js';
import { form, on, esc, destroy } from './ui.js';

export const missingReqs = x => (x.reqs || []).filter(r => !r.done);
export const isReady = x => missingReqs(x).length === 0;
export const lockTag = x => (isReady(x) ? '' : `<em class="locktag">LOCKED · ${missingReqs(x).length}</em>`);

function reqForm(x, r) {
  form({ title: r ? 'Edit requirement' : 'New requirement', sub: r ? '' : 'What has to be in place before you can make this move?',
    fields: [{ name: 'text', label: 'Requirement', value: r?.text, required: true, placeholder: 'Wardrobe sorted, $300 saved, licence passed…' }],
    submit: 'Save', onSubmit: v => { if (r) r.text = v.text; else x.reqs.push({ id: uid(), text: v.text, done: false }); },
    onDelete: r ? () => destroy('Requirement removed.', () => { x.reqs = x.reqs.filter(y => y !== r); }) : null, del: 'Remove' });
}
// The panel on a quest or experience: READY / LOCKED, and the list to tick off.
export function reqPanel(x) {
  const miss = missingReqs(x);
  return `<div class="panel reqp ${miss.length ? 'locked' : 'ready'}"><div class="pt">${miss.length ? `LOCKED · ${miss.length} to go` : 'READY'}<button class="sbtn ghost" ${on(() => reqForm(x))}>+ Requirement</button></div>
    ${x.reqs.map(r => `<div class="task ${r.done ? 'done' : ''}"><button ${on(() => { r.done = !r.done; commit(); })}>${r.done ? '■' : '□'}</button><span ${on(() => { r.done = !r.done; commit(); })}>${esc(r.text)}</span><button class="x" ${on(() => reqForm(x, r))}>✎</button></div>`).join('')
      || '<p>Nothing required. You can make this move now.</p>'}</div>`;
}
