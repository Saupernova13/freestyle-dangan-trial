class_name CharacterLibrary
extends RefCounted
## Repository for the extracted trial's character data and sprite textures.
## Data dictionaries and Images are safe to read off the main thread;
## get_texture()/store_texture() must stay on the main thread (GPU alloc).

var _characters_dir: String
var _data_cache: Dictionary = {}     # char_id -> character dict (+ folder_path)
var _texture_cache: Dictionary = {}  # "char_id:sprite_idx" -> ImageTexture

func _init(characters_dir: String) -> void:
	_characters_dir = characters_dir

func clear() -> void:
	_data_cache.clear()
	_texture_cache.clear()

## Character dictionary for `character_id`, or an empty dict if not found.
## Character folders carry no id in their name, so the first lookup scans every
## folder's character.json; hits are cached.
func get_character(character_id: String) -> Dictionary:
	if character_id.is_empty() or character_id == "null":
		return {}
	if _data_cache.has(character_id):
		return _data_cache[character_id]

	if not DirAccess.dir_exists_absolute(_characters_dir):
		push_warning("Characters directory not found")
		return {}

	var dir = DirAccess.open(_characters_dir)
	if dir:
		dir.list_dir_begin()
		var folder_name = dir.get_next()
		while folder_name != "":
			if dir.current_is_dir():
				var char_json_path = _characters_dir + folder_name + "/character.json"
				if FileAccess.file_exists(char_json_path):
					var char_data = _parse_json(char_json_path)
					if char_data.get("id", "") == character_id:
						char_data["folder_path"] = _characters_dir + folder_name
						dir.list_dir_end()
						_data_cache[character_id] = char_data
						return char_data
			folder_name = dir.get_next()
		dir.list_dir_end()

	push_warning("Character not found: " + character_id)
	return {}

## Absolute path to sprite_NN.png for the character, or "" if missing.
func sprite_path(character_id: String, sprite_index: int) -> String:
	var char_data := get_character(character_id)
	var folder_path: String = char_data.get("folder_path", "")
	if folder_path.is_empty():
		return ""
	var path := "%s/sprite_%02d.png" % [folder_path, sprite_index]
	return path if FileAccess.file_exists(path) else ""

func load_image(character_id: String, sprite_index: int) -> Image:
	var path := sprite_path(character_id, sprite_index)
	if path.is_empty():
		return null
	return Image.load_from_file(path)

## Cached ImageTexture for a sprite, loading from disk on first use.
## Returns null when the sprite is missing.
func get_texture(character_id: String, sprite_index: int) -> ImageTexture:
	var key := _key(character_id, sprite_index)
	if _texture_cache.has(key):
		return _texture_cache[key]
	var image := load_image(character_id, sprite_index)
	if not image:
		return null
	var texture := ImageTexture.create_from_image(image)
	_texture_cache[key] = texture
	return texture

func store_texture(character_id: String, sprite_index: int, texture: ImageTexture) -> void:
	_texture_cache[_key(character_id, sprite_index)] = texture

func _key(character_id: String, sprite_index: int) -> String:
	return "%s:%d" % [character_id, sprite_index]

func _parse_json(json_path: String) -> Dictionary:
	var json_text = FileAccess.get_file_as_string(json_path)
	if json_text.is_empty():
		return {}
	var json = JSON.new()
	if json.parse(json_text) != OK:
		return {}
	return json.data
