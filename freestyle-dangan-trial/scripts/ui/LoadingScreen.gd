extends CanvasLayer

## Loading screen shown while a trial archive is extracted and its character
## assets are cached on a background thread (see TrialLoader.load_trial_async).
##
## Scene-driven — see scenes/ui/loading_screen.tscn. Edit the layout, colors
## and fonts there; edit the entrance/exit animations in
## animations/Loading_Screen_Anim_Lib.tres ("show" autoplays, "dismiss" is
## triggered before leaving). This script only binds live load progress to the
## UI and triggers the dismiss animation.

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
	MobileToast.show(get_tree().root, error, true, 5.0)
	if _anim and _anim.has_animation("dismiss"):
		_anim.play("dismiss")
	await get_tree().create_timer(1.5).timeout
	get_tree().change_scene_to_file("res://scenes/start_menu.tscn")
