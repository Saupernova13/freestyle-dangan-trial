shader_type canvas_item;

// Scanline and CRT effect parameters
uniform float scanline_intensity : hint_range(0.0, 1.0, 0.01) = 0.3;
uniform float scanline_frequency : hint_range(1.0, 500.0, 1.0) = 200.0;
uniform float glitch_intensity : hint_range(0.0, 1.0, 0.01) = 0.2;
uniform float glitch_speed : hint_range(0.0, 5.0, 0.1) = 1.0;
uniform float glitch_frequency : hint_range(0.0, 10.0, 0.1) = 3.0;
uniform float glitch_height : hint_range(0.0, 0.2, 0.01) = 0.05;
uniform vec4 glitch_color = vec4(0.8, 0.8, 0.8, 0.3);
uniform bool enable_scanlines = true;
uniform bool enable_glitch = true;

// Pseudo-random function
float random(vec2 seed) {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

// Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    float ab = mix(a, b, f.x);
    float cd = mix(c, d, f.x);
    return mix(ab, cd, f.y);
}

// Glitch effect
float glitch_offset(vec2 uv, float time) {
    float glitch_amount = noise(vec2(uv.y * glitch_frequency, time * glitch_speed)) - 0.5;
    glitch_amount *= step(0.7, random(vec2(floor(uv.y * 50.0), time))) * 2.0;
    return glitch_amount * glitch_intensity;
}

// Scanlines effect
float scanlines(vec2 uv) {
    return sin(uv.y * scanline_frequency * 3.14159) * 0.5 + 0.5;
}

void fragment() {
    vec2 uv = UV;
    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

    // Apply scanlines only
    if (enable_scanlines) {
        float scan = scanlines(uv);
        color.rgb = mix(vec3(0.0), vec3(0.1), scan * scanline_intensity);
        color.a = scanline_intensity * 0.3;
    }

    // Apply glitch effect overlay
    if (enable_glitch) {
        float glitch = glitch_offset(uv, TIME);

        // Create glitch bands
        float glitch_band = smoothstep(0.0, glitch_height, abs(fract(uv.y * 20.0 + glitch * 10.0) - 0.5));
        glitch_band *= step(0.5, random(vec2(floor(uv.y * 20.0), TIME * glitch_speed)));

        // Mix glitch color with current color
        vec4 glitch_col = glitch_color * glitch_band;
        color = mix(color, glitch_col, glitch_col.a);
    }

    COLOR = color;
}
