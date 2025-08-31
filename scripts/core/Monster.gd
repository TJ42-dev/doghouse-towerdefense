extends Node2D

var hp := 100

func take_damage(amount, direction := Vector2.ZERO):
    hp -= amount
    if hp <= 0:
        die()

func die():
    queue_free()
