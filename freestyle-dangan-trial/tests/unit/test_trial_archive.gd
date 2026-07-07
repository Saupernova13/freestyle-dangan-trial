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
	assert_bool(TrialArchive.extract(ZIP_PATH, DEST_DIR)).is_true()
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

	assert_bool(TrialArchive.extract(ZIP_PATH, DEST_DIR)).is_true()
	assert_bool(FileAccess.file_exists(DEST_DIR + "stale_leftover.png")).is_false()
	assert_bool(FileAccess.file_exists(DEST_DIR + "trial.json")).is_true()


func test_extract_reports_progress() -> void:
	var calls: Array = []
	var ok := TrialArchive.extract(ZIP_PATH, DEST_DIR,
		func(done: int, total: int) -> void: calls.append([done, total]))
	assert_bool(ok).is_true()
	assert_int(calls.size()).is_equal(2)
	assert_array(calls[calls.size() - 1]).is_equal([2, 2])
