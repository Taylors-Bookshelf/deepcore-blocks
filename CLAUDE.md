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
- `src/game.js`: the screen layer in one IIFE: sprite pipeline (`TEX`, `OVERC`, `SPR`; procedural art is the fallback if a PNG is missing), catalog (`MATS`), state, dealer glue, UI, effects, sound, game flow (`startBoard`, async `place`, `reachTarget`, `bankBoard`, `gameOver`, `luckyDodge`), the belt (`beltSlots`) and Craft (`renderCraft`, `beltTap`), cart bar, placement stats (`countPlacement`), field guide, profile, settings, tutorial, saving (schema versioned), home, world map, drag, render loop, boot.
- `tools/`: `sim.mjs`, `day.mjs`, `mercy.mjs` simulate bot players on the real dealer (`--bot mid` is calibrated to a typical player). `tests/`: see above.

## Design rules (keep unless told otherwise)

**Boards and progression (the Descent, v2.0)**
- One long run, kept across days (`dayState` in game.js is the run, saved under `deepcore-run`): Forest, Limestone Caves, Slate Caverns, Granite Halls, Basalt Depths, Magmastone and The Crust have 8 boards each, then the Ancient Core (`ZONES[].boards`, indices via `Z_START`/`zoneOfIdx`/`jOfIdx`). Pacific-time days still drive the daily twist.
- **Tools** gate each layer's first board (`TOOLS`, `toolNeeded`): branch → bone → copper → iron → steel → Galaxy Alloy, forged in Craft on the map (or one tap on the locked board). Tool costs need a few replays per layer on top of its 8 boards. The map shows only rock, tunnels, boards, camps and the Core.
- **Missed day** (no clear yesterday or today): `settle()` drops the current layer's boards after its camp (the layer's first board, below the Forest). Tools and stash are kept.
- **Tool wear is off** (`TOOL_WEAR=false`) until backlog F-9; the old Galaxy Alloy wear code (`WEAR`, `toolBreak`) is dormant.
- **Ancient Core** (`openCore`): place the portal, tally, name, share/download card, credits, then `finishRun()` starts a new run with a core fragment (max 5, Legendary at 5).
- **Scoring (v2.0.4, `SCORE`, `placePoints` in data.js, shared with the simulator):** 10 a block placed, 100 a line, combo +250/+600/+1200 for 2/3/4+ lines, streak +50 per clear in a row after the first (max +500; any non-clearing placement breaks it), All Clear +250. Mining gives resources, never points. Crafted specials: Star Drill +150, Blast +200, Sledgehammer +350, Potion of Luck −150, Potion of Protection −250. Random specials pay resources only.
- **Endless boards** (F-14, v2.4.0): no piece limit, dealt as a **rolling tray**: each placement is refilled at once with the NEXT piece shown above the board, and `chooseNext` deals a new next piece so the tray plus it can all be placed, through the board's **grace** (`def.grace` = old `DEALS`×3, 12–21). After it the dealer hardens (`rampD`) and more and more often deals an awkward piece with no promise (`wildOf`, `RAMP` in core.js; without this the bots never caved in). A board ends three ways: the **cart bar** (`#cartBar`, under the belt; lit from the first star; "Done here?" → `reachTarget`), the third star (automatic), or a cave-in (`gameOver`: stars reached are kept and the board counts as cleared, the haul is lost; once per board a **Lucky Dodge** trades half the haul for undoing the last placement, `luckyDodge`). Stars come from points against `STAR_LINES` (board 1-1: `FIRST_BOARD_STARS`); 1★ from the typical bot's scores before caving in (99% Forest → ~60% from Magmastone), 3★ at the median of a bot that knows the scoring (`tools/experiments/endless.mjs --p3bot good`). The results sheet (`showResult`) offers CONTINUE (`bankBoard`) or RETRY (`retryBoard`, a clean restart). Stars already earned never drop. Each piece carries ore at its layer's rate (`orePiece`, `def.orePer` = `ORE_RATE` × the old budget over the old length; gems capped per board). Replays give ore.
- No side tunnels (removed in v2.0.2): ore for the next tools comes from replaying cleared boards. Pacing and economy are simulated with `tools/run.mjs` (whole descents, including replays; the bots leave at 2★, or 1★ once a board runs 12 past its grace) and checked by `npm run test:balance`.
- No difficulty setting; `ZONES[].d` sets dealer difficulty. Repeated cave-ins ease the dealer (`mercyTilt`). One **daily twist** per day (`MODIFIERS`), including Forge Day (cheaper tools).

**Blocks and resources**
- Base blocks blend between zones (`ZONES[].mixes`); a block never appears before its zone. Ores (`ORES`): bone, coal, copper, iron, gold, meteorite, prism ore (rainbow), ruby (a common gem-looking resource); gems (`ZONES[].gems`, capped per board): emerald, diamond. Wood comes from logs and only grows in the Forest. Rates and the per-zone boosts are balance-tuned; do not change them without re-running the sims.
- `VAL` ranks blocks (deeper rock more, ore far more, gems most); since v2.0.4 it gives no points.

