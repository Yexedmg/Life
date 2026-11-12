// LIFE — calc. Every derived number in the game. Reads D, never writes it.
import { D } from './store.js';
import { STATS, STAT, DAYS, GAIN, ROIS, TIER_VAL, LEADS_PER_STAR, LEAD_MAX_STARS, CAP } from './schema.js';

export const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export const sum = a => a.reduce((x, y) => x + y, 0);
export const avg = a => (a.length ? sum(a) / a.length : 0);
export const r1 = n => Math.round(n * 10) / 10;
export const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtDate = t => { const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; };
export const fmtMonth = t => { const d = new Date(t); return `${MON[d.getMonth()][0].toUpperCase() + MON[d.getMonth()].slice(1)} '${String(d.getFullYear()).slice(2)}`; };
export const DAY = 864e5;
export const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const dts = s => new Date(s + 'T00:00:00').getTime();
export const iso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const todayKey = () => DAYS[(new Date().getDay() + 6) % 7];

// ── XP
export const xpForLevel = l => Math.floor(100 * Math.pow(1.4, l - 1));

// ── Borough scoping: the main borough shows the global sets, every other borough its own.
export function curBorough() { for (const c of D.world.cities) for (const b of c.boroughs) if (b.id === D.world.currentBoroughId) return b; return null; }
export const curCity = () => D.world.cities.find(c => c.boroughs.some(b => b.id === D.world.currentBoroughId)) || null;
const isMain = b => !b || b.id === D.world.mainBoroughId;
export const scopeOwner = () => { const b = curBorough(); return isMain(b) ? D : b; };
export const actCats = () => scopeOwner().activityCategories;
export const actSections = () => scopeOwner().activitySections;
export const leadMethods = () => scopeOwner().leadgen.methods;
export function scopes() {
  const out = [D];
  for (const c of D.world.cities) for (const b of c.boroughs) if (b.id !== D.world.mainBoroughId) out.push(b);
  return out;
}
export function findActivity(id) {
  if (!id) return null;
  for (const s of scopes()) for (const cat of s.activityCategories) { const item = cat.inventory.find(i => i.id === id); if (item) return { cat, item }; }
  return null;
}
export function findLeadItem(id) {
  for (const s of scopes()) for (const method of s.leadgen.methods) { const item = method.inventory.find(i => i.id === id); if (item) return { method, item }; }
  return null;
}

// ── Slots
export const slotted = c => c.slots.map(id => id && c.inventory.find(i => i.id === id)).filter(Boolean);
export const isSlotted = (c, id) => c.slots.includes(id);
export const slottedActivities = () => actCats().flatMap(cat => slotted(cat).map(item => ({ cat, item })));
export const fxKeys = fx => Object.keys(fx || {}).filter(k => fx[k] && STAT[k]);
export function slotHours() { return sum(slottedActivities().map(a => parseRange(a.item.time)?.hours || 0)); }

// ── Lead generation
export const itemGain = (it, maxGain) => Math.min(GAIN[it.difficulty]?.[it.roi] ?? 0, maxGain);
export const methodGain = m => { const s = slotted(m); return s.length ? avg(s.map(i => itemGain(i, m.maxGain))) : 0; };
export function leadBar() { // a MEAN, not a sum — one weak item lowers the bar. Deliberate.
  const g = leadMethods().flatMap(m => slotted(m).map(i => itemGain(i, m.maxGain)));
  return clamp(avg(g));
}
export const leadCeiling = () => Math.min(12, Math.max(1, ...leadMethods().map(m => m.maxGain)));
export const leadStars = n => Math.min(LEAD_MAX_STARS, Math.floor(n / LEADS_PER_STAR));
export const totalLeads = () => sum(leadMethods().flatMap(m => m.inventory.map(i => i.leads)));
export function methodRoi(m) { const s = slotted(m); return s.length ? ROIS[Math.round(avg(s.map(i => ROIS.indexOf(i.roi))))] : null; }
export const roiForLevel = l => (l >= 21 ? 'very-high' : l >= 16 ? 'high' : l >= 11 ? 'medium' : l >= 6 ? 'medium-low' : 'low');

