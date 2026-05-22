extends Node

var voice_player: AudioStreamPlayer
var sfx_player: AudioStreamPlayer
var bgm_player: AudioStreamPlayer
var bgm_crossfade_player: AudioStreamPlayer

var voice_volume_db: float = 0.0
var sfx_volume_db: float = 0.0
var bgm_volume_db: float = -6.0

var _audio_cache: Dictionary = {}
const _MAX_AUDIO_CACHE_SIZE: int = 50

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

func play_minigame_bgm(game_type: String) -> void:
	var stream = _generate_layered_bgm(game_type)
	if stream:
		bgm_player.stream = stream
		bgm_player.volume_db = bgm_volume_db
		bgm_player.play()

func stop_minigame_bgm(fade: float = 0.8) -> void:
	stop_bgm(fade)

func _generate_layered_bgm(game_type: String) -> AudioStreamWAV:
	var sample_rate = 22050
	var num_samples = sample_rate * 2  # 2-second loop
	var buf: Array = []
	buf.resize(num_samples)
	for i in range(num_samples):
		buf[i] = 0.0

	var spb = int(sample_rate * 60.0 / 110.0)  # samples per beat at 110 BPM (~12027)
	@warning_ignore("integer_division")
	var sp8 = spb / 2

	match game_type:
		"nonstop_debate":
			_add_pulse(buf, 80.0, [0, spb * 2], 0.4, int(sample_rate * 0.05))
			_add_drone(buf, 160.0, 0.15, 0.3)
			_add_noise_hits(buf, [0, sp8, spb, spb + sp8, spb * 2, spb * 2 + sp8, spb * 3, spb * 3 + sp8], 0.08, int(sample_rate * 0.012))
		"hangmans_gambit":
			_add_pulse(buf, 55.0, [0], 0.35, int(sample_rate * 0.06))
			_add_drone(buf, 110.0, 0.20, 0.1)
			_add_noise_hits(buf, [spb, spb * 3], 0.06, int(sample_rate * 0.015))
		"logic_dive":
			_add_pulse(buf, 100.0, [0, spb, spb * 2, spb * 3], 0.35, int(sample_rate * 0.04))
			_add_noise_hits(buf, [0, spb, spb * 2, spb * 3], 0.07, int(sample_rate * 0.01))
		"debate_scrum":
			_add_pulse(buf, 90.0, [0, spb * 2], 0.4, int(sample_rate * 0.05))
			_add_pulse(buf, 120.0, [spb, spb * 3], 0.35, int(sample_rate * 0.04))
			_add_noise_hits(buf, [0, spb, spb * 2, spb * 3], 0.09, int(sample_rate * 0.011))
		"mass_panic_debate":
			var every_8th: Array = []
			for k in range(8):
				every_8th.append(sp8 * k)
			_add_pulse(buf, 80.0, every_8th, 0.30, int(sample_rate * 0.03))
			_add_drone(buf, 200.0, 0.10, 2.0)
			_add_noise_hits(buf, every_8th, 0.12, int(sample_rate * 0.008))
		_:  # default / generic tense
			_add_pulse(buf, 80.0, [0, spb * 2], 0.4, int(sample_rate * 0.05))
			_add_drone(buf, 160.0, 0.15, 0.3)
			_add_noise_hits(buf, [spb, spb * 3], 0.08, int(sample_rate * 0.012))

	# Normalize to [-0.9, 0.9]
	var peak = 0.001
	for v in buf:
		if abs(v) > peak:
			peak = abs(v)
	var scale_factor = 0.9 / peak

	var data = PackedByteArray()
	data.resize(num_samples * 2)
	for i in range(num_samples):
		var s = clamp(buf[i] * scale_factor, -1.0, 1.0)
		data.encode_s16(i * 2, int(s * 32767))

	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = num_samples - 1
	wav.data = data
	return wav

func _add_pulse(buf: Array, freq: float, beat_offsets: Array, amp: float, burst_samples: int) -> void:
	var n = buf.size()
	var attack_samples = int(0.005 * 22050)  # 5ms attack
	for offset in beat_offsets:
		if offset >= n:
			continue
		for j in range(burst_samples):
			var idx = offset + j
			if idx >= n:
				break
			var t = float(j) / 22050.0
			var env: float
			if j < attack_samples:
				env = float(j) / attack_samples
			else:
				env = exp(-float(j - attack_samples) * 8.0 / burst_samples)
			buf[idx] += sin(t * freq * TAU) * env * amp

