extends GPUParticles2D
## One-shot radial burst of shards. Count, speed, spread and lifetime are on
## the process material; the caller supplies position and tint.

func _ready():
	finished.connect(queue_free)

func setup(color: Color):
	modulate = color
	emitting = true
