extends GdUnitTestSuite
## An unresolvable selectedBullets id used to leave the player with no evidence
## and no diagnostic: every weak-point shot missed, so the attempt ended on the
## first correct-looking shot and replayed.

const BULLETS := [
	{"bulletId": "tb_knife", "name": "Bloodied Knife"},
	{"bulletId": "tb_note", "name": "Torn Note"},
]


func before_test() -> void:
	TruthBulletManager.all_bullets = BULLETS.duplicate(true)
	TruthBulletManager.active_bullets = TruthBulletManager.all_bullets.duplicate()
	TruthBulletManager.current_selected_index = 0


func after_test() -> void:
	TruthBulletManager.all_bullets = []
	TruthBulletManager.active_bullets = []


func test_a_resolvable_selection_narrows_the_evidence() -> void:
	TruthBulletManager.set_active_bullets(["tb_note"])
	assert_array(TruthBulletManager.active_bullets).has_size(1)
	assert_str(TruthBulletManager.get_current_bullet().get("bulletId", "")).is_equal("tb_note")


func test_an_unresolvable_selection_leaves_no_evidence_to_match() -> void:
	# The state the report is about. It stays empty - the point of the fix is
	# that it is now reported rather than silent - so check_bullet_match still
	# has to refuse rather than crash.
	TruthBulletManager.set_active_bullets(["tb_deleted"])
	assert_array(TruthBulletManager.active_bullets).is_empty()
	assert_bool(TruthBulletManager.check_bullet_match("tb_knife", false)).is_false()


func test_resolve_ids_answers_before_bullets_are_loaded() -> void:
	# MinigameBase.validate_data() runs before load_bullets(), so this reads the
	# trial rather than all_bullets.
	TruthBulletManager.all_bullets = []
	assert_array(TruthBulletManager.resolve_ids(["tb_not_in_this_trial"])).is_empty()


func test_a_dangling_id_still_yields_the_placeholder_name() -> void:
	assert_str(
		TruthBulletManager.get_bullet_name("tb_deleted")
	).is_equal(TruthBulletManager.UNKNOWN_BULLET_NAME)
	assert_str(TruthBulletManager.get_bullet_name("tb_knife")).is_equal("Bloodied Knife")


func test_a_negative_weak_point_is_answerable_only_in_lie_mode() -> void:
	# The reported failure: lie_mode had no writer bound to any input, so this
	# returned false for every bullet the player could select - silently, so
	# each shot read as a miss and the attempt ended.
	TruthBulletManager.lie_mode = false
	assert_bool(TruthBulletManager.check_bullet_match("tb_knife", true)).is_false()

	TruthBulletManager.toggle_lie_mode()
	assert_bool(TruthBulletManager.check_bullet_match("tb_knife", true)).is_true()
	# And the ordinary weak point stops matching, which is the mechanic.
	assert_bool(TruthBulletManager.check_bullet_match("tb_knife", false)).is_false()
	TruthBulletManager.lie_mode = false


func test_the_selector_binds_the_toggle_to_input() -> void:
	# truth_bullet_selector owns the wiring, the way it already owns bullet
	# cycling, so the binding only exists while a minigame is showing evidence.
	var selector: Node = auto_free(ResourceRegistry.instantiate("truth_bullet_selector"))
	add_child(selector)
	TruthBulletManager.lie_mode = false

	InputManager.lie_mode_toggle_requested.emit()
	assert_bool(TruthBulletManager.lie_mode).is_true()
	InputManager.lie_mode_toggle_requested.emit()
	assert_bool(TruthBulletManager.lie_mode).is_false()


func test_the_selector_releases_the_binding_when_it_leaves() -> void:
	var selector: Node = ResourceRegistry.instantiate("truth_bullet_selector")
	add_child(selector)
	remove_child(selector)
	selector.free()
	assert_bool(
		InputManager.lie_mode_toggle_requested.is_connected(TruthBulletManager.toggle_lie_mode)
	).is_false()
