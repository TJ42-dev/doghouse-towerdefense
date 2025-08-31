extends CanvasItem

var visible := false

func _input(event):
    if event is InputEventKey and event.pressed and event.keycode == Key.F3:
        visible = !visible
        queue_redraw()

func _draw():
    if not visible or not load("res://scripts/config.gd").INNOVATION_MODE:
        return
    draw_rect(Rect2(Vector2.ZERO, Vector2(100,100)), Color(1,0,0,0.3))
