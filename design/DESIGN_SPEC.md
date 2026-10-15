# Deepcore Blocks — visual refresh spec

Update the game's art, layout and the slots-full UI to match this package. Gameplay logic is unchanged unless stated here.

## Files

| Path | Contents |
|---|---|
| `assets/` | Every sprite as SVG plus a 16×16 PNG |
| `tokens.json` | Colors, fonts, sizes, glow and motion values |
| `effects.css` | Glow, idle-animation, destroy and toss keyframes |
| `reference/*.dc.html` | Mockups of the three screens (see "Reference mockups" below) |

## Sprites

All sprites are 16×16 pixel art. Scale them with **nearest-neighbor only** (`image-rendering: pixelated` or point filtering).

- **Blocks** (`assets/blocks/`): topsoil, wood-bark, limestone, granite, slate, basalt, magmastone.
  - Bevels are drawn into each texture. Don't add borders or rounded corners to blocks.
  - Depth order runs light to dark, top to bottom: topsoil and wood at the surface, then limestone → granite → slate → basalt → magmastone. Granite is a new layer between limestone and slate.
  - Magmastone is a matte, pitted, rust-orange rock. It must never glow, so it can't be mistaken for lava.
- **Ores** (`assets/ores/`): coal, iron, copper, gold.
- **Gems** (`assets/gems/`): ruby, emerald, diamond.
- Ore and gem sprites are transparent overlays. Draw them on top of the stone block at the same size.
- **Specials** (`assets/specials/`): Blast Charge, Sledgehammer.
- **Craft button icon:** `assets/ui/anvil`.

## Glow levels

| Item | Treatment |
|---|---|
| Ores | No glow, only a thin light edge |
| Gold | Adds a faint glint that cycles every 3.2s |
| Gems | Soft colored glow, 4s shimmer |
| Specials | Animated idle: Blast Charge fuse spark, Sledgehammer gentle swing |

Values are in `tokens.json → glow` and `effects.css`.

## Play screen layout

The layout is for a 390pt-wide screen; `reference/play-screen.dc.html` shows it assembled. From top to bottom:

1. **Top safe area:** 50pt.
2. **Header row, 44pt tall:**
   - Level badge, 44×44.
   - Zone name, with the difficulty chip and the "Today" score beneath it.
   - Map and Sound icon buttons, 44×44 each.
   - The old footer Map and Sound buttons are removed.
3. **Progress bar, 36pt tall.** The score is centered inside the bar, e.g. `640 / 2,520`.
4. **Resource strip, 38pt tall.** Ore icons and counts, a 1px divider, then gem icons and counts.
5. **Board:**
   - 8×8 grid of 42pt cells.
   - 2pt seams, the same width horizontally and vertically.
   - Empty cells are flat, with no inner shadow.
6. **Specials dock:**
   - Three 56pt slots, flat, with a 4pt radius.
   - Each slot holds a single item, so **no count numbers**.
   - After the slots: a 1px divider, then the Craft button (anvil icon plus the word `CRAFT`).
7. **Piece tray:** 3 slots, 114pt tall. Piece cells are 20pt with 2pt gaps, which fits pieces up to 5 cells long.
8. **Bottom safe area:** 34pt.
9. The old hint text line is removed.

## Slots-full flow

There are two triggers.

**Crafting with all 3 slots full.** Tap CRAFT → the normal craft list opens → the player picks a recipe → the sheet below appears. In the mockup the sheet opens straight away only because the craft list isn't drawn.

- Label: `ALL 3 SLOTS FULL`. Title: `Make room for a <item>`.
- Body: `Pick a special to destroy. Your ore is only spent if you go ahead.`
- Buttons:
  - `CANCEL` closes the sheet and changes nothing.
  - `DESTROY & CRAFT` is disabled until the player picks a slot to destroy.

**Earning a special with all 3 slots full.**

- Label: `NEW SPECIAL`. Title: `You found a <item>!`. The found item bobs gently.
- Body: `All 3 slots are full. Destroy one to keep it, or leave it behind.`
- Buttons:
  - `LEAVE IT BEHIND` plays the toss animation and leaves the slots unchanged.
  - `DESTROY & KEEP` is disabled until the player picks a slot to destroy.

**Sheet details:**
- A bottom sheet over a dark scrim.
- The player's three specials appear as tappable tiles.
- The selected tile gets a red ring, a faint crack overlay and a `DESTROY` label.

**Destroy animation.** It plays in the dock slot after the sheet closes:
1. Crack and shake, 450ms.
2. The sprite splits into 4 shards that pop up, spin and fall off the bottom of the screen, with a small dust puff, 800ms.
3. The new item drops into the slot with a bounce, 500ms.

**Toss animation.** About 1s. The found item flips up, spins and falls off the bottom of the screen.

## Fonts

- **Jersey 10** for numbers and titles.
- **Chakra Petch** (weights 500, 600 and 700) for UI text.
- Both are Google Fonts under the OFL license. Bundle them with the game.

## Reference mockups

The files in `reference/` come from a design tool and are not production code. They are HTML with `{{…}}` placeholders, `<sc-for>` and `<sc-if>` blocks, and a small JavaScript state machine. Use them for exact structure, styling, copy and state flow, then rebuild in the game's own stack. Their asset paths point to `../assets/`.
