class_name MobileToast
extends CanvasLayer
## Top-of-screen toast for status and error messages: on Android nobody sees
## push_error() or print(). Layout and fades are scene-owned; the script fills
## in text, tints for error or info, and runs the sequence.

@export var info_bg: Color = Color(0.05, 0.1, 0.2, 0.92)
@export var info_border: Color = Color(0.4, 0.7, 1.0)
@export var error_bg: Color = Color(0.7, 0.1, 0.1, 0.92)
@export var error_border: Color = Color(1.0, 0.3, 0.3)

const _DEFAULT_DURATION: float = 3.0

@onready var _panel: PanelContainer = %Panel
@onready var _label: Label = %Label
@onready var _anim: AnimationPlayer = %AnimationPlayer

## Returns the instance, which self-frees after `duration`, so the caller can
## dismiss it early. Not named show(): that would shadow CanvasLayer.show().
##   MobileToast.show_message(self, "Trial file failed to load", true)
static func show_message(
	host: Node, message: String, is_error: bool = false, duration: float = _DEFAULT_DURATION
) -> CanvasLayer:
	if host == null or not is_instance_valid(host):
		push_warning("MobileToast.show_message: invalid host, message was: " + message)
		return null
	var toast: MobileToast = ResourceRegistry.instantiate("mobile_toast")
	if toast == null:
		return null
	host.add_child(toast)
	toast._display(message, is_error, duration)
	return toast

func _display(message: String, is_error: bool, duration: float) -> void:
	_label.text = message
	var style: StyleBoxFlat = _panel.get_theme_stylebox("panel").duplicate()
	style.bg_color = error_bg if is_error else info_bg
	style.border_color = error_border if is_error else info_border
	_panel.add_theme_stylebox_override("panel", style)

	_anim.play("fade_in")
	await _anim.animation_finished
	await get_tree().create_timer(duration).timeout
	_anim.play("fade_out")
	await _anim.animation_finished
	queue_free()
