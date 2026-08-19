shader_type canvas_item;

// Glass shatter for the BREAK! sequence: the frozen screenshot split into
// jittered-grid voronoi shards. An AnimationPlayer drives two uniforms:
//   crack_progress   0..1  crack lines grow outward from impact_center
//   shatter_progress 0..1  shards fly out, rotate and fall
// Everything else is an editor-tunable look parameter.
uniform float crack_progress : hint_range(0.0, 1.0) = 0.0;
uniform float shatter_progress : hint_range(0.0, 1.0) = 0.0;
uniform int cell_count : hint_range(3, 20) = 8;
uniform float pattern_seed : hint_range(0.0, 100.0) = 7.0;
uniform float crack_width : hint_range(0.0, 0.15) = 0.015;
uniform vec4 crack_color : source_color = vec4(0.95, 0.97, 1.0, 0.85);
uniform float crack_feather : hint_range(0.1, 4.0) = 1.5;
uniform vec2 impact_center = vec2(0.5, 0.5);
uniform float fly_distance : hint_range(0.0, 6.0) = 1.8;
uniform float rotation_amount : hint_range(0.0, 3.14) = 1.1;
uniform float gravity_pull : hint_range(0.0, 3.0) = 0.5;
uniform float stagger : hint_range(0.0, 0.9) = 0.4;
// Keep low enough that a shard fades out before its offset leaves the 5x5
// candidate window (~2 cells at the default fly_distance), or it pops.
uniform float fade_start : hint_range(0.0, 1.0) = 0.45;

vec2 hash2(vec2 c) {
	vec2 h = vec2(
		dot(c, vec2(127.1, 311.7)),
		dot(c, vec2(269.5, 183.3))
	);
	return fract(sin(h + pattern_seed) * 43758.5453);
}

// Feature (seed) point of a grid cell, jittered inside the cell.
vec2 feature_point(vec2 cell) {
	return cell + hash2(cell);
}

mat2 rot2(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(vec2(c, s), vec2(-s, c));
}

// Normalized flight time of a cell: cells near the impact launch first.
float cell_time(vec2 f, vec2 impact_p, float max_r) {
	float delay = stagger * clamp(distance(f, impact_p) / max_r, 0.0, 1.0);
	return clamp((shatter_progress - delay) / max(1.0 - delay, 0.0001), 0.0, 1.0);
}

vec2 cell_offset(vec2 f, vec2 impact_p, float t) {
	vec2 dir = normalize(f - impact_p + vec2(0.0001));
	return dir * fly_distance * t * t + vec2(0.0, gravity_pull * t * t * t);
}

void fragment() {
	vec2 tex_size = 1.0 / TEXTURE_PIXEL_SIZE;
	float aspect = tex_size.x / tex_size.y;
	float n = float(cell_count);

	// Aspect-corrected grid space so shards are roughly square.
	vec2 grid_max = vec2(aspect, 1.0) * n;
	vec2 p = vec2(UV.x * aspect, UV.y) * n;
	vec2 impact_p = vec2(impact_center.x * aspect, impact_center.y) * n;

	// Farthest grid corner from the impact: normalizes stagger and cracks.
	float max_r = 0.0;
	max_r = max(max_r, distance(impact_p, vec2(0.0)));
	max_r = max(max_r, distance(impact_p, vec2(grid_max.x, 0.0)));
	max_r = max(max_r, distance(impact_p, vec2(0.0, grid_max.y)));
	max_r = max(max_r, distance(impact_p, grid_max));

	bool flying = shatter_progress > 0.0001;
	// 3x3 suffices at rest; in flight a shard 2 cells away can reach this pixel.
	int search = flying ? 2 : 1;

	vec4 out_col = vec4(0.0);
	vec2 base_cell = floor(p);

	for (int cx = -2; cx <= 2; cx++) {
		if (abs(cx) > search || out_col.a > 0.0) {
			continue;
		}
		for (int cy = -2; cy <= 2; cy++) {
			if (abs(cy) > search || out_col.a > 0.0) {
				continue;
			}
			vec2 cell = base_cell + vec2(float(cx), float(cy));
			vec2 f = feature_point(cell);
			vec2 rnd = hash2(cell + vec2(17.0));

			float t = flying ? cell_time(f, impact_p, max_r) : 0.0;
			float shard_alpha = 1.0 - smoothstep(fade_start, 1.0, t);
			if (shard_alpha <= 0.0) {
				continue;
			}

			// Back-map this pixel into the shard's rest position.
			vec2 q = p;
			if (t > 0.0) {
				vec2 off = cell_offset(f, impact_p, t);
				float ang = rotation_amount * (rnd.x * 2.0 - 1.0) * t;
				q = rot2(-ang) * (p - f - off) + f;
			}

			// The shard owns q only if f is still q's nearest feature point.
			vec2 q_cell = floor(q);
			float f1 = distance(q, f);
			float f2 = 1e9;
			bool owned = true;
			for (int ox = -1; ox <= 1; ox++) {
				for (int oy = -1; oy <= 1; oy++) {
					vec2 other = q_cell + vec2(float(ox), float(oy));
					if (all(lessThan(abs(other - cell), vec2(0.5)))) {
						continue;
					}
					float d = distance(q, feature_point(other));
					if (d < f1 - 0.0001) {
						owned = false;
					}
					f2 = min(f2, d);
				}
			}
			if (!owned) {
				continue;
			}

			// Rest position outside the frame means there was no glass there.
			vec2 src_uv = vec2(q.x / (aspect * n), q.y / n);
			if (any(lessThan(src_uv, vec2(0.0))) || any(greaterThan(src_uv, vec2(1.0)))) {
				continue;
			}

			vec4 tex = texture(TEXTURE, src_uv);
			vec3 col = tex.rgb;

			// Cracks grow radially: cells inside the ring show their borders.
			float border = (f2 - f1) * 0.5;
			float ring = crack_progress * max_r * 1.15;
			float active = smoothstep(ring, ring - crack_feather, distance(f, impact_p));
			float line = 1.0 - smoothstep(crack_width * 0.5, crack_width, border);
			// Beside the line, never on it, so the crack stays bright.
			float halo = clamp((1.0 - smoothstep(crack_width, crack_width * 2.5, border)) - line, 0.0, 1.0);
			col *= 1.0 - 0.35 * active * halo;
			col = mix(col, crack_color.rgb, active * line * crack_color.a);

			out_col = vec4(col, tex.a * shard_alpha);
		}
	}

	COLOR = out_col;
}
