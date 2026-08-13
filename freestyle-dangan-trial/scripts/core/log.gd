extends Node
## Leveled logging. debug and info are muted in release builds; DANGAN_VERBOSE=1
## re-enables them. warn and error always go through push_warning/push_error.
## This replaces raw print() only — existing push_* call sites stay as they are.

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
