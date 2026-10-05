# Changelog

## 0.5.0 — Release C: progression and the daily map
- New map every Pacific day (src/maps.js): different weather (clear, cloudy, overcast, rain, snow, sunset, dusk), scenery (mountains, hills, a lake or none), tree types (oak, pine, birch, mixed, autumn colours), tunnel shape and width, ore and cave decorations, and where lights are placed.
- The cave is dug open as you play: a fresh day shows only the forest; clearing a board digs the tunnel to the next one, and deeper zones stay in the dark until you reach them.
- Torch and lantern gates: to open the 4th board of any zone you place 2 torches (Forest: 10 coal + 5 wood each) or 2 lanterns (deeper: 20 coal + 10 copper each). Lit tunnels glow on the map. Craft from the new Craft button on the map (also lists the specials).
- Strip mines: after clearing a zone's 3rd board a side tunnel opens (once per zone per day). It has resource goals instead of a score target, asks for exactly what the gate is short of, is not one of the 20 boards, and its score is added to a daily bonus. Ore rates were tuned so the strip mine is needed about 60% of the time.
- The stash now resets at the daily rollover; leftovers become bonus points on yesterday's record (shown on the home screen with your best day). After clearing all 20 boards, a day-end screen lets you spend leftovers on specials to carry into tomorrow.
- Forest boards 1-2 and 1-3 now have a little coal so the first torches are reachable.
- Info guide covers torches, lanterns, strip mines and the daily reset.
- Tests: map generation (variety, spacing, determinism), gates and strip mines, daily reset and day-end, and a soak test (random play on every zone, strip mines, save/resume).

## 0.4.0 — Release B: economy, fairness, variety
- Haul system: ore, gems and wood you mine on a board go into your "hand" (shown as a green +n under each stash item, and +points next to Today). Clearing the board banks them; a cave-in without a Rescue Potion makes them spill out and vanish. Crafting uses only banked stash.
- Wood is now a stash resource. Rescue Potion now costs 20 cinnabar + 1 emerald. New Luck Tonic (12 cinnabar + 1 diamond): tap to drink, the next 7 sets lean toward clearing lines; dots show how many remain and it announces when it wears off.
- Resource rebalance: Blast Charge 12 coal + 3 iron; Jackhammer 10 copper + 8 cinnabar + 8 iron + 4 gold. Coal and copper are more plentiful (coal veins up to 3), iron and gold use is lower, gem rates and caps are lower in the deep zones, and each deeper zone lowers coal/copper a little so the stash does not just swell.
- Fairness: the dealer's difficulty floor is gentler (at least 8 ways to place a set), and it now helps more as the board fills up ("mercy"). Simulated typical players needed 5-10 tries on 4-x/5-x boards before; now about 1.6.
- Early/mid boards are longer: higher score targets in Forest (340), Stone Caves (900) and Deep Stone (1500) and a steeper difficulty ramp.
- Piece variety: pieces are grouped into families (all rotations and mirrors), so mirror images appear equally often; the big 3x3 L is dialled down; a set rarely repeats a family. New 3-block diagonal pieces (both directions) alongside the 2-block ones.
- Code split into src/data.js (tables), src/core.js (rules, solver, dealer) and src/game.js (screen), so the rules also run in Node. New tools: tools/sim.mjs (bot players), tools/day.mjs (whole-day economy).
- Tests: rules (variety, solvability, Luck), flow (hand, cave-in, Luck Tonic), plus `npm run test:balance`.

## 0.3.0 — Release A: interface and feel
- Info button (field guide): how to play, every resource (name, rarity, points, uses, where found), crafting, and the random special blocks. Content is generated from the game's own tables.
- Anvil moved to the top bar between Today and Board, much bigger, and pulses when you can afford something. Info button beside it. The big center score is gone (the progress bar carries it, larger).
- Sound fixed for phones: audio engine is unlocked on first touch, asks iOS for "playback" audio (works with the ring switch on), and is louder. New speaker icon shows on/off clearly and remembers your choice.
- "Brutal" renamed "Expert".
- Dragging: the whole piece rides above your fingertip (centred, so left- and right-handers both see it). The landing spot is outlined, lit, and lines that would clear glow and pulse.
- Tray: boxes removed; every piece is drawn at one fixed size (a 1x5 bar fits at full scale) and never resizes.
- Lava on the map no longer has a floating pool.
- Ore item icons are chunkier and easier to read in the stash.
