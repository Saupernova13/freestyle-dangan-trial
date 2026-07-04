class_name EffectBuilders
extends RefCounted
##
## Reusable tween / animation factories for minigame visual feedback.
## Keep these stateless — pass the node and parameters; return the Tween (or
## the spawned node) so callers can chain `.finished` if they need to.

# ---------------------------------------------------------------------------
# Fade helpers
# ---------------------------------------------------------------------------
static func fade_in(node: CanvasItem, duration: float = 0.2) -> Tween:
	var tween := node.create_tween()
	tween.tween_property(node, "modulate:a", 1.0, duration)
	return tween

static func fade_out(node: CanvasItem, duration: float = 0.3, free_after: bool = false) -> Tween:
	var tween := node.create_tween()
	tween.tween_property(node, "modulate:a", 0.0, duration)
	if free_after:
		tween.finished.connect(func(): if is_instance_valid(node): node.queue_free())
	return tween

static func fade_in_hold_out(
	node: CanvasItem,
	in_duration: float = 0.2,
	hold_duration: float = 1.0,
	out_duration: float = 0.3,
	free_after: bool = false
) -> Tween:
	var tween := node.create_tween()
	tween.tween_property(node, "modulate:a", 1.0, in_duration)
	tween.tween_interval(hold_duration)
	tween.tween_property(node, "modulate:a", 0.0, out_duration)
	if free_after:
		tween.finished.connect(func(): if is_instance_valid(node): node.queue_free())
	return tween

# ---------------------------------------------------------------------------
# Scale / pop animations
# ---------------------------------------------------------------------------
static func scale_pop(
	node: CanvasItem,
	from_scale: Vector2 = Vector2(0.3, 0.3),
	overshoot_scale: Vector2 = Vector2(1.2, 1.2),
	settle_scale: Vector2 = Vector2(1.0, 1.0),
	overshoot_duration: float = 0.3,
	settle_duration: float = 0.08
) -> Tween:
	node.scale = from_scale
	var tween := node.create_tween()
	tween.tween_property(node, "scale", overshoot_scale, overshoot_duration) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tween.tween_property(node, "scale", settle_scale, settle_duration) \
		.set_ease(Tween.EASE_IN)
	return tween

static func flash_alpha(node: CanvasItem, loops: int = 2, dim: float = 0.5, bright: float = 1.0, step: float = 0.1) -> Tween:
	var tween := node.create_tween()
	tween.set_loops(loops)
	tween.tween_property(node, "modulate:a", dim, step)
	tween.tween_property(node, "modulate:a", bright, step)
	return tween

# ---------------------------------------------------------------------------
# Damage / feedback popups
# ---------------------------------------------------------------------------
static func spawn_drift_popup(
	parent: Node,
	pos: Vector2,
	text: String,
	color: Color,
	font_size: int = 28,
	drift: float = 60.0,
	duration: float = 0.8
) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.position = pos
	label.modulate.a = 1.0
	parent.add_child(label)

	var tween := label.create_tween()
	tween.set_parallel(true)
	tween.tween_property(label, "position:y", pos.y - drift, duration)
	tween.tween_property(label, "modulate:a", 0.0, duration)
	tween.finished.connect(func(): if is_instance_valid(label): label.queue_free())
	return label

# ---------------------------------------------------------------------------
# Shatter / break effects
# ---------------------------------------------------------------------------
## Spawn a grid of shards over `rect` that fly outward from its center.
## Returns nothing — shards self-destruct via their own tweens.
static func shatter_rect(
	parent: Node,
	rect: Rect2,
	color: Color,
	rows: int,
	cols: int,
	min_speed: float = 150.0,
	max_speed: float = 400.0,
	min_duration: float = 0.3,
	max_duration: float = 0.6
) -> void:
	var sw := rect.size.x / cols
	var sh := rect.size.y / rows
	var center := rect.get_center()

	for r in range(rows):
		for c in range(cols):
			var shard := ColorRect.new()
			shard.size = Vector2(sw, sh) + Vector2(randf_range(-2, 2), randf_range(-2, 2))
			shard.color = color
			shard.position = rect.position + Vector2(c * sw, r * sh)
			parent.add_child(shard)

			var dir = (shard.position + shard.size / 2 - center).normalized()
			var speed = randf_range(min_speed, max_speed)
			var rot_speed = randf_range(-4.0, 4.0)
			var dur = randf_range(min_duration, max_duration)

			var tween = shard.create_tween().set_parallel(true)
			tween.tween_property(shard, "position", shard.position + dir * speed * dur, dur) \
				.set_ease(Tween.EASE_OUT)
			tween.tween_property(shard, "rotation", rot_speed * dur, dur)
			tween.tween_property(shard, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN)
			tween.finished.connect(func(): if is_instance_valid(shard): shard.queue_free())

