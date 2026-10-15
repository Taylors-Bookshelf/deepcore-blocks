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
