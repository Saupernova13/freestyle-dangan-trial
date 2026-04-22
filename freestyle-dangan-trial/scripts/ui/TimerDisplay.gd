extends CanvasLayer

signal time_expired

var time_label: Label
var bg_panel: PanelContainer

var _time_remaining: float = 0.0
var _is_running: bool = false
var _pulse_tween: Tween

func _ready():
	layer = 10

	var anchor = Control.new()
	anchor.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	anchor.anchor_left = 1.0
	anchor.offset_left = -130
	anchor.offset_top = 15
	anchor.offset_right = -15
	anchor.offset_bottom = 55
	add_child(anchor)

	bg_panel = PanelContainer.new()
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.05, 0.1, 0.85)
	style.border_width_bottom = 2
	style.border_width_top = 2
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_color = Color(0.8, 0.8, 0.2, 0.6)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 4
	style.content_margin_bottom = 4
	bg_panel.add_theme_stylebox_override("panel", style)
	anchor.add_child(bg_panel)

	time_label = Label.new()
	time_label.text = "00:00"
	time_label.add_theme_font_size_override("font_size", 22)
	time_label.add_theme_color_override("font_color", Color.WHITE)
	time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bg_panel.add_child(time_label)

	visible = false

func _process(delta):
	if not _is_running:
		return

	_time_remaining -= delta
	if _time_remaining <= 0:
		_time_remaining = 0
		_is_running = false
		_update_display()
		time_expired.emit()
		return

	_update_display()

	var pct = _time_remaining / _initial_time if _initial_time > 0 else 0.0
	if pct < 0.25:
		time_label.add_theme_color_override("font_color", Color(1.0, 0.2, 0.2))
		if not _pulse_tween or not _pulse_tween.is_running():
			_start_pulse()
	elif pct < 0.5:
		time_label.add_theme_color_override("font_color", Color(1.0, 0.8, 0.2))

var _initial_time: float = 0.0

func start_timer(seconds: float):
	_initial_time = seconds
	_time_remaining = seconds
	_is_running = true
	visible = true
	time_label.add_theme_color_override("font_color", Color.WHITE)
	_update_display()

func stop_timer():
	_is_running = false
	if _pulse_tween:
		_pulse_tween.kill()

func hide_timer():
	stop_timer()
	visible = false

func get_remaining() -> float:
	return _time_remaining

func _update_display():
	@warning_ignore("integer_division")
	var mins = int(_time_remaining) / 60
	var secs = int(_time_remaining) % 60
	time_label.text = "%02d:%02d" % [mins, secs]

func _start_pulse():
	if _pulse_tween:
		_pulse_tween.kill()
	_pulse_tween = create_tween()
	_pulse_tween.set_loops()
	_pulse_tween.tween_property(time_label, "modulate:a", 0.4, 0.3)
	_pulse_tween.tween_property(time_label, "modulate:a", 1.0, 0.3)
