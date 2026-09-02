class_name MinigameBase
extends Node
## Base class for all minigames: lifecycle, shared HUD setup, managed signal
## connections, and the standard influence/timer/concentrate result paths.

signal minigame_completed(success: bool, result_data: Dictionary)

## LOADING was declared but no code could ever produce it, which is a false
## promise to anyone reading the lifecycle. MinigameRunner builds an instance
## and calls start() in the same frame; there is no loading step to represent.
enum State { IDLE, ACTIVE, PAUSED, COMPLETE }

# Standard HUD components requestable via setup_standard_ui().
enum HudComponent {
	INFLUENCE_GAUGE,
	CONCENTRATE_GAUGE,
	TIMER_DISPLAY,
	CROSSHAIR,
	TRUTH_BULLET_SELECTOR,
}

## A new component needs one entry here plus its scene in ResourceRegistry.
const _HUD_SPECS := {
	HudComponent.INFLUENCE_GAUGE: {"scene": "influence_gauge", "show": "show_gauge", "hide": "hide_gauge"},
	HudComponent.CONCENTRATE_GAUGE: {"scene": "concentrate_gauge", "show": "show_gauge", "hide": "hide_gauge"},
	HudComponent.TIMER_DISPLAY: {"scene": "timer_display", "show": "", "hide": "hide_timer"},
	HudComponent.CROSSHAIR: {"scene": "crosshair", "show": "show_crosshair", "hide": "hide_crosshair"},
	HudComponent.TRUTH_BULLET_SELECTOR:
	{"scene": "truth_bullet_selector", "show": "show_selector", "hide": "hide_selector"},
}

var minigame_data: MinigameData = null
var difficulty: String = "medium"
var time_limit: float = 60.0
var state: State = State.IDLE

# Keyed by HudComponent; populated by setup_standard_ui().
var hud: Dictionary = {}

# Backs the deadline only for minigames that show no TimerDisplay; see
# get_time_remaining().
var _timer_node: Timer
var _time_remaining: float = 60.0
var _has_finished: bool = false
# (signal, callable) pairs from connect_managed(), disconnected in cleanup().
var _managed_signal_connections: Array = []
var _mobile_hud: Node = null

# Kept because existing minigames read `is_active` in _process().
var is_active: bool:
	get: return state == State.ACTIVE

func initialize(data: MinigameData):
	minigame_data = data
	difficulty = data.difficulty
	time_limit = data.time_limit
	_time_remaining = time_limit

## Authoring errors that make this minigame unplayable, empty when it is fine.
## Called by MinigameRunner on an initialised instance before the title card:
## a minigame with no data spawns nothing and can never be completed, so it
## would otherwise run the clock down and replay to the attempt cap while the
## player watches an empty screen. Override where empty data is possible.
func validate_data() -> Array[String]:
	return []

func start():
	_transition_to(State.ACTIVE)
	# 0 means no time limit; MinigameData refuses a negative one, so this
	# gate is a choice the author made rather than a value that slipped in.
	if time_limit > 0:
		_start_timer()

## Freezes the whole subtree, not just this node: the overlay, its panels and
## the HUD are all children, so `is_active` alone would stop the spawn loop
## while panels carried on scrolling behind the settings menu.
func pause():
	_transition_to(State.PAUSED)
	_set_clock_paused(true)
	process_mode = Node.PROCESS_MODE_DISABLED

func resume():
	process_mode = Node.PROCESS_MODE_INHERIT
	_transition_to(State.ACTIVE)
	_set_clock_paused(false)

## Whichever clock owns the deadline has to be the one that pauses.
func _set_clock_paused(paused: bool) -> void:
	if _timer_node:
		_timer_node.paused = paused
	var display: Node = hud.get(HudComponent.TIMER_DISPLAY)
	if is_instance_valid(display):
		display.set_paused(paused)

func cleanup():
	_transition_to(State.COMPLETE)
	_disconnect_managed_signals()
	_teardown_standard_ui()
	_stop_internal_timer()

