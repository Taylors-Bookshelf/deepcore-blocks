# Changelog

## 1.3.1
- Possible fix for the map sometimes ignoring taps after finishing a board (iPhone): the map's scroll area is rebuilt each time it opens, an old iOS scrolling setting is removed, and finishing a board can no longer run twice.

## 1.3.0 — playtest round 3: tidier screens and map
- Points and bonus text from clears now sit on a dark plate with crisp text, readable on any block; the line-clear banner (Double!, Quad!) got the same treatment.
- Magmastone redrawn darker and redder with glowing flecks, so it no longer reads as dirt.
- Map header: just today's twist and "n / 24 boards mined" (no date or countdown). Home screen card trimmed to today's boards, points, twist, and a streak chip from 2 days on. Play header drops the "Today" line; the resource strip shows only what you hold or can find on this board.
- Map: the first tunnel now breaks through the grass (no roof over a dug cave); the thin vertical root lines are gone; tunnels and chambers are narrower and tidier; the odd blue pools, burrows and tiny fossil marks are gone; the map now scrolls to a waiting gate instead of the bottom.
- Gates: tapping a gate shows the cost and, with enough in your stash, places both torches or lanterns in one tap; otherwise it sends you to the strip mine.
- Crafting split: the map's Craft panel is torches and lanterns only; specials are crafted from the CRAFT button during a board (and from the end-of-day tally).

## 1.2.0 — playtest round 2
- Music: the bright bell-like overtone is gone (rounder, lower plucks) and the music plays at about a third of its old level, well under the sound effects.
- The first Forest board has no ore, so its stars come from wood (30 for two stars, 42 for three).
- No more combo badge on the board: the multiplier now shows with the points when lines clear ("+136 ×4").
- "Bank" wording replaced: FINISH and KEEP MINING.
- Fixed: the piece that reached a board's target stayed drawn in the tray after KEEP MINING and could not be picked up.
- Field guide brought up to date (stars, hint, dock, 24 boards); "Blast Charge" spelled consistently.

## 1.1.0 — playtest round 1
- Stars now come from ore: the clear is 1 star, and 2 and 3 stars need an "ore value" (coal/copper 1, iron/ruby 2, gold 3, emerald 5, diamond 6) mined on that board. If you already have the ore for 3 stars when the board clears, it banks itself with no question. A small chip by the score bar shows your ore value; after the clear the bar tracks it.
- Combo bonus ore: multi-line clears, long combos and All Clears also pay extra ore from that play (+25% for 2 lines up to +100% for 5, +10%/+25% for combos of 3/5+, +100% for All Clear, capped at +150%; gems capped at +1 per play).
- Ore drop rates lowered about 20% to pay for the bonus ore (strip mines still needed about 55% of the time).
- Ambient music rewritten: light plucked melody over a soft pad in a major key.
- Hint moved to the top bar as a bulb with a question mark.
- Installed-app status bar changed to a solid bar so nothing sits under the top of the phone.

## 1.0.0 — Release 6: hardening
- Full regression, accessibility and performance pass: text contrast checked (4.5:1 minimum), every button named and at least 36px, dialogs labelled, 60fps on a crowded board, large-text and reduce-motion layouts stable.
- Safer saves: damaged or wrong-shaped saved data and a saved board that no longer fits are dropped instead of crashing; storage-blocked browsers still play; the game notices when the Pacific day rolls over while open.
- Works offline (36 cached files verified); a friendly message replaces a blank screen if the game fails to start or JavaScript is off.
- Screen fits dynamic phone toolbars (100dvh) and no longer rubber-bands; new app icons; dead code removed; docs rewritten.

## 0.10.0 — Release 5: retention and onboarding
- Guided first board; new home screen (Continue, today's card, streak, countdown to the daily reset, yesterday and best day); Profile with lifetime rank, stats and a 33-entry discovery log.
- Share card, feedback form, add-to-Home-Screen hint, save-code backup/restore, settings for volume, ambient music (off by default), reduce motion, larger text, reset.
- Tests no longer send analytics to PostHog.

## 0.9.0 — Release 4: gameplay depth
- Stars and push-your-luck: clear banks your ore; BANK IT or KEEP GOING for 2 and 3 stars (bonus points), with the extra ore at risk.
- Combo meter; near-miss cave-in screen with tips and mercy note; hint button (3 coal); six daily twists.

## 0.8.0 — Release 3: specials and interaction
- Make-room sheet: with a full dock, crafting asks which special to destroy (cancel spends nothing); crack, shatter and bounce-in animation in the dock.
- Pick-up and return animations for tray pieces; tap to skip long special/All-Clear celebrations.

## 0.7.0 — Release 2: the new look
- Design package applied: Jersey 10 + Chakra Petch fonts, new block/ore/gem/special sprites with the specified glows, flat 42pt board with 2pt seams, new header, progress bar, resource strip, specials dock with CRAFT button, 114pt tray, no footer or hint line.
- Specials dock: three slots, any mix; Jackhammer renamed Sledgehammer; Rescue and Luck drawn transparent.
- World map restyled onto the new rocks and palette; field guide, anvil, craft panel, cave-in, prospector and day-end screens restyled.
- Spec conformance tests (pixel sizes at 390 wide, short-phone fit) and dock tests.

## 0.6.0 — Release 1: foundation
- Six zones, 24 boards a day: new Granite Halls between Limestone Caves and Slate Caverns. Map generator, gates, strip mines and day-end tally all handle six zones.
- Ruby replaces cinnabar (new gem art, same common-resource behaviour); recipes updated.
- Difficulty modes removed; the game is tuned as the former "Committed" setting.
- Practice runs: replaying a cleared board gives no ore (closes the grinding loophole).
- No drawing loop off the board screen (battery).
- Multi-line clears pay Double / Triple / Quad / Mega bonuses.
- All-Clear hunting when the board is nearly empty; adaptive mercy after repeated cave-ins.
- Economy and difficulty retuned for six zones (tools/sim.mjs, tools/day.mjs, tools/mercy.mjs).
- Save migration (schema 2): cinnabar to ruby, today's map reset once.

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
