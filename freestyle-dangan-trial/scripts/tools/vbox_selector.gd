extends VBoxContainer
## Paints the pulse highlight on whichever menu entry has focus. Focus itself
## is Godot's: ui_up/ui_down move it between the container's buttons and
## ui_accept presses the focused one, which is also how the menu gets gamepad
## and Tab navigation without a second binding.
##
## This used to run its own _input(). Arrow keys moved a glow that had nothing
## to do with focus, KEY_ENTER only wrote a Log.debug line - muted in release,
## so nothing at all - and set_input_as_handled() pre-empted the GUI stage
## where Godot would have moved focus. A player who never touched the mouse
## had no way into the game.

var buttons: Array[BaseButton] = []
var pulse_shader: Shader


func _ready() -> void:
	pulse_shader = load("res://shaders/button_pulse_fade.gdshader")
	for child in get_children():
		if not child is BaseButton:
			continue
		buttons.append(child)
		child.material = null
		# A container derives focus neighbours from sibling order, but only
		# across controls that can take focus at all.
		child.focus_mode = Control.FOCUS_ALL
		child.focus_entered.connect(_highlight.bind(child))
	# Something has to hold focus before ui_up/ui_down have anywhere to move.
	if not buttons.is_empty():
		buttons[0].grab_focus()


## Driven by focus_entered, so the mouse, Tab, the arrow keys and the gamepad
## all move the highlight through one path instead of four.
func _highlight(focused: BaseButton) -> void:
	for button in buttons:
		button.material = _pulse_material() if button == focused else null


func _pulse_material() -> ShaderMaterial:
	if pulse_shader == null:
		return null
	var material := ShaderMaterial.new()
	material.shader = pulse_shader
	return material

