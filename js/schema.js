// LIFE — schema. The single source of truth for defaults, entity shapes and migrations.
// normalize() ALWAYS runs: on fresh installs, on loads, on imports, on undo.

export const VERSION = 1;
export const SAVE_KEY = 'life-save';
export const LEGACY_KEY = 'life-rpg-data'; // the pre-rebuild app; read once, never written
export const UI_KEY = 'life-ui';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const CAP = 25;
export const STATS = [
  { key: 'money', label: 'Money', icon: '$', desc: "What's in the account. Spent on upgrades." },
  { key: 'boldness', label: 'Boldness', icon: '!', desc: 'Raised by approaches that land. Gates the risky moves.' },
  { key: 'fear', label: 'Fear', icon: '~', desc: 'Grows from failure and rejection. Offsets boldness.' },
  { key: 'health', label: 'Health', icon: '+', desc: 'Raised by sports, rest, grooming. Drained by overwork.' },
  { key: 'social', label: 'Social', icon: '●', desc: 'Raised by hangouts and parties. Feeds the Meet bar hard.' },
  { key: 'charm', label: 'Charm', icon: '◆', desc: 'Charisma. Grows from social wins and dates.' },
  { key: 'sexAppeal', label: 'Sex Appeal', icon: '♦', desc: 'Sports + charm. Major Meet driver.' },
  { key: 'power', label: 'Power', icon: '■', desc: 'Raw strength — built by strength sports.' },
  { key: 'fight', label: 'Fight', icon: '▲', desc: 'Combat skill — raised by combat activities.' },
  { key: 'looks', label: 'Looks', icon: '○', desc: 'Grooming and style. Feeds the Meet bar.' },
  { key: 'vibe', label: 'Vibe', icon: '✦', desc: 'Computed. The Entity, rounded. You cannot set it — you earn it.' },
];
export const STAT = Object.fromEntries(STATS.map(s => [s.key, s]));

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const ERA_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#8ce99a', '#4dd4ac', '#63e6be', '#74c0fc', '#9775fa', '#da77f2', '#f783ac'];
export const SLOT_COLORS = ['#4EC8FF', '#40E382', '#FFCB1C', '#FF3366', '#C852FF', '#FF7B00'];

export const TIERS = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
export const TIER_VAL = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
export const TIER_COLOR = { S: '#FFCB1C', A: '#C852FF', B: '#4EC8FF', C: '#40E382', D: '#FFE81A', E: '#FF7B00', F: '#FF3B30' };

export const DIFFS = ['easy', 'medium', 'hard'];
export const ROIS = ['low', 'medium-low', 'medium', 'high', 'very-high'];
export const ROI_TIER = { 'low': 'Common', 'medium-low': 'Uncommon', 'medium': 'Rare', 'high': 'Epic', 'very-high': 'Legendary' };
export const ROI_COLOR = { 'low': '#8A94B0', 'medium-low': '#8ce99a', 'medium': '#4EC8FF', 'high': '#FFE81A', 'very-high': '#FF3B30' };
export const GAIN = {
  easy: { 'low': 1, 'medium-low': 2, 'medium': 4, 'high': 6, 'very-high': 8 },
  medium: { 'low': 2, 'medium-low': 3, 'medium': 5, 'high': 8, 'very-high': 10 },
  hard: { 'low': 3, 'medium-low': 5, 'medium': 7, 'high': 10, 'very-high': 12 },
};
export const LEADS_PER_STAR = 20;
export const LEAD_MAX_STARS = 18;

const emptyWeek = () => Object.fromEntries(DAYS.map(d => [d, []]));
const slotsOf = n => Array(n).fill(null);

