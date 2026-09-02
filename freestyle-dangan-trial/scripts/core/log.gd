extends Node
## Leveled logging with a real threshold.
##
## debug and info used to have byte-identical bodies gated on one flag, and
## the output did not record which was called - so the two were
## indistinguishable in a log, "leveled" described nothing, and there was no
## way to get info without debug. Anything below the threshold is now dropped,
## and every line carries its level.
##
## Default threshold: DEBUG in a debug build, WARN in a release build - so a
## player's log carries problems and nothing else. DANGAN_LOG_LEVEL overrides
## it (debug|info|warn|error); DANGAN_VERBOSE=1 still means debug.
##
## warn and error go through push_warning/push_error, so they reach the Godot
## error list as well as stdout.

enum Level { DEBUG, INFO, WARN, ERROR }

const LEVEL_NAMES := {
	Level.DEBUG: "DEBUG",
	Level.INFO: "INFO",
	Level.WARN: "WARN",
	Level.ERROR: "ERROR",
}

const _LEVELS_BY_NAME := {
	"debug": Level.DEBUG,
	"info": Level.INFO,
	"warn": Level.WARN,
	"warning": Level.WARN,
	"error": Level.ERROR,
}

## Public so a test or a debug console can raise or lower it at runtime.
var min_level: Level = Level.DEBUG if OS.is_debug_build() else Level.WARN


func _ready() -> void:
	min_level = _resolve_min_level()


func _resolve_min_level() -> Level:
	var requested := OS.get_environment("DANGAN_LOG_LEVEL").strip_edges().to_lower()
	if _LEVELS_BY_NAME.has(requested):
		return _LEVELS_BY_NAME[requested]
	if not requested.is_empty():
		push_warning(
			"[WARN][Log] DANGAN_LOG_LEVEL=%s is not one of %s; keeping the default"
			% [requested, ", ".join(_LEVELS_BY_NAME.keys())]
		)
	# Kept because it is what CONTRIBUTING.md and the CHANGELOG document.
	if OS.get_environment("DANGAN_VERBOSE") == "1":
		return Level.DEBUG
	return Level.DEBUG if OS.is_debug_build() else Level.WARN


func is_enabled(level: Level) -> bool:
	return level >= min_level


func debug(tag: String, msg: String) -> void:
	if is_enabled(Level.DEBUG):
		print(_format(Level.DEBUG, tag, msg))


func info(tag: String, msg: String) -> void:
	if is_enabled(Level.INFO):
		print(_format(Level.INFO, tag, msg))


func warn(tag: String, msg: String) -> void:
	if is_enabled(Level.WARN):
		push_warning(_format(Level.WARN, tag, msg))


func error(tag: String, msg: String) -> void:
	if is_enabled(Level.ERROR):
		push_error(_format(Level.ERROR, tag, msg))


func _format(level: Level, tag: String, msg: String) -> String:
	return "[%s][%s] %s" % [LEVEL_NAMES[level], tag, msg]
