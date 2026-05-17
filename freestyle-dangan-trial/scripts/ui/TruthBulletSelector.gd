extends CanvasLayer

const CHAMBER_ROT_SPEED = 1.2
const DECAL_ROT_SPEED = 0.7

var _anchor: Control
var _decal_a: TextureRect
var _decal_b: TextureRect
var _chamber_rect: TextureRect
var _slant_pivot: Control
var _bullet_name_label: Label
var _bullet_rect: TextureRect
var _nav_label: Label

func _ready():
	layer = 10

	var chamber_tex = load("res://textures/ui/lower_res/Bullet_Chamber.png")
	var decal_tex = load("res://textures/ui/lower_res/rotating_white_lines_decal.png")
	var bullet_tex = load("res://textures/ui/lower_res/Truth_Bullet.png")

	if not chamber_tex or not decal_tex or not bullet_tex:
		push_error("Failed to load truth bullet textures")
		queue_free()
		return

	_anchor = Control.new()
	_anchor.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_anchor.anchor_left = 0.0
	_anchor.anchor_top = 1.0
	_anchor.offset_left = 20
	_anchor.offset_top = -220
	_anchor.offset_right = 320
	_anchor.offset_bottom = -10
	_anchor.size = Vector2(300, 210)
	_anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_anchor)

	# Hub center where gear sits (inside _anchor)
	var hub_pos = Vector2(70, 140)
	var gear_size = Vector2(85, 85)
	var outer_decal_size = Vector2(130, 130)
	var inner_decal_size = Vector2(105, 105)

	_decal_b = _make_sprite(decal_tex, outer_decal_size, hub_pos - outer_decal_size / 2.0)
	_decal_b.modulate = Color(1, 1, 1, 0.55)
	_anchor.add_child(_decal_b)

	_decal_a = _make_sprite(decal_tex, inner_decal_size, hub_pos - inner_decal_size / 2.0)
	_decal_a.modulate = Color(1, 1, 1, 0.85)
	_anchor.add_child(_decal_a)

	_chamber_rect = _make_sprite(chamber_tex, gear_size, hub_pos - gear_size / 2.0)
	_anchor.add_child(_chamber_rect)

	# Slant pivot at hub center, rotated; line + bullet flow up-right from here
	_slant_pivot = Control.new()
	_slant_pivot.position = hub_pos
	_slant_pivot.size = Vector2.ZERO
	_slant_pivot.rotation_degrees = -25
	_slant_pivot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_slant_pivot)

	var slant_line = ColorRect.new()
	slant_line.color = Color(1, 1, 1, 0.85)
	slant_line.size = Vector2(190, 2)
	slant_line.position = Vector2(0, -1)
	slant_line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_slant_pivot.add_child(slant_line)

	_bullet_rect = TextureRect.new()
	_bullet_rect.texture = bullet_tex
	_bullet_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bullet_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_bullet_rect.size = Vector2(120, 36)
	_bullet_rect.position = Vector2(75, -18)
	_bullet_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_slant_pivot.add_child(_bullet_rect)

	_bullet_name_label = Label.new()
	_bullet_name_label.text = "No Evidence"
	_bullet_name_label.add_theme_font_size_override("font_size", 14)
	_bullet_name_label.add_theme_color_override("font_color", Color.WHITE)
	_bullet_name_label.add_theme_constant_override("outline_size", 3)
	_bullet_name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	_bullet_name_label.size = Vector2(200, 40)
	_bullet_name_label.position = Vector2(95, 30)
	_bullet_name_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_bullet_name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_bullet_name_label.z_index = 5
	_anchor.add_child(_bullet_name_label)

	_nav_label = Label.new()
	_nav_label.text = "Q/E or Scroll"
	_nav_label.add_theme_font_size_override("font_size", 9)
	_nav_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	_nav_label.add_theme_constant_override("outline_size", 2)
	_nav_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	_nav_label.position = Vector2(30, 190)
	_nav_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_nav_label)

	TruthBulletManager.bullet_selected.connect(_on_bullet_selected)
	TruthBulletManager.lie_mode_changed.connect(_on_lie_mode_changed)
	InputManager.bullet_next.connect(func(): TruthBulletManager.cycle_next())
	InputManager.bullet_prev.connect(func(): TruthBulletManager.cycle_prev())

	visible = false

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
	if visible:
		_chamber_rect.rotation += CHAMBER_ROT_SPEED * delta
		_decal_a.rotation += DECAL_ROT_SPEED * delta
		_decal_b.rotation -= DECAL_ROT_SPEED * delta

func _on_bullet_selected(bullet: Dictionary):
	var bullet_name = TruthBulletManager.get_current_display_name()
	_bullet_name_label.text = bullet_name
	if TruthBulletManager.lie_mode:
		_bullet_name_label.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	else:
		_bullet_name_label.add_theme_color_override("font_color", Color.WHITE)

func _on_lie_mode_changed(enabled: bool):
	if enabled:
		_bullet_name_label.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	else:
		_bullet_name_label.add_theme_color_override("font_color", Color.WHITE)
