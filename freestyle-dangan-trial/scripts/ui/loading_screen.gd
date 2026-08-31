extends CanvasLayer
## Shown while TrialLoader.load_trial_async works on a worker thread.
##
## Layout is scene-owned; animations live in
## animations/loading_screen_anim_lib.tres ("show" autoplays, "dismiss" fires
## before leaving). This script binds progress and triggers the dismiss.

@onready var _progress_bar: ProgressBar = %ProgressBar
@onready var _status_label: Label = %StatusLabel
@onready var _anim: AnimationPlayer = %AnimationPlayer

func _ready() -> void:
	TrialLoader.loading_progress.connect(_on_loading_progress)
	TrialLoader.loading_complete.connect(_on_loading_complete)
	TrialLoader.loading_failed.connect(_on_loading_failed)

	var path: String = TrialLoader.get_meta("pending_trial_path", "")
	TrialLoader.remove_meta("pending_trial_path")

	if path.is_empty():
		_on_loading_failed("No trial file selected.")
		return

	TrialLoader.load_trial_async(path)

func _on_loading_progress(fraction: float, status_text: String) -> void:
	_progress_bar.value = fraction * 100.0
	_status_label.text = status_text

func _on_loading_complete() -> void:
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
		await _anim.animation_finished
	get_tree().change_scene_to_file("res://scenes/thh_trial_room_1.tscn")

func _on_loading_failed(error: String) -> void:
	MobileToast.show_message(get_tree().root, error, true, 5.0)
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
	await get_tree().create_timer(1.5).timeout
	get_tree().change_scene_to_file("res://scenes/start_menu.tscn")
