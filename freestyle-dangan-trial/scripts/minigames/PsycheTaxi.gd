extends MinigameBase

var _overlay: CanvasLayer

func initialize(data: Dictionary):
	super.initialize(data)

func start():
	super.start()
	_overlay = preload("res://scenes/minigames/stub_minigame_overlay.tscn").instantiate()
	add_child(_overlay)
	_overlay.set_title("PSYCHE TAXI", Color(0.2, 0.8, 0.6))
	await get_tree().create_timer(3.0).timeout
	_on_correct_answer({"stub": true})

func cleanup():
	super.cleanup()
	if _overlay:
		_overlay.queue_free()
