extends Label
## Debug FPS readout. Wired to a Label in the trial room scene.

func _process(_delta: float) -> void:
	text = "FPS: %d" % Engine.get_frames_per_second()
