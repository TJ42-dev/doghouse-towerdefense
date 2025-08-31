extends CanvasLayer

var deck := null

func _ready():
    deck = get_node("../systems/EventDeck")

func show_cards(events):
    # Placeholder: auto-apply first event
    if events.size() > 0:
        deck.apply_event(events[0])