// ── Entity blanks: every entity is spread over its blank on load, so no field is ever undefined.
export const BLANK = {
  category: (name = '', emoji = '[···]', maxSlots = 3) => ({ id: uid(), name, emoji, maxSlots, slots: slotsOf(maxSlots), inventory: [], sectionId: null }),
  activity: () => ({ id: uid(), name: '', emoji: '', time: '', kind: 'maintenance', realm: 'real', meetBonus: 0, xp: 5, leadgen: false, statEffects: {} }),
  section: () => ({ id: uid(), name: '' }),
  method: (id = uid(), name = '', emoji = '◉', maxSlots = 2, maxGain = 15) => ({ id, name, emoji, maxSlots, maxGain, slots: slotsOf(maxSlots), inventory: [] }),
  leadItem: () => ({ id: uid(), name: '', difficulty: 'easy', roi: 'medium', leads: 0 }),
  component: (id = uid(), name = '', emoji = '✦', desc = '') => ({ id, name, emoji, desc, maxSlots: 2, maxGain: 25, slots: slotsOf(2), inventory: [] }),
  compItem: () => ({ id: uid(), name: '', difficulty: 'easy', roi: 'medium' }),
  girl: () => ({ id: uid(), name: '', rarity: 3, origin: '', affinity: 10, looksLikeYou: 50, status: 'Talking', dates: 0, notes: '', createdAt: Date.now() }),
  friend: () => ({ id: uid(), name: '', rarity: 3, origin: '', notes: '', createdAt: Date.now() }),
  city: () => ({ id: uid(), name: '', boroughs: [] }),
  borough: () => ({ id: uid(), name: '', activityCategories: defaultCategories(), activitySections: [], leadgen: { methods: defaultMethods(false) }, places: [] }),
  place: () => ({ id: uid(), name: '', type: '', notes: '', visited: false }),
  nextMove: () => ({ id: uid(), name: '', statEffects: {}, city: null }),
  ability: () => ({ id: uid(), name: '', desc: '', unlocked: false, assignments: [] }),
  era: () => ({ id: uid(), name: '', start: '', end: '', color: ERA_COLORS[0], createdAt: Date.now() }),
  manifest: () => ({ id: uid(), name: '', emoji: '◎', milestones: [], achievedAt: null, createdAt: Date.now() }),
  milestone: () => ({ id: uid(), name: '', tasks: [] }),
  task: () => ({ id: uid(), name: '', done: false }),
  lifestyle: () => ({ id: uid(), name: '', emoji: '◈', activities: [], schedule: emptyWeek(), createdAt: Date.now() }),
  entry: () => ({ id: uid(), time: '', name: '', catId: null, activityItemId: null }),
  timeAlloc: (name = 'Default day') => ({ id: uid(), name, slots: [] }),
  timeSlot: () => ({ id: uid(), title: '', start: '', end: '', color: SLOT_COLORS[0] }),
  element: () => ({ id: uid(), title: '', desc: '', level: 0, levelUp: [], history: [], createdAt: Date.now() }), // body-map stat OR platform
  income: () => ({ id: uid(), title: '', desc: '', amount: 0, hoursPerWeek: 0, status: 'active', projections: [], createdAt: Date.now() }),
  rating: (name = '') => ({ id: uid(), name, desc: '', rating: null, routine: null, children: [], items: [] }),
  ratingItem: () => ({ id: uid(), name: '', tier: 'C', later: false, upgrade: null, upgrades: [] }),
};

function defaultCategories() {
  return [['Sports', '[SPT]', 3], ['School / Classes', '[CLS]', 2], ['Combat', '[CMB]', 2],
    ['Social', '[SOC]', 2], ['Grooming', '[GRM]', 1], ['Other', '[···]', 3]].map(a => BLANK.category(...a));
}
function defaultMethods(seed) {
  const m = [BLANK.method('lm-cold', 'Cold Approach', '!', 2, 20),
    BLANK.method('lm-sports', 'Sports', '[SPT]', 2, 18), BLANK.method('lm-event', 'Event Hosting', '◉', 1, 12),
    BLANK.method('lm-online', 'Online Presence', '⌘', 2, 10)];
  return m;
}

