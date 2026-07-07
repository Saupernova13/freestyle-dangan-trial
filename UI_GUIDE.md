# Adding New UI Elements — Step-by-Step Guide

How to build new UI for freestyle-dangan-trial so it survives texture swaps,
UI scaling, window resizing, and stays editable in the Godot editor without
code changes. Companion to `ARCHITECTURE.md` (Scene-owned UI) and
`freestyle-dangan-trial/textures/ui/README.md` (texture policy).

The two invariants everything below serves:

1. **Texture resolution must never affect layout.** Node sizes are declared
   in the scene; the texture is drawn *into* that rect. You can replace any
   texture with a 2x or 0.5x version and nothing moves.
2. **Window size must never affect UI size.** Stretch mode is disabled on
   purpose. The only thing that scales the canvas is the Settings "UI Scale"
   slider (`Window.content_scale_factor`, 75%–200%). Design in fixed pixels
   against a ~1920x1080 canvas and let anchors handle other window sizes.

---

## 1. Author the texture

| Kind of art | Author at | Why |
|---|---|---|
| Fixed-rect art (portraits, icons, banners, buttons, decals) | 2x–4x its on-screen size in a 1080p layout | Headroom so it stays crisp at UI Scale 200% on 4K. 4x is the project norm. |
| 9-slice frames, tiled patterns, anything used in a `StyleBoxTexture` with margins or `region_rect` | Exactly design resolution (its on-screen size) | Godot draws 9-slice margins and regions in *texture pixels*, 1:1 with canvas units. A higher-res source fattens borders and breaks slicing. |

- Save to `freestyle-dangan-trial/textures/ui/<name>.png`. One file per
  asset. **Never** create `high/`/`low/` variants — quality tiers are handled
  by import compression, not duplicate files.
- PSD sources go in `PSDs/` (gitignored), exports go in `textures/ui/`.

## 2. Set the import parameters

Select the PNG in the editor's FileSystem dock, then the Import dock:

- **Large decorative art** (anything bigger than ~256px):
  - Compress > Mode: `VRAM Compressed`
  - Compress > High Quality: `On` (BC7 desktop / ASTC mobile)
  - Mipmaps > Generate: `On` (prevents shimmer when drawn small or rotated)
- **9-slice frames, tiled patterns, small crisp elements**:
  - Compress > Mode: `Lossless`
  - Mipmaps > Generate: `Off`

Click Reimport. Then **commit the generated `.import` file together with the
PNG** — `.import` and `.uid` files are tracked in git deliberately; they
carry the resource UID and these parameters across machines.

## 3. Build the scene (`.tscn`), never code

Create a new scene per screen/panel/dialog under `scenes/ui/`. Follow
`game_over_screen.tscn` / `minigame_title_card.tscn` as exemplars.

- Root: `CanvasLayer` for full-screen overlays (pick a `layer` that fits the
  existing stack), `Control` for embeddable panels.
- Layout with containers (`VBoxContainer`, `HBoxContainer`,
  `MarginContainer`, `CenterContainer`) and anchors — corner-anchored HUD
  pieces stay put at any window size, centered dialogs stay centered.
- Mark every node a script needs with **Access as Unique Name**
  (`unique_name_in_owner = true`) and reference it as `%NodeName`, never
  `$Path/To/Node`.
- No `Label.new()`, `add_child()` for visuals, `create_tween()` for
  authorable animation, or hardcoded colors/sizes in scripts. Code only
  binds data, connects signals, and calls `animation_player.play()`.

## 4. Give every textured node an explicit size

This is the rule that keeps texture swaps harmless. Per node type:

**TextureRect** (the default choice for showing a texture)
- Expand Mode: `Ignore Size` (`expand_mode = 1`)
- Stretch Mode: `Keep Aspect Centered` (`stretch_mode = 5`) — or `Scale` if
  the art is authored at the rect's exact aspect ratio
- Size comes from anchors/offsets, or `custom_minimum_size` when inside a
  container. Never leave Expand Mode on `Keep Size` — that makes the node
  as big as the texture's pixels.

**TextureButton**
- Ignore Texture Size: `On` (`ignore_texture_size = true`)
- Stretch Mode: `Keep Aspect Centered`
- Set `custom_minimum_size` to the intended button size (containers collapse
  it to 0x0 otherwise — and animations that momentarily null the texture
  would too). See the start-menu buttons.

**StyleBoxTexture / NinePatchRect** (9-slice)
- Texture margins are in texture pixels of a *design-resolution* source
  (see step 1). Content margins and the node's own size are set explicitly.
  Exemplar: `minigame_title_card.tscn`'s frame.

**Sprite2D**
- Avoid for new UI — its on-screen size is texture pixels x scale, which is
  exactly the coupling this system removes. Use a TextureRect with
  `pivot_offset` at center if you need rotation (see
  `truth_bullet_selector.tscn`'s chamber/decals).

## 5. Animations: resource files + AnimationPlayer

- Author animations in the scene's `AnimationPlayer` (sub-resource library)
  or a shared `.tres` `AnimationLibrary` in `animations/`.
- `autoplay` for entrance animations; scripts only `play()`/`await
  animation_finished`.
- Animate offsets, modulate, rotation — not `scale` on textured nodes if you
  can avoid it (a keyed scale bakes in assumptions the next artist won't
  see). If an animation must swap textures, the node's explicit
  `custom_minimum_size` (step 4) keeps layout stable through the swap.

## 6. Wire the thin script

- `@onready var _thing: TextureRect = %Thing` bindings, signal connections,
  `Settings` reads, animation triggers. Nothing visual.
- Load alternate texture *variants* (e.g. blue/orange) by full canonical
  path: `res://textures/ui/<name>.png` — never a `high/` or `low/` path,
  they don't exist anymore.

## 7. Test before committing

1. Run the scene: layout correct at the default window.
2. Resize the window smaller and larger, try an ultrawide shape — anchored
   elements should reflow position only; nothing changes size.
3. Open Settings and drag UI Scale to 75% and 200% — everything should scale
   uniformly, no clipping against hardcoded assumptions, text readable.
4. Sanity-check the texture swap invariant: temporarily replace one of your
   textures with a half-size export; the layout must not move. Revert.
5. Commit the `.tscn` + PNG + `.import` (+ `.uid` for new scripts) together.

## Quick reference — the five sins

1. A TextureRect with default Expand Mode (`Keep Size`).
2. A TextureButton without `ignore_texture_size` + `custom_minimum_size`.
3. A Sprite2D in UI whose scale silently encodes texture resolution.
4. A high-res source feeding a 9-slice/tiled/region StyleBox.
5. Duplicate quality variants of a texture on disk.

If a future feature genuinely needs quality tiers, the sanctioned mechanism
is a `.pck` overlay that overrides the same `res://textures/ui/` paths at
startup — see the "If low-end profiling ever demands real quality tiers"
section of `textures/ui/README.md`. Scenes never know about it.
