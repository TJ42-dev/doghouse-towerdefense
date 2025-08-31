class_name Damage

static func apply(base:float, mult:float, add:float, armor_pct:float, armor_flat:float)->float:
    # Calculates effective damage after multipliers and armor reduction.
    # Formula: max(0, (base * (1 + mult) + add) * (1 - armor_pct) - armor_flat)
    var raw = (base * (1.0 + mult)) + add
    return max(0.0, raw * (1.0 - armor_pct) - armor_flat)
