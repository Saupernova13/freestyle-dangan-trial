extends Node
##
## Voice line playback. Volume is owned by Settings, which writes
## voice_player.volume_db directly.

var voice_player: AudioStreamPlayer

var _audio_cache: Dictionary = {}
const _MAX_AUDIO_CACHE_SIZE: int = 50

func _ready():
	voice_player = AudioStreamPlayer.new()
	voice_player.bus = "Master"
	add_child(voice_player)

func play_voice_line(audio_filename: String):
	if audio_filename.is_empty():
		return

	var audio_path = TrialLoader.get_audio_path(audio_filename)
	if audio_path.is_empty():
		return

	var stream = _load_audio_from_file(audio_path)
	if stream:
		voice_player.stream = stream
		voice_player.play()

func stop_voice():
	voice_player.stop()

func is_voice_playing() -> bool:
	return voice_player.playing

func get_voice_line_duration(audio_filename: String) -> float:
	if audio_filename.is_empty():
		return -1.0
	var audio_path = TrialLoader.get_audio_path(audio_filename)
	if audio_path.is_empty():
		return -1.0
	var stream = _load_audio_from_file(audio_path)
	if stream == null:
		return -1.0
	return stream.get_length()

func _load_audio_from_file(file_path: String) -> AudioStream:
	if _audio_cache.has(file_path):
		return _audio_cache[file_path]

	if not FileAccess.file_exists(file_path):
		push_warning("AudioManager: File not found: ", file_path)
		return null

	var bytes = FileAccess.get_file_as_bytes(file_path)
	if bytes.is_empty():
		return null

	var stream: AudioStream = null
	var ext = file_path.get_extension().to_lower()

	match ext:
		"mp3":
			var mp3 = AudioStreamMP3.new()
			mp3.data = bytes
			stream = mp3
		"ogg":
			stream = AudioStreamOggVorbis.load_from_buffer(bytes)
		"wav":
			stream = _parse_wav_data(bytes)
		_:
			push_warning("AudioManager: Unsupported format: ", ext)

	if stream:
		if _audio_cache.size() >= _MAX_AUDIO_CACHE_SIZE:
			_audio_cache.erase(_audio_cache.keys()[0])
		_audio_cache[file_path] = stream

	return stream

func _parse_wav_data(bytes: PackedByteArray) -> AudioStreamWAV:
	if bytes.size() < 44:
		return null

	var wav = AudioStreamWAV.new()
	var num_channels = bytes.decode_u16(22)
	var sample_rate = bytes.decode_u32(24)
	var bits_per_sample = bytes.decode_u16(34)

	wav.mix_rate = sample_rate
	wav.stereo = num_channels == 2

	match bits_per_sample:
		8:
			wav.format = AudioStreamWAV.FORMAT_8_BITS
		16:
			wav.format = AudioStreamWAV.FORMAT_16_BITS
		_:
			wav.format = AudioStreamWAV.FORMAT_16_BITS

	var data_offset = 44
	for i in range(12, min(bytes.size() - 8, 200)):
		if bytes[i] == 0x64 and bytes[i+1] == 0x61 and bytes[i+2] == 0x74 and bytes[i+3] == 0x61:
			data_offset = i + 8
			break

	wav.data = bytes.slice(data_offset)
	return wav

func set_voice_pitch(scale: float):
	voice_player.pitch_scale = scale

func clear_cache():
	_audio_cache.clear()