// ── The Entity
export const actVibe = it => 1 + it.meetBonus * 0.5 + fxKeys(it.statEffects).length * 0.3;
export function compGain(c) {
  const s = slotted(c);
  let g = s.length ? avg(s.map(i => itemGain(i, c.maxGain))) : 0;
  if (c.id === 'vc-vibe') g += sum(slottedActivities().map(a => actVibe(a.item)));
  return clamp(g, 0, c.maxGain);
}
export const vibe = () => clamp(avg([leadBar(), ...D.vibeComponents.map(compGain)]));
export const vibeCeiling = () => avg([leadCeiling(), ...D.vibeComponents.map(c => c.maxGain)]);

// ── People
export const chasers = () => D.girls.filter(g => g.status === 'Talking' || g.status === 'Dating');
export const taken = () => (D.relationships.theOne ? 1 : 0) + D.relationships.commons.length;
export const girl = id => D.girls.find(g => g.id === id) || null;
export function meetParts() {
  const s = D.player.stats;
  return [['Base', 1], ['Social ×1', s.social], ['Charm ×0.5', s.charm * 0.5], ['Sex Appeal ×1', s.sexAppeal], ['Looks ×1', s.looks],
    ['Boldness ×0.5', s.boldness * 0.5], ['Fear ×−0.5', -s.fear * 0.5], ['Friends (rarity ×0.5)', sum(D.friends.map(f => f.rarity * 0.5))],
    ['Slotted activities', sum(slottedActivities().map(a => a.item.meetBonus))], ['Approach streak', D.player.streaks.coldApproach], ['Taken ×2', taken() * 2]];
}
export const meetBar = () => clamp(sum(meetParts().map(p => p[1])), 0, 150);
export const expectedRarity = p => (p >= 100 ? 5 : p >= 80 ? 4 : p >= 50 ? 3 : p >= 25 ? 2 : 1);

// ── Ratings: "% of potential" — Σ value / (count × max)
export function nodePct(n) {
  if (n.children?.length) { const ps = n.children.map(nodePct).filter(p => p !== null); if (ps.length) return avg(ps); }
  const owned = (n.items || []).filter(i => !i.later);
  if (owned.length) return sum(owned.map(i => TIER_VAL[i.tier])) / (owned.length * 6) * 100;
  return n.rating ? TIER_VAL[n.rating] / 6 * 100 : null;
}
export function ratingsPct() { const ps = D.ratings.map(nodePct).filter(p => p !== null); return ps.length ? avg(ps) : null; }
export function findRating(path) {
  let list = D.ratings, node = null;
  for (const id of path || []) { node = list.find(n => n.id === id); if (!node) return null; list = node.children; }
  return node;
}
export function* walkRatingItems(list = D.ratings, path = []) {
  for (const n of list) { const p = [...path, n.id]; for (const item of n.items) yield { node: n, item, path: p }; yield* walkRatingItems(n.children, p); }
}

// ── Money: projection engine
export const monthTs = ym => new Date(ym + '-01T00:00:00').getTime();
export function streamPoints(s, now = Date.now()) {
  return [{ t: now, a: s.amount }, ...s.projections.map(p => ({ t: monthTs(p.date), a: +p.amount || 0, id: p.id })).filter(p => p.t > now).sort((a, b) => a.t - b.t)];
}
export function streamValueAt(s, t, now = Date.now()) {
  const p = streamPoints(s, now);
  if (t <= p[0].t) return p[0].a;
  for (let i = 0; i < p.length - 1; i++) if (t <= p[i + 1].t) return p[i].a + (p[i + 1].a - p[i].a) * (t - p[i].t) / (p[i + 1].t - p[i].t);
  return p[p.length - 1].a;
}
export const flowing = () => D.incomes.filter(i => i.status !== 'possible');
export const incomeAt = (t, now = Date.now()) => sum(flowing().map(s => streamValueAt(s, t, now)));
export const monthlyIncome = () => sum(flowing().map(s => s.amount));
export const hourly = s => (s.hoursPerWeek > 0 ? s.amount * 12 / (s.hoursPerWeek * 52) : null);
export function goalEta() {
  if (!D.moneyGoal) return null;
  let bal = D.player.stats.money;
  if (bal >= D.moneyGoal) return { done: true };
  const now = Date.now(), d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 240; i++) { d.setMonth(d.getMonth() + 1); bal += incomeAt(d.getTime(), now); if (bal >= D.moneyGoal) return { date: d.getTime(), months: i }; }
  return { never: true };
}

