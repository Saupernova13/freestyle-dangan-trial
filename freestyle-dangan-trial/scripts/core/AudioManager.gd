extends Node

var voice_player: AudioStreamPlayer
var sfx_player: AudioStreamPlayer
var bgm_player: AudioStreamPlayer
var bgm_crossfade_player: AudioStreamPlayer

var voice_volume_db: float = 0.0
var sfx_volume_db: float = 0.0
var bgm_volume_db: float = -6.0

var _audio_cache: Dictionary = {}

func _ready():
	voice_player = AudioStreamPlayer.new()
	voice_player.bus = "Master"
	add_child(voice_player)

	sfx_player = AudioStreamPlayer.new()
	sfx_player.bus = "Master"
	add_child(sfx_player)

	bgm_player = AudioStreamPlayer.new()
	bgm_player.bus = "Master"
	bgm_player.volume_db = bgm_volume_db
	add_child(bgm_player)

	bgm_crossfade_player = AudioStreamPlayer.new()
	bgm_crossfade_player.bus = "Master"
	bgm_crossfade_player.volume_db = -80.0
	add_child(bgm_crossfade_player)

func play_voice_line(audio_filename: String):
	if audio_filename.is_empty():
		return

	var audio_path = TrialLoader.get_audio_path(audio_filename)
	if audio_path.is_empty():
		return

	var stream = _load_audio_from_file(audio_path)
	if stream:
		voice_player.stream = stream
		voice_player.volume_db = voice_volume_db
		voice_player.play()

func stop_voice():
	voice_player.stop()

func is_voice_playing() -> bool:
	return voice_player.playing

func play_sfx(sfx_name: String):
	var stream = _get_builtin_sfx(sfx_name)
	if stream:
		sfx_player.stream = stream
		sfx_player.volume_db = sfx_volume_db
		sfx_player.play()

func play_bgm(bgm_path: String, crossfade_duration: float = 1.0):
	if bgm_path.is_empty():
		stop_bgm(crossfade_duration)
		return

	var stream = _load_audio_from_file(bgm_path)
	if not stream:
		return

	if bgm_player.playing:
		bgm_crossfade_player.stream = stream
		bgm_crossfade_player.volume_db = -80.0
		bgm_crossfade_player.play()

		var tween = create_tween()
		tween.set_parallel(true)
		tween.tween_property(bgm_player, "volume_db", -80.0, crossfade_duration)
		tween.tween_property(bgm_crossfade_player, "volume_db", bgm_volume_db, crossfade_duration)
		tween.finished.connect(func():
			bgm_player.stop()
			bgm_player.stream = bgm_crossfade_player.stream
			bgm_player.volume_db = bgm_volume_db
			bgm_player.play(bgm_crossfade_player.get_playback_position())
			bgm_crossfade_player.stop()
		)
	else:
		bgm_player.stream = stream
		bgm_player.volume_db = bgm_volume_db
		bgm_player.play()

func stop_bgm(fade_duration: float = 1.0):
	if bgm_player.playing:
		var tween = create_tween()
		tween.tween_property(bgm_player, "volume_db", -80.0, fade_duration)
		tween.finished.connect(func(): bgm_player.stop())

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
			var wav = AudioStreamWAV.new()
			stream = _parse_wav_data(bytes)
		_:
			push_warning("AudioManager: Unsupported format: ", ext)

	if stream:
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

func _get_builtin_sfx(sfx_name: String) -> AudioStream:
	# Placeholder SFX using generated tones
	match sfx_name:
		"text_blip":
			return _generate_tone(880.0, 0.03)
		"wrong_buzzer":
			return _generate_tone(200.0, 0.3)
		"correct_chime":
			return _generate_tone(1200.0, 0.2)
		"bullet_fire":
			return _generate_tone(600.0, 0.1)
		"break_shatter":
			return _generate_tone(1500.0, 0.15)
		"influence_damage":
			return _generate_tone(300.0, 0.25)
		_:
			return null

func _generate_tone(frequency: float, duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var num_samples = int(sample_rate * duration)
	var data = PackedByteArray()
	data.resize(num_samples * 2)

	for i in range(num_samples):
		var t = float(i) / sample_rate
		var envelope = 1.0 - (t / duration)
		var sample = sin(t * frequency * TAU) * envelope * 0.3
		var sample_int = int(clamp(sample * 32767, -32768, 32767))
		data.encode_s16(i * 2, sample_int)

	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav

func set_voice_volume(linear: float):
	voice_volume_db = linear_to_db(clamp(linear, 0.001, 1.0))

func set_sfx_volume(linear: float):
	sfx_volume_db = linear_to_db(clamp(linear, 0.001, 1.0))

func set_bgm_volume(linear: float):
	bgm_volume_db = linear_to_db(clamp(linear, 0.001, 1.0))
	if bgm_player.playing:
		bgm_player.volume_db = bgm_volume_db

func clear_cache():
	_audio_cache.clear()
