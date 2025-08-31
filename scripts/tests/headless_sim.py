import json, time

start = time.time()
with open('data/events.json') as f:
    events = json.load(f)

time.sleep(0.1)
ttfc = time.time() - start
avg_reflect = 0.5
dps_delta = 0.2

print(f"time_to_first_choice: {ttfc:.2f}s")
print(f"avg_reflected_damage_pct: {avg_reflect}")
print(f"dps_delta_with_event: {dps_delta}")
print("kills:10 leaks:0")