// ── Time
export function parseRange(str) {
  const m = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec((str || '').trim());
  if (!m) return null;
  const start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
  let dur = end - start; if (dur < 0) dur += 1440;
  return { start, end, hours: Math.round(dur / 60 * 2) / 2, from: `${m[1].padStart(2, '0')}:${m[2]}`, to: `${m[3].padStart(2, '0')}:${m[4]}` };
}
export const toMin = hhmm => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + m; };
export function weekStats(schedule) {
  const blank = () => ({ hours: 0, byCat: {}, byStat: {}, acts: [] });
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  const week = { ...blank(), catDetail: {}, statDetail: {} }, days = {};
  for (const day of DAYS) {
    const d = days[day] = blank();
    for (const e of [...schedule[day]].sort((a, b) => (parseRange(a.time)?.start ?? 9999) - (parseRange(b.time)?.start ?? 9999))) {
      const hrs = parseRange(e.time)?.hours || 0, f = findActivity(e.activityItemId);
      const cat = f ? f.cat.name : e.levelUpRef ? 'Level-up' : 'Custom', stats = f ? fxKeys(f.item.statEffects) : [];
      const act = { e, hrs, stats, cat, name: f ? f.item.name : e.name, day };
      d.hours += hrs; week.hours += hrs; d.acts.push(act); week.acts.push(act);
      add(d.byCat, cat, hrs); add(week.byCat, cat, hrs); (week.catDetail[cat] ||= []).push(act);
      for (const s of stats) { add(d.byStat, s, hrs); add(week.byStat, s, hrs); (week.statDetail[s] ||= []).push(act); }
    }
  }
  return { days, week };
}
export function nowNext() {
  const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
  const es = D.schedule[todayKey()].map(e => ({ e, r: parseRange(e.time) })).filter(x => x.r).sort((a, b) => a.r.start - b.r.start);
  const inside = r => (r.start <= r.end ? m >= r.start && m < r.end : m >= r.start || m < r.end);
  return { cur: es.find(x => inside(x.r)) || null, next: es.find(x => x.r.start > m) || null, count: D.schedule[todayKey()].length, hours: sum(es.map(x => x.r.hours)) };
}

// ── Lifestyle
export function lifestyleContrib(l) {
  const tot = {}, add = (k, v) => { tot[k] = (tot[k] || 0) + v; };
  for (const a of l.activities) {
    const f = findActivity(a.activityItemId); if (!f) continue;
    for (const k of fxKeys(f.item.statEffects)) add(STAT[k].label, f.item.statEffects[k]);
    add('Meet bonus', f.item.meetBonus); add('Vibe (when slotted)', actVibe(f.item));
  }
  const rows = Object.entries(tot).filter(r => r[1] !== 0).sort((a, b) => a[1] - b[1]);
  return { rows, total: sum(rows.map(r => Math.abs(r[1]))) };
}
export const lifestyleRank = () => D.lifestyles.map(l => ({ l, score: lifestyleContrib(l).total })).sort((a, b) => b.score - a.score);

// ── Planning
export const eraStatus = e => (dts(e.end) < today0() ? 'past' : dts(e.start) > today0() ? 'planned' : 'current');
export const currentEra = () => D.eras.filter(e => eraStatus(e) === 'current').sort((a, b) => dts(a.start) - dts(b.start))[0] || null;
export const nextEra = () => D.eras.filter(e => eraStatus(e) === 'planned').sort((a, b) => dts(a.start) - dts(b.start))[0] || null;
export const daysTo = s => Math.round((dts(s) - today0()) / DAY);
export const tasksOf = m => m.milestones.flatMap(ms => ms.tasks);
export const progress = tasks => (tasks.length ? tasks.filter(t => t.done).length / tasks.length * 100 : 0);
export function birthday() {
  if (!D.settings.birthday) return null;
  const b = new Date(D.settings.birthday + 'T00:00:00'); if (isNaN(b)) return null;
  const now = new Date(); let next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (next.getTime() < today0()) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate());
  const prev = new Date(next.getFullYear() - 1, b.getMonth(), b.getDate());
  return { next: next.getTime(), turning: next.getFullYear() - b.getFullYear(), days: Math.ceil((next - now) / DAY), pct: clamp((now - prev) / (next - prev) * 100), today: next.getTime() === today0() };
}

