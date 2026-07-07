extends Node
## Leveled logging. debug/info are muted in release builds so shipped players
## aren't spammed; set DANGAN_VERBOSE=1 to re-enable them in a release build.
## warn/error always emit through push_warning/push_error (visible in the
## debugger and on stderr). Existing push_warning/push_error call sites are
## intentionally not migrated -- this replaces raw print() only.

var verbose: bool = OS.is_debug_build() or OS.get_environment("DANGAN_VERBOSE") == "1"


func debug(tag: String, msg: String) -> void:
	if verbose:
		print("[%s] %s" % [tag, msg])


func info(tag: String, msg: String) -> void:
	if verbose:
		print("[%s] %s" % [tag, msg])


func warn(tag: String, msg: String) -> void:
	push_warning("[%s] %s" % [tag, msg])


func error(tag: String, msg: String) -> void:
	push_error("[%s] %s" % [tag, msg])
