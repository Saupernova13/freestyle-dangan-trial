extends CanvasLayer

## Shared placeholder overlay for stub/not-yet-implemented minigames
## (RebuttalShowdown, PsycheTaxi, ClosingArgument). Scene-driven —
## see scenes/minigames/stub_minigame_overlay.tscn.
##
## Each stub minigame instantiates this scene and calls set_title() with
## its own name + color, then auto-completes after a few seconds.

@onready var _title: Label = %Title
@onready var _subtitle: Label = %Subtitle

func set_title(title_text: String, color: Color):
	if _title:
		_title.text = title_text
		_title.add_theme_color_override("font_color", color)

func set_subtitle(text: String):
	if _subtitle:
		_subtitle.text = text
