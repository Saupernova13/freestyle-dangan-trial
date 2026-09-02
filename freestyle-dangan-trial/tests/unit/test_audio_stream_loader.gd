extends GdUnitTestSuite
## The WAV path used to accept anything and play it. It read the sample rate,
## channel count and bit depth from fixed offsets, scanned for the bytes "data"
## up to offset 200, and fell back to offset 44 when it found none - so an MP3
## renamed .wav, a 24-bit export, and a file with a large LIST chunk all
## produced a stream that played as static rather than no stream at all.
##
## Every case here is a file an author can plausibly produce.

const RATE := 44100


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


func _u16(value: int) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(2)
	out.encode_u16(0, value)
	return out


func _u32(value: int) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(4)
	out.encode_u32(0, value)
	return out


## tag + little-endian size + payload, padded to an even length as RIFF requires.
func _chunk(tag: String, payload: PackedByteArray) -> PackedByteArray:
	var out := tag.to_ascii_buffer()
	out.append_array(_u32(payload.size()))
	out.append_array(payload)
	if payload.size() % 2 == 1:
		out.append(0)
	return out


func _fmt_chunk(channels: int, bits: int, format_code: int) -> PackedByteArray:
	var block_align := channels * (bits / 8)
	var payload := _u16(format_code)
	payload.append_array(_u16(channels))
	payload.append_array(_u32(RATE))
	payload.append_array(_u32(RATE * block_align))  # byte rate
	payload.append_array(_u16(block_align))
	payload.append_array(_u16(bits))
	return _chunk("fmt ", payload)


## A whole file. `before` and `after` are extra chunks around the data chunk.
func _wav(
	channels: int,
	bits: int,
	format_code: int,
	data: PackedByteArray,
	before := PackedByteArray(),
	after := PackedByteArray()
) -> PackedByteArray:
	var body := "WAVE".to_ascii_buffer()
	body.append_array(before)
	body.append_array(_fmt_chunk(channels, bits, format_code))
	body.append_array(_chunk("data", data))
	body.append_array(after)

	var out := "RIFF".to_ascii_buffer()
	out.append_array(_u32(body.size()))
	out.append_array(body)
	return out


func _pcm16(samples: Array) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(samples.size() * 2)
	for i in range(samples.size()):
		out.encode_s16(i * 2, samples[i])
	return out


# ---------------------------------------------------------------------------
# The happy path still works
# ---------------------------------------------------------------------------


func test_a_canonical_16_bit_mono_wav_parses() -> void:
	var data := _pcm16([0, 1000, -1000, 32767])
	var wav := AudioStreamLoader.from_bytes(_wav(1, 16, 1, data), "wav", "voice.wav")
	assert_object(wav).is_not_null()
	assert_int(wav.mix_rate).is_equal(RATE)
	assert_bool(wav.stereo).is_false()
	assert_int(wav.format).is_equal(AudioStreamWAV.FORMAT_16_BITS)
	assert_array(Array(wav.data)).is_equal(Array(data))


func test_a_stereo_file_is_reported_as_stereo() -> void:
	var wav := AudioStreamLoader.from_bytes(_wav(2, 16, 1, _pcm16([0, 0, 0, 0])), "wav", "s.wav")
	assert_bool(wav.stereo).is_true()


# ---------------------------------------------------------------------------
# The failures that used to produce sound
# ---------------------------------------------------------------------------


func test_an_mp3_renamed_wav_is_refused_rather_than_played_as_pcm() -> void:
	# ID3 header. The old parser took mix_rate from offset 24 of this.
	var mp3 := "ID3".to_ascii_buffer()
	mp3.resize(400)
	assert_object(AudioStreamLoader.from_bytes(mp3, "wav", "renamed.wav")).is_null()


