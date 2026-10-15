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
