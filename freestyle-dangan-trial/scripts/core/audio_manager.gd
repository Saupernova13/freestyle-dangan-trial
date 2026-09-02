extends Node
## Voice line playback and the decoded-stream cache. Settings drives the volume
## through set_voice_volume_linear(); this file is the only writer of volume_db.

var voice_player: AudioStreamPlayer

var _audio_cache: Dictionary = {}
const _MAX_AUDIO_CACHE_SIZE: int = 50

# Messages already reported; see _warn_once.
var _warned: Dictionary = {}

func _ready():
	voice_player = AudioStreamPlayer.new()
	voice_player.bus = "Master"
	add_child(voice_player)

## A line that names an audio file and plays none is an authoring problem, and
## it used to be swallowed at three consecutive layers with nothing logged: the
## path lookup returned "", the decode returned null, and this returned quietly
## either way. The author heard silence and had nowhere to look.
func play_voice_line(audio_filename: String):
	if audio_filename.is_empty():
		return

	var audio_path = TrialLoader.get_audio_path(audio_filename)
	if audio_path.is_empty():
		_warn_once("Voice line '%s' is not in the trial's Audio folder" % audio_filename)
		return

	var stream = _load_audio_from_file(audio_path)
	if stream == null:
		_warn_once("Voice line '%s' could not be decoded" % audio_filename)
		return
	voice_player.stream = stream
	voice_player.play()

## Once per distinct message. A line replays on every skip and every retry, so
## warning per call would bury the first report under its own repeats.
func _warn_once(message: String) -> void:
	if _warned.has(message):
		return
	_warned[message] = true
	Log.warn("AudioManager", message)

func stop_voice():
	voice_player.stop()

## Linear 0..1, silent at 0. Keeps the volume knob out of decibels.
func set_voice_volume_linear(linear: float) -> void:
	voice_player.volume_db = linear_to_db(linear) if linear > 0.0 else -80.0

func is_voice_playing() -> bool:
	return voice_player.playing

## -1.0 when there is no duration to give. NonstopDebate sizes its panel
## crossings from this, so a missing file silently changes the pacing.
func get_voice_line_duration(audio_filename: String) -> float:
	if audio_filename.is_empty():
		return -1.0
	var audio_path = TrialLoader.get_audio_path(audio_filename)
	if audio_path.is_empty():
		_warn_once("Voice line '%s' is not in the trial's Audio folder" % audio_filename)
		return -1.0
	var stream = _load_audio_from_file(audio_path)
	if stream == null:
		_warn_once("Voice line '%s' could not be decoded" % audio_filename)
		return -1.0
	return stream.get_length()

func _load_audio_from_file(file_path: String) -> AudioStream:
	if _audio_cache.has(file_path):
		return _audio_cache[file_path]

	if not FileAccess.file_exists(file_path):
		Log.warn("AudioManager", "File not found: %s" % file_path)
		return null

	var bytes = FileAccess.get_file_as_bytes(file_path)
	var stream := AudioStreamLoader.from_bytes(bytes, file_path.get_extension())

	if stream:
		if _audio_cache.size() >= _MAX_AUDIO_CACHE_SIZE:
			_audio_cache.erase(_audio_cache.keys()[0])
		_audio_cache[file_path] = stream

	return stream

func set_voice_pitch(scale: float):
	voice_player.pitch_scale = scale

## Called by TrialLoader between trials. Keys are EXTRACT_DIR paths, which
## every trial reuses, so entries from one trial resolve for the next - and the
## warnings are about the previous trial's filenames.
func clear_cache():
	_audio_cache.clear()
	_warned.clear()
