# LIFE

**A life-management RPG for one player: you.** Open it like a pause menu: where you're at, where you're headed, what's missing.

No build step, no dependencies. Static files — open `index.html` from any web server.

## Put it on your phone

1. GitHub → **Settings → Pages** → deploy from this branch, folder `/ (root)`.
2. Open the Pages URL on your phone.
3. **Share → Add to Home Screen** (iOS) or **Install app** (Android). It runs full-screen and works offline.

Your data lives in that browser's `localStorage`. Export it now and then: **ME → Save / Load**.
If the old build ran on the same address, its save (`life-rpg-data`) is picked up automatically on first launch; old JSON exports also import.

## What's in it

| Tab | What it is |
|---|---|
| **HOME** | One-screen status: level, Northstar, four vitals, the single biggest gap |
| **STATUS** | Stats and the body map |
| **PLAN** | Time Allocation (the ideal day) and the actual week; analytics on demand |
| **MENU** | Every area as one tile: People, Grow, Goals, Worlds, System |

## Code map

```
index.html            shell: header, view, dock, modal
css/styles.css        the whole brutalist design system
js/schema.js          THE source of truth: defaults, entity blanks, versioned migrations
js/store.js           state D + commit() = integrity → save → render
js/calc.js            every derived number (lead bar, vibe, % of potential, projections, gaps)
js/game.js            mutations + the integrity pass (mirrors, dangling refs, derived stats)
js/ui.js              router, modal, forms, toast/undo, shared components
js/pages/*.js         one file per area
sw.js, manifest       installable + offline
```

## Decisions made in the rebuild

- **One schema, always normalised.** `normalize()` runs on fresh installs, loads, imports and undo — no field can be undefined.
- **One clock.** The fictional in-game calendar is gone; everything runs on real dates.
- **The dating-sim layer was cut down to a mirror.** No random encounters or summons. The roster holds real people; you log real dates and real approaches. Gates (affinity 60 / 90 + looks-like-you 70) stay.
- **One slot engine** drives Activities, Lead Generation and The Entity. Bars are still means, not sums.
- **Referential integrity is central.** Deleting anything cleans every reference to it, on every commit.
- **Undo on every destructive action.**
