extends CanvasLayer
## Touch HUD for the otherwise keyboard/mouse-only actions: settings, bullet
## prev/next, lie-mode toggle, focus toggle, and slow-time hold. Spawned by
## MinigameBase on mobile builds.
##
## Layout is scene-owned; setup() shows only the buttons a minigame asked for.
## Each button fires the same InputManager signal its keyboard equivalent does,
## so no listener needs a mobile-specific path.

@onready var _settings_btn: Button = %SettingsButton
@onready var _focus_btn: Button = %FocusButton
@onready var _slow_btn: Button = %SlowButton
@onready var _left_column: Control = %LeftActionColumn
@onready var _bullet_row: Control = %BulletRow

var _slow_holding: bool = false

func _ready():
	_settings_btn.pressed.connect(func(): InputManager.settings_toggle_requested.emit())
	# Via InputManager, so Crosshair sees the same pair a right-click sends.
	_focus_btn.toggled.connect(func(pressed): InputManager.set_focus(pressed))
	# button_down/up mirror the desktop hold-to-slow semantics.
	_slow_btn.button_down.connect(func(): _set_slow_held(true))
	_slow_btn.button_up.connect(func(): _set_slow_held(false))
	(%BulletPrev as Button).pressed.connect(func(): InputManager.bullet_prev.emit())
	(%BulletNext as Button).pressed.connect(func(): InputManager.bullet_next.emit())
	# Not a toggle button: TruthBulletManager owns the mode, and the selector's
	# red bullet name is what shows it. A latching button would desync the
	# moment the player pressed R instead.
	(%LieButton as Button).pressed.connect(func(): InputManager.lie_mode_toggle_requested.emit())

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
	# NonstopDebate polls this action in _process(), so touch must set it too.
	if held:
		Input.action_press("debate_slow_time")
	else:
		Input.action_release("debate_slow_time")

func _exit_tree():
	if _slow_holding:
		Input.action_release("debate_slow_time")
