extends GdUnitTestSuite
## Two silent fallbacks stacked: a missing spriteIndex fell back to sprite 1
## unlogged, and a missing sprite 1 left portrait_rect untouched - so the new
## speaker's name appeared over the previous speaker's face, and nothing
## anywhere said so. The author could not reproduce it, because their local
## build had the sprite cached.

const PRESENT := "FC_PRESENT"
const ABSENT := "FC_ABSENT"


## The manager without its scene: _set_portrait needs only the stage and the
## TextureRect, and _ready() would want a whole trial room.
func _manager() -> Node:
	var manager: Node = auto_free(load("res://scripts/game/trial_room_manager.gd").new())
	manager._stage = CharacterStage.new(auto_free(Node3D.new()))
	manager.portrait_rect = auto_free(TextureRect.new())
	return manager


func _seat(manager: Node, bench: int, character_id: String) -> void:
	manager._stage._by_bench[bench] = {"id": character_id}


func _store_sprite(character_id: String, sprite_index: int) -> ImageTexture:
	var image := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	image.fill(Color.RED)
	var texture := ImageTexture.create_from_image(image)
	TrialLoader.characters.store_texture(character_id, sprite_index, texture)
	return texture


func before_test() -> void:
	TrialLoader.characters.clear()


func after_test() -> void:
	TrialLoader.characters.clear()


func test_the_requested_sprite_is_used_when_it_exists() -> void:
	var expected := _store_sprite(PRESENT, 3)
	var manager := _manager()
	_seat(manager, 0, PRESENT)

	manager._set_portrait(0, 3)

	assert_object(manager.portrait_rect.texture).is_same(expected)


func test_a_missing_index_falls_back_to_sprite_one() -> void:
	var first := _store_sprite(PRESENT, 1)
	var manager := _manager()
	_seat(manager, 0, PRESENT)

	manager._set_portrait(0, 7)

	assert_object(manager.portrait_rect.texture).is_same(first)


func test_no_usable_sprite_clears_the_portrait_rather_than_keeping_the_last_one() -> void:
	# The reported failure, stated directly.
	var previous := _store_sprite(PRESENT, 1)
	var manager := _manager()
	_seat(manager, 0, PRESENT)
	manager._set_portrait(0, 1)
	assert_object(manager.portrait_rect.texture).is_same(previous)

	_seat(manager, 1, ABSENT)
	manager._set_portrait(1, 1)

	assert_object(manager.portrait_rect.texture).is_null()


func test_an_empty_bench_clears_the_portrait_too() -> void:
	var previous := _store_sprite(PRESENT, 1)
	var manager := _manager()
	_seat(manager, 0, PRESENT)
	manager._set_portrait(0, 1)
	assert_object(manager.portrait_rect.texture).is_same(previous)

	# Bench 5 has nobody on it.
	manager._set_portrait(5, 1)

	assert_object(manager.portrait_rect.texture).is_null()


func test_a_repeated_problem_is_reported_once() -> void:
	# Otherwise a missing sprite warns on every line that character speaks.
	var manager := _manager()
	_seat(manager, 0, ABSENT)

	manager._warn_once("sprite", "same message")
	manager._warn_once("sprite", "same message")
	manager._warn_once("sprite", "a different message")

	assert_int(manager._warned.size()).is_equal(2)
