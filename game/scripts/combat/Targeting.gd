class_name Targeting

# Acquire the best target from an array based on priority mode.
# Each target is expected to expose properties used below:
#   path_progress: float (0=start, 1=end)
#   hp: float
#   speed: float
#   armor_flat: float
#   armor_pct: float
#   flying: bool
#   distance_to_goal(): optional method returning remaining distance
static func acquire(targets:Array, origin:Vector2, mode:String, only_air:bool=false)->Node:
    var candidates:Array = []
    for t in targets:
        if only_air and not t.flying:
            continue
        candidates.append(t)
    if candidates.is_empty():
        return null
    var best:Node = candidates[0]
    match mode:
        'FIRST':
            var best_prog = -INF
            for t in candidates:
                if t.path_progress > best_prog:
                    best_prog = t.path_progress
                    best = t
        'LAST':
            var best_prog = INF
            for t in candidates:
                if t.path_progress < best_prog:
                    best_prog = t.path_progress
                    best = t
        'STRONGEST':
            var best_hp = -INF
            for t in candidates:
                if t.hp > best_hp:
                    best_hp = t.hp
                    best = t
        'WEAKEST':
            var best_hp = INF
            for t in candidates:
                if t.hp < best_hp:
                    best_hp = t.hp
                    best = t
        'FASTEST':
            var best_speed = -INF
            for t in candidates:
                if t.speed > best_speed:
                    best_speed = t.speed
                    best = t
        'ARMORED':
            var best_armor = -INF
            for t in candidates:
                var total = (t.armor_flat + t.armor_pct)
                if total > best_armor:
                    best_armor = total
                    best = t
        'AIR':
            for t in candidates:
                if t.flying:
                    return t
            best = null
        'CLOSEST_TO_GOAL':
            var best_dist = INF
            for t in candidates:
                var d = t.distance_to_goal() if t.has_method('distance_to_goal') else (t.global_position.distance_to(origin))
                if d < best_dist:
                    best_dist = d
                    best = t
        _:
            # fallback: nearest to origin
            var best_d = INF
            for t in candidates:
                var d = t.global_position.distance_to(origin)
                if d < best_d:
                    best_d = d
                    best = t
    return best
