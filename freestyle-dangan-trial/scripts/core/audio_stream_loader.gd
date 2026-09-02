class_name AudioStreamLoader
extends RefCounted
## Raw bytes -> AudioStream, picked by file extension. Trials ship compressed
## audio the editor never re-encodes, so streams are built at runtime rather
## than imported.
##
## Every failure here returns null and says why, naming `label` (the caller
## passes the file path). Returning a wrong-but-plausible stream is worse than
## returning none: the player hears loud static and the author has nothing to
## go on.

## WAVE_FORMAT_* codes from the fmt chunk.
const _WAVE_PCM := 1
const _WAVE_FLOAT := 3
const _WAVE_EXTENSIBLE := 0xFFFE

## Godot's AudioStreamWAV takes 8- or 16-bit PCM. Anything wider is converted
## down rather than refused: a 24-bit export from Audacity or Reaper is a
## normal thing for an author to produce, and refusing it leaves them with
## silent voice lines and a log line they may never read.
const _SUPPORTED_BIT_DEPTHS := [8, 16, 24, 32]


static func from_bytes(bytes: PackedByteArray, extension: String, label: String = "") -> AudioStream:
	var who := label if not label.is_empty() else "<unnamed>"
	if bytes.is_empty():
		Log.error("AudioStreamLoader", "%s is empty" % who)
		return null
	match extension.to_lower():
		"mp3":
			var mp3 := AudioStreamMP3.new()
			mp3.data = bytes
			return mp3
		"ogg":
			# load_from_buffer returns null on a malformed payload; passing
			# that straight through lost the only place that knew why.
			var ogg := AudioStreamOggVorbis.load_from_buffer(bytes)
			if ogg == null:
				Log.error("AudioStreamLoader", "%s is not readable Ogg Vorbis" % who)
			return ogg
		"wav":
			return _parse_wav(bytes, who)
	Log.error("AudioStreamLoader", "%s has unsupported extension '%s'" % [who, extension])
	return null


## Godot ships no runtime WAV loader to match the mp3/ogg buffer constructors,
## so the RIFF chunk table is walked here.
##
## The previous version read fmt fields from fixed offsets 22/24/34 and scanned
## for the bytes "data" up to offset 200, falling back to 44 if it found none.
## That accepted anything: an MP3 renamed .wav took a garbage mix_rate from
## offset 24 and played its bytes as PCM, and a file whose LIST/INFO chunk
## pushed "data" past byte 200 played its own metadata as audio. Both are
## silent failures that produce sound.
static func _parse_wav(bytes: PackedByteArray, who: String) -> AudioStreamWAV:
	# 12 bytes of RIFF header, then at least one 8-byte chunk header.
	if bytes.size() < 20:
		Log.error("AudioStreamLoader", "%s is too short to be a WAV (%d bytes)" % [who, bytes.size()])
		return null
	if _tag_at(bytes, 0) != "RIFF" or _tag_at(bytes, 8) != "WAVE":
		Log.error(
			"AudioStreamLoader",
			(
				"%s is not a RIFF/WAVE file (got %s / %s)"
				% [who, JSON.stringify(_tag_at(bytes, 0)), JSON.stringify(_tag_at(bytes, 8))]
			)
		)
		return null

	var chunks := _chunk_table(bytes)
	if not chunks.has("fmt "):
		Log.error("AudioStreamLoader", "%s has no fmt chunk" % who)
		return null
	if not chunks.has("data"):
		Log.error("AudioStreamLoader", "%s has no data chunk" % who)
		return null

	var fmt: Dictionary = chunks["fmt "]
	if fmt["size"] < 16:
		Log.error(
			"AudioStreamLoader", "%s has a %d-byte fmt chunk; 16 is the minimum" % [who, fmt["size"]]
		)
		return null

	var fmt_at: int = fmt["offset"]
	var format_code := bytes.decode_u16(fmt_at)
	var channels := bytes.decode_u16(fmt_at + 2)
	var mix_rate := bytes.decode_u32(fmt_at + 4)
	var bit_depth := bytes.decode_u16(fmt_at + 14)

	# WAVE_FORMAT_EXTENSIBLE carries the real code in the first two bytes of
	# its SubFormat GUID, 24 bytes into the chunk. 24-bit files are routinely
	# written this way, so reading the wrapper code alone would reject them.
	if format_code == _WAVE_EXTENSIBLE and fmt["size"] >= 40:
		format_code = bytes.decode_u16(fmt_at + 24)

	if format_code != _WAVE_PCM and format_code != _WAVE_FLOAT:
		Log.error(
			"AudioStreamLoader",
			"%s is compressed WAV (format %d); only PCM and float are readable" % [who, format_code]
		)
		return null
	if channels < 1 or channels > 2:
		Log.error("AudioStreamLoader", "%s has %d channels; mono or stereo only" % [who, channels])
		return null
	if mix_rate == 0:
		Log.error("AudioStreamLoader", "%s declares a sample rate of 0" % who)
		return null
	if not _SUPPORTED_BIT_DEPTHS.has(bit_depth):
		Log.error(
			"AudioStreamLoader", "%s is %d-bit; 8, 16, 24 and 32 are readable" % [who, bit_depth]
		)
		return null
	if format_code == _WAVE_FLOAT and bit_depth != 32:
		Log.error(
			"AudioStreamLoader", "%s is %d-bit float; only 32-bit float is readable" % [who, bit_depth]
		)
		return null

	var data: Dictionary = chunks["data"]
	# Bounded by the declared chunk size. Slicing to EOF played whatever
	# followed data - LIST/INFO is commonly written last - as audio.
	var payload := bytes.slice(data["offset"], data["offset"] + data["size"])
	if payload.is_empty():
		Log.error("AudioStreamLoader", "%s has an empty data chunk" % who)
		return null

	var wav := AudioStreamWAV.new()
	wav.mix_rate = mix_rate
	wav.stereo = channels == 2
	if bit_depth == 8:
		# WAV stores 8-bit samples unsigned; FORMAT_8_BITS is signed, so the
		# bytes need re-centring or the line plays with a DC offset.
		wav.format = AudioStreamWAV.FORMAT_8_BITS
		wav.data = _unsigned_to_signed_8(payload)
	else:
		wav.format = AudioStreamWAV.FORMAT_16_BITS
		wav.data = _to_pcm16(payload, bit_depth, format_code)
	return wav


