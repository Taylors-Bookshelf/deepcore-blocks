# Changelog

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
