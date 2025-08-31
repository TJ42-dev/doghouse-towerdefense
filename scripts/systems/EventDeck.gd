extends Node

var events := []
var applied_event := null
var telemetry_start_time := 0.0
var telemetry_dps_delta := 0.0

func _ready():
    if load("res://scripts/config.gd").INNOVATION_MODE:
        telemetry_start_time = Time.get_ticks_msec()
        load_events()

func load_events():
    var file := FileAccess.open("res://data/events.json", FileAccess.READ)
    events = JSON.parse_string(file.get_as_text())

func offer_events():
    var choices := events.slice(0,3)
    get_node("../ui/UI_Events").show_cards(choices)

func apply_event(event):
    applied_event = event
    var elapsed := (Time.get_ticks_msec() - telemetry_start_time)/1000.0
    print("time_to_first_choice", elapsed)
    print("dps_delta_with_event", telemetry_dps_delta)
