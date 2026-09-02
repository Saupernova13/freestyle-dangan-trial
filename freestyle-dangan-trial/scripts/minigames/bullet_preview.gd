class_name BulletPreview
extends CanvasLayer
## Pre-round overlay listing the truth bullets in play. Layout and the
## fade/hold/fade are scene-owned. show_bullets() fills the grid, plays
## "show", then frees itself; await it to block until that finishes.

@onready var _grid: GridContainer = %Grid
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_bullets(bullets: Array) -> void:
	_grid.columns = mini(bullets.size(), 4)
	for bullet in bullets:
		var cell := ResourceRegistry.instantiate("bullet_preview_cell")
		_grid.add_child(cell)
		(cell.get_node("%Name") as Label).text = JsonRead.str_of(bullet.get("name"), "?")
		var desc := JsonRead.str_of(bullet.get("description"))
		var desc_label: Label = cell.get_node("%Desc")
		if not desc.is_empty():
			desc_label.text = desc
		else:
			desc_label.visible = false

	_anim.play("show")
	await _anim.animation_finished
	queue_free()
