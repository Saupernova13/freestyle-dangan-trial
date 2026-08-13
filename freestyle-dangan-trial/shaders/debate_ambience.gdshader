shader_type canvas_item;

// Nonstop-debate ambience: darkens the scene toward crimson with an edge
// vignette. Only `intensity` is animated, by the overlay's show/dismiss
// clips; the rest are editor-tunable material parameters.
uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float intensity : hint_range(0.0, 1.0) = 0.0;
uniform vec4 tint_color : source_color = vec4(0.55, 0.03, 0.06, 1.0);
uniform float tint_strength : hint_range(0.0, 1.0) = 0.45;
uniform float desaturation : hint_range(0.0, 1.0) = 0.5;
uniform float darken : hint_range(0.0, 1.0) = 0.3;
uniform float vignette_strength : hint_range(0.0, 1.0) = 0.6;
uniform float vignette_radius : hint_range(0.1, 1.5) = 0.75;
uniform float vignette_softness : hint_range(0.05, 1.0) = 0.45;

void fragment() {
	vec3 col = texture(screen_tex, SCREEN_UV).rgb;

	float g = dot(col, vec3(0.299, 0.587, 0.114));
	vec3 graded = mix(col, vec3(g), desaturation);
	graded = mix(graded, g * tint_color.rgb * 2.0, tint_strength);
	graded *= 1.0 - darken;

	// Edge vignette: full brightness inside the radius, darkened toward edges.
	float d = distance(SCREEN_UV, vec2(0.5));
	float vig = smoothstep(vignette_radius, vignette_radius - vignette_softness, d);
	graded *= mix(1.0 - vignette_strength, 1.0, vig);

	COLOR = vec4(mix(col, graded, intensity), 1.0);
}
