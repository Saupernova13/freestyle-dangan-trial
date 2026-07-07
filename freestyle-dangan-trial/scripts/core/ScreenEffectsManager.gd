extends Node
## Full-screen per-line effects (flash/fade/overlay text/shader filters). The
## overlay rects and the filter material are scene-owned — see
## scenes/ui/screen_effects_overlay.tscn. The effect tweens stay in code: their
## duration and colors come from script data, so they can't be authored as fixed
## AnimationPlayer clips.

var _flash_rect: ColorRect
var _fade_rect: ColorRect
var _overlay_label: Label
var _camera: Camera3D

# Full-screen filter overlay (grayscale/sepia/invert/scanlines/distortion/blur)
# driven by shaders/screen_filter.gdshader. One rect, mode-switched.
var _filter_rect: ColorRect
var _filter_material: ShaderMaterial
var _filter_tween: Tween = null

const FILTER_MODES := {
	"grayscale": 0,
	"sepia": 1,
	"invert": 2,
	"scanlines": 3,
	"distortion": 4,
	"blur": 5,
}

var _effects: Dictionary = {}

func _ready():
	# The scene renders FilterRect below Flash/Fade/Label, so filters stay under
	# the flash and fade layers.
	var overlay := ResourceRegistry.instantiate("screen_effects_overlay")
	add_child(overlay)
	_flash_rect = overlay.get_node("%FlashRect")
	_fade_rect = overlay.get_node("%FadeRect")
	_overlay_label = overlay.get_node("%OverlayLabel")
	_filter_rect = overlay.get_node("%FilterRect")
	_filter_material = _filter_rect.material
	_filter_material.set_shader_parameter("intensity", 0.0)

	_register_effects()

	await get_tree().process_frame
	_camera = get_viewport().get_camera_3d()

## Effect vocabulary: maps editor effect names (and aliases) to handlers taking
## (intensity: float, duration: float, color: Color). duration <= 0.0 means
## "use this effect's default"; color comes from the editor's flash color
## picker and defaults to white. Adding an effect = registering it here —
## play_effects() needs no changes.
func _register_effects() -> void:
	_register(["screen_shake", "shake"],
		func(i: float, d: float, _c: Color): screen_shake(d if d > 0.0 else 0.5, i * 0.04))
	_register(["white_flash", "flash"],
		func(_i: float, d: float, c: Color): color_flash(c, d if d > 0.0 else 0.3))
	# A per-line fade must resolve on its own — fade out, hold, fade back in.
	_register(["screen_fade_black", "fade_black"],
		func(_i: float, d: float, _c: Color): fade_pulse(Color.BLACK, d if d > 0.0 else 1.0))
	_register(["screen_fade_white", "fade_white"],
		func(_i: float, d: float, _c: Color): fade_pulse(Color.WHITE, d if d > 0.0 else 1.0))
	_register(["pulse"],
		func(i: float, d: float, _c: Color): fov_pulse(i, d if d > 0.0 else 0.5))
	_register(["objection_overlay", "objection"],
		func(_i: float, _d: float, _c: Color): show_overlay_text("No, that's wrong!", Color(1.0, 0.3, 0.1), 1.5))
	_register(["blood_splatter"],
		func(_i: float, d: float, _c: Color): red_flash(d if d > 0.0 else 0.4))
	_register(["evidence_popup"],
		func(_i: float, _d: float, _c: Color): show_overlay_text("Evidence!", Color(0.3, 0.7, 1.0), 1.0))
	_register(["glitch_effect", "glitch"],
		func(_i: float, d: float, _c: Color): glitch_flash(d if d > 0.0 else 0.3))
	_register(["vignette"],
		func(i: float, d: float, _c: Color): vignette_pulse(d if d > 0.0 else 1.0, i))
	_register(["chromatic_aberration"],
		func(_i: float, d: float, _c: Color): chromatic_flash(d if d > 0.0 else 0.4))
	_register(["impact_frame"],
		func(_i: float, d: float, _c: Color): impact_frame(d if d > 0.0 else 0.3))
	for filter_name in FILTER_MODES:
		_register([filter_name], _run_filter.bind(filter_name))

func _register(names: Array, handler: Callable) -> void:
	for effect_name in names:
		_effects[effect_name] = handler

func _run_filter(intensity: float, duration: float, _color: Color, filter_name: String) -> void:
	play_filter(filter_name, intensity, duration if duration > 0.0 else 1.5)

