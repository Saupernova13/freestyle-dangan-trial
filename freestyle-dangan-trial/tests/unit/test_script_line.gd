extends GdUnitTestSuite


func test_defaults_from_empty_dict() -> void:
	var line := ScriptLine.from_dict({})
	assert_str(line.id).is_empty()
	assert_int(line.order).is_equal(0)
	assert_str(line.type).is_empty()
	assert_str(line.audio_file).is_empty()
	assert_int(line.sprite_index).is_equal(1)
	assert_bool(line.camera_motion.is_empty()).is_true()
	assert_bool(line.special_effects.is_empty()).is_true()
	assert_array(line.highlights).is_empty()


func test_json_null_values_become_clean_defaults() -> void:
	# "audioFile": null in trial.json arrives as Variant null; a str() cast
	# would produce "<null>" and be treated as a real filename.
	var line := ScriptLine.from_dict({
		"audioFile": null,
		"spriteIndex": null,
		"cameraMotion": null,
		"highlights": null,
	})
	assert_str(line.audio_file).is_empty()
	assert_int(line.sprite_index).is_equal(1)
	assert_bool(line.camera_motion.is_empty()).is_true()
	assert_array(line.highlights).is_empty()


func test_sprite_index_is_normalized_one_based() -> void:
	assert_int(ScriptLine.from_dict({"spriteIndex": 0}).sprite_index).is_equal(1)
	assert_int(ScriptLine.from_dict({"spriteIndex": -3}).sprite_index).is_equal(1)
	assert_int(ScriptLine.from_dict({"spriteIndex": 2.0}).sprite_index).is_equal(2)
	assert_int(ScriptLine.from_dict({"spriteIndex": 4}).sprite_index).is_equal(4)


func test_typed_fields_parse() -> void:
	var line := ScriptLine.from_dict({
		"id": "line_1",
		"order": 3,
		"type": "speaking",
		"characterId": "CH_1",
		"dialogue": "Hello.",
		"audioFile": "line_1.mp3",
		"cameraMotion": {"type": "pan"},
		"specialEffects": {"effects": ["shake"]},
		"highlights": [{"startChar": 0, "endChar": 2, "color": "#FFFF00"}],
		"dialogueBoxStyle": {"style": "default"},
	})
	assert_str(line.id).is_equal("line_1")
	assert_int(line.order).is_equal(3)
	assert_str(line.type).is_equal(ScriptLine.TYPE_SPEAKING)
	assert_str(line.character_id).is_equal("CH_1")
	assert_str(line.dialogue).is_equal("Hello.")
	assert_str(line.audio_file).is_equal("line_1.mp3")
	assert_str(line.camera_motion.get("type")).is_equal("pan")
	assert_array(line.special_effects.get("effects")).contains(["shake"])
	assert_int(line.highlights.size()).is_equal(1)


func test_narrator_display_text_falls_back_to_dialogue() -> void:
	var with_text := ScriptLine.from_dict({"type": "narrator", "text": "Narration."})
	assert_str(with_text.display_text()).is_equal("Narration.")

	# Legacy files authored narration in `dialogue` before `text` existed.
	var legacy := ScriptLine.from_dict({"type": "narrator", "dialogue": "Old narration."})
	assert_str(legacy.display_text()).is_equal("Old narration.")
