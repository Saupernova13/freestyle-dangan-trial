extends GdUnitTestSuite
## CameraDirector must resolve the current Camera3D per call. The autoload's
## _ready() runs while the main scene is current, and that is the start menu,
## which has no Camera3D - so a camera that only appears later, as the trial
## room's does, still has to be found.

const MOTION_DURATION := 0.05


## Connects before executing: the no-camera path emits motion_completed
## synchronously, so a listener attached afterwards would never see it.
func _run_motion(motion: Dictionary) -> int:
	var completions: Array[int] = [0]
	var on_done := func() -> void: completions[0] += 1
	CameraDirector.motion_completed.connect(on_done)
	CameraDirector.execute_motion(motion)
	# Bounded rather than open-ended, so a regression fails instead of hanging.
	for _i in range(120):
		if completions[0] > 0:
			break
		await get_tree().process_frame
	CameraDirector.motion_completed.disconnect(on_done)
	return completions[0]


func test_motion_drives_a_camera_that_appeared_after_startup() -> void:
	var camera: Camera3D = auto_free(Camera3D.new())
	camera.fov = 55.0
	add_child(camera)
	camera.make_current()
	await get_tree().process_frame

	assert_int(await _run_motion({"type": "zoom_in", "duration": MOTION_DURATION})).is_equal(1)
	# zoom_in tweens fov to 20; the latched-null bug left it untouched at 55.
	assert_float(camera.fov).is_equal_approx(20.0, 0.5)


func test_motion_completes_when_no_camera_is_current() -> void:
	# The signal is what unblocks ScriptDirector, so it must fire even here or
	# the trial stalls on any line authored with a camera motion.
	assert_object(get_viewport().get_camera_3d()).is_null()
	assert_int(await _run_motion({"type": "zoom_in", "duration": MOTION_DURATION})).is_equal(1)


func _camera(fov: float = 55.0) -> Camera3D:
	var camera: Camera3D = auto_free(Camera3D.new())
	camera.fov = fov
	add_child(camera)
	camera.make_current()
	return camera


func test_a_new_motion_supersedes_the_one_still_running() -> void:
	# Nothing waited or cancelled, so advancing the script mid-pan left two
	# tweens writing fov and the camera followed whichever wrote last that
	# frame. The second motion's target is the one that must win.
	var camera := _camera()
	await get_tree().process_frame

	CameraDirector.execute_motion({"type": "zoom_in", "duration": 5.0})
	await get_tree().process_frame
	CameraDirector.execute_motion({"type": "zoom_out", "duration": MOTION_DURATION})

	for _i in range(120):
		await get_tree().process_frame
		if is_equal_approx(camera.fov, 60.0):
			break
	# zoom_out targets 60; the abandoned zoom_in was heading for 20.
	assert_float(camera.fov).is_equal_approx(60.0, 0.5)

	# And it stays there. Reaching 60 proves only that the later tween wrote
	# last on some frame - with both alive, the 5s zoom_in keeps writing and
	# drags the camera back down after the short one has finished.
	for _i in range(30):
		await get_tree().process_frame
	assert_float(camera.fov).override_failure_message(
		"fov drifted to %s after the superseding motion finished" % camera.fov
	).is_equal_approx(60.0, 0.5)


func test_a_superseded_motion_does_not_report_completion() -> void:
	# motion_completed is what unblocks a waiting caller. The first tween's
	# `finished` used to fire while the second was still running, so the
	# signal announced a motion that had not happened.
	# The node itself is not read; it has to exist and be current.
	_camera()
	await get_tree().process_frame

	var completions: Array[int] = [0]
	var on_done := func() -> void: completions[0] += 1
	CameraDirector.motion_completed.connect(on_done)

	CameraDirector.execute_motion({"type": "pan", "duration": 0.2})
	await get_tree().process_frame
	CameraDirector.execute_motion({"type": "cut", "duration": MOTION_DURATION})

	# Long enough for the abandoned pan's timer to have expired.
	for _i in range(60):
		await get_tree().process_frame
	CameraDirector.motion_completed.disconnect(on_done)

	assert_int(completions[0]).override_failure_message(
		"motion_completed fired %d times for two motions, one of them superseded"
		% completions[0]
	).is_equal(1)


func test_back_to_back_motions_each_report_once() -> void:
	# The guard must not swallow completions for motions that ran to the end.
	# The node itself is not read; it has to exist and be current.
	_camera()
	await get_tree().process_frame

	assert_int(await _run_motion({"type": "zoom_in", "duration": MOTION_DURATION})).is_equal(1)
	assert_int(await _run_motion({"type": "zoom_out", "duration": MOTION_DURATION})).is_equal(1)