func _add_drone(buf: Array, freq: float, amp: float, vibrato_hz: float) -> void:
	var n = buf.size()
	for i in range(n):
		var t = float(i) / 22050.0
		var vib_freq = freq * (1.0 + 0.003 * sin(t * vibrato_hz * TAU))
		buf[i] += sin(t * vib_freq * TAU) * amp

func _add_noise_hits(buf: Array, beat_offsets: Array, amp: float, burst_samples: int) -> void:
	var n = buf.size()
	for offset in beat_offsets:
		if offset >= n:
			continue
		for j in range(burst_samples):
			var idx = offset + j
			if idx >= n:
				break
			var env = 1.0 - float(j) / burst_samples
			buf[idx] += randf_range(-amp, amp) * env

func _get_builtin_sfx(sfx_name: String) -> AudioStream:
	match sfx_name:
		"text_blip":
			# Not cached — randomize pitch each call for variety
			return _generate_tone(880.0 * randf_range(0.95, 1.05), 0.03, "linear")
		"wrong_buzzer":
			return _generate_chord([200.0, 300.0], 0.35, "linear")
		"correct_chime":
			return _generate_sweep(1200.0, 1600.0, 0.25, "adsr")
		"bullet_fire":
			return _generate_chord([800.0, 400.0], 0.12, "exponential")
		"break_shatter":
			return _generate_break_shatter()
		"influence_damage":
			return _generate_chord([250.0, 375.0], 0.3, "linear")
		_:
			return null

func _generate_tone(frequency: float, duration: float, decay: String = "linear") -> AudioStreamWAV:
	return _generate_chord([frequency], duration, decay)

func _generate_chord(freqs: Array, duration: float, decay: String) -> AudioStreamWAV:
	var sample_rate = 22050
	var num_samples = int(sample_rate * duration)
	var amp_per = 0.3 / max(freqs.size(), 1)
	var attack_samples = int(0.005 * sample_rate)  # 5ms attack

	var data = PackedByteArray()
	data.resize(num_samples * 2)

	for i in range(num_samples):
		var t = float(i) / sample_rate
		var envelope: float
		match decay:
			"exponential":
				envelope = exp(-t * 8.0 / duration)
			"adsr":
				if i < attack_samples:
					envelope = float(i) / attack_samples
				else:
					envelope = exp(-float(i - attack_samples) * 6.0 / num_samples)
			_:  # linear
				envelope = 1.0 - (t / duration)

		var sample = 0.0
		for freq in freqs:
			sample += sin(t * freq * TAU) * amp_per * envelope

		data.encode_s16(i * 2, int(clamp(sample * 32767, -32767, 32767)))

	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav

func _generate_sweep(freq_start: float, freq_end: float, duration: float, decay: String) -> AudioStreamWAV:
	var sample_rate = 22050
	var num_samples = int(sample_rate * duration)
	var attack_samples = int(0.005 * sample_rate)
	var data = PackedByteArray()
	data.resize(num_samples * 2)
	var phase = 0.0

	for i in range(num_samples):
		var t = float(i) / sample_rate
		var freq = lerp(freq_start, freq_end, t / duration)
		phase += freq / sample_rate
		var envelope: float
		match decay:
			"adsr":
				if i < attack_samples:
					envelope = float(i) / attack_samples
				else:
					envelope = exp(-float(i - attack_samples) * 5.0 / num_samples)
			_:
				envelope = 1.0 - (t / duration)
		var sample = sin(phase * TAU) * envelope * 0.3
		data.encode_s16(i * 2, int(clamp(sample * 32767, -32767, 32767)))

	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav

func _generate_break_shatter() -> AudioStreamWAV:
	var sample_rate = 22050
	var duration = 0.22
	var num_samples = int(sample_rate * duration)
	var data = PackedByteArray()
	data.resize(num_samples * 2)
	var noise_end = int(sample_rate * 0.01)  # 10ms noise burst at start

	for i in range(num_samples):
		var t = float(i) / sample_rate
		var env = exp(-t * 10.0 / duration)
		var sample = 0.0
		# Chord layers
		for freq in [1500.0, 900.0, 600.0]:
			sample += sin(t * freq * TAU) * (0.1 * env)
		# Noise burst for attack transient
		if i < noise_end:
			var noise_env = 1.0 - float(i) / noise_end
			sample += randf_range(-0.3, 0.3) * noise_env
		data.encode_s16(i * 2, int(clamp(sample * 32767, -32767, 32767)))

	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = data
	return wav

func set_voice_pitch(scale: float):
	voice_player.pitch_scale = scale

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
