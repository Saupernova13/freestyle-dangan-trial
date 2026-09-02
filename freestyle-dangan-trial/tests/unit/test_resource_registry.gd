extends GdUnitTestSuite
## Every SCENES entry is a res:// path resolved at runtime, so a renamed or
## moved .tscn is not a compile error - get_scene() push_errors and
## instantiate() returns null, and the caller add_child(null)s or silently
## skips. One loop turns that into a CI failure naming the key.


func test_every_registered_scene_loads() -> void:
	var broken: Array[String] = []
	for key in ResourceRegistry.SCENES:
		var path: String = ResourceRegistry.SCENES[key]
		if not ResourceLoader.exists(path):
			broken.append("%s -> %s (missing)" % [key, path])
			continue
		if load(path) == null:
			broken.append("%s -> %s (failed to load)" % [key, path])
	assert_array(broken).override_failure_message(
		"These ResourceRegistry entries do not resolve:\n  %s" % "\n  ".join(broken)
	).is_empty()


func test_every_registered_scene_instantiates() -> void:
	# Loading a PackedScene proves the file parses; instantiating proves its
	# scripts and sub-resources do too, which is where a broken @onready path
	# or a deleted shader actually surfaces.
	var broken: Array[String] = []
	for key in ResourceRegistry.SCENES:
		var node := ResourceRegistry.instantiate(key)
		if node == null:
			broken.append(key)
		else:
			node.queue_free()
	assert_array(broken).override_failure_message(
		"These ResourceRegistry keys instantiate to null: %s" % ", ".join(broken)
	).is_empty()


func test_an_unregistered_key_returns_null_rather_than_erroring_out() -> void:
	assert_object(ResourceRegistry.get_scene("no_such_key")).is_null()
	assert_object(ResourceRegistry.instantiate("no_such_key")).is_null()


func test_the_registry_caches_rather_than_reloading() -> void:
	var key: String = ResourceRegistry.SCENES.keys()[0]
	assert_object(ResourceRegistry.get_scene(key)).is_same(ResourceRegistry.get_scene(key))