func play_effects(effects_data: Dictionary):
	var effects_array = effects_data.get("effects", [])
	for effect in effects_array:
		var effect_type = ""
		var intensity = 0.5
		var duration = -1.0
		var color := Color.WHITE
		if effect is String:
			effect_type = effect
		elif effect is Dictionary:
			effect_type = effect.get("type", "")
			intensity = float(effect.get("intensity", 0.5))
			duration = float(effect.get("duration", -1.0))
			var raw_color = effect.get("color", "")
			if raw_color is String and not raw_color.is_empty():
				color = Color.from_string(raw_color, Color.WHITE)

		var handler: Callable = _effects.get(effect_type, Callable())
		if handler.is_valid():
			handler.call(intensity, duration, color)

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
	color_flash(Color.WHITE, duration)

## Flash the screen with an arbitrary color (editor "flash" effect color picker).
func color_flash(color: Color, duration: float):
	_flash_rect.color = Color(color.r, color.g, color.b, 0.9)
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, duration)

## Fade to a solid color, hold, then fade back. `duration` is the full cycle:
## 40% out, 20% hold, 40% in — so the screen always recovers.
func fade_pulse(color: Color, duration: float):
	_fade_rect.color = Color(color.r, color.g, color.b, 0.0)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", 1.0, duration * 0.4)
	tween.tween_interval(duration * 0.2)
	tween.tween_property(_fade_rect, "color:a", 0.0, duration * 0.4)

## Quick camera FOV punch-in/out ("pulse" editor effect). Intensity 0..1 maps
## to up to ~12 degrees of zoom punch.
func fov_pulse(intensity: float, duration: float):
	if not _camera:
		return
	var original_fov = _camera.fov
	var punch = clampf(intensity, 0.0, 1.0) * 12.0
	var tween = create_tween()
	tween.tween_property(_camera, "fov", original_fov - punch, duration * 0.35) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.tween_property(_camera, "fov", original_fov, duration * 0.65) \
		.set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_CUBIC)

func red_flash(duration: float):
	_flash_rect.color = Color(0.8, 0.0, 0.0, 0.6)
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, duration)

func show_overlay_text(text: String, color: Color, duration: float):
	_overlay_label.text = text
	_overlay_label.add_theme_color_override("font_color", color)
	_overlay_label.visible = true
	_overlay_label.modulate.a = 0.0
	_overlay_label.scale = Vector2(0.5, 0.5)

	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(_overlay_label, "modulate:a", 1.0, 0.15)
	var pop := tween.tween_property(_overlay_label, "scale", Vector2(1.0, 1.0), 0.2)
	pop.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
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

func vignette_pulse(duration: float, intensity: float = 0.5):
	_fade_rect.color = Color(0, 0, 0, 0)
	var peak = clampf(0.15 + intensity * 0.5, 0.0, 0.8)
	var tween = create_tween()
	tween.tween_property(_fade_rect, "color:a", peak, duration * 0.3)
	tween.tween_property(_fade_rect, "color:a", 0.0, duration * 0.7)

## Run a shader filter (grayscale/sepia/invert/scanlines/distortion/blur) as a
## pulse: ease in 20%, hold 60%, ease out 20% of `duration`. Filters with
## sensible binary looks (invert/scanlines) still respect intensity as strength.
func play_filter(filter_name: String, intensity: float, duration: float):
	if not _filter_material or not FILTER_MODES.has(filter_name):
		return
	var strength = clampf(intensity, 0.0, 1.0)
	# Binary-look filters read badly when faint — give them a floor.
	if filter_name in ["invert", "scanlines", "sepia", "grayscale"]:
		strength = maxf(strength, 0.6)

	if _filter_tween and _filter_tween.is_valid():
		_filter_tween.kill()

	_filter_material.set_shader_parameter("mode", FILTER_MODES[filter_name])
	_filter_material.set_shader_parameter("intensity", 0.0)
	_filter_rect.visible = true

	_filter_tween = create_tween()
	_filter_tween.tween_method(_set_filter_intensity, 0.0, strength, duration * 0.2)
	_filter_tween.tween_interval(duration * 0.6)
	_filter_tween.tween_method(_set_filter_intensity, strength, 0.0, duration * 0.2)
	_filter_tween.tween_callback(func(): _filter_rect.visible = false)

func _set_filter_intensity(value: float) -> void:
	_filter_material.set_shader_parameter("intensity", value)

func impact_frame(duration: float):
	_flash_rect.color = Color(1, 1, 1, 1)
	Engine.time_scale = 0.1
	await get_tree().create_timer(duration * 0.1).timeout
	Engine.time_scale = 1.0
	var tween = create_tween()
	tween.tween_property(_flash_rect, "color:a", 0.0, 0.2)