**Specials**
- Craft-only, made in **Craft on the map** (F-13, v2.4.0; the Craft button at the end of the map's belt bar; each row asks first) and carried on the **belt**: 3 slots shared by equipment (Star Drill, Blast Charge, Sledgehammer; `RECIPES[].kind='equip'`) and potions (Potion of Protection id `rescue`, Potion of Luck id `luck`; `kind='potion'`, need the brewing table). One slot to start; belt slots 2 and 3 are late-run unlocks (`WORKSHOP` in data.js, kept per run in `dayState.wk`; `beltCap`/`beltFree`/`fitDock`; `specials[i]` is slot i). In Craft: tap an item then another slot to move it, Drop it, or tap the glowing locked slot for its cost. A full belt says so (no make-room sheet). Nothing is crafted during a board. Random-only on the board: Fossil and Buried Treasure (`SPECIAL_MIX`, `SPECIAL_RATE` 0.3%/0.6%/1.2%/1.8% by tier; Easy is the Forest). Both potions need 4 bone; bone is mined only in the Forest.
- Star Drill: dragged to an edge of the board (`drillLineAt`: top/bottom = a column, left/right = a row), mines the line (`useDrill`). Blast Charge breaks and mines the 8 neighbours. Sledgehammer reshuffles the board (no trapped gaps, no full lines, room for the tray). What the drill and blast break goes into the haul. Both potions are tapped to drink and last `POTION_MOVES` (15) placements. Protection: any cave-in in that time undoes the last placement and deals a fresh set (`useRescue('potion')`, `playSaved`). Luck favours gap-filling sets, halves the late awkward pieces and doubles random specials. Fossil = 4–8 bones (`FOSSIL_BONE`); Buried Treasure = a haul of ore/gems (`TREASURE`); no points; both paid by `specialHaul`, shared with the simulator.

**Dealer and feel**
- Every dealt set is solvable, and so is the tray plus its next piece, through a board's grace (a cave-in there is always the player's fault); after it the awkward pieces end boards. Easy boards get strong help that fades with difficulty; "mercy" adds help as the board fills; nearly empty boards get a hunt for All-Clear sets. Pieces come in families (all rotations/mirrors equally likely); big corner pieces are dialled down.
- "Perfect!" when the placement was the only one keeping the tray playable, "Great fit!" for one of 2–3 (praise only, no points). All Clear: +250 and a big easy set.
- Layout is the design spec at 390pt (adjusted in v2.4.0): 44pt header, a 63pt score row (score and placements, a centred 72×48 NEXT, a bigger star meter), 52pt resource strip (counts below the icons, 99+ above 99), 42pt blocks with 2pt seams, a 68pt belt with 56pt slots, a 36pt cart bar, 114pt tray slots with 20pt piece cells; `tests/spec.mjs` asserts it. Tray pieces never resize; a piece rides above the fingertip while dragging.

## Screens (v2.4.0)

- Home: Play / Continue and today's twist, with Profile (podium), Settings (gear) and Sound icons. Settings fit one screen. The speaker on home, map and board opens the sound popover (music and effects, each with a switch and volume: `settings.musicVol`, `settings.sfxVol`).
- Board header: Pause, the board's number (`boardName`: "Magmastone board #3", shown as the layer over "Board #3"), Hint (asks first via `ask()`, 5 coal fly from the stash into the button), Guide, Sound. Pause (`openPause`) is a centred card: placements on this board, next star line, layer stars, round Map / Restart / Resume buttons (left to right); Restart and Map ask first. The score is a number with `N placements` and the star meter. One tap on the next map board starts it.
- Map: Home, the run's stars and placements (`updateMapDate`), Sound; under it the belt bar with Craft. Each layer's name has a placements chip that opens a pop-over of its boards (`openZonePop`). Board cards show today's twist.
- Placement stats (`countPlacement`): `dayState.pl` {t, z, b} for the run (every attempt), `dayState.shapes` and `life.shapes` {sid: [placed, cleared a line]} (not shown yet).
- First-time tips show once each (`tipOnce`, `life.tips`); tests mark them seen unless `phone({ tips: true })`.

## Saving

`localStorage` only (keys `deepcore-profile`, `-run`, `-board`, `-life`, `-settings`, `-schema`, `-sound`, `-install`, `-aid`, `-analytics`). `SCHEMA` (currently 7; v5 moved runs to 8 boards a layer, v6 split the dock, v7 the shared belt) and `migrate()` handle format changes; a saved board is validated before use. Settings has a save-code backup/restore (`DC1.…`) and a reset. Progress does not follow a player across devices without a code.

## Open items to raise with the designer

- Rank thresholds, daily-twist strengths, hint price (5 coal), star bonus and the v2.0.4 scoring numbers and star lines are first-pass numbers.
- Ambient music is off by default (it would play with the iPhone silent switch on).
- Art not from the design package: bone, meteorite and prism ore overlays, crust rock, tool icons, portal, camp, temple (drawn to match), plus the older procedural specials, potions, torch, lantern and wood.
- Pacing (days to Magmastone, hours inside it, Crust break rate) is simulated, not yet measured with players.
- Leaderboards need a backend and are not built; the share card is the social feature.
- Keep the game's own identity in names, art and store listings. Do not use other games' names, logos or textures.
