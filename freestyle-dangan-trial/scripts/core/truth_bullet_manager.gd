extends Node

## Shown on the evidence card when an id does not resolve.
const UNKNOWN_BULLET_NAME := "Unknown Evidence"

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

## Narrows the selectable evidence to the ids a minigame authored. An id that
## resolves to nothing is an authoring error, not an empty selection: with no
## evidence to match, every weak-point shot is a miss and the attempt ends on
## the player's first correct-looking one, with no bullet preview to show them
## why.
func set_active_bullets(bullet_ids: Array):
	active_bullets.clear()
	var resolved: Array = []
	for bullet in all_bullets:
		var id: String = bullet.get("bulletId", "")
		if id in bullet_ids:
			active_bullets.append(bullet)
			resolved.append(id)

	var unresolved: Array = bullet_ids.filter(func(id: Variant) -> bool: return not (id in resolved))
	if not unresolved.is_empty():
		Log.error(
			"TruthBulletManager",
			"selectedBullets ids not in this trial: %s" % ", ".join(PackedStringArray(unresolved))
		)

	current_selected_index = 0
	if not active_bullets.is_empty():
		bullet_selected.emit(active_bullets[0])

## Which of `bullet_ids` name a truth bullet in the loaded trial. Reads the
## trial rather than all_bullets, so a caller can ask before load_bullets() has
## run - MinigameBase.validate_data() does, to reject an unwinnable round
## before the player is shown a title card for it.
func resolve_ids(bullet_ids: Array) -> Array:
	var found: Array = []
	for bullet in TrialLoader.get_truth_bullets():
		var id: String = bullet.get("bulletId", "")
		if id in bullet_ids and not (id in found):
			found.append(id)
	return found

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

## Not yet bound to any input. The editor authors useNegativeBullet on weak
## points, so lie mode is the missing player-side half of that contract.
func toggle_lie_mode():
	lie_mode = not lie_mode
	lie_mode_changed.emit(lie_mode)

func check_bullet_match(bullet_id: String, requires_lie: bool) -> bool:
	var current = get_current_bullet()
	if current.is_empty():
		return false
	var matches_id = current.get("bulletId", "") == bullet_id
	var matches_mode = lie_mode == requires_lie
	return matches_id and matches_mode

func get_bullet_name(bullet_id: String) -> String:
	for bullet in all_bullets:
		if bullet.get("bulletId", "") == bullet_id:
			return bullet.get("name", UNKNOWN_BULLET_NAME)
	# The post-break evidence card renders this verbatim, so without the log a
	# dangling id reads to the player as if that were the bullet's name.
	Log.warn("TruthBulletManager", "No truth bullet with id '%s'" % bullet_id)
	return UNKNOWN_BULLET_NAME