export function defaults() {
  const borough = { ...BLANK.borough(), name: 'City Center', activityCategories: [], leadgen: { methods: [] } };
  const city = { ...BLANK.city(), name: 'Rotterdam', boroughs: [borough] };
  const alloc = BLANK.timeAlloc();
  return {
    version: VERSION,
    player: {
      level: 1, xp: 0,
      stats: { money: 0, boldness: 1, fear: 1, health: 5, social: 1, charm: 1, sexAppeal: 1, power: 1, fight: 1, looks: 1, vibe: 0 },
      streaks: { coldApproach: 0 },
    },
    girls: [], friends: [],
    relationships: { theOne: null, commons: [], sidelined: [] }, // derived from girl.status on every commit
    activityCategories: defaultCategories(), activitySections: [],
    leadgen: { methods: defaultMethods(true) },
    vibeComponents: [
      BLANK.component('vc-vibe', 'Vibe', '✦', 'Personal magnetism — the energy you put out, how you carry yourself.'),
      BLANK.component('vc-socialproof', 'Social Proof', '●', 'How others perceive your social value — circles, events, credibility.'),
      BLANK.component('vc-style', 'Style', '◆', 'Fashion, grooming, fragrance — how you present visually.'),
      BLANK.component('vc-energy', 'Energy', '▲', 'Confidence, body language, eye contact, presence.'),
    ],
    world: { currentCityId: city.id, currentBoroughId: borough.id, mainBoroughId: borough.id, cities: [city] },
    nextMoves: [],
    northstar: null, eras: [], manifests: [], manifestInfo: '', abilities: [],
    lifestyles: [], activeLifestyleId: null,
    schedule: emptyWeek(), timeAllocs: [alloc], currentTimeAllocId: alloc.id,
    meStats: [],
    moneyGoal: null, incomes: [],
    ratings: ['Hair', 'Face', 'Dental', 'Shower', 'Body towel', 'Extracosmetics', 'Clothes', 'Digital system', 'Physique'].map(n => BLANK.rating(n)),
    socialMedia: [],
    log: [],
    settings: { birthday: '' },
  };
}

// ── Migrations: index = the version the blob is coming FROM. Legacy app blobs have no version → 0.
const MIGRATIONS = [
  function v0_legacy(s) {
    for (const m of arr(s.meStats)) { if (m.level == null) m.level = m.stars ?? 0; delete m.stars; }
    if (!arr(s.timeAllocs).length && arr(s.bestTimeAlloc).length) s.timeAllocs = [{ id: uid(), name: 'Default day', slots: s.bestTimeAlloc }];
    const r = s.relationships || {};
    for (const g of arr(s.girls)) {
      if (r.theOne === g.id) g.status = 'TheOne';
      else if (arr(r.commons).includes(g.id)) g.status = 'Common';
      else if (arr(r.sidelined).includes(g.id)) g.status = 'Sidelined';
      else g.status = g.status === 'Dating' ? 'Dating' : 'Talking';
    }
    for (const f of arr(s.friends)) if (f.rarity == null) f.rarity = f.socialStar || 1;
    for (const m of arr(s.manifests)) for (const ms of arr(m.milestones)) ms.tasks = arr(ms.tasks);
  },
];

const arr = a => (Array.isArray(a) ? a : []);
const obj = o => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
const num = (n, d = 0) => (Number.isFinite(+n) ? +n : d);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const fit = (blank, list) => arr(list).filter(x => x && typeof x === 'object').map(x => ({ ...blank(), ...x }));

function fill(def, src) {
  const out = {};
  for (const k of Object.keys(def)) {
    const d = def[k], s = src?.[k];
    if (s === undefined) out[k] = d;
    else if (Array.isArray(d)) out[k] = Array.isArray(s) ? s : d;
    else if (d && typeof d === 'object') out[k] = k === 'schedule' ? s : fill(d, obj(s));
    else if (d === null) out[k] = s;
    else out[k] = typeof s === typeof d ? s : d;
  }
  return out;
}

function shapeSlots(c) {
  c.maxSlots = clamp(Math.round(num(c.maxSlots, 2)), 1, 10);
  c.slots = arr(c.slots).slice(0, c.maxSlots);
  while (c.slots.length < c.maxSlots) c.slots.push(null);
  return c;
}
const shapeCats = cats => fit(BLANK.category, cats).map(c => {
  delete c._collapsed; delete c._invOpen;
  c.inventory = fit(BLANK.activity, c.inventory).map(i => ({ ...i, statEffects: obj(i.statEffects), meetBonus: num(i.meetBonus), xp: num(i.xp, 5) }));
  return shapeSlots(c);
});
const shapeMethods = ms => fit(BLANK.method, ms).map(m => {
  m.maxGain = clamp(num(m.maxGain, 15), 1, 30);
  m.inventory = fit(BLANK.leadItem, m.inventory).map(i => ({ ...i, leads: Math.max(0, num(i.leads)) }));
  return shapeSlots(m);
});
const shapeWeek = w => Object.fromEntries(DAYS.map(d => [d, fit(BLANK.entry, obj(w)[d])]));
const shapeElements = list => fit(BLANK.element, list).map(e => ({ ...e, level: clamp(num(e.level), 0, CAP), levelUp: arr(e.levelUp), history: arr(e.history) }));
const shapeRatings = list => fit(BLANK.rating, list).map(n => ({
  ...n, children: shapeRatings(n.children),
  items: fit(BLANK.ratingItem, n.items).map(i => ({ ...i, upgrades: arr(i.upgrades), tier: TIER_VAL[i.tier] == null ? 'C' : i.tier })),
}));