// ── Balance (Total Stats)
export function balance() {
  const k = { expansion: 0, maintenance: 0, cost: 0 };
  for (const a of slottedActivities()) k[a.item.kind] = (k[a.item.kind] || 0) + 1;
  k.expansion += sum(leadMethods().map(m => slotted(m).length)); // lead slots always count as expansion
  const total = k.expansion + k.maintenance + k.cost, e = total ? k.expansion / total * 100 : 0, c = total ? k.cost / total * 100 : 0;
  const verdict = !total ? 'Nothing slotted. There is no balance to judge yet.'
    : c >= 50 ? 'You are draining yourself. Cut back on indulgences and costs.'
    : c >= 30 ? 'Heavy on cost — indulgences are eating into your balance. Careful.'
    : e >= 70 ? "Heavy on expansion — you are pushing growth hard. Don't burn out."
    : e >= 45 && c <= 15 ? 'Healthy balance of expansion and maintenance.'
    : e >= 45 ? 'Good expansion push, but watch the costs creeping in.'
    : e >= 25 ? 'Maintenance-heavy. Go expand — slot a lead or a skill-building activity.'
    : 'Almost all maintenance. You are coasting. Add expansion activities.';
  return { ...k, total, expPct: e, costPct: c, mntPct: total ? k.maintenance / total * 100 : 0, verdict };
}

// ── Level-up registry (body-map stats + platforms share one shape)
export const elements = () => [...D.meStats.map(el => ({ el, kind: 'me' })), ...D.socialMedia.map(el => ({ el, kind: 'sm' }))];
export function resolveMove(ref) {
  if (!ref) return null;
  const x = elements().find(x => x.el.id === ref.statId); if (!x) return null;
  const move = x.el.levelUp.find(m => m.id === ref.moveId);
  return move ? { el: x.el, move } : null;
}
const allSchedules = () => [D.schedule, ...D.lifestyles.map(l => l.schedule)];
export function moveUsage(statId, moveId) {
  const hit = r => r && r.statId === statId && r.moveId === moveId;
  return {
    sched: sum(allSchedules().map(s => DAYS.reduce((n, d) => n + s[d].filter(e => hit(e.levelUpRef)).length, 0))),
    alloc: sum(D.timeAllocs.map(t => t.slots.filter(s => hit(s.levelUpRef)).length)),
  };
}

