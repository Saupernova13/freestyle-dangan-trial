extends GdUnitTestSuite
## The title card's frame stylebox is a plain sub-resource, so every instance of
## the cached PackedScene shares one object. Recolouring it for Nonstop Debate
## used to write through to every later card in the session.


func _new_card() -> Node:
	var card: Node = ResourceRegistry.instantiate("minigame_title_card")
	add_child(card)
	return card


func _frame_texture_path(card: Node) -> String:
	var style: StyleBoxTexture = card.get_node("%Frame").get_theme_stylebox("panel")
	return style.texture.resource_path


func test_the_orange_frame_does_not_leak_into_the_next_card() -> void:
	var first := _new_card()
	first.show_title("nonstop_debate")
	assert_str(_frame_texture_path(first)).contains("orange")
	# The card frees itself once its fly animation ends.
	await first.card_finished

	var second: Node = auto_free(_new_card())
	assert_str(_frame_texture_path(second)).contains("blue")
