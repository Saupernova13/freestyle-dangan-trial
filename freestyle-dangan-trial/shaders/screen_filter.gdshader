shader_type canvas_item;

// Full-screen filter for per-line special effects (ScreenEffectsManager).
// One shader, mode-switched, so a single overlay rect covers all filters.
// mode: 0 = grayscale, 1 = sepia, 2 = invert, 3 = scanlines,
//       4 = distortion/ripple, 5 = blur
uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform int mode = 0;
uniform float intensity : hint_range(0.0, 1.0) = 0.0;
// Normalized in/hold/out ramp keyed by the FilterAnimator, so the pulse shape
// is editable in the animation editor while `intensity` stays the peak
// strength supplied per line by the trial data.
uniform float envelope : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec2 uv = SCREEN_UV;
	float amount = intensity * envelope;

	if (mode == 4) {
		// Ripple: animated sine displacement scaled by intensity.
		float amp = 0.012 * amount;
		uv.x += sin(uv.y * 28.0 + TIME * 5.0) * amp;
		uv.y += cos(uv.x * 22.0 + TIME * 4.0) * amp;
	}

	vec3 col;
	if (mode == 5) {
		// Blur: lean on the screen texture mip chain.
		col = textureLod(screen_tex, uv, amount * 4.0).rgb;
	} else {
		col = texture(screen_tex, uv).rgb;
	}

	if (mode == 0) {
		float g = dot(col, vec3(0.299, 0.587, 0.114));
		col = mix(col, vec3(g), amount);
	} else if (mode == 1) {
		float g = dot(col, vec3(0.299, 0.587, 0.114));
		vec3 sepia = vec3(g) * vec3(1.2, 1.0, 0.78);
		col = mix(col, sepia, amount);
	} else if (mode == 2) {
		col = mix(col, vec3(1.0) - col, amount);
	} else if (mode == 3) {
		// Scanlines: darken alternating rows with a slow vertical roll.
		float line = sin((uv.y + TIME * 0.02) * 480.0);
		float dark = smoothstep(0.0, 1.0, line * 0.5 + 0.5) * 0.35 * amount;
		col *= 1.0 - dark;
	}

	COLOR = vec4(col, 1.0);
}
