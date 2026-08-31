class_name FloatingLetter
extends Control
## A drifting letter in Hangman's Gambit. Circle styles, font and the three
## destroy animations are scene-owned. Only the drift is procedural: velocity
## and spawn point come from the difficulty settings.

signal clicked(letter_node: FloatingLetter)

var letter: String = ""
var is_answer_letter: bool = false
var velocity: Vector2 = Vector2.ZERO
var _active: bool = true

@onready var _anim: AnimationPlayer = %AnimationPlayer

func _ready():
	var label: Label = %Letter
	label.text = letter
	(%AnswerCircle as Control).visible = is_answer_letter
	(%NormalCircle as Control).visible = not is_answer_letter

func _process(delta):
	if not _active:
		return
	position += velocity * delta
	var vp = get_viewport_rect().size
	if position.x < -80 or position.x > vp.x + 80 or position.y < -80 or position.y > vp.y + 80:
		queue_free()

func _gui_input(event):
	if not _active:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		clicked.emit(self)
	elif event is InputEventScreenTouch and event.pressed:
		clicked.emit(self)

func destroy_correct():
	await _play_destroy("destroy_correct")

func destroy_wrong():
	await _play_destroy("destroy_wrong")

func destroy_collision():
	await _play_destroy("destroy_collision")

func _play_destroy(anim_name: String):
	if not _active:
		return
	_active = false
	_anim.play(anim_name)
	await _anim.animation_finished
	queue_free()
