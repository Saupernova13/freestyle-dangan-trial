extends Node

signal bullet_selected(bullet: Dictionary)
signal lie_mode_changed(enabled: bool)

var all_bullets: Array = []
var active_bullets: Array = []
var current_selected_index: int = 0
var lie_mode: bool = false

func load_bullets():
	all_bullets = TrialLoader.get_truth_bullets()
	active_bullets = all_bullets.duplicate()
	current_selected_index = 0
	lie_mode = false
	if not active_bullets.is_empty():
		bullet_selected.emit(active_bullets[0])

func set_active_bullets(bullet_ids: Array):
	active_bullets.clear()
	for bullet in all_bullets:
		if bullet.get("bulletId", "") in bullet_ids:
			active_bullets.append(bullet)
	current_selected_index = 0
	if not active_bullets.is_empty():
		bullet_selected.emit(active_bullets[0])

func reset_to_all():
	active_bullets = all_bullets.duplicate()
	current_selected_index = 0
	if not active_bullets.is_empty():
		bullet_selected.emit(active_bullets[0])

func cycle_next():
	if active_bullets.is_empty():
		return
	current_selected_index = (current_selected_index + 1) % active_bullets.size()
	bullet_selected.emit(active_bullets[current_selected_index])

func cycle_prev():
	if active_bullets.is_empty():
		return
	current_selected_index = (current_selected_index - 1 + active_bullets.size()) % active_bullets.size()
	bullet_selected.emit(active_bullets[current_selected_index])

func get_current_bullet() -> Dictionary:
	if current_selected_index >= 0 and current_selected_index < active_bullets.size():
		return active_bullets[current_selected_index]
	return {}

func get_current_display_name() -> String:
	var bullet = get_current_bullet()
	if bullet.is_empty():
		return ""
	if lie_mode:
		return bullet.get("inversedLieBulletName", bullet.get("name", ""))
	return bullet.get("name", "")

func toggle_lie_mode():
	lie_mode = not lie_mode
	lie_mode_changed.emit(lie_mode)

func set_lie_mode(enabled: bool):
	lie_mode = enabled
	lie_mode_changed.emit(lie_mode)

func check_bullet_match(bullet_id: String, requires_lie: bool) -> bool:
	var current = get_current_bullet()
	if current.is_empty():
		return false
	var matches_id = current.get("bulletId", "") == bullet_id
	var matches_mode = lie_mode == requires_lie
	return matches_id and matches_mode

func get_bullet_image_path(bullet: Dictionary) -> String:
	var image_file = bullet.get("imageFile", "")
	if image_file.is_empty():
		return ""
	return TrialLoader.get_truth_bullet_image(image_file)

func get_bullet_count() -> int:
	return active_bullets.size()