export function normalize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const src = JSON.parse(JSON.stringify(raw));
  for (let v = num(src.version); v < VERSION; v++) MIGRATIONS[v]?.(src);
  const o = fill(d, src);
  o.version = VERSION;
  o.player.level = Math.max(1, Math.round(num(o.player.level, 1)));
  o.player.xp = Math.max(0, num(o.player.xp));
  for (const s of STATS) o.player.stats[s.key] = num(o.player.stats[s.key]);
  o.girls = fit(BLANK.girl, o.girls);
  o.friends = fit(BLANK.friend, o.friends);
  o.activityCategories = shapeCats(o.activityCategories);
  o.activitySections = fit(BLANK.section, o.activitySections);
  o.leadgen.methods = shapeMethods(o.leadgen.methods);
  o.vibeComponents = fit(BLANK.component, o.vibeComponents).map(c => { c.inventory = fit(BLANK.compItem, c.inventory); c.maxGain = clamp(num(c.maxGain, 25), 1, 30); return shapeSlots(c); });
  o.world.cities = fit(BLANK.city, o.world.cities).map(c => ({
    ...c, boroughs: arr(c.boroughs).filter(Boolean).map(b => ({
      id: b.id || uid(), name: b.name || '', activityCategories: shapeCats(b.activityCategories), activitySections: fit(BLANK.section, b.activitySections),
      leadgen: { methods: shapeMethods(obj(b.leadgen).methods) }, places: fit(BLANK.place, b.places),
    })),
  }));
  o.nextMoves = fit(BLANK.nextMove, o.nextMoves).filter(m => !m.done).map(m => ({ ...m, statEffects: obj(m.statEffects) }));
  o.northstar = o.northstar && typeof o.northstar === 'object' && o.northstar.text ? { text: String(o.northstar.text), targetDate: o.northstar.targetDate || null, updatedAt: num(o.northstar.updatedAt) } : null;
  o.eras = fit(BLANK.era, o.eras).filter(e => e.start && e.end);
  o.manifests = fit(BLANK.manifest, o.manifests).map(m => ({ ...m, milestones: fit(BLANK.milestone, m.milestones).map(ms => ({ ...ms, tasks: fit(BLANK.task, ms.tasks) })) }));
  o.abilities = fit(BLANK.ability, o.abilities).map(a => ({ ...a, assignments: arr(a.assignments) }));
  o.lifestyles = fit(BLANK.lifestyle, o.lifestyles).map(l => ({ ...l, activities: arr(l.activities), schedule: shapeWeek(l.schedule) }));
  o.schedule = shapeWeek(o.schedule);
  o.timeAllocs = fit(BLANK.timeAlloc, o.timeAllocs).map(t => ({ ...t, slots: fit(BLANK.timeSlot, t.slots) }));
  o.meStats = shapeElements(o.meStats);
  o.socialMedia = shapeElements(o.socialMedia);
  o.moneyGoal = o.moneyGoal == null ? null : num(o.moneyGoal) || null;
  o.incomes = fit(BLANK.income, o.incomes).map(i => ({ ...i, amount: num(i.amount), hoursPerWeek: num(i.hoursPerWeek), projections: arr(i.projections) }));
  o.ratings = shapeRatings(o.ratings);
  o.log = arr(o.log).filter(e => e && e.msg).slice(0, 500).map(e => ({ t: num(e.t, Date.now()), msg: String(e.msg), tag: e.tag || 'event' }));
  return o;
}
