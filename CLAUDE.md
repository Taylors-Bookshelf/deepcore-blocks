# Deepcore Blocks: notes for Claude Code

A mining-themed 8×8 block puzzle: drag 3-piece sets onto the board, clear rows and columns, dig through six zones of a new map every day. A single-page web app with no build step and no runtime dependencies, installable as a PWA, hosted on GitHub Pages (https://taylors-bookshelf.github.io/deepcore-blocks/, repo Taylors-Bookshelf/deepcore-blocks). The visual system comes from the design package in `design/`.

## Run, test, release

- `npm start` serves the folder at http://localhost:8080 (any static server works).
- `npm install && npx playwright install chromium && npm test` runs every suite (rules, release tests r1/r3/r4/r5/r6/r7, maps, smoke, spec, touch, flow, dock, gates, soak). `npm run test:balance` runs the slow bot-based balance test.
- Add `?debug` to the URL on **localhost only** to get `window.__deepcore.test` (hooks used by the tests; never rely on them in game code). Tests block analytics so test runs never reach PostHog.
- Release routine: bump `APP_VERSION` in `src/version.js` (the service worker cache name derives from it), update `CHANGELOG.md`, run `npm test`, commit, tag `vX.Y.Z`, `git push --tags origin main`, then confirm the live site serves the new version. Pushing to `main` republishes in about 30 seconds.
- Decisions made without asking are logged in `DECISIONS.md`; `BACKLOG.md` (exported from the online doc) tracks bugs, features, the roadmap toward v1 and design notes.

## Files

- `index.html`: all screens. `game.js` is loaded only after `assets.js` has preloaded the sprites.
- `src/styles.css`: all styles, from the design tokens (`design/tokens.json`): flat slate ground, panel surfaces with a 1px inset line, amber lamp accent. Jersey 10 for numbers and titles, Chakra Petch for text (`fonts/`, both OFL).
- `design/`: the design package as delivered (spec, tokens, effects, mockups, SVG + PNG sprites). `assets/`: the 16×16 PNGs the game loads.
- `src/data.js`: tables only (ores, block values, zones, recipes, daily twists, scoring `SCORE`/`placePoints`, deals, star lines, ore budget, `boardParams`). `src/core.js`: bitboard, solver, piece families, the `chooseSet` dealer, `dressPiece`, move evaluator `rankMoves`. No DOM, runs in Node.
- `src/maps.js`: the descent's map generator (tunnels per run, surface per day) and renderer (automatic lamps, camps, the Core temple). `src/meta.js`: lifetime rank, streaks, countdown, share text, save codes, discovery log catalogue, ambient music engine (no DOM except WebAudio).
- `src/analytics.js` + `src/config.js`: anonymous PostHog analytics (empty key = off); `src/analytics.js` exposes `window.DCA`.
- `src/game.js`: the screen layer in one IIFE: sprite pipeline (`TEX`, `OVERC`, `SPR`; procedural art is the fallback if a PNG is missing), catalog (`MATS`), state, dealer glue, UI, effects, sound, game flow (`startBoard`, async `place`, `reachTarget`, `bankBoard`, `gameOver`), specials dock, anvil and craft panels, make-room sheet, field guide, profile, settings, tutorial, saving (schema versioned), home, world map, drag, render loop, boot.
- `tools/`: `sim.mjs`, `day.mjs`, `mercy.mjs` simulate bot players on the real dealer (`--bot mid` is calibrated to a typical player). `tests/`: see above.

## Design rules (keep unless told otherwise)

**Boards and progression (the Descent, v2.0)**
- One long run, kept across days (`dayState` in game.js is the run, saved under `deepcore-run`): Forest, Limestone Caves, Slate Caverns, Granite Halls, Basalt Depths, Magmastone and The Crust have 8 boards each, then the Ancient Core (`ZONES[].boards`, indices via `Z_START`/`zoneOfIdx`/`jOfIdx`). Pacific-time days still drive the daily twist.
- **Tools** gate each layer's first board (`TOOLS`, `toolNeeded`): branch → bone → copper → iron → steel → Galaxy Alloy, forged on the map (Forge panel, or one tap on the locked board). Tool costs need a few replays per layer on top of its 8 boards. The map shows only rock, tunnels, boards, camps and the Core.
- **Missed day** (no clear yesterday or today): `settle()` drops the current layer's boards after its camp (the layer's first board, below the Forest). Tools and stash are kept.
- **Tool wear is off** (`TOOL_WEAR=false`) until backlog F-9; the old Galaxy Alloy wear code (`WEAR`, `toolBreak`) is dormant.
- **Ancient Core** (`openCore`): place the portal, tally, name, share/download card, credits, then `finishRun()` starts a new run with a core fragment (max 5, Legendary at 5).
- **Scoring (v2.0.4, `SCORE`, `placePoints` in data.js, shared with the simulator):** 10 a block placed, 100 a line, combo +250/+600/+1200 for 2/3/4+ lines, streak +50 per clear in a row after the first (max +500; any non-clearing placement breaks it), All Clear +250. Mining gives resources, never points. Crafted specials: Blast +200, Sledgehammer +350, Potion of Luck −150, Potion of Protection −250. Random specials pay resources only.
- A board is **a fixed number of deals** (`DEALS` by layer, 4 to 7); placing the last piece ends it (`reachTarget`). Its 0–3 stars come from its points against `STAR_LINES` (board 1-1: `FIRST_BOARD_STARS`); `def.target` is the 1-star line. A three-star meter beside the score bar fills with points; layer star totals show on the header and map. Lines were set with `tools/experiments/score2.mjs --even 1`. The results sheet (`showResult`) offers CONTINUE (`bankBoard`: haul, stars, star bonus) or RETRY (`retryBoard`: a clean restart, the run is discarded); 0 stars = not cleared, RETRY or MAP only. Stars already earned never drop. Each board deals a **fixed ore budget** (`ORE_BUDGET`, `rollBudget`/`spreadOre` in core.js); there is no bonus ore. Replays give ore.
- No side tunnels (removed in v2.0.2): ore for the next tools comes from replaying cleared boards. Pacing and economy are simulated with `tools/run.mjs` (whole descents, including replays and 0-star retries) and checked by `npm run test:balance`.
- No difficulty setting; `ZONES[].d` sets dealer difficulty. Repeated cave-ins ease the dealer (`mercyTilt`). One **daily twist** per day (`MODIFIERS`), including Forge Day (cheaper tools).

