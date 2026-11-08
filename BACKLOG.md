<!-- Exported 2026-10-31 from the claude.ai doc "Deepcore Blocks — Release Tracker & Backlog" (https://claude.ai/artifact/3q8AVQNjuVmpii19DuSMt7). The online doc is the source of truth; re-export after edits. -->

# Deepcore Blocks — Release Tracker & Backlog

2026-10-29 · @Taylor

Current build: **v2.0.2** (Oct 31)  
Next build: **v2.1.0** on 2026-11-15 (see Roadmap)

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

## Queued from 2.0.2 playtest (not yet in the online doc)

From the 2.0.2 playtest. B-6 and I-11 to I-14 were released in 2.0.3 (2026-11-02); B-5 is open; I-15 is in playtest (2.0.4). Move these into the tables below, and into the online doc.

| Proposed ID | Type | Item | Notes |
| --- | --- | --- | --- |
| B-5 | Bug | Retry takes several taps | Not reproduced: both Retry buttons (results sheet and cave-in) open on one tap in Chrome and in WebKit with iPhone touch emulation, and nothing covers either button. Needs details: which Retry, and where on the button. PostHog `ui_click` repeats on `resRetry` / `retry` would show it. Still open. |
| B-6 | Bug | Star numbers don't match the resources mined | Done in 2.0.3: stars count each ore and gem as one (`STAR_ORES`), the same numbers the player sees. Star lines recalibrated (`HAUL_MAX` 12/21/26/27/22/19/10, Crust 1-star line 1 ore). |
| I-11 | Improvement | Results sheet star display | Done in 2.0.3: unearned stars grayed out; earned stars amber, glowing, slightly bigger, popping in one by one. |
| I-12 | Improvement | Live 3-star meter on the board | Done in 2.0.3: three stars next to the score bar fill as ore is mined and light up when earned. Replaces the "17/31" chip. |
| I-13 | Improvement | Zone star totals | Done in 2.0.3: "★ 7/18" for the layer on the board header, the map's top bar and each layer label on the map. There is no pause menu; the header stands in for it. |
| I-14 | Improvement | Random specials in the Forest, at a lower rate | Done in 2.0.3: Easy-tier rate 0.3% per piece; Buried Treasure contents unchanged. Fossil and Treasure points are now 25% / 8% of the board's target instead of a flat 600 / 200, so a Fossil can't end a Forest board on the spot (deep down about the same as before). Closes OI-34. |
| I-15 | Improvement | 2★ and 3★ reachable through skill on every layer | Built as a playtest build in 2.0.4: points from play (blocks, lines, combos, streaks, All Clears, crafted specials), fixed deals per board, stars from points, a fixed ore budget per board, no bonus ore. Numbers in DECISIONS.md (v2.0.4). Waiting on play feedback. Supersedes I-10. |
| — | Docs | Backlog fixes | Local copy: mark B-1 Done (closed 2026-11-01, already Done online). Close OI-34 with I-14. Fix I-3's "4–5 with a Fossil" wording. |

Simulation scripts for I-14 and I-15 are in `tools/experiments/` (see its README).

## From the 2.0.4 playtest (2026-11-06)

Goal: **v1**, the build shared with family and friends. Version numbers keep counting from 2.x; "v1" is a milestone name. 2.1.0 is the first step toward it, and the roadmap below slides back one slot. I-16 to I-29 and B-7 were released in 2.1.0 (2026-11-06).

### Done in 2.1.0 (toward v1)

| Proposed ID | Type | Item | Notes |
| --- | --- | --- | --- |
| I-16 | Improvement | Simpler home screen | Small icons at the top: a podium (profile), a gear (settings), sound. The quick-glance stats card is removed. |
| I-17 | Improvement | Visual profile | Rank badge, big numbers and cards instead of a spreadsheet of stats. |
| I-18 | Improvement | One-screen settings | Short labels, no scrolling. |
| I-19 | Improvement | Sound popover on every screen | The sound button opens a small drop-down: music and sound-effect sliders, each with a mute. Home, map and board. |
| I-20 | Improvement | Cleaner board header and a pause sheet | Remove the difficulty label (there is no difficulty setting), the layer star count and the tool %. A pause button on the left opens a sheet with the board name, the layer's stars ("Limestone: 7 of 18 stars"), Resume, Restart and Quit to map. The hint bulb reads "Hint · 3 coal"; (i) becomes "How to play". |
| I-21 | Improvement | Score as a number, stars as the progress | The bar goes; the score counts up and the three stars fill. A small "Deal 3/5". The confusing "Board mined! +900" popup goes; any day bonus is shown on the results sheet. |
| I-22 | Improvement | One-tap play | Tapping the next board on the map starts it. Cleared and locked boards still open their card. |
| I-23 | Improvement | 8 boards in every layer | Forest to Crust 8 each, plus the Core: 57 boards (was 62, with Magmastone at 30). Matches F-11's 8-deep zones. |
| I-24 | Improvement | Camps at every layer | Magmastone's two mid-layer camps go. Each layer's first board is its camp (a tent on the map); a missed day sends you back to your layer's camp. No camp at the Core. |
| I-25 | Improvement | No tool wear until F-9 | Galaxy Alloy no longer wears or breaks. The rule could wipe out hours of progress and nothing taught it. |
| I-26 | Improvement | Simpler map | Remove the lamps, ladders, rails, lava, crystals and other decorations; keep the rock, tunnels and boards. |
| I-27 | Improvement | First-time tips and a "next tools" goal | Short tips the first time you haul ore, meet a locked layer ("Forge bone tools: 12 bone + 6 wood"), open the Forge and craft a special. A visible readout of progress toward the next tools. |
| I-28 | Improvement | Iron no longer a bottleneck | Re-measure the stash over a whole descent; raise iron where it runs short, trim what piles up. |
| I-29 | Improvement | Luck Tonic renamed Luck Potion | Both potions are potions. |
| B-7 | Bug | Tools broke without warning in the Crust and sent the run back 30 boards | Fixed by I-25 for now; F-9 is the real answer. |

### Done in 2.1.1 (first 2.1.0 playtest)

| Proposed ID | Type | Item | Notes |
| --- | --- | --- | --- |
| I-31 | Improvement | Hint asks first and costs more | A Yes/No before the coal is spent; 5 coal (was 3); the coal flies from the stash into the Hint button. |
| I-32 | Improvement | "Guide" pill | The (?) becomes a labelled Guide button like Hint. |
| I-33 | Improvement | Placements left | "14/21 placements left" replaces "Deal 2 of 7". |
| I-34 | Improvement | Numbered boards | "Magmastone board #3" instead of names; the grid maps will have too many boards to name. |
| I-35 | Improvement | Centred pause card | Next star line (or "All three stars! Finish strong."), layer stars, round Resume / Restart / Map icons; Map and Restart ask first. "Your best here" and the star lines are gone. |
| B-8 | Bug | Hint stayed greyed out at the start of a board | Fixed: it wakes as soon as the opening banner ends. |

### Done in 2.1.2 (2.1.1 playtest)

| Proposed ID | Type | Item | Notes |
| --- | --- | --- | --- |
| B-9 | Bug | After a Rescue the tray looked empty, the used potion stayed in the dock, and a Blast Charge wouldn't drag | One line since 2.0.4 had the redraw calls inside a comment. Fixed, with a regression test. |
| I-36 | Improvement | Potions renamed | Potion of Luck (was Luck Potion), Potion of Protection (was Rescue Potion). |
| I-37 | Improvement | Potion of Luck lasts 5 deals | Was 7. The Potion of Protection stays automatic until F-10, which makes both potions drink-on-purpose for 5 deals. |

### Backlog features from this round

**F-9 Tool durability and repair** (replaces today's Galaxy-Alloy-only wear)
- Tools wear in every layer, shown by a clear tool icon with a colour state, not a percentage chip.
- Repair happens on the board, from the craft menu, as you play; forging new tools stays on the map, where you break into the next layer.
- Broken tools lock you out of that depth: climb back to where your older tools still work, gather resources and reforge, then return. No progress is lost.
- No automatic repair (prism ore no longer mends on its own); repair costs resources so it's a real decision.
- Taught by F-12 from the start.

**F-10 Workshop and brewing** (bundles with F-3 Crafting table). **Done in 2.2.0** (2026-11-06); costs and choices in DECISIONS.md.
- Two kinds of specials, two kinds of slots. Equipment (Blast Charge, Sledgehammer) on the left with the anvil; potions (Rescue, Luck) on the right with the brewing table. Not interchangeable.
- Equipment: one slot to start; a second slot crafted for a very large cost that only a thrifty player reaches near the end of a descent.
- Brewing table: crafted from the equipment menu for ruby, emerald, bone, iron and wood, affordable around 30% of a descent. It unlocks potion crafting and one potion slot; a second potion slot costs a late-game amount like the second equipment slot.
- Both potions are drunk on purpose and last 5 deals (the Potion of Luck already does from 2.1.2). Rescue keeps today's effect during that window (a cave-in undoes your last move and deals fresh pieces, and the protection carries on), with a clear "saved you" animation. Luck favours easy-to-place and gap-filling pieces and doubles the chance of random specials.
- Potions need bone, so Fossils stay useful the whole way down.

**F-11 Zone grid maps** (supersedes F-1 Layer maps and F-2 Vein farming; their proposals OI-2, OI-3, OI-4 are replaced)
- Each zone is a grid 9 wide and 8 deep. Straight down is the fastest way through, but it rarely gathers enough for the next tools, so you dig sideways for more. Deeper zones need more side digging.
- Blocks stay dark until a board next to them is mined; mining one reveals its neighbours: a plain block, or a vein of one resource. Mined blocks become the path (no dotted lines or check marks).
- A vein board deals mostly that one resource; plain boards deal base blocks (random specials can still appear anywhere).
- Wood comes only from trees in the Forest's first row, so it is finite for the whole run.
- Veins by zone (common / uncommon / rare): Forest: trees (first row), bone. Limestone: copper; bone; ruby. Slate: iron; copper, ruby; bone, emerald. Granite: gold; iron, emerald; meteorite, copper, ruby, diamond. Basalt: meteorite, prism ore; gold, diamond; iron, emerald. Magmastone: prism ore, diamond; gold. Crust: to define. Core: a 3×3 area of prism ore veins (2–4), no new tool, no camp; then the final single board where the keystone is placed in the glowing square between the walls.
- A resource floor per zone, well above the true minimum, so no player is ever blocked or forced to dig every last block.
- Finite boards per zone (72); replay and farming rules to define with F-11.

**F-12 Onboarding tutorial**: a fuller first-run tutorial that teaches resources, the stash, forging tools, repairs (F-9) and the workshop and brewing table (F-10). Ships with them.

**F-13 Craft and the belt** (crafting between boards; proposed 2026-11-07, revised twice after review). **Done in 2.4.0** (2026-11-08); choices in DECISIONS.md.
Why: since 2.2.0 you can craft mid-board whenever you like, so extra slots only save a trip to the anvil. Slots are worth something only when there is a moment you can't make more. F-13 makes that moment the start of each board: what is on your belt is all you get.
- **The belt.** Specials live on a belt of **3 slots shared by equipment and potions**. A new run starts with 1 slot; slots 2 and 3 are unlocked for a significant resource cost (first numbers: slot 2 about 20 gold, 4 diamonds, 120 coal; slot 3 about 10 prism ore, 8 diamonds, 12 meteorite; to tune with the sims). They replace the equipment/potion second slots. **No satchel**: you can only craft into a free slot. Camps do not refill the belt. The belt look is subtle (a faint strap with stitching behind the slots), with no buckle anywhere.
- **Map top bar:** Home on the left, Sound on the right, and the run's stats between them: **STARS 52/168** (earned / possible in the run) and **PLACEMENTS 541**. The daily twist name and the tool/ore line leave the top bar (the twist still shows on the home screen and the board card).
- **Map belt bar:** under the top bar, the whole bar is the belt (larger slots, read-only here), with the **Craft** button (anvil icon) at its right end. It stays put wherever the map is scrolled.
- **Craft screen** (opened from that button): one screen for everything that is made: Tools, Mining equipment (Star Drill, Blast Charge, Sledgehammer), Potions (the brewing table is still built there first).
  - The **belt sits at the top in large slots and stays put** while the list scrolls. It is where you rearrange the belt (drag an item to another slot) and where new items land.
  - **Locked belt slots glow** (amber ring and a small +) to invite a tap; the tap opens a small pop-over with that slot's cost (and an Unlock button once you can afford it).
  - **Each item is one compact row** with no button: image on the left; on the right its name, a short description ("Breaks a 3×3 patch.", "Undoes a cave-in, 15 placements.") and its cost, short amounts in red.
  - **Tapping a row** asks: "Craft / Forge / Brew X?" with the cost (No / Yes), or says "Belt is full!" or "Not enough resources!".
- **On a board** the split dock becomes one belt band with the three slots (drag equipment, tap potions to drink, as today). Locked slots don't glow here. No CRAFT or BREW on the board; the Hint (coal) stays.
- **During a board** you use what is on the belt; anything unused stays for the next board. A Retry keeps whatever you haven't used; what you used is gone.
- **Migration:** specials held now move onto the belt in order (equipment first); any that don't fit the unlocked slots are refunded at their recipe cost. A run that had built a second equipment or potion slot gets belt slot 2.
- **Board screen changes that ship with it:** NEXT moves to the middle of the score row and gets bigger (label above the box, not cutting into its border: that overlap is the small artifact seen at the top of today's NEXT box); the star meter grows about 20%; "23 PLACEMENTS" replaces "placements left". **Pause** buttons run Map, Restart, Resume from left to right.
- Pairs with F-14 (endless boards make the belt choice matter more) and F-12 (the tutorial teaches Craft and the belt).

**F-14 Endless boards and placement stats** (proposed 2026-11-07). **Done in 2.4.0**; the dealer's late awkward pieces, star lines and ore rate are in DECISIONS.md.
- **No fixed number of pieces.** The tray keeps refilling (rolling tray and NEXT stay) until the board ends one of three ways:
  - **Leave the board** with 1 or 2 stars by tapping the **cart bar** (below). You keep everything you mined.
  - **The third star** ends the board at once with the complete screen.
  - **Cave-in:** no piece fits. You lose this board's haul (unless a Lucky Dodge, F-15, or a Potion of Protection saves it). Stars already reached on the board are kept.
- **No pop-up at the first or second star.** Instead a **cart bar** sits under the belt, above the tray: a mine cart on rails rolling right toward a timber-framed mine exit. The cart moves along with the board's points toward the last star line. Before the first star the bar is greyed out; from the first star it lights up (amber glow, lit doorway) and can be tapped. The tap asks **"Done here?"** (No / Yes); Yes goes to the board-complete screen. A first-time tip points at it the first time it lights.
- **Difficulty has to come from inside the board**: with unlimited pieces a careful player could go on forever, so the dealer gets harder as placements go up (fewer helpful sets, more awkward shapes), and the star lines are re-set with the bots for "how far can you push". Replaces `DEALS`, the placements-left count and the "So close" cave-in text.
- **Ore**: no fixed budget per board any more; each piece carries ore at about today's rate (budget ÷ placements), so playing on pays more ore and risks more. Re-run the descent and balance sims (tool pacing assumes today's hauls).
- **Placement stats** (counted from the build that ships F-14):
  - **This board**: in the score row ("23 PLACEMENTS") and on the pause card.
  - **This run**: total placements in the map's top bar (with the run's stars).
  - **Each zone**: a chip under each layer's name by its camp ("87 placements ›"). Tapping it opens a pop-over listing that layer's 8 boards: stars and placements for cleared boards, NEXT for the frontier, a dash for the rest.
  - A board's number counts all its attempts and replays, so a zone's total is the sum of its boards (a caved-in attempt on an uncleared board counts in the zone total but has no row yet).
  - **By shape** (not shown yet; for achievements or fun stats later): for every piece shape (each rotation separately, so families can be summed later), how many were placed and how many of those cleared a row or column. Kept per run and for the lifetime profile.
  - Run counts reset with a new run; lifetime counts are kept in the profile and the save code.

**F-15 Lucky Dodge** (proposed 2026-11-07). **Done in 2.4.0**: a second cave-in on the board is final.
- On the cave-in screen, once per board: trade **half of everything mined on this board so far** for a second chance. The board clears enough room to go on (a fresh, placeable tray, as the Potion of Protection does) and play continues.
- If the board caves in again it is over: the remaining half is lost, as in any cave-in. (Assumed; the proposal was cut off at "If the board caves in". Confirm.)
- Not offered when nothing has been mined yet. Points and stars reached are unaffected.
- Questions: does a Potion of Protection that is active fire first (so the Dodge only shows if it has worn off)? Should the dodge count toward a stat?

**F-16 Star Drill** (proposed 2026-11-07). **Done in 2.4.0**, with the Blast Charge now mining what it breaks.
- A new crafted equipment special that looks like a classic miner's star drill (a long steel rod with a star-shaped bit and a battered striking end).
- **Mines one whole row or column.** It is dragged onto an **edge of the board** rather than onto a cell: along the top or bottom edge it picks a column, along the left or right edge a row; the line under it highlights before you let go. Unlike the Blast Charge, what it breaks is mined (paid to the haul). (Assumed from "mine"; confirm.)
- **Cheapest special**: about 30% cheaper than the Blast Charge, which (with the Sledgehammer) becomes about 10% dearer. First numbers: Star Drill 9 coal, 2 iron; Blast Charge 14 coal, 3 iron (was 12 coal, 3 iron); Sledgehammer 11 copper, 9 ruby, 9 iron, 4 gold (was 10, 8, 8, 4). Re-run the economy sims.
- Ships with F-13 (one more Craft row, one more belt choice).

**I-30 Resource curve** (replaces I-4 Scarcity pass): each zone's main ore covers most of the next tools, so the main path never forces you back up; earlier ores still turn up as rarer veins deeper down, so going back is an option, never a chore; every resource keeps a late-game use (repairs, slot unlocks, brewing) so nothing piles up uselessly. Tuned on F-11's grids.

## Open items

Twenty-one items are open. Each lists the bug, feature or improvement it blocks, or "Non-blocker" for a question to follow up later. Anything with an open item stays in Scoping. Closed items keep their resolution; proposals for the open ones follow the table.

| ID | Item | Blocks | Status | Resolution / notes |
| --- | --- | --- | --- | --- |
| OI-1 | What does the Fossil grant past the Forest? | I-5, F-3 | Closed | Bone becomes an ingredient in Rescue Potion and Luck Tonic. Below the Forest it comes only from Fossils, which grant 4–8 (1–2 potions). Luck Tonic dropped its diamond. (2026-10-31) |
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
| OI-34 | Should Fossils appear in the Forest? | Non-blocker | Open | Forest boards are Easy tier, which has a 0% special rate, so I-3's "4–5 boards with a Fossil" can't happen. 2.0.2 tunes bone alone: 6–8 boards. |
| OI-35 | Is the Crust's 1-star cap right? | Non-blocker | Open | At the ramp's 35% the Crust gave 0 stars on about half of runs (Core on day 27 instead of 14). 2.0.2 caps its 1-star line at 3 (a typical player's 10th percentile); 2 and 3 stars keep 60/85%. |
| OI-36 | Do the star lines hold up with real players? | Non-blocker | Open | The simulator's bots don't aim for ore, so the "maximum haul" mostly measures deal luck: typical bots reach 3 stars on 20–40% of boards. Re-measure after playthroughs (OI-18). |

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
| B-1 | Map unresponsive after the phone sleeps | Game foregrounded, phone sleeps or screen off, then resume: map ignores taps. Quit and relaunch fixes it. | v2.0.1 resets the map and any interrupted drag when the game comes back. 2.0.2 adds an automated sleep/resume test and fixes a related freeze: a drawing error could stop the render loop for good. Confirm on a phone (30 minutes with sleep/resume) before closing. | P0 | In progress | 2.0.1, verify on a phone |
| B-2 | Dealer slots look empty but hold pieces | Slots render blank; tapping one makes its piece appear. | Fixed in v2.0.1. Cause: picking up a second piece while the first was still gliding back. | P0 | Done | 2.0.1 |
| B-3 | Tutorial stalls on an off-target placement | New game: placing the piece outside the glowing outline is accepted, but the tutorial never advances. Expected: off-target drops snap back during tutorial steps. | A Skip button and Settings \> replay tutorial already exist. Off-target drops now glide back with a nudge. | P0 | Done | 2.0.2 |
| B-4 | Resource counts overlap their icons | In the resource bar, each count draws over its resource icon. Expected: the count sits below the icon, and any count above 99 shows as "99+". | Fix: move counts below the icons and cap the display at 99+. The real total stays visible where it's spent, e.g. the forge and crafting screens. Shipped with a 52pt strip so icons keep full size. | P1 | Done | 2.0.2 |

## Features

Features list.

| ID | Feature | What the player gets | Scope | Open items | Priority | Status | Release |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-1 | Layer maps | Each layer is its own map you can explore sideways without limit. Forge the next tools to drop down; climb back up anytime. | Sideways-scrolling layer map; the next layer's wall at the fixed depth; side tunnels removed; Drop down; Climb back up, with the layer above as the ceiling; a wall reminder hint. Side tunnels were already removed in 2.0.2. | OI-2 | P1 | Scoping | 2.1.0 |
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
| I-3 | Rarer bones in the Forest | Lower bone drops (now 0.12 with a 1.4× Forest boost) so bone tools (12 bone + 6 wood) take about 6–8 Forest boards without a special, 4–5 with a Fossil. Shipped: bone boost 0.8, about 6.5 boards (see OI-34). | — | P1 | Done | 2.0.2 |
| I-4 | Scarcity pass for other materials | The same tuning for every other material, so gathering always takes effort. | — | P1 | Scheduled | 2.2.0 |
| I-5 | Fossil reward and bone potions | Fossils grant 4–8 bone at every depth. Rescue Potion and Luck Tonic each add 4 bone to their recipe; Luck Tonic no longer needs a diamond. Bone is mined only in the Forest. | — | P1 | Done | 2.0.2 |
| I-6 | Remove the Geode special | The Geode (formerly Prism Stone) no longer spawns. Fossil and Buried Treasure keep their current drop rates and contents, so random specials overall turn up about 40% less often. Prism Ore, the normal ore, is unchanged. Removed from the code entirely. | — | P1 | Done | 2.0.2 |
| I-7 | Retry instead of Keep Mining | When a board's score target is reached, the board ends. KEEP MINING is removed; a Retry button replays the board to earn more stars. | — | P1 | Done | 2.0.2 |
| I-8 | Stars from resource efficiency | Stars measure the ore mined against the board's maximum possible haul, combo bonuses included. 3 stars takes about 60% in the Forest, and the bar rises each layer so the last layers need retries and expert combos or specials. Stars already earned stay as they are; the new rules apply from the next play of each board. Board 1-1 counts wood too; the Crust's 1-star line is capped (OI-35). | — | P1 | Done | 2.0.2 |
| I-9 | Zero stars possible; 1 star to progress | A poor or unlucky run can end with no stars. The board then doesn't count as cleared, and the player retries until it earns at least 1 star. | — | P1 | Done | 2.0.2 |
| I-10 | Bigger combo yield | Multi-line clears multiply the ore they mine: ×2 for 2 lines, ×3 for 3, ×4 for 4 or more. Replaces today's +25% to +100% line bonus (v1.1.0). From the Game Modes doc's Career skill levers. | — | P1 | Scheduled | 2.2.0 |

## Change Points

Every code change is logged here when it ships, linked to the bug, feature or improvement it came from. The log starts at v2.0.1; earlier changes are in Version history.

| CP | Type | Change | From | Release |
| --- | --- | --- | --- | --- |
| CP-15 | Bug fix | A drawing error in one effect no longer stops all effects and animations (found while testing B-1). | B-1 | 2.0.2 |
| CP-14 | Improvement | Side tunnels removed; gates and the Forge point to replaying cleared boards. | F-1 | 2.0.2 |
| CP-13 | Improvement | A run below the 1-star line doesn't clear the board: Retry or Map, haul dropped. | I-9 | 2.0.2 |
| CP-12 | Improvement | Stars measure ore against the board's maximum haul (expert bot, 95th percentile); lines 20/40/60% in the Forest to 35/60/85% in the Crust; board 1-1 counts wood; Crust 1-star capped at 3. | I-8 | 2.0.2 |
| CP-11 | Improvement | The board ends at its target; results sheet with Continue / Retry (a clean restart); Keep Mining and Finish removed. | I-7 | 2.0.2 |
| CP-10 | Improvement | Geode removed; Fossil and Buried Treasure keep their rates. | I-6 | 2.0.2 |
| CP-9 | Improvement | Fossil gives 4–8 bone; Rescue Potion and Luck Tonic need 4 bone; Luck Tonic needs no diamond. | I-5 | 2.0.2 |
| CP-8 | Improvement | Forest bone boost 1.4 → 0.8: bone tools take about 6.5 boards. | I-3 | 2.0.2 |
| CP-7 | Bug fix | Resource counts sit below their icons in a 52pt strip and cap at 99+. | B-4 | 2.0.2 |
| CP-6 | Bug fix | During the tutorial, off-target drops glide back with a nudge. | B-3 | 2.0.2 |
| CP-5 | Bug fix | Automated sleep/resume test for the map and interrupted drags (phone check still open). | B-1 | 2.0.2 |
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

Eighteen versions shipped between Oct 4 and Oct 31, 2026, all to [deepcore-blocks](https://github.com/Taylors-Bookshelf/deepcore-blocks) on GitHub Pages. Taken from the project's git log, tags and CHANGELOG.md; newest first.

| Date | Version | What shipped |
| --- | --- | --- |
| 2026-10-31 | v2.0.2 | Board ends at its target with Retry / Continue; stars from ore efficiency, 0 stars possible; Geode and side tunnels removed; bone potions and rarer Forest bones; tutorial and resource-strip fixes. |
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
