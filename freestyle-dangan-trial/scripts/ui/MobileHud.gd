extends CanvasLayer
## On-screen touch HUD for actions that are otherwise keyboard/mouse-only:
## settings (replaces ESC), bullet prev/next (replaces Q/E and scroll wheel),
## focus toggle (replaces right-click and F), and slow-time hold (replaces the
## debate_slow_time keyboard action).
##
## Layout and styling are scene-owned — see scenes/ui/mobile_hud.tscn. setup()
## just shows the buttons a given minigame asked for; each button fires the same
## InputManager signal the keyboard/mouse handlers do, so downstream listeners
## need no mobile-specific path. Spawned by MinigameBase on mobile builds.

@onready var _settings_btn: Button = %SettingsButton
@onready var _focus_btn: Button = %FocusButton
@onready var _slow_btn: Button = %SlowButton
@onready var _left_column: Control = %LeftActionColumn
@onready var _bullet_row: Control = %BulletRow

var _slow_holding: bool = false

func _ready():
	_settings_btn.pressed.connect(func(): InputManager.settings_toggle_requested.emit())
	# Drive focus through InputManager so Crosshair gets the same
	# focus_started/ended pair as a right-click or F press.
	_focus_btn.toggled.connect(func(pressed): InputManager.set_focus(pressed))
	# button_down/up mirror the desktop "hold key" slow-time semantics.
	_slow_btn.button_down.connect(func(): _set_slow_held(true))
	_slow_btn.button_up.connect(func(): _set_slow_held(false))
	(%BulletPrev as Button).pressed.connect(func(): InputManager.bullet_prev.emit())
	(%BulletNext as Button).pressed.connect(func(): InputManager.bullet_next.emit())

func setup(opts: Dictionary) -> void:
	_settings_btn.visible = opts.get("settings", true)
	_focus_btn.visible = opts.get("focus", false)
	_slow_btn.visible = opts.get("slow_time", false)
	_left_column.visible = _focus_btn.visible or _slow_btn.visible
	_bullet_row.visible = opts.get("bullet_cycle", false)

func _set_slow_held(held: bool) -> void:
	if held == _slow_holding:
		return
	_slow_holding = held
	# NonstopDebate polls Input.is_action_pressed("debate_slow_time") in
	# _process(); drive that action so touch takes the same code path as the key.
	if held:
		Input.action_press("debate_slow_time")
	else:
		Input.action_release("debate_slow_time")

func _exit_tree():
	if _slow_holding:
		Input.action_release("debate_slow_time")
