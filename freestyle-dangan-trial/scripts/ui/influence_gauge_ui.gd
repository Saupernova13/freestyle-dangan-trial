extends CanvasLayer

## Influence (HP) gauge HUD. Scene-driven — see scenes/ui/influence_gauge.tscn.
## The scene supplies the node tree; this script handles signal hookup, fill
## tween, and triggers AnimationPlayer animations for the damage flash.

@export var bar_max_width: float = 300.0
@export var color_full: Color = Color(0.9, 0.2, 0.5, 1.0)
@export var color_mid: Color = Color(1.0, 0.4, 0.3, 1.0)
@export var color_low: Color = Color(1.0, 0.1, 0.1, 1.0)

@onready var bar_bg: ColorRect = %BarBG
@onready var bar_fill: ColorRect = %BarFill
@onready var bar_damage_flash: ColorRect = %BarDamageFlash
@onready var _anim: AnimationPlayer = %AnimationPlayer

func _ready():
	InfluenceGauge.influence_changed.connect(_on_influence_changed)
	InfluenceGauge.damage_taken.connect(_on_damage_taken)
	visible = false

func show_gauge():
	visible = true

func hide_gauge():
	visible = false

func _on_influence_changed(current: float, maximum: float):
	var pct = current / maximum if maximum > 0 else 0.0
	var target_width = bar_max_width * pct
	# Fill is a dynamic target — Tween stays in code (AnimationPlayer animations
	# have fixed end values). The static animations live in the scene's
	# AnimationPlayer; this is the one piece that can't.
	var tween = create_tween()
	tween.tween_property(bar_fill, "size:x", target_width, 0.3).set_ease(Tween.EASE_OUT)

	if pct < 0.25:
		bar_fill.color = color_low
	elif pct < 0.5:
		bar_fill.color = color_mid
	else:
		bar_fill.color = color_full

func _on_damage_taken(_amount: float):
	if _anim and _anim.has_animation("damage_flash"):
		_anim.stop()
		_anim.play("damage_flash")
