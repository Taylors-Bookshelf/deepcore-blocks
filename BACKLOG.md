<!-- Exported 2026-10-31 from the claude.ai doc "Deepcore Blocks — Release Tracker & Backlog" (https://claude.ai/artifact/3q8AVQNjuVmpii19DuSMt7). The online doc is the source of truth; re-export after edits. -->

# Deepcore Blocks — Release Tracker & Backlog

2026-10-29 · @Taylor

Current build: **v2.0.1** (Oct 26, The Descent update)  
Next build: **v2.0.2** on 2026-10-31 (see Roadmap)

**P0** blocks gameplay  
**P1** affects quality or experience  
**P2** is a technical change with no direct player-impact  
**P3** is wishlist.

B = bug, F = feature, I = improvement, CP = change point, OI = open item

Status:

- **Scoping** = any linked OI is open
- **Ready** = all linked OI's are closed, or there are no OI's.
- **Scheduled** = assigned to a release
- **In progress** = that release is the one being worked on (now 2.0.2)
- **Done**.
- **Superseded** = another item replaced it. Change points have no status: they are logged when they ship.

Item types:

**Bug** (B) is something that doesn't work as intended.

**Feature** (F) is a new player-facing capability that delivers value on its own, the kind of thing listed under "What's new".

**Improvement** (I) makes something that already exists in some form, better. Usability, art, balance, flow, or behind-the-scenes work.

Every code change is logged as a **change point** (CP) when it ships, typed by the item it came from.

## Open items

Eighteen items are open. Each lists the bug, feature or improvement it blocks, or "Non-blocker" for a question to follow up later. Anything with an open item stays in Scoping. Closed items keep their resolution; proposals for the open ones follow the table.

| ID | Item | Blocks | Status | Resolution / notes |
| --- | --- | --- | --- | --- |
| OI-1 | What does the Fossil grant past the Forest? | I-5, F-3 | Closed | Bone becomes an ingredient in Rescue Potion and Luck Tonic, on top of their gem cost. Below the Forest it comes only from Fossils, which grant 5–8 (1–2 potions). (2026-10-31) |
| OI-2 | How do layers and depth work? | F-1 | Open | Proposal and diagram below. |
| OI-3 | How do vein boards appear and read? | F-2 | Open | Proposal below. |
| OI-4 | What does a cave-in cost on a vein board? | F-2 | Open | Proposal below. |
| OI-5 | Remove the Geode, or rename it? | I-6 | Closed | Remove the Geode outright; Fossil and Buried Treasure rates and contents stay as they are. (2026-10-31) |
| OI-6 | What is the purple cluster in the resource bar? | I-6 | Closed | Meteorite, a Basalt ore used for Galaxy Alloy tools; it reads 0 until Basalt. (2026-10-31) |
| OI-7 | Remove the geode? | I-6 | Closed | Superseded by OI-5: Prism Ore keeps its name; the Geode is decided there. (2026-10-29) |
| OI-8 | What does the Fossil grant in the Forest? | I-5 | Closed | Bones. Already live: 5 bones and 600 points at every depth. (2026-10-29) |
| OI-9 | Where does resource farming happen? | F-2 | Closed | On vein boards with a Haul Out exit: leave at any time and bank everything gathered on that board. (2026-10-29) |
| OI-10 | Do vein boards have a score target? | F-2 | Closed | No. They are endless; difficulty ramps so most players hit or nearly hit a cave-in by about 5 minutes. (2026-10-29) |
| OI-11 | How often can a vein board be played? | F-2 | Closed | Once. No daily replenishment; another vein means hunting for one, with no guarantee of the resource you want. (2026-10-29) |
| OI-12 | How much can one vein yield? | F-2 | Closed | Never enough to finish a tool, or farming stops mattering. (2026-10-29) |
| OI-13 | How is each layer's map shaped? | F-1 | Closed | Its own side-scrolling map; players can mine sideways indefinitely, e.g. a young child staying in the Forest. (2026-10-29) |
| OI-14 | How much of the next layer is visible? | F-1 | Closed | Only a wall after 4–6 boards deep, with a subtle reminder to craft the next tools. (2026-10-29) |
| OI-15 | How do layers connect? | F-1 | Closed | Drop down once the tools are forged; the deeper map shows the layer above as its ceiling, with Climb back up. (2026-10-29) |
| OI-16 | Can crafted specials be used directly on the board? | I-1 | Closed | Yes, dragged straight onto the board. Shipped in v2.0.1. (2026-10-29) |
| OI-17 | On a Retry, what happens to the first run's ore? | I-7, I-9 | Closed | A clean restart: everything the earlier run earned is discarded; only the new run counts. (2026-10-31) |
| OI-18 | How is a board's maximum haul measured, and where are the star lines? | I-8, I-9 | Closed | Simulator max (expert bot, 95th percentile); lines 20/40/60% in the Forest rising to about 35/60/85% at the end; tune after playthroughs. (2026-10-31) |
| OI-19 | Does Career reset monthly, replacing the Descent's single long run (v2.0.0), or does a monthly map sit on top of it? | F-4, F-7 | Open | Biggest conflict: the live build keeps progress, tools and stash across days with no reset. |
| OI-20 | How does a monthly reset treat late joiners and players who miss a week? | F-4 | Open | Options in the Game Modes doc: a late-start rule, depth checkpoints, an onboarding map. |
| OI-21 | When do daily and monthly resets happen, and how do they work across time zones? | F-4, F-6 | Open | The live build uses Pacific midnight. |
| OI-22 | What are the mode access rules? | F-5, F-6 | Open | Unlock window says 7 days in one place and 10 in another; a daily Career board to unlock Peaceful clashes with handing it to a child; locking modes behind Career may hide them from most players. |
| OI-23 | Where does the flow meter live, and how does it fill and decay? | F-5 | Open | 27 placements or 9 clears: whichever comes first? The board area is already full. |
| OI-24 | What counts toward "10 Minutes of Calm"? | F-5 | Open | Active play time or blocks placed, so idle time can't earn it. |
| OI-25 | How are sharing and social features handled for kids? | F-5 | Open | Parent gating and children's-privacy rules. |
| OI-26 | How is Master Miner scored and compared? | F-6 | Open | Rules say no scores, yet challenges are scored; a player-picked zone breaks identical boards; one scorecard or several achievements? |
| OI-27 | What is a Master Miner board made of? | F-6 | Open | Which materials exist, board size, and what "infinite board" means. |
| OI-28 | What backend do daily boards and score comparison need? | F-6 | Open | Server-generated boards, accounts, anti-cheat, friends or global boards. The current build is offline-only static files. |
| OI-29 | How are holiday dates handled? | F-7 | Open | Moving holidays need a per-year calendar; month-edge holidays can straddle the map reset. |
| OI-30 | Do Peaceful and Master Miner get seasonal themes too? | F-7 | Open | — |
| OI-31 | Where do the reward basin, preview and hold slot fit on screen? | F-8 | Open | Same crowding concern as the flow meter. |
| OI-32 | Do daily achievements and streaks create pressure that undercuts the calm goal? | Non-blocker | Open | — |
| OI-33 | What is Career's "Daily grind" share? | F-4 | Open | Listed in the Game Modes overview but never defined. |

### OI-1: What does the Fossil grant past the Forest?

**Closed: bone becomes a potion ingredient.** Rescue Potion and Luck Tonic each need bone on top of their current gem cost, so a Fossil alone never makes a potion.

- **Recipes (first pass, to tune):** Rescue Potion 20 ruby + 1 emerald + 4 bone; Luck Tonic 12 ruby + 1 diamond + 4 bone.
- **Supply:** bone is mined only in the Forest. Below it, bone comes only from Fossils.
- **Fossil:** grants 5–8 bone at every depth, enough for 1–2 potions.

### OI-2: How do zones and depth work?

**Yes to both of your readings, and the second is now intended.** Each zone is a map that runs sideways without limit and a fixed number of boards deep. Digging down that far reaches a wall of the next zone's material, which needs the next tier of tools to break. A player can keep mining sideways and stay in one zone forever. That was a flaw before your map notes; with OI-13 it is the point.

- **Depth per zone is fixed and the same rule everywhere,** which fixes the dirt-has-4, stone-has-more inconsistency. The live build already has fixed depths: Forest 4; Limestone, Slate, Granite and Basalt 6 each; Magmastone 30; the Crust 3; the Ancient Core 1.
- **Which boards are playable:** any board touching one you've cleared, above or beside it. You dig a tunnel, not teleport.
- **Pressure to go down comes from Career,** not the map: reaching the Core within the month on the ~3-hour pacing target. Peaceful play can ignore it.
- **Board layouts are seeded per month,** so the map is consistent within a month and fresh after the reset.

Layer names and tools follow the live build: bone tools open Limestone, then copper, iron, steel and Galaxy Alloy tools open each layer below.

### OI-3: How do vein boards appear and read?

**Proposal: veins hide only in side boards, are announced by a glint, and are mixed boards with a finite seam.**

- **Where:** veins spawn only off the straight-down path, so finding one means choosing to dig sideways.
- **How often:** about 1 in 8 side boards, with a soft guarantee of at least one vein within 12 side boards. The vein type is random, weighted to the zone's ores, so you can't count on the one you need.
- **Discovery:** clearing a board next to a vein makes its map tile glint with the ore icon. Tapping it opens a card such as "Iron Vein: rich in iron. Used in: Iron Pickaxe, Blast Charge", pulled from the recipe list.
- **Contents:** the vein ore is about 60% of ore spawns; the rest is the normal zone mix plus base blocks, so it's still a real puzzle.
- **Finite seam:** a meter shows the vein's remaining reserve. A full seam is worth roughly 40–60% of the next tool's need for that ore (OI-12). Once it runs dry, the board keeps going with ordinary blocks and rising difficulty.
- **After you leave,** the tile shows as mined out.

### OI-4: What does a cave-in cost on a vein board?

Not decided yet, and it sets the whole push-your-luck feel. **Proposal: Haul Out keeps 100% of the haul; a cave-in keeps 50%.** Without a penalty there's no reason to ever Haul Out early; at 0% it feels punishing for an endless mode.

Zone map, as proposed in OI-2:

*Diagram: zone map model (two zones, one wall, two transitions). Each zone is its own endless map, sealed by the next zone's wall.*

```
+------------------------------------------------------------------+
| Forest map: 4 boards deep                                        |
|                                                                  |
|  < endless   [ ] [ ] [ ] [D] [ ] [ ] [ ]   endless >             |
|              [ ] [ ] [ ] [D] [D] [V] [ ]                         |
|              [ ] [ ] [ ] [D] [ ] [ ] [ ]                         |
|              [ ] [ ] [ ] [D] [ ] [ ] [ ]                         |
|  ==== Limestone wall: forge bone tools to break through ====     |
|  [D] = boards dug: the shaft and a side tunnel                   |
|  [V] = a vein, revealed by digging beside it                     |
+------------------------------------------------------------------+
        |  Drop down to Limestone          ^  Climb back up anytime
        v                                  |
+------------------------------------------------------------------+
| Limestone map: 6 boards deep                                     |
|  ==== Ceiling: the Forest above ====                             |
|  < endless   [ ] [ ] [ ] [D] [ ] [ ] [ ]   endless >             |
|              [ ] [ ] [ ] [ ] [ ] [ ] [ ]                         |
|        More rows below, then the next zone's wall                |
+------------------------------------------------------------------+
```

Digging down hits the wall; digging sideways never ends and is where veins hide. Crafting the tools opens the drop to the next map, and the zone above stays reachable.

### OI-5: Remove the Geode, or rename it?

**Closed: remove it outright.** Its reward overlapped Buried Treasure. Fossil and Buried Treasure keep their current drop rates and contents, so random specials overall turn up about 40% less often.

### OI-6: What is the purple cluster in the resource bar?

Closed: it's meteorite, a Basalt ore used for Galaxy Alloy tools. It reads 0 until you reach Basalt.

### OI-17: On a Retry, what happens to the first run's ore?

**Closed: a Retry is a clean restart.** Everything the earlier run earned (ore, points, stars) is discarded, and only the new run counts. No run's ore stacks with another's, so Retry can't become farming.

### OI-18: How is a board's maximum haul measured, and where are the star lines?

**Closed: measure it with the simulator; adjust after playthroughs.** The dealer is random, so a true optimum can't be computed. An expert bot plays each board many times, and its 95th-percentile haul (combo bonuses and specials included) is the board's maximum.

- **Forest:** 1 star at 20%, 2 at 40%, 3 at 60% of the maximum.
- **Ramp:** the lines rise each layer, to about 35%, 60% and 85% in the Crust and the Ancient Core.
- **Tuning:** set in playtest so 3 stars in the last layers takes retries and expert combos or specials.

## Bugs

| ID | Bug | Repro / expected | Notes | Priority | Status | Release |
| --- | --- | --- | --- | --- | --- | --- |
| B-1 | Map unresponsive after the phone sleeps | Game foregrounded, phone sleeps or screen off, then resume: map ignores taps. Quit and relaunch fixes it. | v2.0.1 resets the map and any interrupted drag when the game comes back; its changelog says "probably" fixed. Confirm on a phone before closing. | P0 | In progress | 2.0.1, verify in 2.0.2 |
| B-2 | Dealer slots look empty but hold pieces | Slots render blank; tapping one makes its piece appear. | Fixed in v2.0.1. Cause: picking up a second piece while the first was still gliding back. | P0 | Done | 2.0.1 |
| B-3 | Tutorial stalls on an off-target placement | New game: placing the piece outside the glowing outline is accepted, but the tutorial never advances. Expected: off-target drops snap back during tutorial steps. | A Skip button and Settings \> replay tutorial already exist. Still missing: rejecting off-target drops. | P0 | In progress | 2.0.2 |
| B-4 | Resource counts overlap their icons | In the resource bar, each count draws over its resource icon. Expected: the count sits below the icon, and any count above 99 shows as "99+". | Fix: move counts below the icons and cap the display at 99+. The real total stays visible where it's spent, e.g. the forge and crafting screens. | P1 | In progress | 2.0.2 |

## Features

Features list.

| ID | Feature | What the player gets | Scope | Open items | Priority | Status | Release |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-1 | Layer maps | Each layer is its own map you can explore sideways without limit. Forge the next tools to drop down; climb back up anytime. | Sideways-scrolling layer map; the next layer's wall at the fixed depth; side tunnels removed; Drop down; Climb back up, with the layer above as the ceiling; a wall reminder hint. | OI-2 | P1 | Scoping | 2.1.0 |
| F-2 | Vein farming | Hidden ore veins in side boards: an endless, one-time board you can Haul Out of with what you mined. | Veins in side boards with a glint reveal and info card; an endless, single-use board with a finite seam and ramping difficulty; Haul Out exit and cave-in payout. | OI-3, OI-4 | P1 | Scoping | 2.2.0 |
| F-3 | Crafting table | Forging becomes its own screen: arrange materials on a table, risk a break, and sometimes get an enchanted tool. | Crafting table screen with drag-to-arrange recipes and animations; a chance the tool or part of it breaks; a chance of an enchanted tool with a perk and effect, e.g. a fire hammer throwing embers on clears. | — | P1 | Scheduled | 2.3.0 |
| F-4 | Career mode (monthly) | A fresh map each month: dig from the surface to the Core and place the keystone before the month resets. Beating it unlocks the other modes. | Monthly map generation and reset; mode select screen; pacing target about 3 h average, 2–2.25 h skilled; "Core Conquered" achievement; completion unlocks Peaceful and Master Miner. | OI-19, OI-20, OI-21, OI-33 | P1 | Scoping | — |
| F-5 | Peaceful mode | Calm free play: no score, no inventory, an endless board whose music and visuals grow richer while you keep it flowing. | Zone picker (zones unlocked in Career); free specials (those already used in Career); flow meter driving music and visuals; calm audio and effects; daily "10 Minutes of Calm" card with streak lines. | OI-22, OI-23, OI-24, OI-25 | P1 | Scoping | — |
| F-6 | Master Miner mode | A daily skill challenge with the same board and deal for everyone, scored and shareable. | Server-generated daily board and fixed deal; shape, combo-chain and pattern challenges; scored on time, placements and cave-ins; replay of the last 5 unlocked days; daily scorecard and streak; challenge music. | OI-21, OI-22, OI-26, OI-27, OI-28 | P1 | Scoping | — |
| F-7 | Seasonal and holiday themes | Career's look follows the month: surface art, cave dressing, particles, a music layer, the miner's outfit and a unique Core, plus hidden holiday resource swaps. | Month palette with a hemisphere setting; the season carried underground; monthly Core and relic; holiday swaps in tiers with settings toggles (seasonal on, secular on by default, cultural opt-in). | OI-19, OI-29, OI-30 | P1 | Scoping | — |
| F-8 | Earned deal control | Combo streaks fill a reward basin that converts into an edge: a 3-deal preview, a one-time reroll, or a hold slot. | Streaks count from 2 consecutive clearing placements; basin meter; preview, reroll and hold, limited to the current board. | OI-31 | P1 | Scoping | — |

## Improvements

I-1 and I-2 shipped in v2.0.1; the rest are planned in the Roadmap.

| ID | Improvement | Description | Open items | Priority | Status | Release |
| --- | --- | --- | --- | --- | --- | --- |
| I-1 | Specials dragged onto the board | Blast Charge breaks the 3×3 patch under your finger; Sledgehammer reshuffles the board. Neither needs a line clear. | — | P1 | Done | 2.0.1 |
| I-2 | Classic bone art | Bones drawn as an easy-to-read cartoon bone. | — | P1 | Done | 2.0.1 |
| I-3 | Rarer bones in the Forest | Lower bone drops (now 0.12 with a 1.4× Forest boost) so bone tools (12 bone + 6 wood) take about 6–8 Forest boards without a special, 4–5 with a Fossil. | — | P1 | In progress | 2.0.2 |
| I-4 | Scarcity pass for other materials | The same tuning for every other material, so gathering always takes effort. | — | P1 | Scheduled | 2.2.0 |
| I-5 | Fossil reward and bone potions | Fossils grant 5–8 bone at every depth. Rescue Potion and Luck Tonic each add 4 bone to their recipe. Bone is mined only in the Forest. | — | P1 | In progress | 2.0.2 |
| I-6 | Remove the Geode special | The Geode (formerly Prism Stone) no longer spawns. Fossil and Buried Treasure keep their current drop rates and contents, so random specials overall turn up about 40% less often. Prism Ore, the normal ore, is unchanged. | — | P1 | In progress | 2.0.2 |
| I-7 | Retry instead of Keep Mining | When a board's score target is reached, the board ends. KEEP MINING is removed; a Retry button replays the board to earn more stars. | — | P1 | In progress | 2.0.2 |
| I-8 | Stars from resource efficiency | Stars measure the ore mined against the board's maximum possible haul, combo bonuses included. 3 stars takes about 60% in the Forest, and the bar rises each layer so the last layers need retries and expert combos or specials. Stars already earned stay as they are; the new rules apply from the next play of each board. | — | P1 | In progress | 2.0.2 |
| I-9 | Zero stars possible; 1 star to progress | A poor or unlucky run can end with no stars. The board then doesn't count as cleared, and the player retries until it earns at least 1 star. | — | P1 | In progress | 2.0.2 |
| I-10 | Bigger combo yield | Multi-line clears multiply the ore they mine: ×2 for 2 lines, ×3 for 3, ×4 for 4 or more. Replaces today's +25% to +100% line bonus (v1.1.0). From the Game Modes doc's Career skill levers. | — | P1 | Scheduled | 2.2.0 |

## Change Points

Every code change is logged here when it ships, linked to the bug, feature or improvement it came from. The log starts at v2.0.1; earlier changes are in Version history.

| CP | Type | Change | From | Release |
| --- | --- | --- | --- | --- |
| CP-4 | Improvement | New bone art. | I-2 | 2.0.1 |
| CP-3 | Improvement | Specials are used by dragging them onto the board. | I-1 | 2.0.1 |
| CP-2 | Bug fix | The map and any interrupted drag reset when the game resumes after sleep. Not yet confirmed on a phone. | B-1 | 2.0.1 |
| CP-1 | Bug fix | A tray piece no longer hides when a second piece is picked up while the first is still gliding back. | B-2 | 2.0.1 |

## Roadmap

What's planned as coming up next.

| Version | Target | Contents | Why this bundle | Ship gate |
| --- | --- | --- | --- | --- |
| 2.0.2 | 2026-10-31 | B-1, B-3, B-4; I-3, I-5, I-6; I-7, I-8, I-9 | Off-cycle release: every open bug plus each ready improvement that doesn't shift the overall economy. I-3, I-5 and I-6 all touch random specials and bone, so they're tuned together. I-7 to I-9 are one end-of-board change. I-4 and I-10 wait for 2.2.0 because they pull the economy in opposite directions. | B-1 confirmed on a phone (30 minutes with sleep/resume); the tutorial can't stall; counts sit below icons and cap at 99+; no Geode spawns while Fossil and Buried Treasure are unchanged; potion costs, bone supply and star lines set with the simulator; the Forest 1-star line low enough that board 1-1 can't realistically fail; a 0-star run must retry. |
| 2.1.0 | 2026-11-15 | F-1 Layer maps | Changes how every player moves through the game, so it ships alone. F-2 needs it first, since veins live in side boards. | OI-2 closed; existing saves land on the right layer; layer progression unchanged otherwise. |
| 2.2.0 | 2026-11-22 | F-2 Vein farming, I-4, I-10 | One economy pass: bigger combo yield and the scarcity pass pull in opposite directions, and scarcer materials need vein farming as an outlet. Tuning all three together avoids retuning twice. | OI-3 and OI-4 closed; reaching Limestone takes effort without a special; one vein run can't fund a whole tool; most playtesters hit a cave-in by about 5 minutes. |
| 2.2.1 | 2026-11-29 | Fixes and balance from 2.2.0 | Buffer week: the biggest economy change gets a follow-up before the next feature. | 2.2.0 playtest feedback triaged. |
| 2.3.0 | 2026-12-13 | F-3 Crafting table | A new screen with new risk, shipped after the economy settles. | Break and enchant rates tuned in playtest. |

## Version history

Seventeen versions shipped between Oct 4 and Oct 26, 2026, all to [deepcore-blocks](https://github.com/Taylors-Bookshelf/deepcore-blocks) on GitHub Pages. Taken from the project's git log, tags and CHANGELOG.md; newest first.

| Date | Version | What shipped |
| --- | --- | --- |
| 2026-10-26 | v2.0.1 | Playtest round 4: specials dragged straight onto the board; hidden tray piece fixed; map reset after waking (unconfirmed); new bone art. |
| 2026-10-16 | v2.0.0, The Descent | Daily map replaced by one long run across days: Forest, Limestone, Slate, Granite, Basalt, Magmastone (30 boards, 2 camps), the Crust, the Ancient Core; 62 boards. Tools replace torches and lanterns. New ores: bone, meteorite, prism ore. Prism Stone renamed Geode. Missed days drop you to the layer start. Core finale with credits and core fragments. |
| 2026-10-15 | v1.3.1 | Guard against the map ignoring taps after a board on iPhone. |
| 2026-10-15 | v1.3.0 | Playtest round 3: readable clear text, darker Magmastone, calmer headers, tidier map and gate flow, crafting split (map: lights; board: specials). |
| 2026-10-15 | v1.2.0 | Playtest round 2: quieter music, wood stars on board 1-1, combo shown with points, FINISH / KEEP MINING wording, tray fix. |
| 2026-10-14 | v1.1.0 | Playtest round 1: stars from ore value, bonus ore for multi-line, combo and All Clear, ore rates cut about 20%, new music, hint in the header. |
| 2026-10-14 | v1.0.0 | Hardening: regression, accessibility and performance pass, safer saves, offline play, new icons. |
| 2026-10-14 | v0.10.0 | Tutorial, home redesign, profile and discovery log, share card, feedback form, install hint, save codes, settings, ambient music. |
| 2026-10-14 | v0.9.0 | Stars and push-your-luck, combo meter, near-miss cave-in screen, hint button, daily twists. |
| 2026-10-14 | v0.8.0 | Make-room sheet for a full specials dock, pick-up and return animations, tap to skip. |
| 2026-10-14 | v0.7.0 | New look: design-package fonts and sprites, specials dock, Jackhammer renamed Sledgehammer, restyled map. |
| 2026-10-14 | v0.6.0 | Six zones and 24 boards, ruby replaces cinnabar, difficulty modes removed, practice runs, multi-line bonus, adaptive mercy. Roadmap and decision log added the same day. |
| 2026-10-05 | v0.5.0 | Daily procedural map, torch and lantern gates, strip mines, daily stash reset, day-end tally. |
| 2026-10-05 | v0.4.0 | Haul system (unbanked ore lost on a cave-in), Luck Tonic, economy and fairness retune, piece families, balance simulator. |
| 2026-10-05 | v0.3.0 | Field guide, anvil in the header, phone sound fix, drag offset, fixed-size tray, Brutal renamed Expert. |
| 2026-10-04 | v0.2.1 | Analytics on (PostHog), stable tray piece sizes. |
| 2026-10-04 | v0.2.0 | First commit: prototype split into a project, installable web app, published on GitHub Pages. |
| Before 2026-10-04 | Prototype | Built in a claude.ai chat as a single-page artifact: 8×8 board, ores and gems, solver-backed dealer, specials, a 20-board World Map across 5 zones, anvil crafting, score-target clears. |

Design only, not built: the Oct 27 Game Modes and Seasonal Design Notes (Career, Peaceful, Master Miner; monthly seasonal theming).
