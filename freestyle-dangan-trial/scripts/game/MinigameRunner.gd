class_name MinigameRunner
extends Node
## Runs a trial's minigame line: title card, then a replay loop where a wrong
## answer or timeout retries the minigame (showing its failure card) and only a
## success advances the trial. Hides the conversation UI for the duration.
## Reports back to ScriptDirector, the trial's flow controller.

## Minigame gameType -> script path. Adding a minigame = one entry here plus the
## script (a MinigameBase subclass).
const MINIGAME_SCRIPTS := {
	"nonstop_debate": "res://scripts/minigames/NonstopDebate.gd",
	"hangmans_gambit": "res://scripts/minigames/HangmansGambit.gd",
	"logic_dive": "res://scripts/minigames/LogicDive.gd",
	"debate_scrum": "res://scripts/minigames/DebateScrum.gd",
	"mass_panic_debate": "res://scripts/minigames/MassPanicDebate.gd",
	"rebuttal_showdown": "res://scripts/minigames/RebuttalShowdown.gd",
	"psyche_taxi": "res://scripts/minigames/PsycheTaxi.gd",
	"closing_argument": "res://scripts/minigames/ClosingArgument.gd",
}

var _conversation_ui: CanvasItem
var _roaming_text: CanvasItem
var _dialogue_label: Node
var _conversation_ui_was_visible: bool = true
var _roaming_text_was_visible: bool = true

func setup(conversation_ui: Node, roaming_text: Node, dialogue_label: Node) -> void:
	_conversation_ui = conversation_ui as CanvasItem
	_roaming_text = roaming_text as CanvasItem
	_dialogue_label = dialogue_label

func run(minigame: MinigameData) -> void:
	if not MINIGAME_SCRIPTS.has(minigame.game_type):
		Log.warn("MinigameRunner", "Unknown minigame type: %s" % minigame.game_type)
		await get_tree().create_timer(1.0).timeout
		ScriptDirector.on_minigame_finished(true)
		return

	if _dialogue_label:
		_dialogue_label.text = ""
	_hide_conversation_ui()

	# Title card plays once; each attempt then gets its own result card.
	var title_card = ResourceRegistry.instantiate("minigame_title_card")
	add_child(title_card)
	title_card.show_title(minigame.game_type, minigame.name)
	await title_card.card_finished

	_start_attempt(minigame)

func _start_attempt(minigame_data: MinigameData) -> void:
	var minigame: MinigameBase = _instantiate(minigame_data.game_type)
	add_child(minigame)
	minigame.initialize(minigame_data)
	minigame.minigame_completed.connect(func(success, data):
		minigame.cleanup()
		minigame.queue_free()

		# An emptied influence gauge is a hard fail — the game-over screen
		# takes over, so skip the result card and the replay.
		if not success and data.get("reason", "") == "influence_depleted":
			return

		var result_card = ResourceRegistry.instantiate("minigame_result_card")
		add_child(result_card)
		result_card.show_result(success, data.get("failComment", ""))
		await result_card.card_finished

		if success:
			_restore_conversation_ui()
			ScriptDirector.on_minigame_finished(true)
		else:
			_start_attempt(minigame_data)
	)
	ScriptDirector.on_minigame_started(minigame)
	minigame.start()

func _instantiate(game_type: String) -> MinigameBase:
	if not MINIGAME_SCRIPTS.has(game_type):
		return null
	var script: GDScript = load(MINIGAME_SCRIPTS[game_type])
	return script.new() as MinigameBase

func _hide_conversation_ui() -> void:
	# The roaming background text is part of the dialogue presentation — hide it
	# alongside the conversation UI so minigames get a clean screen.
	if _conversation_ui:
		_conversation_ui_was_visible = _conversation_ui.visible
		_conversation_ui.visible = false
	if _roaming_text:
		_roaming_text_was_visible = _roaming_text.visible
		_roaming_text.visible = false

func _restore_conversation_ui() -> void:
	if _conversation_ui:
		_conversation_ui.visible = _conversation_ui_was_visible
	if _roaming_text:
		_roaming_text.visible = _roaming_text_was_visible
