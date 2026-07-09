extends GPUParticles2D

## Radial burst of shards, fired once at a point. Scene-driven — see
## scenes/effects/shard_burst.tscn. Edit the shard count, speed, spread, and
## lifetime on the process material; the caller only supplies position and tint.

func _ready():
	finished.connect(queue_free)

func setup(color: Color):
	modulate = color
	emitting = true