**Blocks and resources**
- Base blocks blend between zones (`ZONES[].mixes`); a block never appears before its zone. Ores (`ORES`): bone, coal, copper, iron, gold, meteorite, prism ore (rainbow), ruby (a common gem-looking resource); gems (`ZONES[].gems`, capped per board): emerald, diamond. Wood comes from logs and only grows in the Forest. Rates and the per-zone boosts are balance-tuned; do not change them without re-running the sims.
- `VAL` ranks blocks (deeper rock more, ore far more, gems most); since v2.0.4 it gives no points.

**Specials**
- Craft-only, held in a **3-slot dock in any mix** (duplicates allowed): Blast Charge, Sledgehammer, Potion of Protection (id `rescue`), Potion of Luck (id `luck`) (`RECIPES`). Crafting with a full dock opens the make-room sheet (destroy one special; ore is spent only on confirm). Random-only on the board: Fossil and Buried Treasure (`SPECIAL_MIX`, `SPECIAL_RATE` 0.3%/0.6%/1.2%/1.8% by tier; Easy is the Forest). The Geode was removed in v2.0.2. Both potions need 4 bone; bone is mined only in the Forest.
- Blast Charge breaks the 8 neighbours; Sledgehammer reshuffles the board (no trapped gaps, no full lines, room for the tray); the Potion of Protection is used automatically on a cave-in (undo last placement, fresh set); the Potion of Luck (tap to drink) favours the next `LUCK_DEALS` (5) deals. What a Blast Charge breaks is lost, not mined. Fossil = 4–8 bones (`FOSSIL_BONE`); Buried Treasure = a haul of ore/gems (`TREASURE`); no points; both paid by `specialHaul`, shared with the simulator.

**Dealer and feel**
- Every dealt set is solvable (a cave-in is always the player's fault). Easy boards get strong help that fades with difficulty; "mercy" adds help as the board fills; nearly empty boards get a hunt for All-Clear sets. Pieces come in families (all rotations/mirrors equally likely); big corner pieces are dialled down.
- "Perfect!" when the placement was the only one keeping the tray playable, "Great fit!" for one of 2–3 (praise only, no points). All Clear: +250 and a big easy set.
- Layout is the design spec at 390pt: 44pt header, 36pt progress bar, 52pt resource strip (counts below the icons, 99+ above 99), 42pt blocks with 2pt seams, 56pt dock slots, 114pt tray slots with 20pt piece cells; `tests/spec.mjs` asserts it. Tray pieces never resize; a piece rides above the fingertip while dragging.

## Screens (v2.1.1)

- Home: Play / Continue, with Profile (podium), Settings (gear) and Sound icons. Settings fit one screen. The speaker on home, map and board opens the sound popover (music and effects, each with a switch and volume: `settings.musicVol`, `settings.sfxVol`).
- Board header: Pause, the board's number (`boardName`: "Magmastone board #3", shown as the layer over "Board #3"), Hint (asks first via `ask()`, 5 coal fly from the stash into the button), Guide, Sound. Pause (`openPause`) is a centred card: next star line, layer stars, round Resume / Restart / Map buttons; Restart and Map ask first. The score is a number with `x/y placements left` (`placementsLeft`) and the star meter. One tap on the next map board starts it.
- First-time tips show once each (`tipOnce`, `life.tips`); tests mark them seen unless `phone({ tips: true })`.

## Saving

`localStorage` only (keys `deepcore-profile`, `-run`, `-board`, `-life`, `-settings`, `-schema`, `-sound`, `-install`, `-aid`, `-analytics`). `SCHEMA` (currently 5; v5 moved runs to 8 boards a layer) and `migrate()` handle format changes; a saved board is validated before use. Settings has a save-code backup/restore (`DC1.…`) and a reset. Progress does not follow a player across devices without a code.

## Open items to raise with the designer

- Rank thresholds, daily-twist strengths, hint price (5 coal), star bonus and the v2.0.4 scoring numbers and star lines are first-pass numbers.
- Ambient music is off by default (it would play with the iPhone silent switch on).
- Art not from the design package: bone, meteorite and prism ore overlays, crust rock, tool icons, portal, camp, temple (drawn to match), plus the older procedural specials, potions, torch, lantern and wood.
- Pacing (days to Magmastone, hours inside it, Crust break rate) is simulated, not yet measured with players.
- Leaderboards need a backend and are not built; the share card is the social feature.
- Keep the game's own identity in names, art and store listings. Do not use other games' names, logos or textures.