## Every top-level chunk, keyed by tag, as {offset, size} pointing at the
## payload. First occurrence wins; a declared size running past the end is
## truncated rather than read out of bounds.
static func _chunk_table(bytes: PackedByteArray) -> Dictionary:
	var chunks := {}
	var at := 12
	while at + 8 <= bytes.size():
		var tag := _tag_at(bytes, at)
		var size := bytes.decode_u32(at + 4)
		var payload_at := at + 8
		var available: int = maxi(bytes.size() - payload_at, 0)
		if not chunks.has(tag):
			chunks[tag] = {"offset": payload_at, "size": mini(size, available)}
		# Chunks are padded to an even length; the pad byte is not counted in
		# size, and skipping it walks every later chunk off by one.
		at = payload_at + size + (size & 1)
	return chunks


static func _tag_at(bytes: PackedByteArray, at: int) -> String:
	if at + 4 > bytes.size():
		return ""
	return bytes.slice(at, at + 4).get_string_from_ascii()


static func _unsigned_to_signed_8(payload: PackedByteArray) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(payload.size())
	for i in range(payload.size()):
		out[i] = (payload[i] + 128) & 0xFF
	return out


## Narrows 24-bit and 32-bit samples to the 16-bit format Godot plays, keeping
## the high bytes. 16-bit input is returned unchanged.
static func _to_pcm16(payload: PackedByteArray, bit_depth: int, format_code: int) -> PackedByteArray:
	if bit_depth == 16:
		return payload

	var bytes_per_sample := bit_depth / 8
	var sample_count := payload.size() / bytes_per_sample
	var out := PackedByteArray()
	out.resize(sample_count * 2)
	for i in range(sample_count):
		var at := i * bytes_per_sample
		var value := 0
		if format_code == _WAVE_FLOAT:
			# [-1,1] float to signed 16-bit, clamped: a sample above 1.0 would
			# otherwise wrap and read as full-scale noise of the opposite sign.
			var f := clampf(payload.decode_float(at), -1.0, 1.0)
			value = int(round(f * 32767.0))
		elif bit_depth == 24:
			# Little-endian, so the top two bytes are the 16-bit sample.
			value = payload.decode_s16(at + 1)
		else:
			value = payload.decode_s32(at) >> 16
		out.encode_s16(i * 2, value)
	return out
