extends CanvasLayer

## Spinning truth-bullet HUD shown in the bottom-left during minigames.
## All visual placement / sizing is editable in the inspector via @export.
## A scene wrapper at scenes/ui/truth_bullet_selector.tscn pre-fills sensible defaults.

@export_group("Animation")
@export var chamber_rotation_speed: float = 1.2
@export var decal_inner_rotation_speed: float = 0.8
@export var decal_outer_rotation_speed: float = -0.5

@export_group("Layout")
@export var anchor_offset: Vector2 = Vector2(20, -380)
@export var anchor_size: Vector2 = Vector2(430, 360)
@export var hub_pos: Vector2 = Vector2(120, 240)
@export var gear_size: Vector2 = Vector2(140, 140)
@export var inner_decal_size: Vector2 = Vector2(180, 180)
@export var outer_decal_size: Vector2 = Vector2(230, 230)
@export var slant_degrees: float = -25.0
@export var bullet_size: Vector2 = Vector2(220, 70)
@export var bullet_offset_from_hub: float = 90.0

@export_group("Text")
@export var bullet_text_font_size: int = 18
@export var bullet_text_color: Color = Color(1, 1, 1, 1)
@export var bullet_text_outline_color: Color = Color(0.35, 0.12, 0.0, 1.0)
@export var bullet_text_outline_size: int = 4
@export var nav_label_text: String = "Q/E or Scroll"

@export_group("Colors")
@export var inner_decal_modulate: Color = Color(1, 1, 1, 0.95)
@export var outer_decal_modulate: Color = Color(1, 1, 1, 0.55)
@export var lie_color: Color = Color(1.0, 0.3, 0.3)

@export_group("Textures")
@export var chamber_texture: Texture2D
@export var decal_texture: Texture2D
@export var bullet_texture: Texture2D

var _anchor: Control
var _decal_a: TextureRect
var _decal_b: TextureRect
var _chamber_rect: TextureRect
var _slant_pivot: Control
var _bullet_rect: TextureRect
var _bullet_text_label: Label
var _nav_label: Label

func _ready():
	layer = 10

	if not chamber_texture:
		chamber_texture = load("res://textures/ui/lower_res/Bullet_Chamber.png")
	if not decal_texture:
		decal_texture = load("res://textures/ui/lower_res/rotating_white_lines_decal.png")
	if not bullet_texture:
		bullet_texture = load("res://textures/ui/lower_res/Truth_Bullet.png")

	if not chamber_texture or not decal_texture or not bullet_texture:
		push_error("TruthBulletSelector: missing textures")
		queue_free()
		return

	_build_ui()

	TruthBulletManager.bullet_selected.connect(_on_bullet_selected)
	TruthBulletManager.lie_mode_changed.connect(_on_lie_mode_changed)
	InputManager.bullet_next.connect(func(): TruthBulletManager.cycle_next())
	InputManager.bullet_prev.connect(func(): TruthBulletManager.cycle_prev())

	visible = false

func _build_ui():
	_anchor = Control.new()
	_anchor.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_anchor.anchor_left = 0.0
	_anchor.anchor_top = 1.0
	_anchor.offset_left = anchor_offset.x
	_anchor.offset_top = anchor_offset.y
	_anchor.offset_right = anchor_offset.x + anchor_size.x
	_anchor.offset_bottom = anchor_offset.y + anchor_size.y
	_anchor.size = anchor_size
	_anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_anchor)

	_decal_b = _make_sprite(decal_texture, outer_decal_size, hub_pos - outer_decal_size / 2.0)
	_decal_b.modulate = outer_decal_modulate
	_anchor.add_child(_decal_b)

	_decal_a = _make_sprite(decal_texture, inner_decal_size, hub_pos - inner_decal_size / 2.0)
	_decal_a.modulate = inner_decal_modulate
	_anchor.add_child(_decal_a)

	_chamber_rect = _make_sprite(chamber_texture, gear_size, hub_pos - gear_size / 2.0)
	_anchor.add_child(_chamber_rect)

	_slant_pivot = Control.new()
	_slant_pivot.position = hub_pos
	_slant_pivot.size = Vector2.ZERO
	_slant_pivot.rotation_degrees = slant_degrees
	_slant_pivot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_slant_pivot)

	_bullet_rect = TextureRect.new()
	_bullet_rect.texture = bullet_texture
	_bullet_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bullet_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_bullet_rect.size = bullet_size
	_bullet_rect.position = Vector2(bullet_offset_from_hub, -bullet_size.y / 2.0)
	_bullet_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_slant_pivot.add_child(_bullet_rect)

	# Bullet text - child of _slant_pivot so it rotates with the bullet (appears ON the bullet)
	_bullet_text_label = Label.new()
	_bullet_text_label.text = "Truth Bullet"
	_bullet_text_label.add_theme_font_size_override("font_size", bullet_text_font_size)
	_bullet_text_label.add_theme_color_override("font_color", bullet_text_color)
	_bullet_text_label.add_theme_color_override("font_outline_color", bullet_text_outline_color)
	_bullet_text_label.add_theme_constant_override("outline_size", bullet_text_outline_size)
	_bullet_text_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_bullet_text_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_bullet_text_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_bullet_text_label.size = Vector2(bullet_size.x - 30, bullet_size.y - 14)
	_bullet_text_label.position = Vector2(bullet_offset_from_hub + 15, -(bullet_size.y - 14) / 2.0)
	_bullet_text_label.z_index = 5
	_bullet_text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_slant_pivot.add_child(_bullet_text_label)

	_nav_label = Label.new()
	_nav_label.text = nav_label_text
	_nav_label.add_theme_font_size_override("font_size", 10)
	_nav_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	_nav_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	_nav_label.add_theme_constant_override("outline_size", 2)
	_nav_label.position = Vector2(hub_pos.x - 60, anchor_size.y - 22)
	_nav_label.size = Vector2(140, 16)
	_nav_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_nav_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_nav_label)

func _make_sprite(tex: Texture2D, sz: Vector2, pos: Vector2) -> TextureRect:
	var rect = TextureRect.new()
	rect.texture = tex
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	rect.size = sz
	rect.position = pos
	rect.pivot_offset = sz / 2.0
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return rect

func show_selector():
	visible = true

func hide_selector():
	visible = false

func _process(delta):
	if not visible:
		return
	if _chamber_rect:
		_chamber_rect.rotation += chamber_rotation_speed * delta
	if _decal_a:
		_decal_a.rotation += decal_inner_rotation_speed * delta
	if _decal_b:
		_decal_b.rotation += decal_outer_rotation_speed * delta

func _on_bullet_selected(_bullet: Dictionary):
	_bullet_text_label.text = TruthBulletManager.get_current_display_name()
	_apply_lie_color()

func _on_lie_mode_changed(_enabled: bool):
	_apply_lie_color()

func _apply_lie_color():
	var color = lie_color if TruthBulletManager.lie_mode else bullet_text_color
	_bullet_text_label.add_theme_color_override("font_color", color)
