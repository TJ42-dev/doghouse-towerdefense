extends "res://scripts/core/TowerBase.gd"

const STACK_THRESHOLD := 5

var stack_count := 0
var telemetry_reflected := 0.0

func _ready():
    pass

func fire(target):
    if not load("res://scripts/config.gd").INNOVATION_MODE:
        return
    stack_count += 1
    shoot(target)
    if stack_count >= STACK_THRESHOLD:
        stack_count = 0
        for extra in get_backshot_targets(target, 2):
            shoot(extra)

func get_backshot_targets(primary, count):
    # Placeholder logic: return empty list
    return []

func set_targeting_mode(mode):
    # mode could be "backshot_bias"
    pass
