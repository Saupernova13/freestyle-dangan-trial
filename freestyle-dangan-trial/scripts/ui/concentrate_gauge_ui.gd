extends CanvasLayer
## FOCUS / Concentrate gauge HUD; position and style live in
## scenes/ui/concentrate_gauge.tscn. This tweens the fill, whose target is
## dynamic, and triggers the color-shift animations.

@export var bar_width: float = 130.0

@onready var _bar_fill: ColorRect = %BarFill
@onready var _anim: AnimationPlayer = %AnimationPlayer

var _last_tier: int = 2  # 0=low, 1=mid, 2=high

func _ready():
	ConcentrateGauge.concentrate_changed.connect(_on_concentrate_changed)
	visible = false

func show_gauge():
	visible = true

func hide_gauge():
	visible = false

## Tier index -> its colour clip. A lookup rather than an if/elif chain, so the
## tiers and the clip names stay side by side.
const TIER_ANIMATIONS := ["color_low", "color_mid", "color_high"]

func _on_concentrate_changed(current: float, maximum: float):
	var pct = current / maximum if maximum > 0 else 0.0
	var new_tier: int
	if pct > 0.5:
		new_tier = 2
	elif pct > 0.25:
		new_tier = 1
	else:
		new_tier = 0

	if new_tier != _last_tier:
		# Recorded outside the _anim check. It used to be set inside it, so a
		# null AnimationPlayer would have left the tier stuck and this
		# re-evaluating the same transition forever.
		_last_tier = new_tier
		var anim_name: String = TIER_ANIMATIONS[new_tier]
		if _anim and _anim.has_animation(anim_name):
			_anim.play(anim_name)

	# Assigned, not tweened. This is a continuous value: drain() emits on every
	# frame slow-time is held and refill() on every frame after, so a 0.2s
	# tween per emission meant roughly 60 Tween objects a second and about a
	# dozen live at once, all animating the same property against each other.
	# InfluenceGauge can tween because its trigger is discrete damage.
	_bar_fill.offset_right = bar_width * pct
