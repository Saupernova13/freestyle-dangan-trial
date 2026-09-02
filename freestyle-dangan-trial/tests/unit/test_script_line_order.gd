extends GdUnitTestSuite
## `order` was parsed, kept in the schema and asserted in two tests, while no
## production code read it - playback was array position alone. Editing
## `order` in trial.json, which is the obvious thing to try when hand-editing
## and exactly what the field name promises, was a silent no-op.


func _manifest(lines: Array) -> TrialManifest:
	return TrialManifest.from_dict({
		"trialName": "T",
		"characters": [],
		"script": {"lines": lines},
		"metadata": {"version": "4.0"},
	})


func _ids(manifest: TrialManifest) -> Array:
	return manifest.script_lines.map(func(line: ScriptLine) -> String: return line.id)


func _line(id: String, order: Variant = null) -> Dictionary:
	var out := {"id": id, "type": "narrator", "text": id}
	if order != null:
		out["order"] = order
	return out


func test_lines_play_in_order_not_file_position() -> void:
	var manifest := _manifest([_line("c", 2), _line("a", 0), _line("b", 1)])
	assert_array(_ids(manifest)).is_equal(["a", "b", "c"])


func test_a_file_with_no_orders_at_all_keeps_file_position() -> void:
	# Every line coerces to 0, and Array.sort_custom is not stable, so a sort
	# here would scramble a legacy file on every load.
	var manifest := _manifest([_line("c"), _line("a"), _line("b")])
	assert_array(_ids(manifest)).is_equal(["c", "a", "b"])


func test_a_partially_ordered_file_keeps_file_position() -> void:
	# The lines without an order coerce to 0 and would all jump to the front,
	# which is a worse outcome than ignoring the field.
	var manifest := _manifest([_line("c"), _line("a", 5), _line("b")])
	assert_array(_ids(manifest)).is_equal(["c", "a", "b"])


func test_duplicate_orders_keep_file_position_relative_to_each_other() -> void:
	# Position breaks the tie, so two loads of the same file agree.
	var manifest := _manifest([_line("c", 1), _line("a", 0), _line("b", 1)])
	assert_array(_ids(manifest)).is_equal(["a", "c", "b"])


func test_order_is_read_as_a_number_however_json_spells_it() -> void:
	var manifest := _manifest([_line("b", 2.0), _line("a", 1)])
	assert_array(_ids(manifest)).is_equal(["a", "b"])


func test_negative_and_sparse_orders_are_honoured() -> void:
	# Nothing renumbers on load, so a hand-edited file can use any spacing.
	var manifest := _manifest([_line("c", 100), _line("a", -5), _line("b", 3)])
	assert_array(_ids(manifest)).is_equal(["a", "b", "c"])


func test_a_missing_order_is_distinguishable_from_zero() -> void:
	assert_bool(ScriptLine.from_dict({"order": 0}).has_explicit_order).is_true()
	assert_bool(ScriptLine.from_dict({}).has_explicit_order).is_false()
	# A wrong-typed order is not an order; it coerces to 0 like any absent one.
	assert_bool(ScriptLine.from_dict({"order": "3"}).has_explicit_order).is_false()
	assert_bool(ScriptLine.from_dict({"order": null}).has_explicit_order).is_false()


func test_non_dictionary_lines_are_still_dropped_before_the_sort() -> void:
	var manifest := _manifest([_line("b", 1), "junk", _line("a", 0)])
	assert_array(_ids(manifest)).is_equal(["a", "b"])