# ---------------------------------------------------------------------------
# Standard HUD setup
# ---------------------------------------------------------------------------
## Instantiates the requested components into `hud`; cleanup() tears them down.
##   var ui = setup_standard_ui([HudComponent.INFLUENCE_GAUGE, HudComponent.TIMER_DISPLAY])
func setup_standard_ui(components: Array) -> Dictionary:
	for component in components:
		var spec: Dictionary = _HUD_SPECS.get(component, {})
		if spec.is_empty():
			continue
		var node = _add_hud(component, spec["scene"], spec["show"])
		# The timer is the one component that drives state, not just shows it.
		if component == HudComponent.TIMER_DISPLAY and node:
			connect_managed(node.time_expired, _on_time_expired)
			if time_limit > 0:
				node.start_timer(time_limit)
				# One deadline only. The internal Timer counted down from the
				# same time_limit but nothing could adjust it, so add_time()'s
				# bonuses and penalties were cosmetic - the round ended on the
				# original schedule whatever the HUD showed. Safe here because
				# every minigame calls super.start() before setup_standard_ui().
				_stop_internal_timer()
	_maybe_spawn_mobile_hud(components)
	return hud

## The touch HUD mirrors the keyboard/mouse actions the components would need.
func _maybe_spawn_mobile_hud(components: Array) -> void:
	if not OS.has_feature("mobile"):
		return
	_mobile_hud = ResourceRegistry.instantiate("mobile_hud")
	if _mobile_hud == null:
		return
	add_child(_mobile_hud)
	_mobile_hud.setup({
		"settings": true,
		"bullet_cycle": HudComponent.TRUTH_BULLET_SELECTOR in components,
		"focus": HudComponent.CROSSHAIR in components,
		"slow_time": wants_mobile_slow_time(),
	})

## Override in subclasses that poll the "debate_slow_time" action.
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
		var hide_method: String = _HUD_SPECS.get(component, {}).get("hide", "")
		if not hide_method.is_empty() and node.has_method(hide_method):
			node.call(hide_method)
	hud.clear()
	if _mobile_hud and is_instance_valid(_mobile_hud):
		_mobile_hud.queue_free()
	_mobile_hud = null

# ---------------------------------------------------------------------------
# Managed signal connections — auto-disconnected by cleanup(), so a forgotten
# disconnect can't leak callbacks across plays.
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
	_time_remaining -= 0.1
	if _time_remaining <= 0:
		_time_remaining = 0
		_on_time_expired()

## The one deadline. TimerDisplay owns it whenever the minigame asked for one:
## it is the clock the player sees and the only one add_time() can move. The
## internal Timer covers the minigames that show no timer at all.
func get_time_remaining() -> float:
	var display: Node = hud.get(HudComponent.TIMER_DISPLAY)
	if is_instance_valid(display):
		return display.get_remaining()
	return _time_remaining

func _stop_internal_timer() -> void:
	if _timer_node:
		_timer_node.stop()
		_timer_node.queue_free()
		_timer_node = null

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
	# Without a fallback the result card would come up blank.
	if not success and str(data.get("failComment", "")).is_empty():
		if minigame_data and not minigame_data.fail_comment.is_empty():
			data["failComment"] = minigame_data.fail_comment
	_transition_to(State.COMPLETE)
	if _timer_node:
		_timer_node.stop()
	minigame_completed.emit(success, data)

func _transition_to(new_state: State) -> void:
	if state == new_state:
		return
	state = new_state

func get_difficulty_multiplier() -> float:
	return MinigameConfig.get_difficulty_multiplier(difficulty)

# ---------------------------------------------------------------------------
# Camera focus, NOT a spotlight. The spotlight is a separate, unimplemented
# lighting effect; `characterSpotlight` is reserved for it and must never gate
# camera focus, which always follows the speaker.
# ---------------------------------------------------------------------------
func focus_camera_on_character(char_id: String) -> void:
	var trial_room = get_tree().get_first_node_in_group("trial_room")
	if trial_room == null or not trial_room.has_method("find_character_position"):
		return
	var pos = trial_room.find_character_position(char_id)
	if pos < 0:
		return
	var cam = get_viewport().get_camera_3d()
	if cam and cam.has_method("jump_to_bench"):
		cam.jump_to_bench(pos, true)
