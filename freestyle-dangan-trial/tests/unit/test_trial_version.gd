extends GdUnitTestSuite
## check_version's policy, on its own because it is a policy rather than a
## shape check: an unrecognised version warns and loads, an older major warns
## and loads, and only a newer major is refused. These pin which input takes
## which branch, including the ones that skip the gate entirely.

const FIXTURE_PATH := "res://tests/fixtures/minimal-trial/trial.json"


func _load_fixture() -> Dictionary:
	var text := FileAccess.get_file_as_string(FIXTURE_PATH)
	assert_str(text).is_not_empty()
	var json := JSON.new()
	assert_int(json.parse(text)).is_equal(OK)
	return json.data


func test_newer_major_version_is_rejected() -> void:
	var data := _load_fixture()
	data["metadata"]["version"] = "5.0"
	assert_str(TrialValidator.check_version(data)).is_not_empty()


func test_missing_metadata_warns_but_passes() -> void:
	var data := _load_fixture()
	data.erase("metadata")
	assert_str(TrialValidator.check_version(data)).is_empty()
	assert_array(TrialValidator.validate(data)).is_empty()


func test_older_major_version_passes() -> void:
	var data := _load_fixture()
	data["metadata"]["version"] = "3.0"
	assert_str(TrialValidator.check_version(data)).is_empty()


func test_an_unparseable_version_string_warns_and_loads() -> void:
	assert_str(TrialValidator.check_version({"metadata": {"version": "abc"}})).is_empty()
	assert_str(TrialValidator.check_version({"metadata": {"version": ""}})).is_empty()


func test_a_version_with_no_dot_is_read_as_its_major() -> void:
	# "4" splits to ["4"], which parses. "5" must still be rejected, or a
	# newer file would load against an engine that cannot play it.
	assert_str(TrialValidator.check_version({"metadata": {"version": "4"}})).is_empty()
	assert_str(TrialValidator.check_version({"metadata": {"version": "5"}})).is_not_empty()


func test_a_numeric_version_is_treated_as_a_legacy_file() -> void:
	# {"version": 4.0} is a number, not a string, so it takes the
	# no-metadata.version branch and loads with a warning. Pinned because it
	# is a plausible hand-edit that silently skips the version gate - a
	# numeric 5.0 would load too.
	assert_str(TrialValidator.check_version({"metadata": {"version": 4.0}})).is_empty()
	assert_str(TrialValidator.check_version({"metadata": {"version": 5.0}})).is_empty()


func test_a_missing_metadata_object_warns_and_loads() -> void:
	assert_str(TrialValidator.check_version({})).is_empty()
	assert_str(TrialValidator.check_version({"metadata": "4.0"})).is_empty()
