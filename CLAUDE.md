# Deepcore Blocks: notes for Claude Code

A mining-themed 8×8 block puzzle: drag 3-piece sets onto the board, clear rows and columns, dig through six zones of a new map every day. A single-page web app with no build step and no runtime dependencies, installable as a PWA, hosted on GitHub Pages (https://taylors-bookshelf.github.io/deepcore-blocks/, repo Taylors-Bookshelf/deepcore-blocks). The visual system comes from the design package in `design/`.

## Run, test, release

- `npm start` serves the folder at http://localhost:8080 (any static server works).
- `npm install && npx playwright install chromium && npm test` runs every suite (rules, release tests r1/r3/r4/r5/r6, maps, smoke, spec, touch, flow, dock, gates, soak). `npm run test:balance` runs the slow bot-based balance test.
- Add `?debug` to the URL on **localhost only** to get `window.__deepcore.test` (hooks used by the tests; never rely on them in game code). Tests block analytics so test runs never reach PostHog.
- Release routine: bump `APP_VERSION` in `src/version.js` (the service worker cache name derives from it), update `CHANGELOG.md`, run `npm test`, commit, tag `vX.Y.Z`, `git push --tags origin main`, then confirm the live site serves the new version. Pushing to `main` republishes in about 30 seconds.
- Decisions made without asking are logged in `DECISIONS.md`; `ROADMAP.md` tracks the v1.0 work item by item.

## Files

- `index.html`: all screens. `game.js` is loaded only after `assets.js` has preloaded the sprites.
- `src/styles.css`: all styles, from the design tokens (`design/tokens.json`): flat slate ground, panel surfaces with a 1px inset line, amber lamp accent. Jersey 10 for numbers and titles, Chakra Petch for text (`fonts/`, both OFL).
- `design/`: the design package as delivered (spec, tokens, effects, mockups, SVG + PNG sprites). `assets/`: the 16×16 PNGs the game loads.
- `src/data.js`: tables only (ores, point values, zones, recipes, lights, daily twists, stars, `boardParams`). `src/core.js`: bitboard, solver, piece families, the `chooseSet` dealer, `dressPiece`, move evaluator `rankMoves`. No DOM, runs in Node.
- `src/maps.js`: daily world-map generator and renderer. `src/meta.js`: lifetime rank, streaks, countdown, share text, save codes, discovery log catalogue, ambient music engine (no DOM except WebAudio).
- `src/analytics.js` + `src/config.js`: anonymous PostHog analytics (empty key = off); `src/analytics.js` exposes `window.DCA`.
- `src/game.js`: the screen layer in one IIFE: sprite pipeline (`TEX`, `OVERC`, `SPR`; procedural art is the fallback if a PNG is missing), catalog (`MATS`), state, dealer glue, UI, effects, sound, game flow (`startBoard`, async `place`, `reachTarget`, `bankBoard`, `gameOver`), specials dock, anvil and craft panels, make-room sheet, field guide, profile, settings, tutorial, saving (schema versioned), home, world map, drag, render loop, boot.
- `tools/`: `sim.mjs`, `day.mjs`, `mercy.mjs` simulate bot players on the real dealer (`--bot mid` is calibrated to a typical player). `tests/`: see above.

## Design rules (keep unless told otherwise)

**Boards and progression**
- 24 boards per day: 6 zones × 4 (The Forest, Limestone Caves, Granite Halls, Slate Caverns, Basalt Gem Depths, The Underworld). The map regenerates every **Pacific-time** day with a different surface and tunnels (`maps.js`); the cave is dug open board by board, only the forest shows at first. Internal block ids stay `grass/dirt/log/stone/granite/deep/obsidian/ember` (display names Topsoil, Wood, Limestone, Granite, Slate, Basalt, Magmastone).
- Clearing all 24 in a day earns **Prospector**; the day-end screen then lets you spend leftovers on specials.
- **Gates:** the 4th board of each zone needs 2 torches (Forest: 10 coal + 5 wood each) or 2 lanterns (deeper: 20 coal + 10 copper each), crafted from the map's Craft panel. **Strip mine:** a side tunnel after each zone's 3rd board (once per zone per day, not one of the 24): resource goals instead of a score, score becomes a daily bonus. Ore rates were tuned (`tools/day.mjs`) so it is needed about 55-65% of the time.
- A board clears at its **score target**. Reaching it clears the board for good and banks the haul; then BANK IT or KEEP GOING for stars (2★ at 130%, 3★ at 170%, each extra star +10% of the target; 3★ banks itself). A cave-in while playing on loses only the ore gathered since and keeps the clear.
- **Haul:** ore, gems and wood mined on a board sit in `hand` (shown as +n) and bank at the clear; a cave-in without a Rescue Potion loses them. The **stash resets each Pacific day**; leftovers become bonus points on yesterday's record. Replaying a cleared board is a **practice run** (points and stars, no ore).
- No difficulty setting; `ZONES[].d` sets dealer difficulty. Repeated cave-ins on one board ease the dealer (`mercyTilt`). One **daily twist** per day (`MODIFIERS`): Gold Rush, Ruby Rain, Gem Fever, Treasure Day, Coal Seams, Bright Lamps.

**Blocks and resources**
- Base blocks blend between zones (`ZONES[].mixes`); a block never appears before its zone. Ores (`ORES`): coal, copper, iron, ruby (a common gem-looking resource), gold; gems (`ZONES[].gems`, capped per board): emerald, diamond. Wood comes from logs. Rates and the per-zone boosts are balance-tuned; do not change them without re-running the sims.
- Point values in `VAL`: deeper rock worth more, ore far more, gems most.

**Specials**
- Craft-only, held in a **3-slot dock in any mix** (duplicates allowed): Blast Charge, Sledgehammer, Rescue Potion, Luck Tonic (`RECIPES`). Crafting with a full dock opens the make-room sheet (destroy one special; ore is spent only on confirm). Random-only on the board: Prism Stone, Fossil, Buried Treasure (`SPECIAL_MIX`, `SPECIAL_RATE` 1%/2%/3% by tier).
- Blast Charge breaks the 8 neighbours; Sledgehammer reshuffles the board (no trapped gaps, no full lines, room for the tray); Rescue Potion is used automatically on a cave-in (undo last placement, fresh set); Luck Tonic (tap to drink) favours the next 7 sets. Prism = 3 of a zone ore/gem; Fossil = 1,000 points; Buried Treasure = a haul of ore/gems.

**Dealer and feel**
- Every dealt set is solvable (a cave-in is always the player's fault). Easy boards get strong help that fades with difficulty; "mercy" adds help as the board fills; nearly empty boards get a hunt for All-Clear sets. Pieces come in families (all rotations/mirrors equally likely); big corner pieces are dialled down.
- "Perfect!" (+50) when the placement was the only one keeping the tray playable, "Great fit!" (+25) for one of 2–3. Multi-line clears pay extra (Double/Triple/Quad). All Clear: bonus of 15% of the target and a big easy set.
- Layout is the design spec at 390pt: 44pt header, 36pt progress bar, 38pt resource strip, 42pt blocks with 2pt seams, 56pt dock slots, 114pt tray slots with 20pt piece cells; `tests/spec.mjs` asserts it. Tray pieces never resize; a piece rides above the fingertip while dragging.

## Saving

`localStorage` only (keys `deepcore-profile`, `-day`, `-board`, `-life`, `-settings`, `-schema`, `-sound`, `-install`, `-aid`, `-analytics`). `SCHEMA` (currently 3) and `migrate()` handle format changes; a saved board is validated before use. Settings has a save-code backup/restore (`DC1.…`) and a reset. Progress does not follow a player across devices without a code.

## Open items to raise with the designer

- Rank thresholds, daily-twist strengths, hint price (3 coal) and star bonus are first-pass numbers.
- Ambient music is off by default (it would play with the iPhone silent switch on).
- Random special art (Prism, Fossil, Treasure), potions, torch, lantern and wood are still the original procedural pixel art; the design package did not cover them.
- Leaderboards need a backend and are not built; the share card is the social feature.
- Keep the game's own identity in names, art and store listings. Do not use other games' names, logos or textures.
