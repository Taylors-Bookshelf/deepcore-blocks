# Decisions made while building the v1.0 update

Judgment calls I made without asking, so you can review and ask me to change or revert any of them. Newest releases at the bottom.

## Release 1
- **Zone order and names:** The Forest, Limestone Caves, Granite Halls, Slate Caverns, Basalt Gem Depths, The Underworld (Slate Caverns per your request). Internal block ids stay `stone/deep/obsidian/ember` so saves stay valid; only display names changed (Limestone, Slate, Basalt, Magmastone, Topsoil).
- **24 boards a day.** The Prospector badge and the day-end screen now need all 24. Strip mines stay once per zone per day, so there are 6 of them.
- **Granite zone settings:** difficulty .36 to .52, target 1,200 (+20% per board), 4 to 6 starter blocks, ores coal/copper/iron/ruby. Ruby first appears here; gold and gems start in Slate Caverns as before.
- **Ruby is mechanically the old cinnabar** (a common resource, about 10% of pieces) but drawn as a gem. It is not a capped gem, it makes no gem fanfare, and the field guide calls it Unusual. Recipes: Rescue 20 ruby + 1 emerald, Luck 12 ruby + 1 diamond, Jackhammer 8 ruby.
- **Difficulty modes removed.** The game is tuned as the old middle setting (Committed). The Settings screen now just says the dealer is tuned per zone.
- **Practice runs:** replaying a cleared board gives points and can raise your best score but gives **no ore at all** (not a reduced amount). This closes the grinding loophole.
- **Idle battery:** the drawing loop only runs on the board screen (and while effects are finishing).
- **All-Clear:** when 22 or fewer blocks remain, the dealer searches harder for a set that can wipe the board. In the deepest zones it stays rare (about 1% of boards for the test bot), because starter blocks have to be cleared too. I judged "rare but possible" the right feel.
- **Multi-line bonus:** extra 25 x n x (n-1) points on top of the existing n-squared scoring, with Double / Triple / Quad / Mega call-outs.
- **Adaptive mercy:** after 2 cave-ins on the same board today the dealer eases up (about 35% more help, then 70%, then 75%) and deals as if the board were up to 30% easier. Resets each day. In simulation this cuts 4-or-more-try boards from 5 to 12% down to 0 to 6%.
- **Retune results** (typical-player bot, tries per board by zone): 1.00, 1.01, 1.07, 1.19, 1.36, 1.86. The strip mine is needed at about 54% of gates in simulated whole days. Ore changes: iron 5% to 4%, ruby 12% to 10%, forest coal boosted so first torches are usually reachable.
- **Save migration:** your stash and crafted specials are kept (cinnabar becomes ruby), but **today's map progress resets once**, because boards were renumbered.

