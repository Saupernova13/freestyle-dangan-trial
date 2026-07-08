# UI texture policy

This folder is the **single runtime set** of UI textures. There are no
quality tiers; every scene references these files and nothing else.

## Authoring rules

- **Fixed-rect art** (portraits, banners, decals, buttons): author at roughly
  2-4x the size it occupies in a 1080p layout so it stays crisp at high UI
  scale on 4K displays. Resolution is a quality knob only -- it must never
  affect layout (see sizing rules below).
- **9-slice, tiled, or region-rect textures** (`minigame_name_frame_*`,
  `empty_block`, anything used in a `StyleBoxTexture` with margins or a
  `region_rect`): author at **design resolution**. Godot expresses 9-slice
  margins and region rects in *texture pixels* drawn 1:1 in canvas units, so
  a higher-resolution source fattens borders and breaks the slicing. This is
  why `minigame_name_frame_blue/orange` are 640x135 while most other art here
  is high-res.

## Sizing rules for scenes (the actual fix for "HD textures broke my UI")

A texture swap must never move layout. Every node that draws one of these
textures gets an explicit size in the scene and ignores the texture's pixel
size:

- `TextureRect`: `expand_mode = 1` (Ignore Size) plus explicit
  offsets/anchors, or a `custom_minimum_size` when inside a container.
- `TextureButton`: `ignore_texture_size = true`, `stretch_mode` Keep Aspect
  Centered, and a `custom_minimum_size`.
- `Sprite2D` in UI: avoid for new work (use `TextureRect`); where one exists
  its `scale` encodes texture pixels -> screen pixels, so changing a source's
  resolution requires compensating the scale.
- `StyleBoxTexture`: margins/regions are texture pixels -- see authoring
  rules; only design-resolution sources are safe.

## Window scaling / UI scale

Stretch mode is deliberately **disabled** (`project.godot` has no
`window/stretch/mode`): resizing the window never rescales the UI. The only
thing that scales the canvas is the Settings "UI Scale" option
(`Settings.ui_scale` -> `Window.content_scale_factor`, clamped to
`UI_SCALE_MIN..UI_SCALE_MAX`).

## Imports

Large decorative textures import VRAM-compressed (`compress/mode=2`,
`high_quality=true`, BC7 on desktop / ASTC on mobile) with mipmaps, which is
what keeps the high-res set viable on low-end hardware (~1/3 the memory of
lossless) and shimmer-free when drawn small. 9-slice frames and small
tiled/region textures stay lossless. `.import` files are versioned; keep it
that way or UIDs and these parameters silently diverge across machines.

## If low-end profiling ever demands real quality tiers

Do **not** re-introduce per-node texture swapping or duplicate directories.
The standard mechanism is a resource-pack overlay: ship design-res files at
these same `res://textures/ui/...` paths and mount an optional HD `.pck`
(`ProjectSettings.load_resource_pack`) that overrides the identical paths at
startup. Scenes stay untouched.
