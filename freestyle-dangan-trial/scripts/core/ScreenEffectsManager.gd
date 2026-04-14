extends Node

var _canvas: CanvasLayer
var _flash_rect: ColorRect
var _fade_rect: ColorRect
var _overlay_label: Label
var _camera: Camera3D

func _ready():
	_canvas = CanvasLayer.new()
	_canvas.layer = 20
	add_child(_canvas)

	_flash_rect = ColorRect.new()
	_flash_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_flash_rect.color = Color(1, 1, 1, 0)
	_flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_canvas.add_child(_flash_rect)

	_fade_rect = ColorRect.new()
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade_rect.color = Color(0, 0, 0, 0)
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_canvas.add_child(_fade_rect)

	_overlay_label = Label.new()
	_overlay_label.set_anchors_preset(Control.PRESET_CENTER)
	_overlay_label.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_overlay_label.grow_vertical = Control.GROW_DIRECTION_BOTH
	_overlay_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_overlay_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_overlay_label.add_theme_font_size_override("font_size", 48)
	_overlay_label.visible = false
	_overlay_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_canvas.add_child(_overlay_label)

	await get_tree().process_frame
	_camera = get_viewport().get_camera_3d()

func play_effects(effects_data: Dictionary):
	var effects_array = effects_data.get("effects", [])
	for effect in effects_array:
		var effect_type = ""
		var intensity = 0.5
		if effect is String:
			effect_type = effect
		elif effect is Dictionary:
			effect_type = effect.get("type", "")
			intensity = float(effect.get("intensity", 0.5))

		_play_single_effect(effect_type, intensity)

func _play_single_effect(effect_type: String, intensity: float):
	match effect_type:
		"screen_shake", "shake":
			screen_shake(0.5, intensity * 0.04)
		"white_flash", "flash":
			white_flash(0.3)
		"screen_fade_black", "fade_black":
			fade_to_black(0.5)
		"screen_fade_white", "fade_white":
			fade_to_white(0.5)
		"objection_overlay", "objection":
			show_overlay_text("No, that's wrong!", Color(1.0, 0.3, 0.1), 1.5)
		"blood_splatter":
			red_flash(0.4)
		"evidence_popup":
			show_overlay_text("Evidence!", Color(0.3, 0.7, 1.0), 1.0)
		"glitch_effect", "glitch":
			glitch_flash(0.3)
		"vignette":
			vignette_pulse(1.0)
		"chromatic_aberration":
			chromatic_flash(0.4)
		"impact_frame":
			impact_frame(0.3)

func screen_shake(duration: float, intensity: float = 0.02):
	if not _camera:
		return
	intensity *= Settings.screen_shake_intensity if Settings else 1.0
	if intensity <= 0.0:
		return
	var original_pos = _camera.global_position
	var elapsed = 0.0
	while elapsed < duration:
		var offset = Vector3(
			randf_range(-intensity, intensity),
			randf_range(-intensity, intensity),
			0.0
		)
		_camera.global_position = original_pos + offset
		await get_tree().process_frame
		elapsed += get_process_delta_time()
	_camera.global_position = original_pos

func white_flash(duration: float):
	_flash_rect.color = Color(1, 1, 1, 0.9)
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, duration)

func red_flash(duration: float):
	_flash_rect.color = Color(0.8, 0.0, 0.0, 0.6)
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, duration)

func fade_to_black(duration: float):
	_fade_rect.color = Color(0, 0, 0, 0)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", 1.0, duration)

func fade_from_black(duration: float):
	_fade_rect.color = Color(0, 0, 0, 1)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", 0.0, duration)

func fade_to_white(duration: float):
	_fade_rect.color = Color(1, 1, 1, 0)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", 1.0, duration)

func fade_from_white(duration: float):
	_fade_rect.color = Color(1, 1, 1, 1)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", 0.0, duration)

func show_overlay_text(text: String, color: Color, duration: float):
	_overlay_label.text = text
	_overlay_label.add_theme_color_override("font_color", color)
	_overlay_label.visible = true
	_overlay_label.modulate.a = 0.0
	_overlay_label.scale = Vector2(0.5, 0.5)

	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(_overlay_label, "modulate:a", 1.0, 0.15)
	tween.tween_property(_overlay_label, "scale", Vector2(1.0, 1.0), 0.2).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.chain().tween_interval(duration - 0.4)
	tween.chain().tween_property(_overlay_label, "modulate:a", 0.0, 0.25)
	tween.finished.connect(func(): _overlay_label.visible = false)

func glitch_flash(duration: float):
	_flash_rect.color = Color(0.2, 0.8, 0.2, 0.3)
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, duration * 0.3)
	tween.tween_property(_flash_rect, "color", Color(0.8, 0.2, 0.2, 0.2), 0.05)
	tween.tween_property(_flash_rect, "color:a", 0.0, duration * 0.3)

func chromatic_flash(duration: float):
	_flash_rect.color = Color(1.0, 0.0, 0.0, 0.15)
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color", Color(0.0, 0.0, 1.0, 0.15), duration * 0.3)
	tween.tween_property(_flash_rect, "color", Color(0.0, 1.0, 0.0, 0.1), duration * 0.3)
	tween.tween_property(_flash_rect, "color:a", 0.0, duration * 0.4)

func vignette_pulse(duration: float):
	_fade_rect.color = Color(0, 0, 0, 0)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", 0.4, duration * 0.3)
	tween.tween_property(_fade_rect, "color:a", 0.0, duration * 0.7)

func impact_frame(duration: float):
	_flash_rect.color = Color(1, 1, 1, 1)
	Engine.time_scale = 0.1
	await get_tree().create_timer(duration * 0.1).timeout
	Engine.time_scale = 1.0
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, 0.2)
