class_name MobileToast
extends RefCounted
##
## Simple top-of-screen toast for status / error messages. Works on both
## desktop and mobile — we need a visible feedback channel on Android where
## the user can't see push_error()/print() output.

const _LAYER: int = 200
const _DEFAULT_DURATION: float = 3.0

## Spawn a toast inside `host`. Returns the spawned CanvasLayer (already
## scheduled to self-free) so the caller can dismiss it early if desired.
##   MobileToast.show(self, "Trial file failed to load", true)
static func show(host: Node, message: String, is_error: bool = false, duration: float = _DEFAULT_DURATION) -> CanvasLayer:
	if host == null or not is_instance_valid(host):
		push_warning("MobileToast.show: invalid host, message was: " + message)
		return null

	var canvas := CanvasLayer.new()
	canvas.layer = _LAYER
	host.add_child(canvas)

	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	panel.offset_top = 24
	panel.offset_left = 24
	panel.offset_right = -24
	panel.modulate.a = 0.0

	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.7, 0.1, 0.1, 0.92) if is_error else Color(0.05, 0.1, 0.2, 0.92)
	bg.border_color = Color(1.0, 0.3, 0.3) if is_error else Color(0.4, 0.7, 1.0)
	bg.border_width_top = 2
	bg.border_width_bottom = 2
	bg.border_width_left = 2
	bg.border_width_right = 2
	bg.content_margin_top = 12
	bg.content_margin_bottom = 12
	bg.content_margin_left = 16
	bg.content_margin_right = 16
	bg.corner_radius_top_left = 6
	bg.corner_radius_top_right = 6
	bg.corner_radius_bottom_left = 6
	bg.corner_radius_bottom_right = 6
	panel.add_theme_stylebox_override("panel", bg)
	canvas.add_child(panel)

	var label := Label.new()
	label.text = message
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_color_override("font_color", Color.WHITE)
	panel.add_child(label)

	var tween := panel.create_tween()
	tween.tween_property(panel, "modulate:a", 1.0, 0.2)
	tween.tween_interval(duration)
	tween.tween_property(panel, "modulate:a", 0.0, 0.3)
	tween.finished.connect(func(): if is_instance_valid(canvas): canvas.queue_free())

	return canvas
