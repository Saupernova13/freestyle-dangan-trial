extends CanvasLayer

## Full-screen "ALL RIGHT! / WRONG!" flash shown after each minigame attempt,
## with an optional failure message below. Scene-driven:
## scenes/ui/minigame_result_card.tscn — edit the layout, fonts and the
## show / show_message AnimationPlayer animations in the editor.
##
## Code only binds data: the result word, its color, and the optional message.
## A wrong-answer card with a message holds longer ("show_message") so the
## player can read it before the replay.

signal card_finished

@export var success_color: Color = Color(0.2, 1.0, 0.4)
@export var fail_color: Color = Color(1.0, 0.2, 0.2)
@export var success_text: String = "ALL RIGHT!"
@export var fail_text: String = "WRONG!"

@onready var _stack: VBoxContainer = %Stack
@onready var _result_label: Label = %ResultLabel
@onready var _message_label: Label = %MessageLabel
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_result(success: bool, message: String = "") -> void:
	_result_label.text = success_text if success else fail_text
	_result_label.add_theme_color_override("font_color", success_color if success else fail_color)

	_message_label.text = message
	_message_label.visible = not message.is_empty()

	# Center the scale-pop pivot on the laid-out content.
	await get_tree().process_frame
	_stack.pivot_offset = _stack.size * 0.5

	_anim.play("show_message" if _message_label.visible else "show")
	await _anim.animation_finished
	card_finished.emit()
	queue_free()
