extends Node

var _camera: Camera3D
var _bench_camera: Node
var _original_fov: float = 30.0
var _original_position: Vector3
var _is_executing: bool = false

signal motion_completed

func _ready():
	await get_tree().process_frame
	_camera = get_viewport().get_camera_3d()
	if _camera:
		_original_fov = _camera.fov
		_original_position = _camera.global_position
		if _camera.has_method("jump_to_bench"):
			_bench_camera = _camera

func execute_motion(motion_data: Dictionary, target_bench_index: int = -1):
	if not _camera:
		motion_completed.emit()
		return

	var motion_type = motion_data.get("type", "none")
	var duration = float(motion_data.get("duration", 1.0))
	var easing_str = motion_data.get("easing", "ease-in-out")

	var ease_type = _parse_ease(easing_str)
	var trans_type = _parse_trans(easing_str)

	_is_executing = true

	match motion_type:
		"none":
			_finish_motion()
		"cut":
			_execute_cut(target_bench_index)
		"pan":
			_execute_pan(target_bench_index, duration, ease_type, trans_type)
		"zoom_in":
			_execute_zoom(20.0, duration, ease_type, trans_type)
		"zoom_out":
			_execute_zoom(60.0, duration, ease_type, trans_type)
		"shake":
			_execute_shake(duration, 0.02)
		"dramatic_zoom":
			_execute_dramatic_zoom(target_bench_index, duration)
		"spin":
			_execute_spin(duration, ease_type, trans_type)
		"overhead":
			_execute_overhead(duration, ease_type, trans_type)
		"low_angle":
			_execute_low_angle(duration, ease_type, trans_type)
		"dolly_in":
			_execute_dolly(target_bench_index, -0.5, duration, ease_type, trans_type)
		"dolly_out":
			_execute_dolly(target_bench_index, 0.5, duration, ease_type, trans_type)
		"cross_dissolve":
			_execute_cross_dissolve(duration)
		"split_screen":
			_finish_motion()
		"tracking":
			_execute_tracking(target_bench_index, duration, ease_type, trans_type)
		"dutch_tilt":
			_execute_dutch_tilt(duration, ease_type, trans_type)
		"reset":
			_execute_reset(duration, ease_type, trans_type)
		_:
			_finish_motion()

func _execute_cut(bench_index: int):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, false)
	_finish_motion()

func _execute_pan(bench_index: int, duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, true)
	await get_tree().create_timer(duration).timeout
	_finish_motion()

func _execute_zoom(target_fov: float, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "fov", target_fov, duration)
	tween.finished.connect(_finish_motion)

func _execute_shake(duration: float, intensity: float):
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
	_finish_motion()

func _execute_dramatic_zoom(bench_index: int, duration: float):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, true)

	var tween = _camera.create_tween()
	tween.tween_property(_camera, "fov", 20.0, duration * 0.6).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.finished.connect(func():
		_execute_shake(duration * 0.4, 0.015)
	)

func _execute_spin(duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var start_rot = _camera.rotation.y
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "rotation:y", start_rot + TAU, duration)
	tween.finished.connect(func():
		_camera.rotation.y = start_rot
		_finish_motion()
	)

func _execute_overhead(duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var overhead_pos = Vector3(0, 2.0, 0)
	var overhead_rot = Vector3(-PI / 2, 0, 0)
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.set_parallel(true)
	tween.tween_property(_camera, "global_position", overhead_pos, duration)
	tween.tween_property(_camera, "rotation", overhead_rot, duration)
	tween.finished.connect(_finish_motion)

func _execute_low_angle(duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var low_pos = _camera.global_position + Vector3(0, -0.3, 0)
	var low_rot = _camera.rotation + Vector3(0.2, 0, 0)
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.set_parallel(true)
	tween.tween_property(_camera, "global_position", low_pos, duration)
	tween.tween_property(_camera, "rotation", low_rot, duration)
	tween.finished.connect(_finish_motion)

func _execute_dolly(_bench_index: int, distance: float, duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var forward = -_camera.global_transform.basis.z
	var target_pos = _camera.global_position + forward * distance
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "global_position", target_pos, duration)
	tween.finished.connect(_finish_motion)

func _execute_cross_dissolve(duration: float):
	var canvas = CanvasLayer.new()
	canvas.layer = 20
	add_child(canvas)
	var rect = ColorRect.new()
	rect.color = Color(0, 0, 0, 0)
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(rect)

	var tween = create_tween()
	tween.tween_property(rect, "color:a", 1.0, duration * 0.4)
	tween.tween_interval(duration * 0.2)
	tween.tween_property(rect, "color:a", 0.0, duration * 0.4)
	tween.finished.connect(func():
		canvas.queue_free()
		_finish_motion()
	)

func _execute_tracking(bench_index: int, duration: float, _ease_type: Tween.EaseType, _trans_type: Tween.TransitionType):
	if _bench_camera and bench_index >= 0:
		_bench_camera.jump_to_bench(bench_index, true)
	await get_tree().create_timer(duration).timeout
	_finish_motion()

func _execute_dutch_tilt(duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var tilt_angle = deg_to_rad(15.0)
	var original_z = _camera.rotation.z
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.tween_property(_camera, "rotation:z", tilt_angle, duration * 0.3)
	tween.tween_interval(duration * 0.4)
	tween.tween_property(_camera, "rotation:z", original_z, duration * 0.3)
	tween.finished.connect(_finish_motion)

func _execute_reset(duration: float, ease_type: Tween.EaseType, trans_type: Tween.TransitionType):
	var tween = _camera.create_tween()
	tween.set_ease(ease_type)
	tween.set_trans(trans_type)
	tween.set_parallel(true)
	tween.tween_property(_camera, "fov", _original_fov, duration)
	tween.tween_property(_camera, "rotation:z", 0.0, duration)
	tween.finished.connect(_finish_motion)

func _finish_motion():
	_is_executing = false
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

func is_executing() -> bool:
	return _is_executing
