class_name AudioStreamLoader
extends RefCounted
## Decodes raw audio bytes into an AudioStream, chosen by file extension.
## Trials ship compressed audio the editor never re-encodes, so playback has to
## build the stream at runtime rather than importing it.

static func from_bytes(bytes: PackedByteArray, extension: String) -> AudioStream:
	if bytes.is_empty():
		return null
	match extension.to_lower():
		"mp3":
			var mp3 := AudioStreamMP3.new()
			mp3.data = bytes
			return mp3
		"ogg":
			return AudioStreamOggVorbis.load_from_buffer(bytes)
		"wav":
			return _parse_wav(bytes)
	push_warning("AudioStreamLoader: Unsupported format: ", extension)
	return null

## Minimal WAV header parse. Godot has no runtime WAV loader equivalent to the
## mp3/ogg buffer constructors, so read channel count, sample rate and bit depth
## straight from the header and locate the "data" chunk.
static func _parse_wav(bytes: PackedByteArray) -> AudioStreamWAV:
	if bytes.size() < 44:
		return null

	var wav := AudioStreamWAV.new()
	wav.mix_rate = bytes.decode_u32(24)
	wav.stereo = bytes.decode_u16(22) == 2
	wav.format = AudioStreamWAV.FORMAT_8_BITS if bytes.decode_u16(34) == 8 else AudioStreamWAV.FORMAT_16_BITS

	var data_offset := 44
	for i in range(12, min(bytes.size() - 8, 200)):
		if bytes[i] == 0x64 and bytes[i + 1] == 0x61 and bytes[i + 2] == 0x74 and bytes[i + 3] == 0x61:
			data_offset = i + 8
			break

	wav.data = bytes.slice(data_offset)
	return wav
