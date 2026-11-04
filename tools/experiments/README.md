# Experiments

One-off simulators used to explore balance questions before a rule change. Nothing in `npm test` or the game depends on them, and they may lag behind the current rules. Run them from the repo root, e.g. `node tools/experiments/score2.mjs --runs 40 --even 1`.

| Script | Question it answered |
| --- | --- |
| `rate.mjs` | How a Forest special rate changes pacing (I-14). |
| `skill.mjs` | Under ore-based stars, does a skilled bot earn more stars than an ore-blind one? (No.) |
| `model.mjs` | Ore multipliers + fixed-length boards (the first I-15 model). |
| `p10.mjs` | Typical-player ore percentiles in the deep layers, for the 1-star line. |
| `score2.mjs` | The points-based scoring (I-15): bots, point breakdown, star-line calibration (`--calibrate`, `--even`). |
| `alloc.mjs` | Today's average haul per board by layer, the basis for the fixed resource budget. |
