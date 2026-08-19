shader_type canvas_item;

uniform float fade_speed : hint_range(0.5, 5.0) = 5.0;
uniform float min_opacity : hint_range(0.0, 1.0) = 0.3;
uniform float max_opacity : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	float fade = sin(TIME * fade_speed) * 0.5 + 0.5;
	float alpha = mix(min_opacity, max_opacity, fade);

	vec4 color = texture(TEXTURE, UV);
	color.a *= alpha;

	COLOR = color;
}
