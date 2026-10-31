<!-- Exported 2026-10-31 from the claude.ai doc "Deepcore Blocks — Game Modes & Seasonal Design Notes" (https://claude.ai/artifact/UT3tGjiYPRZazk6AANWeq7). The online doc is the source of truth; re-export after edits. Tracked in BACKLOG.md as F-4 to F-8. -->

# Deepcore Blocks: Game Modes & Seasonal

2026-10-26 · @Taylor

This is a doc describing three major update ideas for Deepcore Blocks.

1. Career - monthly map reset and seasonal variation / holiday easter eggs
2. Peaceful - NEW GAME MODE: calm free play
3. Master Miner - NEW GAME MODE: skill challenges

## The three modes at a glance

| Mode | Purpose | Access | Shareable result |
| --- | --- | --- | --- |
| Career | Progression: dig from the surface to the Core on a fresh monthly map | Always open | "Core Conquered" achievement on the Home Screen shelf, "Daily grind" |
| Peaceful | Calm, low-stress free play for brain breaks, kids, winding down, sleep | Unlocked by beating career that month (sticky until next month), OR unlocked daily by completing at least one career board per day. | Daily "10 Minutes of Calm" |
| Master Miner | Skill and strategy: daily puzzles, combo chains, pattern challenges | Unlocked by beating Career that month | Daily 3-achievement card |

## Career mode

Career is the existing game, reframed as a monthly run: a new map each month, start at the surface, goal is to beat the Core before the month ends and the map resets.

### Monthly cycle

- A new map generates on the 1st of each month; the player starts at ground level (e.g. forest).
- Goal: beat the Core within that month. Reaching it isn't enough: the player must also clear the challenging Core levels and place the final keystone (confirm against the current build). If not, the map resets and progress starts over.
- Each month's map gets random variation in board layout and zone look, plus a seasonal/holiday theme (see Seasonal section).
- Keeps all current systems: resource inventories, specials, special crafting, tool crafting, zone progression, material loss on cave-in.

### Pacing targets

Pacing is set by total play time to complete career mode within a given month. 

| Player Skill | Average time needed | At 10 min/day | At 15 min/day | At 30 min/day |
| --- | --- | --- | --- | --- |
| Average | ~3 h | ~18 days | ~12 days | ~6 days |
| Skilled | ~2–2.25 h | ~13 days | ~9 days | ~4–5 days |

Design target: an average player at 10 min/day finishes around day 18, leaving about 12 days of Master Miner; at 15 min/day, around day 12. These are starting targets, to be tuned based on feedback.

### Skill levers

In the current build, skill doesn't have much influence over progression, so the levers marked "new" add mechanics that let it:

- **Combo yield (new).** Ore and gems mined in a multi-line clear drop extra (e.g. ×2 for 2 lines, ×3 for 3, x4 for 4+ lines).
- **Earned deal control (new).** A combo streak, starting at 2 consecutive clearing placements, contributes to a reward basin, which when full, can be converted into an advantage: a next-deal preview for the next 3 deals, a one-time use re-roll, or a "hold" slot that lets the player bank a piece of their choice until they want to use it (limited to within the current board).
- **Cave-in avoidance (current).** Less time spent on replays, and less material lost.
- **Crafted specials (current).** Spending ore on the right special at the right time saves boards.

### Completion reward

- "Core Conquered" achievement.
- Unlocks Master Miner mode for the rest of the current month.
  - If fewer than 7 days remain in the month, Master Miner unlocks for 7 days instead.
- Remaining Master Miner access time shows on the mode select screen.

## Peaceful mode

Peaceful is free play, built for calm. Characterized by soothing, immersive visuals, soothing sound and music, and no pressure or strategy demands.

### What it's about

- Relaxation
- Satisfying feedback
  - unique block break, multi-line clear, board clear, and combo effects, animations, and sounds.
- Dynamic immersion
  - music (slight crescendo, layering, additive arrangement, texture) as the flow meter is filled
  - Faintly sparkly or glowing blocks when at full flow meter

### Access

- Unlocks on beating the Core in Career; lasts the rest of the month, or 10 days if fewer than 10 remain.
- Countdown of remaining access shown on the mode select screen and the Master Miner dashboard.
- Also unlocks one day at a time, if at least one Career board has been cleared that day, if career has not yet been completed in the current month.

### Use cases

- Quick brain breaks during the day
- Handing to a child for a few minutes
- Winding down, de-stressing, or helping fall asleep
- Meditative play, similar to coloring, doodling, other low-stress zen-like games commonly used to de-stress

### Mode rules

- No scores or score target
- No resource inventory
  - Ores, gems, and random specials still occur, but give no points or resources
  - Therefore, no materials to lose on cave-in
- No map or zone progression
  - Therefore, no tool crafting
- Infinite board
- Player can select what zone the blocks are from, the default is "all zones". What is available in peaceful depends on which zones are unlocked in Career in the current month. Others should appear grayed out with a "Unlock by playing Career!" reminder.
- Crafted specials require zero resources and can be obtained and used at will (as long as each special has been obtained and used at least once in career mode. For any that haven't, gray them out and have a reminder to unlock in career mode first. This should reset each month.)
- New sounds, visuals, animations, and music optimized for zen/calm immersion (should still feel familiar across modes) with a unique "flow meter" mechanic.
  - New dynamic of the sounds, visuals, and music increasing in richness and immersion as the player keeps the board clear and maintains the flow of the board. If there is a cave-in, the "flow is lost" and these added immersive/soothing elements are reset back to baseline. It should take 27 piece placements, or 9 row clears, to reach a full "flow meter" where the colors, animations, sounds, and music are at full immersion.
- Unique daily shareable achievement and habit streak with clever notes.

### Flow meter

a "flow meter" controls the richness of the experience.

- Full meter: full musical richness, vibrant blocks with special break effects/animations and accompanying sounds)
- Empty meter: simplified music, basic block appearance.
- Partial meter: Music gradually ramps as meter fills (layering, texture, crescendo, etc.)
- Keeping all meters full is the reward loop: a calming, rewarding sensory flow-state.

### Daily achievement: "10 Minutes of Calm"

- One shareable daily achievement for completing 10 minutes of play
- Card shows # of blocks mined in those 10 minutes, plus one novel stat, e.g. your favorite corner of the board to place pieces that day
- Earning the daily achievement should be made clear with a completion animation / visual element that does not stop or disrupt gameplay, but can be tapped to present a shareable card. The card would also be shown at the pause screen, or when exiting Peaceful mode.
- Card includes a short sentence based on how long the current streak is. the first day of a streak (day 2 of getting the achievement) might be something like "learning about calm". Day 7 would be "level-headed miner". Day 14 might be "cooler than an average cucumber". Day 30 might be "redefining the cave life" day 45 might be "Elder miner, rich with wisdom". Day 60+ could be "One with the earth" or something.

## Master Miner mode

Master Miner is the skill mode: an infinite, inventory-free board with daily strategy challenges, earned only by beating that month's Career.

### What it's about

- Challenge and competitiveness
- Daily puzzle/shape challenges based on piece shapes.

### Access

- Unlocks on beating the Core in Career; lasts the rest of the month, or 10 days if fewer than 10 remain.
- Countdown of remaining access shown on the mode select screen and the Master Miner dashboard.

### Mode rules

- No scores or score target
- No resource inventory
  - No ores, gems, or random specials
  - No resources to lose on cave-in
- No map or zone progression
  - No tool crafting
- Infinite board
- A cave-in resets the board
- Player can select what zone the blocks are from, the default is "all zones".
- No crafted specials
- New music optimized for "challenge", so should have a bit higher energy to it than the standard career music, with an element of stone/hammer striking, background chanting like might be heard in a LOTR movie track, or similar. (should still feel familiar across modes).
  - Not so far as to feel stress-inducing
- Unique daily shareable achievements and habit streaks
- Possibly introducing a new mechanic, like being able to rotate pieces, or being scored according to how closely a provided shape target is achieved (e.g. how many extraneous contiguous blocks are attached to the pieces that fill an outlined shape on the board, like a pixel-art outline or solid shape.
  - Boards might be larger than standard play boards to allow for more granular "pixel art" or more complex shape puzzles
  - Boards might always start blank, or might have some pre-populated blocks, not sure yet.
- Master Miner boards must be generated server-side each day, and be the same for all players for that same day to allow for comparing scores.
  - Each day brings 1 unique board and challenge, and the dealer sets are pre-determined and standardized across all players as well to ensure fair comparison of scores.
- Players are able to re-attempt the 5 most recent previous boards, ONLY for days which the game mode was unlocked. 
  - e.g. if today is the first day of the current month in which the player has unlocked Master Miner mode, then there should be no previous boards available to play. They should be grayed out, reminding the player to keep Master Miner mode unlocked and play each day in order to be able to re-play previous day boards.
  - Achievements are only possible on the current daily board, not prior day boards.

### Daily challenges (mentally stimulating)

- Shape puzzles built around specific materials or piece shapes
- Combo chains: trigger specific combos in a set order
- Pattern completion: clear rows/columns using specific materials or shapes, or per ranked "challenge patterns"
- Scored on:
  - time taken
  - number of placements needed since the last cave-in
  - Number of cave-ins

### Daily achievement

- Complete the days challenge goal(s) to obtain a scorecard showing how long it took, how man piece placements it took (since the last cave-in), and how many cave-ins occurred. The card should also show how many days the player has maintained a Master Miner mode streak.

## Seasonal and holiday atmosphere (Career)

The season should follow the player underground through ambient details, lighting, particles, and a unique Core each month, not just the surface art.

### Surface (forest zone)

- Fall: color-changing leaves, falling leaves, then bare trees at the winter transition
- Winter: bare and snowy trees, frozen tundra or lake
- Spring: thawing ice, melting snow, birds, bees, flower fields
- Summer: lush greenery, active wildlife, bright sunny atmosphere

### Carrying the season below the forest

1. **Surface window.** A thin strip or skylight at the top of the screen keeps showing the surface: weather, sky color, time of day. It shrinks as you dig, so depth feels real.
2. **Things that fall or seep down.** Leaves drift down the shaft in fall, snowmelt drips through limestone in spring, frost creeps along walls in winter, roots push down in summer.
3. **Cave dressing per season.** Ice stalactites and frozen underground pools (winter), trickling streams and puddle reflections (spring), glowworms and cool breezes (summer), amber with trapped leaves (fall).
4. **Underground wildlife.** Hibernating bat clusters (winter), earthworms (spring), cicada nymphs (summer), burrowing animals hoarding acorns (fall). Small, ambient, occasionally reactive to clears.
5. **Lantern and color grading.** The miner's lantern and zone lighting shift per season: cool blue-white in winter, warm amber in fall, green-gold in spring.
6. **Clear particles.** Line clears burst into the season: snowflakes, petals, leaves, fireflies. Cheap to build, seen constantly.
7. **Seasonal music layer.** Same zone tracks, with a seasonal instrument layer added (chimes and bells, birdsong, crickets, wind).
8. **Deep-zone reactions.** Magmastone runs hotter in summer; basalt pools freeze in winter. The deepest zones can echo the season too.
9. **Miner outfit.** Scarf and earmuffs, raincoat, sun hat, flannel. Visible every placement.
10. **A unique Core each month.** The finale changes: Ice Core, Ember Core, Amber Core, etc. Reaching it becomes a reveal worth chasing, which directly fights "same game again" staleness.
11. **Monthly relic.** One hidden seasonal fossil or artifact per map, collectible on a shelf. Gives Career a discovery goal beyond the Core.

### Month-by-month starter palette (Northern Hemisphere)

| Month | Surface | Underground motif | Core | Optional holiday swaps |
| --- | --- | --- | --- | --- |
| Jan | Snowy pines, frozen lake | Frost walls, hibernating bats | Ice Core | New Year: gems → firework sparks; Lunar New Year: gold → red lanterns/envelopes |
| Feb | Snowdrifts, first crocus | Icicles dripping, frozen pools | Frost Crystal Core | Valentine's: ruby → hearts |
| Mar | Melting snow, buds, mud | Meltwater seeping through limestone | Geode Core | St. Patrick's: emerald → lucky clovers; Holi: color bursts on clears |
| Apr | Spring rain, blossoms, birds | Earthworms, roots, puddle reflections | Seed Core | Earth Day: wood → saplings |
| May | Flower fields, bees | Bulbs in soil, first glowworms | Bloom Core | — |
| Jun | Lush green, long days | Cool cave breezes, fireflies at the shaft | Sunstone Core | Solstice: gold → sun tokens |
| Jul | High summer, active wildlife | Cicada nymphs, livelier magma | Ember Core | Camping: coal → s'mores, wood → firewood |
| Aug | Late-summer heat, meteor showers | Meteorite fragments in stone | Meteor Core | Perseids: gems → shooting stars |
| Sep | Harvest, first leaves turning | Acorn hoards, heavy roots | Harvest Core | Mid-Autumn: gold → mooncakes/lanterns |
| Oct | Peak fall color, falling leaves | Leaves drifting down the shaft, amber | Amber Core | Halloween: bones → ghosts/zombies; Diwali: gold → diyas |
| Nov | Bare trees, frost, fog | Wind in the shafts, hearth-glow lantern | Hearth Core | Harvest: wood → firewood; Día de los Muertos: bones → marigolds |
| Dec | Snow, evergreens, long nights | Ice crystals, cozy lantern glow | Aurora Core | Winter holidays: ruby → candy canes; Hanukkah: gems → candles |

### Holiday resource swaps

- Swaps are easter eggs to discover, not announced up front.
- The season theme covers the whole month; holiday swaps can run in a window around the holiday itself (e.g. the week before).
- Original examples: ruby → candy canes, emerald → lucky clovers, wood → firewood, coal → s'mores, bones → ghosts or zombies.

### Inclusivity and opt-outs

Swap content is grouped into tiers, each with a toggle in settings.

1. **Seasonal / nature** (on for everyone): leaves, snow, flowers, fireflies, meteors.
2. **Secular celebrations** (on by default): New Year, Valentine's, Halloween, camping, Earth Day.
3. **Cultural and religious holidays** (opt-in, per holiday): Christmas, Hanukkah, Diwali, Lunar New Year, Eid, Holi, Día de los Muertos, Mid-Autumn, and more.

- Cultural holidays deserve design care and ideally review by people from those cultures, especially anything near sacred imagery or Día de los Muertos.
- A hemisphere setting (or region detection) flips seasons for Southern Hemisphere players.

## Open questions and design tensions

A few parts of the plan pull against each other; these are worth deciding before building.

1. **Late joiners and missed weeks.** Someone who installs on the 20th, or misses a week, can't finish at average pace and loses everything at reset. That's harsh for a game pitched as calming. Options: a late-start rule mirroring the 10-day rule, depth checkpoints that soften reset, or an onboarding map for new players.
2. **Where does the immersion meter live?** The board space is already full/crowded. What should the Peaceful mode "flow meter" look like and where should it live?
3. **Locking away the best** **modes.** If most players never beat Career, most players never see the best experiences. Losing access after x days can also cause churn. Consider a free preview day, or pay-to-unlock options.
4. **Daily habit vs. pressure.** Daily achievements and shares can turn into streak anxiety, which undercuts the de-stress goal.
5. **Gaming the Calm timer.** Count active play only, so idle time doesn't earn the 10-minute achievement. Consider counting blocks placed instead of time elapsed.
6. **Time boundaries.** Define when "daily" and "monthly" reset (local midnight vs. a global time) and how the monthly map behaves across time zones.
7. **Kids and sharing.** If Peaceful is meant to be handed to children, share and social features likely need parent gating and attention to children's privacy rules.
8. **Master Miner unlock window.** Career → Completion reward says 7 days if fewer than 7 remain. Master Miner → Access (and the Late joiners item) says 10.
9. **Peaceful access.** The overview says Peaceful stays unlocked after beating Career, or unlocks daily by clearing one Career board. Peaceful → Access instead repeats the Master Miner text (10-day window, Master Miner dashboard countdown). It's also unclear whether the one-board daily unlock applies to Master Miner too.
10. **Gating Peaceful vs. its use cases.** If Peaceful needs a Career board first each day, handing it to a child or opening it to fall asleep means playing Career first. On the 1st of the month Peaceful would also have only the forest zone and no specials.
11. **"No scores" in Master Miner.** Mode rules say no scores or score target, but daily challenges are scored on time, placements and cave-ins, and boards are standardized for comparing scores.
12. **Zone selection vs. standardized boards.** If Master Miner players can choose which zone the blocks come from, the daily board differs between players and fair comparison breaks.
13. **What "infinite board" means.** Both modes list it, but Master Miner has one fixed daily board with predetermined deal sets, possibly larger than standard, and a cave-in resets it. Define it as endless play, board size, or both.
14. **Materials in Master Miner.** Mode rules remove ores and gems, but the daily challenges reference specific materials. Which materials exist in this mode?
15. **Master Miner achievements.** The overview still says "Daily 3-achievement card," but the Daily achievement section now defines a single scorecard, while Mode rules say achievements and streaks (plural).
16. **Career "Daily grind" share.** Listed in the overview's Shareable result column but not defined anywhere.
17. **Flow meter details.** 27 placements or 9 row clears: is it whichever comes first? Does the meter decay without a cave-in? The section also says "keeping all meters full" though there's now one meter, and the Open question above calls it the immersion meter.
18. **Online requirement.** Server-generated daily boards and score comparison need a backend, accounts and some anti-cheat, while the current build is an offline-capable web app. Where scores are compared (friends, global leaderboard) is also undefined.
19. **Screen space for deal control.** The reward basin, deal preview and hold slot add Career UI, the same crowding concern as the flow meter.
20. **Holiday timing.** Some holidays sit on month edges (Halloween, Día de los Muertos) and others move every year (Lunar New Year, Diwali, Eid, Easter). They need a per-year calendar, and a week-before window can straddle the map reset.
21. **Seasonal scope.** Only Career is seasonally themed. Decide whether Peaceful and Master Miner get seasonal flair too.