## Release 2 (the new look)
- **Tray boxes are back.** You asked earlier to remove the little boxes around the three pieces, but the design package specifies 114pt-tall panel slots for the tray, and it is the newer instruction, so I followed the package. Pieces still never resize.
- **Resource strip order:** wood, coal, iron, copper, gold, then a divider, then ruby, emerald, diamond. Wood is included (the package shows four ores) because torches need it. Ruby sits with the gems as the package shows.
- **Unbanked haul** is kept: a small green "+n" under each count, and "+score" next to Today.
- **Info button** lives in the header with Map and Sound (three 44pt icon buttons).
- **Specials dock rules already in this release:** three slots, any mix, duplicates allowed, Rescue stays in its slot until a cave-in uses it, Luck Tonic leaves its slot when you drink it, Blast/Sledgehammer leave when dropped on a piece. When the dock is full every Craft button reads "Slots full". The "make room" sheet and destroy animation come in Release 3.
- **Jackhammer is now Sledgehammer** everywhere (saves migrate; schema 3).
- **Plain dirt** is the topsoil block with its grass painted over (the package has no separate dirt).
- **Art the package does not cover** (potions, torch, lantern, wood, prism, fossil, treasure): kept my procedural art. Rescue and Luck now draw without their dark background square so they sit cleanly in the dock. I did not restyle the others further; tell me if you want them redrawn.
- **Difficulty chip colours:** the package only defines Hard (orange). I added Easy (soft green), Medium (lamp yellow) and Expert (coral) in the same style.
- **Safe areas:** the 50pt top and 34pt bottom in the spec are for notched phones, so I use the device's real safe-area insets with a 14px minimum. On a notched iPhone installed to the home screen this matches the spec.
- **Short phones:** below 700px of screen height the tray slots shrink to 96pt and piece cells to 16pt so a 1x5 still fits (tested at 375x667).
- **Board sizing** adapts to the free height; spare vertical room is shared evenly between rows like the spec's mockup.
- **Fonts:** Silkscreen and Barlow were removed; Jersey 10 and Chakra Petch are bundled. Canvas text (combo, floating text) uses Jersey 10.
- **Map restyle:** new rock sprites and palette; the mine-support timbers and fossil/geode decorations were redrawn because they looked wrong on the lighter rock; open nodes use the lamp yellow.
- **Empty-cell contrast (#18):** empty cells are the package's #35383d on a #232428 well, with a visible 2pt seam; I judged the contrast fine.

## Release 3 (specials and interaction)
- **No "found a special" sheet and no toss animation.** Following your answer that Prism, Fossil and Treasure stay craft-free random drops on the board, only the craft-with-full-dock flow exists. The toss animation from the package is unused.
- **Make room** appears whenever you tap Craft on something you can afford while the dock is full (from the anvil on the board and from the map's Craft panel). If you cannot afford it the button stays "Craft" and disabled with "Need more". The destroyed special is **not refunded**. The new special lands in the slot you destroyed.
- **Destroy animation** follows the spec's timeline (crack and shake 450ms, shatter about 850ms, bounce-in 550ms). On the map there is no dock on screen, so the swap is instant there. The dock ignores taps while the animation runs.
- **Pick-up animation:** the piece glides from its tray slot to your finger while growing to board size over 140ms. **Return animation:** a piece dropped somewhere invalid flies back to its slot and shrinks (190ms).
- **Tap to skip:** tapping anywhere while a Blast Charge, special or All Clear celebration is playing skips the waiting and ends the overlay. All points and ore are still awarded. A small "Tap to skip" label shows during those sequences.

## Release 4 (gameplay depth)
- **Push your luck, as built:** reaching the target clears the board for good (it counts toward the 24, unlocks the next board, and your ore so far is banked on the spot). A sheet then offers **BANK IT** or **KEEP GOING**. Playing on, a cave-in costs you only the ore gathered since the clear (and the extra stars) and you keep the clear with 1 star. At 3 stars the board banks itself. Starting a different board while playing on counts as abandoning it (same loss).
- **Stars:** 1 star at the target, 2 at 130%, 3 at 170%. Each star after the first adds a bonus of 10% of the target to that board's score (so to Today). The existing "board mined" bonus stays and is awarded at the clear.
- **A cave-in while playing on is not counted as a failed attempt**, so it does not trigger the dealer's mercy.
- **Replays (practice runs)** can still improve your stars and best score, never lower them, and never give ore.
- **Today** no longer double counts while you play on: the clear is already in it, extra points show in the bar.
- **Combo meter** appears at x2 or higher, top-right of the board, with three pips for the moves left before the combo resets.
- **Near-miss cave-in screen:** shows a bar for how far you got, "So close!" at 85% or more and the points short, plus one tip chosen from what actually happened (sealed gaps, long pieces with a crowded board, a dry spell without clears, a nearly full board, or a general tip). After the second cave-in on a board it tells you the dealer will ease up.
- **Hint:** a bulb button over the tray costing **3 coal every time** (no free hints). It glows the tray piece and outlines the best placement for 4.5 seconds, using the same move evaluator as the test bots (clears lines, avoids sealed gaps, keeps the rest of the set playable).
- **Daily twists** (one per day, picked from the date): Gold Rush (3x gold), Ruby Rain (2x ruby), Gem Fever (emerald/diamond 1.8x and +1 per board cap), Treasure Day (3x special blocks), Coal Seams (1.5x coal), Bright Lamps (torches and lanterns 25% cheaper, rounded up). Shown on the home screen and map header. They shift resources only, never how hard clearing is. I did not re-run the whole-day economy simulation per twist; Coal Seams and Bright Lamps make that day's strip mine less necessary, which seems fine.
- **Strip mines** have no stars or playing-on.

## Release 5 (retention and onboarding)
- **Tutorial:** the very first time you start board 1-1 (until you finish or skip it), the first set is scripted (a 3-bar, a 3-bar and a 2-bar) so the bottom row fills and clears. A caption and a glowing target guide each move; clearing the row ends it with an explanation. "Skip tutorial" is always visible; Settings has "Replay the tutorial". It only plays on board 1-1, never on a later board.
- **Streak:** a day counts once you clear at least one board that Pacific day; consecutive days extend it. The streak keeps showing until you miss a whole day.
- **Ranks (by lifetime points, banked days plus today):** Rookie Miner 0, Pick Swinger 5,000, Tunnel Digger 20,000, Vein Finder 60,000, Deep Delver 150,000, Gem Hunter 350,000, Core Master 750,000. These numbers are a first guess: a very good day is about 15,000-25,000 points.
- **Profile** (home screen): rank and progress, plus 12 stats (lifetime points, boards cleared, stars, days played, streak and best, best day, best board, best combo, most lines at once, Prospector badges, specials crafted, cave-ins survived). **Discovery log:** 33 entries (7 rocks, 4 ores, 3 gems, 7 specials, 6 zones reached, 6 daily twists), shown as silhouettes until found.
- **Home screen:** a Continue button when a board is in progress; a card with today's boards and points, the daily twist, the countdown to the Pacific-midnight reset, your streak, and yesterday and best day. The countdown also shows on the map header.
- **Share:** a small grid of the day (colours: black not cleared, brown 1 star, orange 2, yellow 3) plus points, streak and twist. It uses the phone's share sheet when available, otherwise copies to the clipboard. Buttons are on the home card and the day-end screen.
- **Feedback:** a form in Settings (Bug, Idea or Love it plus up to 500 characters) sent as an analytics event so it needs "Share anonymous play data" on. I did not put your email address in the public app; a GitHub issues link is shown when analytics is off.
- **Install hint:** iPhone Safari visitors who have not added the game to the Home Screen see instructions on the home screen; Android Chrome shows an Install button when the browser offers one. "Not now" hides it for 14 days.
- **Save codes:** Settings > Back up shows a code (starts with DC1) holding stash, specials, lifetime profile, settings and today's map; Restore replaces progress on this device after a second tap. This is also the way to move between devices. **Reset all progress** needs a second tap; it keeps only the anonymous analytics id.
- **Settings:** sound effects switch (same as the header speaker), ambient music, one volume slider, reduce motion (also honours the phone's own setting), larger text (panels only, the game screen has a fixed layout), backup/restore, replay tutorial, reset, feedback, analytics switch.
- **Ambient music is OFF by default.** It is generated (a slow minor-key drone with distant drips), about 3 kilobytes of code, no audio files. I left it off because the game asks iPhones for "playback" audio so effects work with the ring switch on, which also means music would play with the switch on; you can change the default if you disagree.
- **Test runs no longer send analytics.** I found my earlier test runs were sending events to your PostHog project from headless browsers, so a few test sessions may be in your data (they come from "HeadlessChrome"). They are blocked from now on.

## Release 6 (hardening)
- **Damaged saves are discarded, not repaired.** A save that fails validation (wrong shape, impossible numbers, a board layout that does not match its shape) is dropped and you start that part fresh; the rest of your progress is kept.
- **Midnight while the game is open:** when the Pacific day changes, the game switches to the new day the next time you return to the home screen or map rather than interrupting a board in progress.
- **New app icons** (the old ones predated the new look). Easy to swap: the three files in `icons/`.
- **Boot failure message:** if the game cannot start, a plain message with a Reload button shows instead of a blank page.
- **Accessibility:** I raised any text that fell below 4.5:1 contrast, labelled buttons and dialogs, and enforced a 36px minimum tap size. I did not add screen-reader narration of the board itself (it is a drag game on a canvas); that would be a separate project.
- **Phone screen:** layout uses the dynamic viewport height and disables pull-to-refresh bounce so a swipe near the top does not move the board.
- **Dead code removed** (old difficulty-mode remnants, unused helpers).
- **Not done:** no haptics, no leaderboards, no real-device test (see the final report).

## Playtest round 1 (v1.1.0)
- **Stars from ore, not points.** Clear = 1 star; 2 and 3 stars need an ore value mined on that board. Ore value weights: coal 1, copper 1, iron 2, ruby 2, gold 3, emerald 5, diamond 6 (wood does not count). Thresholds per zone (first board of the zone; later boards scale with their target): Forest 9/12, Limestone 20/28, Granite 23/32, Slate 26/36, Basalt 23/32, Underworld 36/50. They come from the simulator (`tools/stars.mjs`): 2 stars is about 1.25x and 3 stars about 1.75x what a typical player holds at the clear.
- **No more pointless prompt.** If the ore for 3 stars is already in hand when the board clears, it banks itself. If you have 2 stars worth, the prompt only offers the third. Ore from Prism Stones and Buried Treasure counts. Practice runs still count toward stars (they just give no ore).
- **Bonus ore tiers** (share of the ore mined in that placement): 2 lines +25%, 3 +50%, 4 +75%, 5+ +100%; combo x3-4 +10%, x5+ +25%; All Clear +100%; total capped at +150%. Rounded to the nearest whole ore, at least 1 per ore type once the bonus reaches +50%; emerald and diamond bonus capped at +1 per play. This is different from your example of +4 of every ore for a 4-line clear: that would roughly double the economy.
- **Rebalanced ore:** bonus ore alone made strip mines needed only 14% of the time and doubled crafting, so I lowered base ore rates about 20% (coal .185, copper .175, ruby .078, iron .033, gold .038). Strip mines are needed 55% of the time again; crafts per day match the old numbers. Daily twists that boost ore also make stars easier that day.
- **Hint** is now a lamp-coloured bulb with a question mark in the top bar (greyed when you lack coal); header buttons are 40 wide to make room.
- **Status bar:** I could not reproduce the top-of-screen shadow without your phone. My best guess is the translucent status bar style; I switched the installed app to a solid black one. If it persists, send a screenshot.
- **Music:** C major pentatonic, about 77 bpm, soft marimba-like plucks with a quiet pad, bass notes and an echo; never repeats. Still off by default.

## Playtest round 2 (v1.2.0)
- **Music volume** is fixed at about a third of the old level (no separate music slider; the one volume slider still scales everything). The bell sound was a bright overtone an octave above each melody note; it is removed, the melody sits lower, and notes start softer.
- **Wood stars** apply to any board with no ore or gems at all, which today is only Forest 1-1. Thresholds 30 / 42 wood: between what the simulator's typical player has at the clear (about 30) and what a quick in-browser bot had (about 20). Bonus "ore" from combos also pays wood on that board.
- **Combo display:** the corner badge is removed. A clear shows "+points ×combo" where the lines cleared; the separate "Combo ×n" banner is gone too (it said the same thing). Double/Triple/Quad names still show.
- **Wording:** BANK IT → FINISH, KEEP GOING → KEEP MINING, the bar's BANK → FINISH, "your ore is banked" → "your ore is safe in your stash". (Internally the code still calls it banking.)
- **Tray bug:** when the placement that reached the target cleared lines, the game stopped before redrawing the tray, so that piece stayed visible but was already used. The tray now refreshes first, and if KEEP MINING leaves no playable piece, the cave-in happens straight away.

## Playtest round 3 (v1.3.0)
- **Readable clear text:** a dark rounded plate behind every floating score/bonus with a thin outline in the text colour, and a hard drop shadow instead of a soft glow. The Double/Triple/Quad banner uses the same plate in lamp yellow.
- **Magmastone:** recoloured the design package's sprite (same pixel pattern): maroon-charcoal body, and its darkest crack pixels now glow orange. The original stays in `design/`; the game uses `assets/blocks/magmastone.png`.
- **Less on screen:** the countdown and date are gone from the map; the home card no longer shows the countdown or yesterday (Profile has your history); the streak only shows from 2 days. In play the "Today" total is hidden (home and map show it) and the resource strip hides resources you have none of and cannot find on this board.
- **Map:** removed the root lines, burrows, blue pools and the small fossil marks; narrower tunnels (half to two-thirds of a tile) and smaller chambers; the first tunnel opens the grass as a pit.
- **Gate flow:** one tap places all remaining lights when you can afford them; if not, the gate sends you to the strip mine (when it's open) or the Craft panel.
- **Crafting split:** map Craft = torches/lanterns (plus the strip-mine shortcut); board CRAFT = specials. The end-of-day "spend leftovers" button now opens the specials anvil.

## The Descent (v2.0.0)
- **Layers and boards:** Forest 4, Limestone 6, Slate 6, Granite 6, Basalt 6, Magmastone 30 (camps after boards 10 and 20), Crust 3, Ancient Core 1: 62 in all.
- **Tool costs (first pass, from the simulator):** bone 12 bone + 6 wood; copper 20 copper + 10 wood; iron 20 iron + 10 wood; steel 25 iron + 25 coal; Galaxy Alloy 15 meteorite + 10 iron. Wood only grows in the Forest, so its surplus (about 46) pays for the later handles (26). Forge Day (replaces Bright Lamps) makes tools 25% cheaper.
- **Pacing (simulated typical player, about 8 boards a day):** Magmastone on day 5, about 2.3 hours inside it, the Core around day 15. The Crust needs about 2 tries per board and breaks the tools in roughly 3 of 4 runs once. Real players are slower, so expect longer.
- **Galaxy Alloy wear:** Magmastone wears 0.04% per magmastone block but never below 10%, and any prism ore mined there mends fully. The Crust wears 0.62% per crust block; each prism ore mined mends 7%. Each prism ore in the stash mends 12% at the Forge. After a break, tools come back at 60%.
- **Missed days:** a day counts when you clear a board. If neither yesterday nor today has a clear, the next visit drops the boards of your current layer (back to the last camp in Magmastone, or the start of the Crust). Tools and stash always stay. A message explains it.
- **Side tunnels:** once a day per layer, after its third board. They ask for whatever the next tools still lack (at least a third of their cost); in Magmastone and the Crust they ask for 6 prism ore and 4 gold.
- **Replays give ore** (no more practice runs), since the stash now lasts the whole descent.
- **Stars:** thresholds re-measured for the new layers (2 stars at about 1.25x and 3 at 1.75x a typical player's ore value at the clear). Board 1-1 now has bones, so its wood-based stars are gone.
- **Ore balance:** copper in Limestone was trimmed (1.5 to 1.15 boost), iron in Granite and meteorite in Basalt raised so each layer gives roughly what the next tools cost (1.0-1.8x).
- **Fresh start:** v2.0 starts everyone on a new descent: stash and specials cleared; lifetime stats, ranks, discovery log and settings kept.
- **Names:** "Prism Stone" special renamed Geode (purple, so it can't be mistaken for rainbow prism ore). The Fossil now gives 5 bones and 600 points. The map's Craft button is now Forge.
- **The Core:** drag the portal into the temple; a 4-second light show; tally = board points + the value of all ore and gems mined on the run; name (stored on this phone, last 10 runs kept), Share (image when the phone supports it) and Download (PNG card). Credits roll for 60 seconds (skippable) and credit "Taylor's Bookshelf" for design and direction (change it if you prefer another name). Then a new run on the grass. Core fragments show as small violet stars on the home and map screens and as glints in the grass on the map; five earns Legendary.
- **Art I drew** (16×16, same style): bone, meteorite and prism ore overlays, Crust rock, the six tool icons, the portal, the camp tent, the temple. Basalt is the package sprite lifted about 20% in brightness.

## Playtest round 4 (v2.0.1)
- **Specials straight onto the board:** I agree with the change. Blast Charge breaks the 3×3 patch under your finger (mining everything in it) and still sets off other specials it hits; Sledgehammer reshuffles the board. Using one ends no turn and needs no line clear, so they are now emergency tools as well as score boosts. They still score their points (250 / 300). The trade-off: you lose the old trick of setting a Blast Charge in a piece to pair it with a big clear.

## v2.0.2 (built without check-ins; review these)
You asked for default decisions so the build could finish without you. Each line below is one I made.
- **Resource strip 38pt → 52pt** (your call: keep the icons full size). Icons stay 22pt; the count sits below in 17pt, the haul "+n" beside it. The board still measures 350pt at 390×844 (the strip took spare gap space); on a 375×667 phone the board loses about 14pt. Design spec and `tests/spec.mjs` updated.
- **Counts cap at 99+**, the haul "+n" too. The exact total is in each icon's tooltip, and the Forge and craft panels show real totals.
- **Geode removed completely** (your call), including the discovery log and field guide. The Fossil and Buried Treasure keep their v2.0.1 per-piece rates: the overall special rate is now 0.6% / 1.2% / 1.8% by tier. The map's purple crystal decoration was called "geode" internally; renamed to "amethyst" (same art). A saved board holding a Geode turns it into copper (the generic retired-block rule); you said saves don’t matter.
- **Treasure Day twist text** no longer mentions Prism Stones.
- **Fossil: 4–8 bone** (your call) and **600 points**, at any depth.
- **Rescue Potion 20 ruby + 1 emerald + 4 bone; Luck Tonic 12 ruby + 4 bone** (your call: no diamond).
- **Fossils can't appear in the Forest.** Forest boards are Easy tier, and Easy has a 0% special rate. The backlog's "4–5 boards with a Fossil" can't happen, so I tuned bone on its own (see below). Raise with the designer if a Forest Fossil was intended.
- **Bone rate:** Forest bone boost 1.4 → 0.8 (bone p 0.12 unchanged). Typical-player bot: about 2.0 bone per board, bone tools after 6.5 boards on average (median 7, 90th percentile 9). That's 2–3 replays after the four Forest boards.
- **Side tunnels removed now** (you leaned that way; they were due to go with F-1 in 2.1.0). The gate card and the Forge point to replaying cleared boards. Cost: in the simulator iron tools need about 7 Slate replays (Slate about 11 → 24 minutes) and meteorite about 2 Basalt replays. I left ore rates alone because the 2.2.0 economy pass (I-4) owns them. Flag it if Slate feels grindy.
- **End of board:** reaching the target always opens a results sheet, even at 3 stars (CONTINUE, RETRY), so the player always sees the stars and haul. The haul is held until CONTINUE; RETRY discards it with the run's points and stars. At 0 stars the choices are RETRY or MAP; MAP leaves the board uncleared and drops the haul. A board left on its results sheet reopens on it.
- **Star bonus kept:** each star after the first still adds 10% of the target. The clear bonus is paid on CONTINUE only.
- **Maximum haul = expert bot ("planner"), 95th percentile of ore value at the clear**, measured on 4 boards per layer and scaled by target as before (`tools/stars.mjs`). HAUL_MAX: Forest 12, Limestone 26, Slate 32, Granite 42, Basalt 39, Magmastone 37, Crust 25.
- **Line ramp:** 20/40/60% in the Forest to 35/60/85% in the Crust, rising evenly per layer.
- **Board 1-1 counts wood too.** On ore alone a third of runs mined no ore at all on the short tutorial board, which broke the "1-1 can't fail" gate. With ore + wood (max 50, lines 10/20/30) no simulated typical or casual run got 0 stars.
- **Crust 1-star line capped at 3** (a typical player's 10th percentile). At the ramp's 35% (9) the Crust gave 0 stars on 42–50% of runs: tries per board went 1.8 → 3.0, tool breaks 0.5 → 2.7 per run, the Core moved from day 14 to day 27. With the cap: 1.3 tries, no breaks in 6 runs, Core on day 12. The 2- and 3-star lines keep the ramp.
- **Simulated star spread (typical player):** 0 stars on 0–9% of runs depending on layer (Magmastone highest); 3 stars on 20–40%. **Caveat:** the bots don't aim for ore, so "maximum haul" mostly measures how lucky the deal was. Re-check the lines after real playthroughs, as OI-18 says.
- **Tutorial (B-3):** an off-target drop, or the wrong piece, glides back with "Not there: drag the glowing piece onto the glowing spot." and a small shake. Skip and Replay are unchanged.
- **B-1 is still unconfirmed on a phone.** I added an automated sleep/resume test (`tests/r7.mjs`). I also found a real freeze along the way: an effect could throw during drawing (a ring with a negative radius on the first frame), and that stopped the render loop for good. Effects are clamped now, and one broken effect can no longer stop the loop. This may be part of the "unresponsive after sleep" reports. Please still do the 30-minute phone check.

## v2.0.3 (after the 2.0.2 playtest)
- **Count-based stars** (your call): every ore and gem counts as one (`STAR_ORES` replaces the `YIELD_W` weights). `HAUL_MAX` re-measured with `tools/stars.mjs` (expert bot, p95): 12/21/26/27/22/19/10, `WOOD_MAX` 46. The line ramp (20/40/60% to 35/60/85%) is unchanged.
- **Crust 1-star line = 1 ore** (was 3 ore value). Counted, a typical Crust run mines about 4 ore and 1 in 8 mines none, so any higher line blocks progress. Whole-descent sim (20 runs): Crust 0-star retries 8% → 15% of tries, tool breaks 0.30 → 0.50 per run, Core on day 11.6 instead of 10.8. Other layers barely move.
- **Typical-player star spread under counts:** 3 stars on 15–52% of boards depending on layer, 0 stars on 0–9% outside the Crust. Stars still mostly measure the deal, not skill; that is I-15, still open.
- **Fossil and Treasure points scale with the target** (25% / 8%, like the All Clear's 15%) instead of a flat 600 / 200. Needed once specials appear in the Forest (targets 340–560: a 600-point Fossil ended the board at once, usually before a star's worth of ore). Deep down it is about what it was. Blast Charge (250 per block) and Sledgehammer (300) stay flat: the player chooses to use them.
- **Zone star totals** go on the board header (there is no pause menu), the map's top bar and the map's layer labels.
- **Retry tap bug (B-5) not reproduced** in Chrome or WebKit with iPhone emulation; left open for details.

## v2.0.4 (new scoring, I-15; built 2026-11-03 for playtesting)
Your calls: points from play, fixed deals per board, stars from points, resources give no points and take no multipliers, crafted specials give or cost points, random specials give resources only. The numbers below are mine, from `tools/experiments/score2.mjs` (mid / good / skilled bots on the real dealer).
- **Combos +250 / +600 / +1200** (you proposed +50 / +100 / +250 and asked for more). Combos were 5% of points; now they're the main skill payoff and widen the star gaps deep down.
- **Streak +50 per clear in a row after the first, max +500** (proposed +100, then +100×n to +1000). Back-to-back clears happen on their own on a crowded board (every bot reached 3), so the proposal paid ~35% of all points for little skill.
- **No shape bonus.** Every dealt piece must be placed, so a bonus for hard shapes pays for the deal, not the play.
- **Deals 4 / 5 / 5 / 6 / 6 / 7 / 7** by layer, about today's board length. Board 1-1 deals 4 like the rest of the Forest.
- **Star lines** (board points, base included): Forest 900/1000/1100 (board 1-1: 700/1000/1100), Limestone 1350/1550/1700, Slate 1500/1700/1850, Granite 2050/2300/2550, Basalt 2000/2400/2750, Magmastone 2500/3000/3550, Crust 2700/3150/3600. Rule: 1 star at the skilled bot's 3rd percentile (a pass mark), 3 stars at its median deep down (10th percentile in the Forest), 2 stars halfway. Sim, deep layers: skilled 98/78/53%, typical (mid) about 50–60/25–35/5–15% with cave-ins. Your 85% 1-star target for skilled players would have meant ~2.4 tries a board for a typical player in Magmastone, so 1 star sits lower. Basalt and Magmastone 1-star lines were then lowered (from 2150 and 2600) so a typical player's tries per board still rise layer by layer and Magmastone stays under 1.8 (`npm run test:balance`).
- **Blast Charge +200, Sledgehammer +350** (you proposed 250 / 400; the stars deep down are ~450 apart, so a special is worth a bit less than a star). **Luck Tonic −150, Rescue Potion −250** (your call).
- **A Blast Charge's blocks are lost, not mined** ("crafted specials never pay resources").
- **Perfect / Great fit keep their callout but give no points** (they weren't in the new table).
- **Fossil and Treasure points removed** (random specials pay resources only); the 2.0.3 target-scaled points are gone with the target.
- **Ore budget per board** = the v2.0.3 average haul per layer (`tools/experiments/alloc.mjs`), bone only in the Forest (deeper bone still comes from Fossils). The budget is handed out over all deals but the last (ore in the final deal was rarely cleared), and Forest bone (3 a board) and Basalt meteorite (2.6) and iron (2) were raised so tools cost what they did. Fractions are a per-board chance. Daily twists multiply the budget. Starter blocks are plain rock. Ore you don't clear stays on the board and is lost.
- **Version 2.0.4, not 2.1.0**, so the roadmap's 2.1.0 (layer maps) keeps its number.
- **Not yet simulated with the skilled bot over whole descents.** `tools/run.mjs` uses score-blind bots, so its pacing is a pessimistic read; see the balance notes in the release message.

## v2.1.0 (toward v1, from the 2.0.4 playtest; built 2026-11-06)
Your calls: keep 2.x version numbers ("v1" is a milestone name); no tool wear until backlog F-9; camps at the first board of each layer; 8 boards a layer without shortening the game; simpler home, settings, profile, board header and map; sound popover everywhere; one-tap play; Luck Potion. The rest are mine:
- **Pause sheet** shows the layer and board number, the star lines, the layer's stars and your best on that board; Resume, Restart board, Quit to map (the board is saved; one tap on the map resumes it). Tapping outside closes it.
- **Header:** Pause, the board's name, "Hint" (with its 3-coal cost in the tooltip and label), "?" (How to play), Sound. The map card's difficulty chip is gone too.
- **Score:** the bar is gone; a counting number, "Deal 3 of 5" and the three stars. The day's clear bonus is still added to your day's points but no longer flashed as a number.
- **Sound:** two volumes (music 50, effects 70 by default; the old single volume became the effects volume). Each has a switch. The speaker icon is crossed out only when both are off.
- **Home:** Play (or Continue board X-Y plus World map when a board is in progress). The "clear a board today" warning stays as a one-line note. Share moved into the Profile.
- **Profile:** rank card, Points / Stars / Day streak, then six records (deepest layer, best board, longest streak of clears, most lines at once, boards cleared, core fragments). Days played, specials crafted and cave-ins are still tracked but not shown.
- **Settings:** switches for Reduce motion, Larger text and play data; Back up / Restore; Replay tutorial; Feedback; Reset. The explanatory paragraphs are gone.
- **8 boards a layer:** 57 boards in all. Saves migrate (schema 5): every layer above your current one is cleared, your current layer keeps its share of boards, stars and points move to the matching board, tools are kept. In-progress boards are dropped.
- **Camps:** the first board of each layer below the Forest (not the Core). A missed day drops your layer's boards after its camp. The Forest has no camp. Old mid-Magmastone camps are gone.
- **Tool wear off** behind one switch (`TOOL_WEAR` in data.js); the old Galaxy Alloy code stays dormant for F-9.
- **Game length:** with 8 boards a layer the simulated descent fell from about 178 to about 101 minutes. To keep its length without more boards, tool costs went up so each layer needs a few replays (about 2 in the Forest rising to about 6 in Basalt): bone 24 bone + 6 wood, copper 50 copper + 10 wood, iron 40 iron + 10 wood, steel 45 iron + 90 coal, Galaxy Alloy 26 meteorite + 15 iron. Magmastone and the Crust need no new tools, so they stay at 8 boards. This also starts F-11's "straight down isn't enough".
- **Iron:** Basalt's budget 2 → 3 a board, and Magmastone and the Crust now deal 1 iron a board, so iron for specials doesn't run dry late. Coal now has a real sink (steel tools).
- **Map:** no lamps, rails, crystals, lava, mushrooms, pebbles or lake, and no ore textures painted into the rock. Kept: sky, trees, rock, tunnels, boards, camps, the Core.
- **Basalt's 1-star line 2000 → 2100** so a typical player's tries per board still rise layer by layer with 8 boards (1.04, 1.20, 1.23, 1.45, 1.50, 1.75, 2.18). Simulated descent: about 121 minutes (was about 178 in 2.0.4), the Core on about day 11 (was about 14).
- **First-time tips** (once each, `life.tips`): your first haul (a toast), your first map visit, your first locked layer, your first anvil. The map's top bar now shows what the next tools still need.

## v2.1.1 (first 2.1.0 playtest; built 2026-11-06)
- **Hint price 3 → 5 coal.** The simulated stash reaches the Core with about 270 coal, so 5 still allows plenty of hints; it stays a first-pass number.
- **Header name on two lines** ("Limestone Caves" over "Board #2"): "Limestone Caves board #2" doesn't fit beside Pause, Hint, Guide and Sound at 390pt. The pause card and the board's opening banner show the full "Limestone Caves board #2"; "The" is dropped from "The Forest" and "The Crust".
- **Restart asks first too**, not only Map: Restart throws away the board's points, so it gets the same Yes/No as Exit to map.
- **Small labels under the pause icons** (Resume, Restart, Map), so the icons read without guessing.
- **"Placements left" counts the pieces in the tray plus three for every deal still to come**, so it drops by one with every placement (a Rescue Potion's fresh set doesn't change it).

## v2.1.2 (2.1.1 playtest; built 2026-11-06)
- **"Each potion lasts 5 deals":** the Potion of Luck now lasts 5 deals (`LUCK_DEALS` in data.js, was 7). The Potion of Protection still works automatically on a cave-in, because a timed Protection only makes sense once it's drunk on purpose, which is F-10. F-10's design now says 5 deals instead of 3.

## v2.2.0 (F-10 workshop and brewing; built 2026-11-06)
- **Costs** (simulated with `tools/experiments/workshop.mjs`): brewing table 12 ruby, 1 emerald, 4 bone, 4 iron, 8 wood; second equipment slot 20 gold, 4 diamond, 80 coal; second potion slot 8 prism ore, 6 emerald, 25 ruby. The table can't come at 30% of a descent as planned: emerald first appears in Granite Halls, so a player who spends as they go affords it at about 40% of play time (about 55% when saving for the next tools). A thrifty player (no specials) affords the second slots at about 77% and 83%.
- **Protection covers the tray you hold when you drink it**, plus the next 4 deals (5 in all), since you drink it when you're in trouble. Luck starts with the next deal, as before. A Protection save's fresh pieces don't use up a deal of either potion.
- **Protection's −250 points are paid when you drink it**; saves in its window are free.
- **No rescue after a cave-in** (the user's call before release): the cave-in screen's old "Craft a Potion of Protection" button is gone; the screen offers Retry and Map. A separate after-the-fact potion (a "Potion of Resurrection") may come later.
- **Luck's dealer lean is unchanged** (it already favours sets that fill gaps and clear lines); the new part is twice the random-special rate while it lasts.
- **Layout:** six 56pt squares wouldn't fit a 375pt phone, so the anvil and brewing table are 36pt-wide buttons with small CRAFT / BREW labels. Locked slots show a padlock and open the upgrade.
- **The workshop belongs to the run** (`dayState.wk`), like tools, so a new run after the Core starts without it. A missed day keeps it.
- **Migration (schema 6):** a run whose player held a potion gets the brewing table. Specials beyond the new slots are refunded as their ore (`fitDock`).
- **The simulator's player** still buys extras only after saving for the next tools, so `tools/run.mjs` builds the table late (around day 9). It now models the workshop and slot limits; the balance test is unchanged and passes.

## v2.2.1 (dock redesign; built 2026-11-06)
- **Dock layout chosen by the user** from four mock-ups: two panels, CRAFT left of the tool slots and BREW right of the potion slots, no group labels, the game's own sprites. Slots stay 56pt; the two panels fill a 375pt phone exactly (15pt gap), wider phones get a bigger gap.
- **Naming:** the user called the left group "Tools". With the labels removed this name isn't shown; the anvil panel still heads its list "Equipment", because "tools" already means the mining tools you forge on the map.

## v2.3.0 (rolling tray and star lines; released 2026-11-07)
Your calls: fix luck-driven 3 stars; let the player see what's coming; recommended a rolling refill with a one-piece preview. The rest are mine:
- **The preview piece is dealt with the tray in mind:** `chooseNext` (core.js) picks the next piece so the three you hold plus it can all be placed with it not first (`solveCount`'s new `late` argument). Same weights, mercy, tilt, Luck and All Clear hunt as the 3-piece dealer. A whole tray (start of a board, a Protection save) still comes from `chooseSet`.
- **Dealer kindness for 4 pieces:** `ROLL.ways=4` (the number of ways the 4 pieces can be placed is aimed at `targetWays × 4`). With 2.2 the typical bot caved in more than with 3-piece deals (Crust board completion 70% vs 83%); with 4 it is about the same or better (Granite 96%, Magmastone 88%, Crust 90% vs 90 / 85 / 81%).
- **Star lines from two bots, not one** (`score2.mjs --mix .4,.18 --ramp .03`): 1★ at the typical (mid) bot's percentile with cave-ins counted as misses, ramping from the 3rd in the Forest to the 40th from Magmastone on (typical tries a board 1.0 / 1.1 / 1.2 / 1.3 / 1.5 / 1.6 / 1.55; a flat 40th made the Forest 1.7 tries and failed the balance test), 3★ at the skilled bot's 18th percentile (it gets 3★ 82–86% in every layer, was ~53% deep down), 2★ halfway. With the preview the skilled planner pulls far ahead (half its clears are multi-line), so lines set from it alone would have passed a typical player on only 12–22% of tries.
- **Typical-player 3★ is rare in the sim (1–7%)**, but the mid bot ignores the preview and the scoring. A player who plans with NEXT sits between it and the skilled bot. Worth watching in playtests; 2★ (typical 16–38%) is the realistic goal for most.
- **Board 1-1** keeps a lower 1★ line: 600 / 1,150 / 1,550.
- **Basalt uses Granite's lines** (1,900 / 2,450 / 3,000; the sim said 2,950 for 3★): lines never fall from one layer to the next.
- **Potions last 15 placements** (5 deals × 3). Both count down per placement; a protected cave-in is undone before its placement counts. Five pips, each worth three placements.
- **All Clear:** the next three pieces dealt lean to the big set (they were a whole big set).
- **NEXT sits in the score row** (a 40×36 box with the piece at 6pt cells), not beside the tray: a fourth tray column would have shrunk the 20pt tray pieces below the spec at 375pt. The score now stacks over "placements left".
- **Speed:** `chooseNext` takes ~12 ms (worst ~80 ms) on a desktop per placement.
- **Old saved boards** get their next piece when loaded; their deals become placements (deals × 3).
- **F-13 Pack before you mine** (crafting between boards) is defined in BACKLOG.md with mock-ups; not built.
