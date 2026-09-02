extends Node

var _camera: Camera3D
var _bench_camera: Node
var _original_fov: float = 30.0
var _original_position: Vector3

## The web editor's camera tab -> handlers, filled by _register_motions().
var _motions: Dictionary = {}

## No production listener - motions are fire-and-forget - but it is the only
## way to observe that one finished, and test_camera_director depends on it.
signal motion_completed

func _ready():
	_register_motions()

## Autoload _ready() runs while the main scene is current, and that is the start
## menu, which has no Camera3D - so latching one at startup left every motion a
## no-op for the whole session. The reference would dangle again after each
## change_scene_to_file, so resolve per call instead.
##
## The rest pose is re-captured whenever a different camera comes into view:
## _execute_reset returns to the fov the trial camera was authored with, not to
## whatever a preceding zoom left behind.
func _resolve_camera() -> bool:
	var cam: Camera3D = get_viewport().get_camera_3d()
	if cam == null:
		_camera = null
		_bench_camera = null
		return false
	if cam != _camera:
		_camera = cam
		_original_fov = cam.fov
		_original_position = cam.global_position
		_bench_camera = cam if cam.has_method("jump_to_bench") else null
	return true

## Editor motion names -> handlers taking
## (bench_index, duration, ease_type, trans_type), with variants pre-bound.
## A new motion only needs an entry here.
func _register_motions() -> void:
	_motions = {
		"none": _finish_immediately,
		"split_screen": _finish_immediately,
		"cut": _execute_cut,
		"pan": _execute_pan,
		"zoom_in": _execute_zoom.bind(20.0),
		"zoom_out": _execute_zoom.bind(60.0),
		"shake": _execute_shake,
		"dramatic_zoom": _execute_dramatic_zoom,
		"spin": _execute_spin,
		"overhead": _execute_overhead,
		"low_angle": _execute_low_angle,
		"dolly_in": _execute_dolly.bind(-0.5),
		"dolly_out": _execute_dolly.bind(0.5),
		# Pans and tilts rotate in place; trucks and pedestals translate
		# locally. Both persist for the line: the next speaking line resets it.
		"pan_left": _execute_rotate.bind(Vector3(0, deg_to_rad(15.0), 0)),
		"pan_right": _execute_rotate.bind(Vector3(0, deg_to_rad(-15.0), 0)),
		"pan_up": _execute_rotate.bind(Vector3(deg_to_rad(10.0), 0, 0)),
		"pan_down": _execute_rotate.bind(Vector3(deg_to_rad(-10.0), 0, 0)),
		"tilt_up": _execute_rotate.bind(Vector3(deg_to_rad(18.0), 0, 0)),
		"tilt_down": _execute_rotate.bind(Vector3(deg_to_rad(-18.0), 0, 0)),
		"rotate_cw": _execute_rotate.bind(Vector3(0, 0, deg_to_rad(-12.0))),
		"rotate_ccw": _execute_rotate.bind(Vector3(0, 0, deg_to_rad(12.0))),
		"truck_left": _execute_translate.bind(Vector3(-0.4, 0, 0)),
		"truck_right": _execute_translate.bind(Vector3(0.4, 0, 0)),
		"pedestal_up": _execute_translate.bind(Vector3(0, 0.3, 0)),
		"pedestal_down": _execute_translate.bind(Vector3(0, -0.3, 0)),
		"cross_dissolve": _execute_cross_dissolve,
		"tracking": _execute_tracking,
		"dutch_tilt": _execute_dutch_tilt,
		"reset": _execute_reset,
	}

func execute_motion(motion_data: Dictionary, target_bench_index: int = -1):
	if not _resolve_camera():
		Log.warn("CameraDirector", "No current Camera3D; skipping camera motion.")
		motion_completed.emit()
		return

	var motion_type = motion_data.get("type", "none")
	var duration = float(motion_data.get("duration", 1.0))
	var easing_str = motion_data.get("easing", "ease-in-out")

	var handler: Callable = _motions.get(motion_type, _finish_immediately)
	handler.call(target_bench_index, duration, _parse_ease(easing_str), _parse_trans(easing_str))

func _finish_immediately(
	_bench_index: int, _duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType
):
	_finish_motion()

func _execute_cut(bench_index: int, _duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, false)
	_finish_motion()

func _execute_pan(bench_index: int, duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, true)
	await get_tree().create_timer(duration).timeout
	_finish_motion()

func _execute_zoom(
	_bench_index: int,
	duration: float,
	ease_type: Tween.EaseType,
	trans_type: Tween.TransitionType,
	target_fov: float
):
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "fov", target_fov, duration)
	tween.finished.connect(_finish_motion)

