class_name BulletPreview
extends CanvasLayer
## Pre-round overlay listing the truth bullets in play. Layout and the
## fade-in/hold/fade-out are scene-owned (scenes/minigames/bullet_preview.tscn);
## show_bullets() fills the grid with one cell per bullet, plays "show", and
## frees itself. Await the call to block until it's done.

@onready var _grid: GridContainer = %Grid
@onready var _anim: AnimationPlayer = %AnimationPlayer

func show_bullets(bullets: Array) -> void:
	_grid.columns = mini(bullets.size(), 4)
	for bullet in bullets:
		var cell := ResourceRegistry.instantiate("bullet_preview_cell")
		_grid.add_child(cell)
		(cell.get_node("%Name") as Label).text = bullet.get("name", "?")
		var desc = bullet.get("description", "")
		var desc_label: Label = cell.get_node("%Desc")
		if desc is String and not desc.is_empty():
			desc_label.text = desc
		else:
			desc_label.visible = false

	_anim.play("show")
	await _anim.animation_finished
	queue_free()
