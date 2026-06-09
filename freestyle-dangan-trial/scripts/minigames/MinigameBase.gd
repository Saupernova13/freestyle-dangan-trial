class_name MinigameBase
extends Node
##
## Base class for all minigames. Handles common lifecycle (initialize/start/
## pause/resume/cleanup), shared HUD setup, managed signal connections, and
## the standard influence/timer/concentrate result paths.

signal minigame_completed(success: bool, result_data: Dictionary)
signal state_changed(new_state: State)

enum State { IDLE, LOADING, ACTIVE, PAUSED, COMPLETE }

# Standard HUD components requestable via setup_standard_ui().
enum HudComponent {
	INFLUENCE_GAUGE,
	CONCENTRATE_GAUGE,
	TIMER_DISPLAY,
	CROSSHAIR,
	TRUTH_BULLET_SELECTOR,
}

var minigame_data: Dictionary = {}
var difficulty: String = "medium"
var time_limit: float = 60.0
var time_remaining: float = 60.0
var state: State = State.IDLE

# HUD components keyed by HudComponent enum, populated by setup_standard_ui().
var hud: Dictionary = {}

var _timer_node: Timer
var _has_finished: bool = false
# (signal, callable) pairs registered via connect_managed(), auto-disconnected
# in cleanup() so a forgotten teardown can't leak connections.
var _managed_signal_connections: Array = []
# Active mobile touch HUD, when one was spawned for this minigame.
var _mobile_hud: Node = null

# Backwards-compat read-only mirror of `state == ACTIVE`. Existing minigames
# read `is_active` in _process(); keep the property name working.
var is_active: bool:
	get: return state == State.ACTIVE

func initialize(data: Dictionary):
	minigame_data = data
	difficulty = data.get("difficulty", "medium")
	time_limit = float(data.get("timeLimit", 60))
	time_remaining = time_limit

func start():
	_transition_to(State.ACTIVE)
	if time_limit > 0:
		_start_timer()

func pause():
	_transition_to(State.PAUSED)
	if _timer_node:
		_timer_node.paused = true

func resume():
	_transition_to(State.ACTIVE)
	if _timer_node:
		_timer_node.paused = false

func cleanup():
	_transition_to(State.COMPLETE)
	_disconnect_managed_signals()
	_teardown_standard_ui()
	if _timer_node:
		_timer_node.stop()
		_timer_node.queue_free()
		_timer_node = null

# ---------------------------------------------------------------------------
# Standard HUD setup
# ---------------------------------------------------------------------------
## Instantiate and parent the requested HUD components. Stored in `hud` keyed
## by the HudComponent enum value, and torn down automatically by cleanup().
##   var ui = setup_standard_ui([HudComponent.INFLUENCE_GAUGE, HudComponent.TIMER_DISPLAY])
func setup_standard_ui(components: Array) -> Dictionary:
	for component in components:
		match component:
			HudComponent.INFLUENCE_GAUGE:
				_add_hud(component, "influence_gauge", "show_gauge")
			HudComponent.CONCENTRATE_GAUGE:
				_add_hud(component, "concentrate_gauge", "show_gauge")
			HudComponent.TIMER_DISPLAY:
				var timer = _add_hud(component, "timer_display", "")
				if timer:
					connect_managed(timer.time_expired, _on_time_expired)
					if time_limit > 0:
						timer.start_timer(time_limit)
			HudComponent.CROSSHAIR:
				_add_hud(component, "crosshair", "show_crosshair")
			HudComponent.TRUTH_BULLET_SELECTOR:
				_add_hud(component, "truth_bullet_selector", "show_selector")
	_maybe_spawn_mobile_hud(components)
	return hud

## On mobile, spawn the touch HUD with buttons mirroring whatever keyboard /
## mouse actions the requested components would otherwise need.
##   - bullet_cycle: shown whenever the truth-bullet selector is active
##   - focus: shown whenever the crosshair is active
##   - slow_time: opted in by subclasses via wants_mobile_slow_time()
func _maybe_spawn_mobile_hud(components: Array) -> void:
	if not OS.has_feature("mobile"):
		return
	var script: GDScript = load("res://scripts/ui/MobileHud.gd")
	if script == null:
		return
	_mobile_hud = script.new()
	add_child(_mobile_hud)
	_mobile_hud.setup({
		"settings": true,
		"bullet_cycle": HudComponent.TRUTH_BULLET_SELECTOR in components,
		"focus": HudComponent.CROSSHAIR in components,
		"slow_time": wants_mobile_slow_time(),
	})

