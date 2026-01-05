extends VBoxContainer

var buttons: Array = []
var current_index: int = 0
var pulse_shader: Shader

func _ready() -> void:
	buttons = get_children()
	buttons = buttons.filter(func(child): return child is BaseButton)

	pulse_shader = load("res://shaders/button_pulse_fade.gdshader")

	for button in buttons:
		button.material = null

	if buttons.size() > 0:
		current_index = 0
		update_shader()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_UP:
				current_index = (current_index - 1) % buttons.size()
				update_shader()
				get_tree().root.set_input_as_handled()
			KEY_DOWN:
				current_index = (current_index + 1) % buttons.size()
				update_shader()
				get_tree().root.set_input_as_handled()
			KEY_ENTER:
				print("Selected: ", current_index)
				get_tree().root.set_input_as_handled()

func update_shader() -> void:
	for i in range(buttons.size()):
		if i == current_index:
			apply_shader_to_button(i)
		else:
			remove_shader_from_button(i)

func apply_shader_to_button(index: int) -> void:
	var shader_material = ShaderMaterial.new()
	shader_material.shader = pulse_shader
	buttons[index].material = shader_material

func remove_shader_from_button(index: int) -> void:
	buttons[index].material = null


func _on_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/thh_trial_room_1.tscn")
