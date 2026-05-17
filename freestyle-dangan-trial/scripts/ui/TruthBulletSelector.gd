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
	_anchor.offset_left = 10
	_anchor.offset_top = -200
	_anchor.offset_right = 180
	_anchor.offset_bottom = -10
	_anchor.custom_minimum_size = Vector2(170, 190)
	_anchor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_anchor)

	_decal_b = TextureRect.new()
	_decal_b.texture = decal_tex
	_decal_b.custom_minimum_size = Vector2(110, 110)
	_decal_b.position = Vector2(0, 55)
	_decal_b.pivot_offset = Vector2(55, 55)
	_decal_b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_decal_b)

	_decal_a = TextureRect.new()
	_decal_a.texture = decal_tex
	_decal_a.custom_minimum_size = Vector2(110, 110)
	_decal_a.position = Vector2(0, 55)
	_decal_a.pivot_offset = Vector2(55, 55)
	_decal_a.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_decal_a)

	_chamber_rect = TextureRect.new()
	_chamber_rect.texture = chamber_tex
	_chamber_rect.custom_minimum_size = Vector2(70, 70)
	_chamber_rect.position = Vector2(20, 75)
	_chamber_rect.pivot_offset = Vector2(35, 35)
	_chamber_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_chamber_rect)

	_slant_pivot = Control.new()
	_slant_pivot.position = Vector2(55, 110)
	_slant_pivot.pivot_offset = Vector2(0, 0)
	_slant_pivot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_slant_pivot)

	var slant_line = ColorRect.new()
	slant_line.color = Color.WHITE
	slant_line.size = Vector2(160, 3)
	slant_line.position = Vector2(0, -2)
	slant_line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_slant_pivot.add_child(slant_line)

	_bullet_rect = TextureRect.new()
	_bullet_rect.texture = bullet_tex
	_bullet_rect.custom_minimum_size = Vector2(80, 40)
	_bullet_rect.position = Vector2(90, -20)
	_bullet_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_slant_pivot.add_child(_bullet_rect)

	_bullet_name_label = Label.new()
	_bullet_name_label.text = "No Evidence"
	_bullet_name_label.add_theme_font_size_override("font_size", 14)
	_bullet_name_label.add_theme_color_override("font_color", Color.WHITE)
	_bullet_name_label.position = Vector2(120, 20)
	_bullet_name_label.custom_minimum_size.x = 160
	_bullet_name_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	_bullet_name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_bullet_name_label)

	_nav_label = Label.new()
	_nav_label.text = "Q/E or Scroll"
	_nav_label.add_theme_font_size_override("font_size", 9)
	_nav_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
	_nav_label.position = Vector2(10, 155)
	_nav_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_anchor.add_child(_nav_label)

	_slant_pivot.rotation_degrees = -30

	TruthBulletManager.bullet_selected.connect(_on_bullet_selected)
	TruthBulletManager.lie_mode_changed.connect(_on_lie_mode_changed)
	InputManager.bullet_next.connect(func(): TruthBulletManager.cycle_next())
	InputManager.bullet_prev.connect(func(): TruthBulletManager.cycle_prev())

	visible = false

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
