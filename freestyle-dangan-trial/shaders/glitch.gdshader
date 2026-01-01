shader_type canvas_item;

uniform float speed : hint_range(0.0, 2.0, 0.01) = 1.0;
uniform float intensity : hint_range(0.0, 1.0, 0.01) = 0.2;

void fragment() {
    vec2 uv = UV;
    vec3 pixel = texture(TEXTURE, uv).rgb;
    vec2 line = vec2(sin(TIME * speed) * 0.5 + 0.5, uv.y);
    vec3 glitch = texture(TEXTURE, line).rgb * intensity;

    COLOR = vec4(pixel + glitch, 1.0);
}
