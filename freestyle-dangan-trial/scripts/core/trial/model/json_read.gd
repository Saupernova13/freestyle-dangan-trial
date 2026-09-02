class_name JsonRead
extends RefCounted
## Coercion for values that came out of JSON.
##
## `Dictionary.get(key, default)` returns the default only when the key is
## ABSENT. A present `"key": null` returns null, and so does a present
## `"key": 7` when the reader wanted a String - the mistake then surfaces
## wherever the value is first used, as `Nonexistent function 'to_upper' in
## base 'Nil'`, which aborts the enclosing function. In initialize() that
## leaves a half-built minigame that MinigameRunner still calls start() on.
##
## Every reader goes through here instead, so a bad value degrades to a
## default at the point it is read rather than crashing somewhere later.
## ScriptLine has always worked this way; these are the same three rules,
## shared so typeSpecific and the panels can follow them too.


static func str_of(v: Variant, fallback: String = "") -> String:
	return v if v is String else fallback


static func bool_of(v: Variant, fallback: bool = false) -> bool:
	return v if v is bool else fallback


static func int_of(v: Variant, fallback: int = 0) -> int:
	return int(v) if (v is int or v is float) else fallback


static func float_of(v: Variant, fallback: float = 0.0) -> float:
	return float(v) if (v is int or v is float) else fallback


static func dict_of(v: Variant) -> Dictionary:
	return v if v is Dictionary else {}


static func array_of(v: Variant) -> Array:
	return v if v is Array else []


## Objects only. A String where an object list was expected is the shape that
## reaches `.get()` on a String and takes the whole minigame down with it.
## `label` names the field in the warning, so the author can find it.
static func dicts_of(v: Variant, label: String = "") -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	if not v is Array:
		if v != null:
			push_warning("%s is not a list; ignoring it" % _label(label))
		return out
	for i in range(v.size()):
		if v[i] is Dictionary:
			out.append(v[i])
		else:
			push_warning("%s[%d] is not an object; skipping it" % [_label(label), i])
	return out


static func strings_of(v: Variant, label: String = "") -> Array[String]:
	var out: Array[String] = []
	if not v is Array:
		if v != null:
			push_warning("%s is not a list; ignoring it" % _label(label))
		return out
	for i in range(v.size()):
		if v[i] is String:
			out.append(v[i])
		else:
			push_warning("%s[%d] is not a string; skipping it" % [_label(label), i])
	return out


static func _label(label: String) -> String:
	return label if not label.is_empty() else "value"
