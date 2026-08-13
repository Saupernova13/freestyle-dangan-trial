extends GPUParticles2D

## A debate panel breaking into shards. Shard look, speed and lifetime are on
## the process material in scenes/effects/panel_shatter.tscn; the caller
## supplies only the panel rect and tint.

func _ready():
	finished.connect(queue_free)

## Fits the emission box to the panel and centres on it.
func setup(rect: Rect2, color: Color):
	global_position = rect.get_center()
	modulate = color
	var mat := process_material as ParticleProcessMaterial
	if mat:
		mat.emission_box_extents = Vector3(rect.size.x * 0.5, rect.size.y * 0.5, 0.0)
	emitting = true
