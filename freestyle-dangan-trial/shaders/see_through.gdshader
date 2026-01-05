shader_type canvas_item;

void fragment() {
	// Make the panel completely transparent to reveal the 3D scene underneath
	COLOR = vec4(0.0, 0.0, 0.0, 0.0);
}