## Radial burst of small square shards (used for break particles).
static func spawn_burst_particles(
	parent: Node,
	center: Vector2,
	color: Color,
	count: int = 10,
	shard_size: Vector2 = Vector2(6, 6),
	min_speed: float = 200.0,
	max_speed: float = 500.0,
	min_duration: float = 0.4,
	max_duration: float = 0.6
) -> void:
	for i in range(count):
		var shard := ColorRect.new()
		shard.size = shard_size
		shard.color = color
		shard.position = center - shard_size / 2
		parent.add_child(shard)

		var angle = i * (TAU / float(count)) + randf_range(-0.3, 0.3)
		var speed = randf_range(min_speed, max_speed)
		var vel = Vector2(cos(angle), sin(angle)) * speed
		var dur = randf_range(min_duration, max_duration)

		var tween = shard.create_tween().set_parallel(true)
		tween.tween_property(shard, "position", shard.position + vel * dur, dur).set_ease(Tween.EASE_OUT)
		tween.tween_property(shard, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN)
		tween.finished.connect(func(): if is_instance_valid(shard): shard.queue_free())

## Full-screen shatter overlay. Builds its own CanvasLayer, shatters, frees itself.
static func screen_shatter(
	host: Node,
	color: Color,
	rows: int,
	cols: int,
	layer: int = 60
) -> void:
	var vp_rect := host.get_viewport().get_visible_rect()
	var canvas := CanvasLayer.new()
	canvas.layer = layer
	host.add_child(canvas)

	var bg := ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(bg)

	var cell_w := vp_rect.size.x / cols
	var cell_h := vp_rect.size.y / rows
	var center := vp_rect.get_center()
	var longest_dur := 0.0

	for r in range(rows):
		for c in range(cols):
			var shard := ColorRect.new()
			shard.color = color
			var pos := Vector2(c * cell_w, r * cell_h)
			shard.position = pos
			shard.size = Vector2(cell_w + 2, cell_h + 2)
			shard.z_index = 1
			canvas.add_child(shard)

			var dir = (pos + shard.size / 2 - center).normalized()
			var speed = randf_range(200.0, 600.0)
			var rot_speed = randf_range(-6.0, 6.0)
			var dur = randf_range(0.4, 0.8)
			if dur > longest_dur:
				longest_dur = dur

			var tween = shard.create_tween().set_parallel(true)
			tween.tween_property(shard, "position", shard.position + dir * speed * dur, dur).set_ease(Tween.EASE_OUT)
			tween.tween_property(shard, "rotation", rot_speed * dur, dur)
			tween.tween_property(shard, "modulate:a", 0.0, dur).set_ease(Tween.EASE_IN)

	# Clean up the host canvas once the last shard fades.
	var cleanup_timer := host.get_tree().create_timer(longest_dur + 0.1)
	cleanup_timer.timeout.connect(func(): if is_instance_valid(canvas): canvas.queue_free())

# ---------------------------------------------------------------------------
# Misc overlays
# ---------------------------------------------------------------------------
## Spawn a translucent ColorRect covering the parent, fade it out, free it.
static func screen_flash(parent: Node, color: Color, duration: float = 0.3) -> ColorRect:
	var flash := ColorRect.new()
	flash.color = color
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(flash)
	var tween := flash.create_tween()
	tween.tween_property(flash, "color:a", 0.0, duration)
	tween.finished.connect(func(): if is_instance_valid(flash): flash.queue_free())
	return flash
