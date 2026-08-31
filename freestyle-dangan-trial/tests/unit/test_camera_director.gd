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