func _execute_shake(
	_bench_index: int,
	duration: float,
	_ease_type: Tween.EaseType,
	_trans_type: Tween.TransitionType,
	intensity: float = 0.02
):
	await ScreenEffects.screen_shake(duration, intensity)
	_finish_motion()

func _execute_dramatic_zoom(
	bench_index: int, duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType
):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, true)

	var tween = _camera.create_tween()
	tween.tween_property(_camera, "fov", 20.0, duration * 0.6).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.finished.connect(func():
		_execute_shake(bench_index, duration * 0.4, Tween.EASE_IN_OUT, Tween.TRANS_CUBIC, 0.015)
	)

func _execute_spin(_bench_index: int, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var start_rot = _camera.rotation.y
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "rotation:y", start_rot + TAU, duration)
	tween.finished.connect(func():
		_camera.rotation.y = start_rot
		_finish_motion()
	)

func _execute_overhead(_bench_index: int, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var overhead_pos = Vector3(0, 2.0, 0)
	var overhead_rot = Vector3(-PI / 2, 0, 0)
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.set_parallel(true)
	tween.tween_property(_camera, "global_position", overhead_pos, duration)
	tween.tween_property(_camera, "rotation", overhead_rot, duration)
	tween.finished.connect(_finish_motion)

func _execute_low_angle(
	_bench_index: int, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType
):
	var low_pos = _camera.global_position + Vector3(0, -0.3, 0)
	var low_rot = _camera.rotation + Vector3(0.2, 0, 0)
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.set_parallel(true)
	tween.tween_property(_camera, "global_position", low_pos, duration)
	tween.tween_property(_camera, "rotation", low_rot, duration)
	tween.finished.connect(_finish_motion)

func _execute_dolly(
	_bench_index: int,
	duration: float,
	ease_type: Tween.EaseType,
	trans_type: Tween.TransitionType,
	distance: float
):
	var forward = -_camera.global_transform.basis.z
	var target_pos = _camera.global_position + forward * distance
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "global_position", target_pos, duration)
	tween.finished.connect(_finish_motion)

## Relative delta, in radians per axis.
func _execute_rotate(
	_bench_index: int,
	duration: float,
	ease_type: Tween.EaseType,
	trans_type: Tween.TransitionType,
	delta_rot: Vector3
):
	var target_rot = _camera.rotation + delta_rot
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "rotation", target_rot, duration)
	tween.finished.connect(_finish_motion)

## Local-space offset: x is right, y is up.
func _execute_translate(
	_bench_index: int,
	duration: float,
	ease_type: Tween.EaseType,
	trans_type: Tween.TransitionType,
	local_offset: Vector3
):
	var basis = _camera.global_transform.basis
	var world_offset = basis.x * local_offset.x + basis.y * local_offset.y + basis.z * local_offset.z
	var target_pos = _camera.global_position + world_offset
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "global_position", target_pos, duration)
	tween.finished.connect(_finish_motion)

func _execute_cross_dissolve(
	_bench_index: int, duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType
):
	await ScreenEffects.cross_dissolve(duration)
	_finish_motion()

func _execute_tracking(
	bench_index: int, duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType
):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, true)
	await get_tree().create_timer(duration).timeout
	_finish_motion()

func _execute_dutch_tilt(
	_bench_index: int, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType
):
	var tilt_angle = deg_to_rad(15.0)
	var original_z = _camera.rotation.z
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "rotation:z", tilt_angle, duration * 0.3)
	tween.tween_interval(duration * 0.4)
	tween.tween_property(_camera, "rotation:z", original_z, duration * 0.3)
	tween.finished.connect(_finish_motion)

func _execute_reset(_bench_index: int, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.set_parallel(true)
	tween.tween_property(_camera, "fov", _original_fov, duration)
	tween.tween_property(_camera, "rotation:z", 0.0, duration)
	tween.finished.connect(_finish_motion)

func _finish_motion():
	motion_completed.emit()

func _parse_ease(easing_str: String) -> Tween.EaseType:
	match easing_str:
		"ease-in":
			return Tween.EASE_IN
		"ease-out":
			return Tween.EASE_OUT
		"ease-in-out":
			return Tween.EASE_IN_OUT
		"linear":
			return Tween.EASE_IN_OUT
		_:
			return Tween.EASE_IN_OUT

func _parse_trans(easing_str: String) -> Tween.TransitionType:
	if easing_str == "linear":
		return Tween.TRANS_LINEAR
	return Tween.TRANS_CUBIC

