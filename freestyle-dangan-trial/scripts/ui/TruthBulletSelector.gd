extends CanvasLayer

var panel: PanelContainer
var bullet_name_label: Label
var bullet_image_rect: TextureRect
var lie_indicator: Label
var nav_label: Label

func _ready():
	layer = 10

	panel = PanelContainer.new()
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.05, 0.1, 0.85)
	style.border_width_bottom = 2
	style.border_width_top = 2
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_color = Color(0.4, 0.7, 1.0, 0.8)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	panel.add_theme_stylebox_override("panel", style)

	var vbox = VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 4)
	panel.add_child(vbox)

	var header = Label.new()
	header.text = "TRUTH BULLET"
	header.add_theme_font_size_override("font_size", 10)
	header.add_theme_color_override("font_color", Color(0.4, 0.7, 1.0))
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(header)

	bullet_image_rect = TextureRect.new()
	bullet_image_rect.custom_minimum_size = Vector2(80, 60)
	bullet_image_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	bullet_image_rect.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	vbox.add_child(bullet_image_rect)

	bullet_name_label = Label.new()
	bullet_name_label.text = "No Evidence"
	bullet_name_label.add_theme_font_size_override("font_size", 14)
	bullet_name_label.add_theme_color_override("font_color", Color.WHITE)
	bullet_name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bullet_name_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	bullet_name_label.custom_minimum_size.x = 120
	vbox.add_child(bullet_name_label)

	lie_indicator = Label.new()
	lie_indicator.text = ""
	lie_indicator.add_theme_font_size_override("font_size", 11)
	lie_indicator.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	lie_indicator.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(lie_indicator)

	nav_label = Label.new()
	nav_label.text = "Q/E or Scroll"
	nav_label.add_theme_font_size_override("font_size", 9)
	nav_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
	nav_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(nav_label)

	var anchor_control = Control.new()
	anchor_control.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	anchor_control.anchor_left = 0.0
	anchor_control.anchor_top = 1.0
	anchor_control.offset_left = 10
	anchor_control.offset_top = -200
	anchor_control.offset_right = 160
	anchor_control.offset_bottom = -10
	add_child(anchor_control)
	anchor_control.add_child(panel)

	TruthBulletManager.bullet_selected.connect(_on_bullet_selected)
	TruthBulletManager.lie_mode_changed.connect(_on_lie_mode_changed)
	InputManager.bullet_next.connect(func(): TruthBulletManager.cycle_next())
	InputManager.bullet_prev.connect(func(): TruthBulletManager.cycle_prev())

	visible = false

func show_selector():
	visible = true

func hide_selector():
	visible = false

func _on_bullet_selected(bullet: Dictionary):
	bullet_name_label.text = TruthBulletManager.get_current_display_name()
	_load_bullet_image(bullet)

func _on_lie_mode_changed(enabled: bool):
	lie_indicator.text = "LIE BULLET" if enabled else ""
	bullet_name_label.text = TruthBulletManager.get_current_display_name()

func _load_bullet_image(bullet: Dictionary):
	var img_path = TruthBulletManager.get_bullet_image_path(bullet)
	if img_path.is_empty():
		bullet_image_rect.texture = null
		return

	var image = Image.load_from_file(img_path)
	if image:
		bullet_image_rect.texture = ImageTexture.create_from_image(image)
	else:
		bullet_image_rect.texture = null
