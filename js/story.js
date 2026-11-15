// "Where this stands" — a short description you rewrite as things change, like a quest log entry.
// Every rewrite is kept as a dated step. Steps can be removed.
import { form, on, esc, destroy, fold } from './ui.js';
import { uid } from './schema.js';

const stamp = t => { const d = new Date(t); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
export const storyNow = list => list.at(-1)?.text || '';

export function storyForm(list, title, after) {
  const cur = list.at(-1);
  form({ title, sub: 'Where does this stand right now? Write it the way the game would describe it.',
    fields: [{ name: 'text', label: 'Where you are now', type: 'textarea', rows: 4, value: cur?.text, required: true, placeholder: "He dislikes socializing, but according to sources it's the only way." }],
    submit: cur ? 'Update' : 'Write it',
    onSubmit: v => { if (!cur || cur.text !== v.text) list.push({ id: uid(), t: Date.now(), text: v.text }); if (after) setTimeout(after); } });
}
// list: the array of steps (live, from D). id: unique key for the fold state. after: reopen a sheet once the form closes.
export function storyBlock(list, id, title, after) {
  const cur = list.at(-1);
  return `<div class="story"><div class="st-h"><span>WHERE THIS STANDS</span><button class="sbtn ghost" ${on(() => storyForm(list, title, after))}>${cur ? '✎ Update' : '+ Write it'}</button></div>
    ${cur ? `<p>${esc(cur.text)}</p><small>${stamp(cur.t)} · step ${list.length}</small>` : '<p class="muted">Nothing written yet. Describe where you are with this.</p>'}
    ${list.length ? fold('story-' + id, `Changes · ${list.length} step${list.length === 1 ? '' : 's'}`, () => list.map((e, i) => ({ e, i })).reverse().map(({ e, i }) =>
      `<div class="st-e"><div><b>Step ${i + 1}</b><small>${stamp(e.t)}</small><button ${on(() => destroy(`Step ${i + 1} removed.`, () => { const at = list.findIndex(x => x.id === e.id); if (at >= 0) list.splice(at, 1); }))}>× Remove</button></div><p>${esc(e.text)}</p></div>`).join('')) : ''}</div>`;
}