// ── THE GAPS — what the mirror says back. Plain text; sev 3 = it should sting.
export function gaps() {
  const g = [], add = (sev, title, sub, to) => g.push({ sev, title, sub, to });
  const r = D.relationships, ch = chasers(), s = D.player.stats;

  if (!r.theOne && !r.commons.length) {
    if (ch.length) {
      const top = [...ch].sort((a, b) => b.affinity - a.affinity)[0];
      const dates = Math.max(1, Math.ceil((60 - top.affinity) / 12));
      add(3, top.affinity >= 60 ? `Make it official with ${top.name}.` : `Take ${top.name} on a date.`,
        top.affinity >= 60 ? `Affinity ${top.affinity}/100 — she's there. Ask.` : `Affinity ${top.affinity}/100. ${dates} more date${dates === 1 ? '' : 's'} and you can make it official.`, ['life']);
    } else add(3, 'Meet someone new.', 'Nobody in play yet. Go where people are, start a conversation, then add her to the roster.', ['leadgen']);
  } else if (!r.theOne) add(2, 'Find The One.', `${r.commons.length} in the commons. Is one of them it?`, ['life']);

  if (!D.northstar) add(3, 'No Northstar.', "You're moving without a direction. One sentence. Call it.", ['@northstar']);
  else if (D.northstar.targetDate && daysTo(D.northstar.targetDate) < 0) add(3, 'Your Northstar deadline passed.', `${-daysTo(D.northstar.targetDate)} days ago. Did you hit it? Then set the next one. If not — re-date it and mean it.`, ['@northstar']);

  if (!leadMethods().some(m => slotted(m).length)) add(2, 'No lead sources slotted.', 'Nobody finds you by accident. Slot how you actually meet people.', ['leadgen']);

  if (!D.moneyGoal) add(2, 'No number.', 'What number are you chasing? Set it.', ['money']);
  else if (s.money < D.moneyGoal) {
    const eta = goalEta(), pct = Math.round(clamp(s.money / D.moneyGoal * 100));
    if (eta.never) add(3, `${money(D.moneyGoal - s.money)} short of the goal.`, flowing().length ? 'At this income you never get there. Raise a stream or add one.' : 'Nothing is flowing. No income, no goal. Put a stream on the board.', ['income']);
    else add(1, `Money goal: ${pct}%.`, `On track for ${fmtMonth(eta.date)} — ${eta.months} months out. Want it sooner? Raise a stream.`, ['income']);
  }

  const era = currentEra(), nx = nextEra();
  if (era) { const left = daysTo(era.end); if (left <= 7) add(2, `"${era.name}" ends in ${left} day${left === 1 ? '' : 's'}.`, 'Finish what this era was for.', ['calendar']); }
  else if (nx) add(1, 'No main quest running.', `"${nx.name}" starts in ${daysTo(nx.start)} days. What is this stretch for until then?`, ['calendar']);
  else add(2, 'No main quest.', 'Which chapter of your life is this? Name it. Date it.', ['calendar']);

  const open = D.manifests.filter(m => !m.achievedAt);
  if (!open.length) add(1, 'No goals on the board.', 'Set a goal, detach, and do your best on what\'s required.', ['manifest']);
  for (const m of open) {
    const t = tasksOf(m);
    if (!t.length) add(1, `"${m.name}" has no tasks.`, 'A goal without moves is a wish. Break it down.', ['manifest']);
    else if (!t.some(x => x.done)) add(1, `"${m.name}" is at 0%.`, 'Not one task done. Start with the smallest.', ['manifest']);
  }

  if (!D.schedule[todayKey()].length) add(2, 'Nothing scheduled today.', 'Unplanned days get eaten. Paint it.', ['schedule']);

  const cats = actCats(), totalSlots = sum(cats.map(c => c.maxSlots)), filled = sum(cats.map(c => slotted(c).length));
  if (totalSlots - filled > 0) add(filled ? 1 : 2, `${totalSlots - filled} of ${totalSlots} activity slots are empty.`, filled ? 'Unused capacity. Fill them or cut them.' : 'Nothing is slotted. What do you actually do with your weeks?', ['activities']);
  const b = balance();
  if (b.total && (b.costPct >= 30 || b.expPct < 25)) add(b.costPct >= 30 ? 2 : 1, b.costPct >= 30 ? 'Your balance is leaking.' : 'You are coasting.', b.verdict, ['totalstats']);

  const moves = elements().flatMap(x => x.el.levelUp.map(m => moveUsage(x.el.id, m.id)));
  if (moves.length && !moves.some(u => u.sched || u.alloc)) add(2, `${moves.length} level-up move${moves.length === 1 ? '' : 's'} written. None scheduled.`, "Intentions that aren't in the week don't happen.", ['schedule']);

  if (!D.meStats.length) add(1, 'Nothing on your body map.', 'What are the parts of you? Put them on the map and rate them.', ['me']);
  else {
    const w = [...D.meStats].sort((a, b) => a.level - b.level)[0];
    if (w.level < CAP) add(1, `Weakest part: ${w.title} — ${w.level}/${CAP}.`, w.levelUp.length ? 'You wrote the moves. Are they in your week?' : 'No level-up moves written. What exactly gets this to the next level?', ['me']);
  }

  const rated = D.ratings.map(n => ({ n, p: nodePct(n) })).filter(x => x.p !== null).sort((a, b) => a.p - b.p)[0];
  if (rated && rated.p < 50) add(1, `${rated.n.name} is at ${Math.round(rated.p)}% of potential.`, 'Lowest-rated part of your setup. Upgrade it.', ['ratingdetail', { path: [rated.n.id] }]);
  else if (ratingsPct() === null) add(1, 'Nothing is rated.', 'Everything you run — rate it S to F. You can\'t close a gap you never measured.', ['ratings']);

  if (s.fear > s.boldness) add(1, 'Fear is beating boldness.', `${r1(s.fear)} against ${r1(s.boldness)}. One approach that lands flips it.`, ['meet']);

  for (const { item, path } of walkRatingItems()) if (item.upgrade && item.upgrade.price <= s.money) { add(0, `You can afford ${item.upgrade.name}.`, `${item.name} ➜ ${item.upgrade.name} for ${money(item.upgrade.price)}. Take it.`, ['ratingdetail', { path }]); break; }

  return g.sort((a, b) => b.sev - a.sev);
}
export { STATS };
