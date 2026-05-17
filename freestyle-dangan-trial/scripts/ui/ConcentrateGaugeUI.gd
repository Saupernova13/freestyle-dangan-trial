extends CanvasLayer

## FOCUS / Concentrate gauge HUD. Scene-driven — see scenes/ui/concentrate_gauge.tscn.
## Position/style is editable directly in that scene. This script handles fill
## tween (dynamic target) and triggers AnimationPlayer animations for color shifts.

@export var bar_width: float = 130.0

@onready var _label: Label = %Label
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

func _on_concentrate_changed(current: float, maximum: float):
	var pct = current / maximum if maximum > 0 else 0.0
	var new_tier: int
	if pct > 0.5:
		new_tier = 2
	elif pct > 0.25:
		new_tier = 1
	else:
		new_tier = 0

	if new_tier != _last_tier and _anim:
		var anim_name = ""
		if new_tier == 2:
			anim_name = "color_high"
		elif new_tier == 1:
			anim_name = "color_mid"
		else:
			anim_name = "color_low"
		if _anim.has_animation(anim_name):
			_anim.play(anim_name)
		_last_tier = new_tier

	# Bar fill width — dynamic target, stays as Tween
	var tween = create_tween()
	tween.tween_property(_bar_fill, "offset_right", bar_width * pct, 0.2)
