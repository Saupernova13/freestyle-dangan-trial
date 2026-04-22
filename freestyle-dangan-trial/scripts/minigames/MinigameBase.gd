class_name MinigameBase
extends Node

signal minigame_completed(success: bool, result_data: Dictionary)

var minigame_data: Dictionary = {}
var difficulty: String = "medium"
var time_limit: float = 60.0
var time_remaining: float = 60.0
var is_active: bool = false

var _timer_node: Timer

func initialize(data: Dictionary):
	minigame_data = data
	difficulty = data.get("difficulty", "medium")
	time_limit = float(data.get("timeLimit", 60))
	time_remaining = time_limit

func start():
	is_active = true
	AudioManager.play_minigame_bgm(minigame_data.get("gameType", ""))
	if time_limit > 0:
		_start_timer()

func pause():
	is_active = false
	if _timer_node:
		_timer_node.paused = true

func resume():
	is_active = true
	if _timer_node:
		_timer_node.paused = false

func cleanup():
	is_active = false
	if _timer_node:
		_timer_node.stop()
		_timer_node.queue_free()
		_timer_node = null

func _start_timer():
	_timer_node = Timer.new()
	_timer_node.wait_time = 0.1
	_timer_node.timeout.connect(_on_timer_tick)
	add_child(_timer_node)
	_timer_node.start()

func _on_timer_tick():
	if not is_active:
		return
	time_remaining -= 0.1
	if time_remaining <= 0:
		time_remaining = 0
		_on_time_expired()

func _on_time_expired():
	_finish(false, {"reason": "time_expired"})

func _on_correct_answer(data: Dictionary = {}):
	_finish(true, data)

func _on_wrong_answer():
	AudioManager.play_sfx("wrong_buzzer")
	InfluenceGauge.take_damage(difficulty)

func _finish(success: bool, data: Dictionary = {}):
	is_active = false
	if _timer_node:
		_timer_node.stop()
	AudioManager.stop_minigame_bgm(0.6)
	if success:
		AudioManager.play_sfx("correct_chime")
	minigame_completed.emit(success, data)

func get_difficulty_multiplier() -> float:
	match difficulty:
		"easy":
			return 0.7
		"hard":
			return 1.5
		_:
			return 1.0