func test_a_riff_file_that_is_not_wave_is_refused() -> void:
	var avi := "RIFF".to_ascii_buffer()
	avi.append_array(_u32(64))
	avi.append_array("AVI ".to_ascii_buffer())
	avi.resize(80)
	assert_object(AudioStreamLoader.from_bytes(avi, "wav", "clip.wav")).is_null()


func test_a_large_metadata_chunk_no_longer_pushes_data_out_of_reach() -> void:
	# A LIST/INFO chunk this size is ordinary DAW output. The old scan gave up
	# at offset 200 and fell back to 44, playing the metadata as audio.
	var info := PackedByteArray()
	info.resize(300)
	info.fill(0x20)
	var data := _pcm16([1234, -1234])
	var wav := AudioStreamLoader.from_bytes(
		_wav(1, 16, 1, data, _chunk("LIST", info)), "wav", "tagged.wav"
	)
	assert_object(wav).is_not_null()
	assert_array(Array(wav.data)).is_equal(Array(data))


func test_a_chunk_after_data_is_not_played_as_audio() -> void:
	var trailing := PackedByteArray()
	trailing.resize(64)
	trailing.fill(0xFF)
	var data := _pcm16([5, 6, 7, 8])
	var wav := AudioStreamLoader.from_bytes(
		_wav(1, 16, 1, data, PackedByteArray(), _chunk("LIST", trailing)), "wav", "trailing.wav"
	)
	# Slicing to EOF appended the trailing chunk to the samples.
	assert_int(wav.data.size()).is_equal(data.size())


func test_an_odd_sized_chunk_before_fmt_does_not_desynchronise_the_walk() -> void:
	# RIFF pads an odd chunk to an even length and does not count the pad in
	# the size. Ignoring the pad walks every later chunk off by one byte.
	var odd := PackedByteArray()
	odd.resize(5)
	var data := _pcm16([42])
	var wav := AudioStreamLoader.from_bytes(
		_wav(1, 16, 1, data, _chunk("odd ", odd)), "wav", "odd.wav"
	)
	assert_object(wav).is_not_null()
	assert_int(wav.mix_rate).is_equal(RATE)


func test_a_file_with_no_data_chunk_is_refused() -> void:
	var body := "WAVE".to_ascii_buffer()
	body.append_array(_fmt_chunk(1, 16, 1))
	var out := "RIFF".to_ascii_buffer()
	out.append_array(_u32(body.size()))
	out.append_array(body)
	assert_object(AudioStreamLoader.from_bytes(out, "wav", "headeronly.wav")).is_null()


func test_a_compressed_wav_is_refused_by_name() -> void:
	# 17 is IMA ADPCM. Its bytes are not PCM and playing them is noise.
	assert_object(
		AudioStreamLoader.from_bytes(_wav(1, 16, 17, _pcm16([0, 0])), "wav", "adpcm.wav")
	).is_null()


func test_an_empty_data_chunk_is_refused() -> void:
	assert_object(
		AudioStreamLoader.from_bytes(_wav(1, 16, 1, PackedByteArray()), "wav", "silent.wav")
	).is_null()


# ---------------------------------------------------------------------------
# Bit depths Godot cannot play directly
# ---------------------------------------------------------------------------


func test_a_24_bit_export_is_narrowed_instead_of_played_as_static() -> void:
	# The issue's scenario: 24-bit out of Audacity or Reaper. Every sample is
	# little-endian, so the top two bytes are the 16-bit value.
	var data := PackedByteArray()
	data.resize(6)
	data.encode_u8(0, 0x11)
	data.encode_s16(1, 4000)
	data.encode_u8(3, 0x22)
	data.encode_s16(4, -4000)

	var wav := AudioStreamLoader.from_bytes(_wav(1, 24, 1, data), "wav", "reaper.wav")
	assert_object(wav).is_not_null()
	assert_int(wav.format).is_equal(AudioStreamWAV.FORMAT_16_BITS)
	assert_int(wav.data.size()).is_equal(4)
	assert_int(wav.data.decode_s16(0)).is_equal(4000)
	assert_int(wav.data.decode_s16(2)).is_equal(-4000)


