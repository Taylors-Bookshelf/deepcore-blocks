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