## Override in subclasses that poll Input.is_action_pressed("debate_slow_time")
## — currently just NonstopDebate.
func wants_mobile_slow_time() -> bool:
	return false

func get_hud(component: int) -> Node:
	return hud.get(component)

func _add_hud(component: int, registry_key: String, show_method: String) -> Node:
	var node = ResourceRegistry.instantiate(registry_key)
	if node == null:
		return null
	add_child(node)
	if not show_method.is_empty() and node.has_method(show_method):
		node.call(show_method)
	hud[component] = node
	return node

func _teardown_standard_ui():
	for component in hud.keys():
		var node = hud[component]
		if not is_instance_valid(node):
			continue
		match component:
			HudComponent.INFLUENCE_GAUGE, HudComponent.CONCENTRATE_GAUGE:
				if node.has_method("hide_gauge"):
					node.call("hide_gauge")
			HudComponent.TIMER_DISPLAY:
				if node.has_method("hide_timer"):
					node.call("hide_timer")
			HudComponent.CROSSHAIR:
				if node.has_method("hide_crosshair"):
					node.call("hide_crosshair")
			HudComponent.TRUTH_BULLET_SELECTOR:
				if node.has_method("hide_selector"):
					node.call("hide_selector")
	hud.clear()
	if _mobile_hud and is_instance_valid(_mobile_hud):
		_mobile_hud.queue_free()
	_mobile_hud = null

# ---------------------------------------------------------------------------
# Managed signal connections — auto-disconnected by cleanup().
# Why: hand-rolled is_connected()/disconnect() chains were repeated in every
# minigame and easy to forget, risking leaked callbacks across plays.
# ---------------------------------------------------------------------------
func connect_managed(sig: Signal, callable: Callable, flags: int = 0) -> void:
	if not sig.is_connected(callable):
		sig.connect(callable, flags)
	_managed_signal_connections.append({"signal": sig, "callable": callable})

func _disconnect_managed_signals() -> void:
	for entry in _managed_signal_connections:
		var sig: Signal = entry["signal"]
		var callable: Callable = entry["callable"]
		if sig.is_connected(callable):
			sig.disconnect(callable)
	_managed_signal_connections.clear()

# ---------------------------------------------------------------------------
# Timer and finishing
# ---------------------------------------------------------------------------
func _start_timer():
	_timer_node = Timer.new()
	_timer_node.wait_time = 0.1
	_timer_node.timeout.connect(_on_timer_tick)
	add_child(_timer_node)
	_timer_node.start()

func _on_timer_tick():
	if state != State.ACTIVE:
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
	InfluenceGauge.take_damage(difficulty)

func _finish(success: bool, data: Dictionary = {}):
	if _has_finished:
		return
	_has_finished = true
	# Fall back to the minigame-level fail comment when the subclass didn't
	# supply a per-line one — so every minigame's result card can show text.
	if not success and str(data.get("failComment", "")).is_empty():
		var fallback = minigame_data.get("failComment", "")
		if fallback is String and not fallback.is_empty():
			data["failComment"] = fallback
	_transition_to(State.COMPLETE)
	if _timer_node:
		_timer_node.stop()
	minigame_completed.emit(success, data)

func _transition_to(new_state: State) -> void:
	if state == new_state:
		return
	state = new_state
	state_changed.emit(new_state)

func get_difficulty_multiplier() -> float:
	return MinigameConfig.get_difficulty_multiplier(difficulty)

# ---------------------------------------------------------------------------
# Shared helper: focus the trial-room camera on a speaker bench.
# Used by NonstopDebate, MassPanicDebate, etc.
# ---------------------------------------------------------------------------
func trigger_spotlight(char_id: String) -> void:
	var trial_room = get_tree().get_first_node_in_group("trial_room")
	if trial_room == null or not trial_room.has_method("find_character_position"):
		return
	var pos = trial_room.find_character_position(char_id)
	if pos < 0:
		return
	var cam = get_viewport().get_camera_3d()
	if cam and cam.has_method("jump_to_bench"):
		cam.jump_to_bench(pos, true)
