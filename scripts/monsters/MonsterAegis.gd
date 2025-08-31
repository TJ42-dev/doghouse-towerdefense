extends "res://scripts/core/Monster.gd"

var front_reflect_pct := 0.5
var reflected_total := 0.0

func take_damage(amount, direction := Vector2.ZERO):
    if load("res://scripts/config.gd").INNOVATION_MODE and direction.dot(Vector2.RIGHT) > 0:
        var reflected := amount * front_reflect_pct
        reflected_total += reflected
        hp -= amount * (1.0 - front_reflect_pct)
    else:
        hp -= amount
    if hp <= 0:
        die()
