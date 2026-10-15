# Roadmap: the v1.0 update

Status key: [ ] todo · [~] in progress · [x] done and live. Every item names the test that proves it once done.

## Release 1 · v0.6.0 · Foundation (structure, scoring engine, economy)
- [x] 6 zones / 24 boards: The Forest, Limestone Caves, Granite Halls, Slate Caverns, Basalt Gem Depths, The Underworld (new granite layer)
- [x] Ruby replaces cinnabar everywhere (Rescue 20 ruby + 1 emerald, Luck 12 ruby + 1 diamond)
- [x] Difficulty modes removed (Casual/Committed/Hardened); game tuned as the old "Committed"
- [x] #1 Replaying a cleared board no longer farms ore (practice runs)
- [x] #2 Idle battery: no drawing loop off the board screen
- [x] #6 All-clear still possible (rare) in every zone
- [x] #9 Multi-line bonus (Double / Triple / Quad)
- [x] #12 Adaptive mercy after repeated cave-ins on the same board
- [x] Economy, targets and difficulty retuned for 6 zones with the simulator (balance + day sims)
- [x] Save migration (cinnabar to ruby, today's map reset, schema version)

## Release 2 · v0.7.0 · The new look (design package, no rule changes)
- [x] Fonts bundled: Jersey 10 (numbers, titles) and Chakra Petch (UI text)
- [x] Sprites: 7 block textures, ores, gems, Blast Charge, Sledgehammer, anvil; glow/idle effects
- [x] Play screen to spec: header (level badge, zone, difficulty chip, Today, Map + Sound + info icons), progress bar, resource strip (ore | gem), flat 42pt board with 2pt seams, specials dock (3 slots + Craft), 114pt tray, no footer, no hint line
- [x] Jackhammer renamed Sledgehammer
- [x] Map restyled to the new art; field guide restyled
- [x] Art the package lacks (potions, torch, lantern, wood, prism, fossil, treasure) restyled to match
- [x] #18 Empty-cell contrast verified on the new art; #22 title font fixed by Jersey 10
- [x] Spec-conformance test (pixel sizes) added

## Release 3 · v0.8.0 · Specials and interaction
- [x] Dock holds up to 3 specials in any mix; Blast, Sledgehammer, Rescue, Luck each take a slot
- [x] "Make room" sheet: destroy one special to craft another; cancel spends nothing; crack, shatter and bounce animations
- [x] Random specials (Prism, Fossil, Treasure) stay on the board, craft-only rule for the rest
- [x] #19 Pickup scale animation · #20 invalid-drop return animation · #25 tap to skip long animations

## Release 4 · v0.9.0 · Gameplay depth
- [x] #7 Push your luck: bank at the target or keep playing for stars
- [x] #8 Stars per board feed the daily score
- [x] #10 Combo meter
- [x] #11 Near-miss cave-in screen (points short, tip, quick retry)
- [x] #13 Daily modifiers
- [x] #14 Hint button

## Release 5 · v0.10.0 · Retention and onboarding
- [ ] #5 Guided first board
- [ ] #21 Home redesign (Continue, yesterday, streak, best day)
- [ ] #15 Lifetime rank, discovery log, streaks, records
- [ ] #16 Share card · #17 Reset countdown · #4 Feedback button
- [ ] #3 iOS Add-to-Home-Screen hint + save export/import
- [ ] #24 Settings: reset progress, reduce motion, text size
- [ ] #23 Ambient music + volume slider

## Release 6 · v1.0.0 · Hardening
- [ ] Full regression, accessibility and performance pass; final balance run; dead code removal; docs rewritten

Dropped on request: #26 (renaming difficulty modes), because modes are removed entirely.
