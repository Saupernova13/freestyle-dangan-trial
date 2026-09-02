extends GdUnitTestSuite
## TrialArchive extraction, exercised against a zip built on the fly in
## user:// so the test is self-contained and headless-safe.

const ZIP_PATH := "user://gdunit_test_trial.zip"
const DEST_DIR := "user://gdunit_test_extract/"


func before_test() -> void:
	var packer := ZIPPacker.new()
	assert_int(packer.open(ZIP_PATH)).is_equal(OK)
	packer.start_file("trial.json")
	packer.write_file('{"trialName": "Zipped"}'.to_utf8_buffer())
	packer.close_file()
	packer.start_file("Characters/Someone/character.json")
	packer.write_file('{"id": "SO_1"}'.to_utf8_buffer())
	packer.close_file()
	packer.close()


func after_test() -> void:
	DirAccess.remove_absolute(ZIP_PATH)


func test_extract_unpacks_all_files() -> void:
	assert_str(TrialArchive.extract(ZIP_PATH, DEST_DIR)).is_empty()
	assert_str(FileAccess.get_file_as_string(DEST_DIR + "trial.json")).is_equal(
		'{"trialName": "Zipped"}'
	)
	assert_str(
		FileAccess.get_file_as_string(DEST_DIR + "Characters/Someone/character.json")
	).is_equal('{"id": "SO_1"}')


func test_extract_wipes_stale_files_from_previous_trial() -> void:
	# A file left behind by a previously extracted trial must not survive,
	# or trial B could resolve assets belonging to trial A by name.
	DirAccess.make_dir_recursive_absolute(DEST_DIR)
	var stale := FileAccess.open(DEST_DIR + "stale_leftover.png", FileAccess.WRITE)
	stale.store_string("stale")
	stale.close()

	assert_str(TrialArchive.extract(ZIP_PATH, DEST_DIR)).is_empty()
	assert_bool(FileAccess.file_exists(DEST_DIR + "stale_leftover.png")).is_false()
	assert_bool(FileAccess.file_exists(DEST_DIR + "trial.json")).is_true()


func test_extract_reports_progress() -> void:
	var calls: Array = []
	var error := TrialArchive.extract(ZIP_PATH, DEST_DIR,
		func(done: int, total: int) -> void: calls.append([done, total]))
	assert_str(error).is_empty()
	assert_int(calls.size()).is_equal(2)
	assert_array(calls[calls.size() - 1]).is_equal([2, 2])


## A .drtrial arrives from a third party, so an entry name is untrusted input.
func _pack_one(zip_path: String, entry: String) -> void:
	var packer := ZIPPacker.new()
	assert_int(packer.open(zip_path)).is_equal(OK)
	packer.start_file(entry)
	packer.write_file("escaped".to_utf8_buffer())
	packer.close_file()
	packer.close()


func test_extract_rejects_a_traversal_entry_and_keeps_the_installed_trial() -> void:
	assert_str(TrialArchive.extract(ZIP_PATH, DEST_DIR)).is_empty()

	var evil := "user://gdunit_test_traversal.zip"
	_pack_one(evil, "../../gdunit_escaped.txt")
	# Reported, never partially applied: the previous trial must survive an
	# archive that fails, so the check has to run before the destination is wiped.
	assert_str(TrialArchive.extract(evil, DEST_DIR)).is_not_empty()
	assert_bool(FileAccess.file_exists("user://gdunit_escaped.txt")).is_false()
	assert_bool(FileAccess.file_exists(DEST_DIR + "trial.json")).is_true()
	DirAccess.remove_absolute(evil)


func test_extract_rejects_an_absolute_entry() -> void:
	var evil := "user://gdunit_test_absolute.zip"
	_pack_one(evil, "/gdunit_absolute.txt")
	assert_str(TrialArchive.extract(evil, DEST_DIR)).is_not_empty()
	DirAccess.remove_absolute(evil)


func test_an_empty_archive_is_refused_before_the_destination_is_cleared() -> void:
	# _clear_dir used to run the moment the ZIP opened, so a valid but empty
	# archive destroyed the previously extracted trial and still reported
	# success.
	assert_str(TrialArchive.extract(ZIP_PATH, DEST_DIR)).is_empty()

	var empty := "user://gdunit_test_empty.zip"
	var packer := ZIPPacker.new()
	assert_int(packer.open(empty)).is_equal(OK)
	packer.close()

	assert_str(TrialArchive.extract(empty, DEST_DIR)).is_not_empty()
	assert_bool(FileAccess.file_exists(DEST_DIR + "trial.json")).is_true()
	DirAccess.remove_absolute(empty)


func test_a_file_that_cannot_be_written_is_reported_not_swallowed() -> void:
	# A partial failure - disk full mid-extract, a denied subtree on Android -
	# used to log and carry on while extraction returned success either way, so
	# the trial played with characters missing.
	#
	# A 300-character name is the portable stand-in: every mainstream
	# filesystem caps a path component at 255, so the write fails while the
	# entry name itself is perfectly safe.
	var long_name := "x".repeat(300) + ".png"
	var partial := "user://gdunit_test_partial.zip"
	var packer := ZIPPacker.new()
	assert_int(packer.open(partial)).is_equal(OK)
	packer.start_file("trial.json")
	packer.write_file('{"trialName": "Partial"}'.to_utf8_buffer())
	packer.close_file()
	packer.start_file(long_name)
	packer.write_file("data".to_utf8_buffer())
	packer.close_file()
	packer.close()

	var error := TrialArchive.extract(partial, DEST_DIR)

	assert_str(error).contains("could not be written")
	# The rest still landed; the point is that the caller is told.
	assert_bool(FileAccess.file_exists(DEST_DIR + "trial.json")).is_true()
	DirAccess.remove_absolute(partial)
