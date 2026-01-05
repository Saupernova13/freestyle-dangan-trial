/*
Shader from Godot Shaders - the free shader library.

Feel free to use, improve and change this shader according to your needs
and consider sharing the modified result on godotshaders.com.
*/

shader_type canvas_item;

uniform float wave_amplitude = 130.0;
uniform float wave_frequency = 275.0;
uniform float movement_speed = 2;
uniform float movement_amplitude = 5.0;

void vertex() {
	VERTEX.y -= sin(VERTEX.x / wave_frequency) * wave_amplitude;
	VERTEX.y += sin(TIME * movement_speed) * movement_amplitude;
}
