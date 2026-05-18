extends CanvasLayer
##
## On-screen touch HUD for actions that are otherwise keyboard/mouse-only:
## settings (replaces ESC), bullet prev/next (replaces Q/E and scroll wheel),
## focus toggle (replaces right-click and F), and slow-time hold (replaces
## the debate_slow_time keyboard action).
##
## Minigames request only the buttons they need via setup(). The script
## fires the same InputManager signals the keyboard/mouse handlers do, so
## downstream listeners (TruthBulletManager, Crosshair, NonstopDebate) don't
## need a mobile-specific code path.
##
## Spawned automatically by MinigameBase on mobile builds.

const _LAYER: int = 90

@export var slot_size: Vector2 = Vector2(72, 72)
@export var slot_margin: float = 16.0

var _settings_btn: Button
var _bullet_prev_btn: Button
var _bullet_next_btn: Button
var _focus_btn: Button
var _slow_btn: Button

var _slow_holding: bool = false

func _ready():
	layer = _LAYER

func setup(opts: Dictionary) -> void:
	var want_settings: bool = opts.get("settings", true)
	var want_bullet: bool = opts.get("bullet_cycle", false)
	var want_focus: bool = opts.get("focus", false)
	var want_slow: bool = opts.get("slow_time", false)

	var right_column := VBoxContainer.new()
	right_column.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	right_column.offset_top = slot_margin
	right_column.offset_left = -(slot_size.x + slot_margin)
	right_column.offset_right = -slot_margin
	right_column.add_theme_constant_override("separation", 8)
	add_child(right_column)

	if want_settings:
		_settings_btn = _make_icon_button("⚙", "Settings")
		_settings_btn.pressed.connect(func(): InputManager.settings_toggle_requested.emit())
		right_column.add_child(_settings_btn)

	var left_column := VBoxContainer.new()
	left_column.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	left_column.offset_bottom = -(slot_margin + 90)  # leave room for bullet selector
	left_column.offset_top = -(slot_margin + 90 + 240)
	left_column.offset_left = -(slot_size.x + slot_margin)
	left_column.offset_right = -slot_margin
	left_column.add_theme_constant_override("separation", 8)
	left_column.alignment = BoxContainer.ALIGNMENT_END
	add_child(left_column)

	if want_focus:
		_focus_btn = _make_icon_button("◎", "Focus")
		_focus_btn.toggle_mode = true
		_focus_btn.toggled.connect(_on_focus_toggled)
		left_column.add_child(_focus_btn)

	if want_slow:
		_slow_btn = _make_icon_button("◐", "Slow")
		# Use the button down/up signals so the held slow-time matches the
		# desktop "hold key" semantics. button_down/up fire on touch begin/end.
		_slow_btn.button_down.connect(func(): _set_slow_held(true))
		_slow_btn.button_up.connect(func(): _set_slow_held(false))
		left_column.add_child(_slow_btn)

	if want_bullet:
		var bullet_row := HBoxContainer.new()
		bullet_row.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
		bullet_row.offset_left = slot_margin
		bullet_row.offset_bottom = -slot_margin
		bullet_row.offset_top = -(slot_margin + slot_size.y)
		bullet_row.offset_right = slot_margin + slot_size.x * 2 + 8
		bullet_row.add_theme_constant_override("separation", 8)
		add_child(bullet_row)

		_bullet_prev_btn = _make_icon_button("◀", "Prev")
		_bullet_prev_btn.pressed.connect(func(): InputManager.bullet_prev.emit())
		bullet_row.add_child(_bullet_prev_btn)

		_bullet_next_btn = _make_icon_button("▶", "Next")
		_bullet_next_btn.pressed.connect(func(): InputManager.bullet_next.emit())
		bullet_row.add_child(_bullet_next_btn)

func _on_focus_toggled(pressed: bool) -> void:
	# Drive focus through InputManager so Crosshair receives the same
	# focus_started/focus_ended pair as a right-click or F-key press.
	InputManager.set_focus(pressed)

func _set_slow_held(held: bool) -> void:
	if held == _slow_holding:
		return
	_slow_holding = held
	# NonstopDebate polls Input.is_action_pressed("debate_slow_time") in
	# _process(). Drive that action manually so the touch HUD activates the
	# same code path as the keyboard.
	if held:
		Input.action_press("debate_slow_time")
	else:
		Input.action_release("debate_slow_time")

func _make_icon_button(text: String, tooltip: String) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.tooltip_text = tooltip
	btn.custom_minimum_size = slot_size
	btn.add_theme_font_size_override("font_size", 32)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.1, 0.18, 0.78)
	style.border_color = Color(0.4, 0.7, 1.0, 0.7)
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_width_left = 2
	style.border_width_right = 2
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	btn.add_theme_stylebox_override("normal", style)
	var pressed_style: StyleBoxFlat = style.duplicate()
	pressed_style.bg_color = Color(0.2, 0.35, 0.55, 0.92)
	btn.add_theme_stylebox_override("pressed", pressed_style)
	btn.add_theme_stylebox_override("hover", pressed_style)
	btn.focus_mode = Control.FOCUS_NONE
	return btn

func _exit_tree():
	# Make sure we never leave the slow-time action stuck pressed.
	if _slow_holding:
		Input.action_release("debate_slow_time")
