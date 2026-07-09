extends GPUParticles2D

## Debate panel breaking apart into shards. Scene-driven — see
## scenes/effects/panel_shatter.tscn. Edit the shard look, speed, and lifetime
## on the process material; the caller only supplies the panel rect and tint.

func _ready():
	finished.connect(queue_free)

## Fit the emission box to the panel being shattered and center on it.
func setup(rect: Rect2, color: Color):
	global_position = rect.get_center()
	modulate = color
	var mat := process_material as ParticleProcessMaterial
	if mat:
		mat.emission_box_extents = Vector3(rect.size.x * 0.5, rect.size.y * 0.5, 0.0)
	emitting = true
