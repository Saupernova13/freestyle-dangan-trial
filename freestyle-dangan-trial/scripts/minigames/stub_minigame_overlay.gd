extends CanvasLayer

## Placeholder overlay for the unimplemented minigames: RebuttalShowdown,
## PsycheTaxi, ClosingArgument. Each sets its own title and color, then
## auto-completes.

@onready var _title: Label = %Title
@onready var _subtitle: Label = %Subtitle

func set_title(title_text: String, color: Color):
	if _title:
		_title.text = title_text
		_title.add_theme_color_override("font_color", color)

func set_subtitle(text: String):
	if _subtitle:
		_subtitle.text = text
