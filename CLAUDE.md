# Deepcore Blocks: notes for Claude Code

A mining-themed 8×8 block puzzle (drag 3-piece sets onto the board, clear rows/columns). Built as a single-page web app with no build step and no dependencies at runtime. Installable as a PWA. All art is procedurally drawn 16×16 pixel art generated in code at startup; there are no image assets except the app icons.

## Run and test

- `npm start` serves the folder at http://localhost:8080 (any static server works; opening `index.html` from disk also works, minus the service worker).
- `npm install && npx playwright install chromium && npm test` runs `tests/smoke.mjs` (Home → Map → board 1 random play, craft limits, no page errors).
- Add `?debug` to the URL to expose `window.__deepcore.test`. It only works on localhost/127.0.0.1 (never on a published host). The smoke test relies on it; never depend on it in game code.
- Each release: bump `APP_VERSION` in `src/version.js` (the service worker's cache name derives from it, so installed copies update).
- Analytics: `src/analytics.js` + `src/config.js` (PostHog key; empty = off). Events are fired from `game.js` through the `A` shim. Players can opt out in Settings; DNT/GPC are honoured.
- Fonts are self-hosted in `fonts/` (Silkscreen for titles, Barlow Semi Condensed for text; both OFL).

## Files

- `index.html`: markup for all screens (home, world map, board, anvil, overlays).
- `src/styles.css`: all styles. Single dark "mine" look on purpose, no light theme.
- `src/data.js`: tables only (ores, values, zones, recipes, difficulty modes, `boardParams`). `src/core.js`: bitboard, solver, piece families, `chooseSet` dealer, `dressPiece` (no DOM; runs in Node). `tools/sim.mjs` / `tools/day.mjs` simulate bot players for tuning (`--bot mid` is calibrated to a typical player).
- `src/game.js`: the screen layer in one IIFE, in this order (rules/data now live in the files above):
  1. **Textures** (`makeTex`, `PAL`, `inclusionMask`): procedural block art. Each ore has one fixed 3-piece inclusion layout seeded by its name, drawn on whichever host rock the zone uses (`TEX['iron@deep']` etc.).
  2. **Catalog** (`MATS`, `ORES`, `VAL`, `SPECIAL_MIX`, `DROPS`, `FX`): every block, its kind, drop, rarity and point value.
    4. **Bitboard core** (`SHAPES`, `applyMove`, `countHoles`, `healthy`, `solveCount`, `pocketInfo`): the board is two 32-bit ints; the solver counts the ways a 3-piece set can be placed (any order, with line clears between).
  5. **Zones and daily boards** (`MODES`, `ZONES`, `boardDef`): 5 zones × 4 boards, regenerated from the device's local date.
  6. **Dealer** (`chooseSet`, `dressPiece`, `prefill`): every dealt set is solver-checked; difficulty sets the target number of solutions and how much the dealer "helps".
  7. **UI, effects, sound** (goal bar, stash, flyers, `playSpecial`, `playSplash`, `playAllClear`, WebAudio blips).
  8. **Game flow** (`startBoard`, async `place`, `detonate`, `doShake`, `completeBoard`, `gameOver`, `useRescue`).
  9. **Stash / anvil / crafted specials**, **saving**, **home**, **world map**, **drag**, **render loop**, **boot**.

## Design rules agreed with the designer (keep these unless told otherwise)

**Boards and progression**
- Home screen: World Map and Settings. The map shows 20 boards per day (4 per zone: The Forest, Stone Caves, Deep Stone, Gem Depths, The Underworld), unlocked in order, regenerated each Pacific-time day (fixed to America/Los_Angeles for everyone). Finishing all 20 in a day earns the **Prospector** achievement.
- Forest board 1 is on the surface; forest boards 2–4 sit at increasing dirt depths. Torches only on rock walls (stone, deep stone, obsidian zones). Lava lake at the bottom.
- A board is cleared by **reaching a score target** (progress bar), not by collecting specific resources. Targets per zone are in `ZONES[].target`, +20% per board within a zone, times the difficulty setting's `goals` multiplier.
- Difficulty setting (Settings slider): Casual / Committed / Hardened, in `MODES`.

**Blocks**
- Base blocks blend gradually between zones (`ZONES[].mixes`, one mix per board). A block never appears before its own zone (no stone in the forest, no deep stone in Stone Caves, …).
- Point values in `VAL`: deeper base rock is worth more, ores far more, gems most, specials more still.
- Ores are rare (`ORES`); emeralds and diamonds only from Deep Stone on, with per-zone rates and per-board caps (`ZONES[].gems`). Emeralds are always slightly more common than diamonds. Deep Stone: usually 0, ~1 every other board, 2 occasionally, never more than 2.
- All mined ore and gems go to the persistent stash (shown under the board).

**Specials**
- Craft-only (anvil), one of each held at a time: **Blast Charge**, **Jackhammer**, **Rescue Potion** (`RECIPES`). Never spawn randomly.
- Random-only, never craftable: **Prism Stone**, **Fossil**, **Buried Treasure** (`SPECIAL_MIX`, `SPECIAL_RATE`).
- Blast Charge: flares on the board, explodes, breaks the 8 neighbours (their ore flies to the stash), then a short splash.
- Jackhammer: shakes remaining blocks into a random layout with no trapped gaps, no full lines, and room for the tray pieces (`shakeLayout`).
- Rescue Potion: consumed automatically on a cave-in; undoes the last placement and deals a fresh set. If the player can afford one at a cave-in, the overlay offers "Craft a Rescue Potion".
- Buried Treasure: one haul of 5–9 iron, 4–7 gold, 2–4 emeralds or 1–3 diamonds; odds and amounts lean to gems in the Gem Depths and Underworld.
- Prism Stone: 3 of a random ore/gem from the current zone (redefined after goals were removed).
- Fossil: 1,000 points.

**Dealer and feel**
- Every set must be solvable: a cave-in is always the player's fault.
- Easy boards: strong dealer assistance (pieces that complete lines, fill exact pockets, enable all-clears). Assistance fades with difficulty; Expert should feel close to random but still solvable with a small number of correct placements.
- Shapes that exactly match an open pocket are much more likely in the next set.
- Starter blocks never create locked holes or sealed 2-cell pockets.
- "Perfect!" (+50) when the placement was the only one that keeps the tray playable, "Great fit!" (+25) for one of 2–3.
- All clear: golden wave, bonus of 15% of the board's score target (so it only finishes a board that was already ~85% there), then a big easy set (3×3, 2×3, 1×5).

## Open items to raise with the designer

- `SPECIAL_RATE` is 1% / 2% / 3% per piece (Medium / Hard / Expert), set deliberately.
- Score targets and gem rates are first-pass numbers; the gem simulation assumed ~45 pieces per board.
- Sand was removed from play; its texture still exists in `MATS`. Lapis and quartz were removed entirely (jackhammer and rescue recipes now use copper instead; old saves convert them to copper).
- Saves are `localStorage` only (keys `deepcore-profile`, `deepcore-day`, `deepcore-board`, `deepcore-mode`), so progress does not follow a player across devices.

## Suggested next steps

1. Split `src/game.js` into ES modules (catalog, textures, solver, dealer, ui, map) with Vite. Keep the solver pure and unit-test it.
2. Add lightweight play-test telemetry (board started/cleared/caved-in, moves, score, difficulty) and an in-game feedback button for beta testers.
3. Native builds via Capacitor (iOS TestFlight, Google Play internal testing) once the web beta settles.
4. Keep the game's own identity in names, art and store listings. Do not use other games' names, logos or textures.