func test_a_32_bit_float_export_is_narrowed_and_clamped() -> void:
	var data := PackedByteArray()
	data.resize(12)
	data.encode_float(0, 0.5)
	data.encode_float(4, -1.0)
	# Above full scale. Without the clamp this wraps and reads as loud noise
	# of the opposite sign.
	data.encode_float(8, 1.4)

	var wav := AudioStreamLoader.from_bytes(_wav(1, 32, 3, data), "wav", "float.wav")
	assert_object(wav).is_not_null()
	assert_int(wav.data.size()).is_equal(6)
	assert_int(wav.data.decode_s16(0)).is_equal(16384)
	assert_int(wav.data.decode_s16(2)).is_equal(-32767)
	assert_int(wav.data.decode_s16(4)).is_equal(32767)


func test_an_8_bit_file_is_recentred_from_unsigned_to_signed() -> void:
	# WAV writes 8-bit samples unsigned (128 is silence); FORMAT_8_BITS is
	# signed (0 is silence). Handing the bytes over untouched played the whole
	# line with a DC offset.
	var data := PackedByteArray([0, 128, 255])
	var wav := AudioStreamLoader.from_bytes(_wav(1, 8, 1, data), "wav", "old.wav")
	assert_object(wav).is_not_null()
	assert_int(wav.format).is_equal(AudioStreamWAV.FORMAT_8_BITS)
	assert_array(Array(wav.data)).is_equal([128, 0, 127])


func test_an_unreadable_bit_depth_is_refused_by_name() -> void:
	assert_object(
		AudioStreamLoader.from_bytes(_wav(1, 12, 1, _pcm16([0, 0])), "wav", "twelve.wav")
	).is_null()


func test_extensible_format_is_read_through_to_its_subformat() -> void:
	# WAVE_FORMAT_EXTENSIBLE (0xFFFE) is how most tools write 24-bit. Reading
	# the wrapper code alone would refuse a perfectly ordinary file.
	var payload := _u16(0xFFFE)
	payload.append_array(_u16(1))
	payload.append_array(_u32(RATE))
	payload.append_array(_u32(RATE * 3))
	payload.append_array(_u16(3))
	payload.append_array(_u16(24))
	payload.append_array(_u16(22))  # cbSize
	payload.append_array(_u16(24))  # valid bits
	payload.append_array(_u32(4))  # channel mask
	payload.append_array(_u16(1))  # SubFormat GUID, first field: PCM
	payload.resize(40)

	var body := "WAVE".to_ascii_buffer()
	body.append_array(_chunk("fmt ", payload))
	var data := PackedByteArray()
	data.resize(3)
	data.encode_s16(1, 777)
	body.append_array(_chunk("data", data))
	var out := "RIFF".to_ascii_buffer()
	out.append_array(_u32(body.size()))
	out.append_array(body)

	var wav := AudioStreamLoader.from_bytes(out, "wav", "extensible.wav")
	assert_object(wav).is_not_null()
	assert_int(wav.data.decode_s16(0)).is_equal(777)


# ---------------------------------------------------------------------------
# The other formats
# ---------------------------------------------------------------------------


func test_empty_bytes_are_refused() -> void:
	assert_object(AudioStreamLoader.from_bytes(PackedByteArray(), "mp3", "empty.mp3")).is_null()


func test_an_unsupported_extension_is_refused() -> void:
	assert_object(AudioStreamLoader.from_bytes(PackedByteArray([1, 2, 3]), "flac", "x.flac")).is_null()


func test_malformed_ogg_returns_null_rather_than_an_unchecked_stream() -> void:
	var junk := PackedByteArray()
	junk.resize(64)
	assert_object(AudioStreamLoader.from_bytes(junk, "ogg", "broken.ogg")).is_null()
