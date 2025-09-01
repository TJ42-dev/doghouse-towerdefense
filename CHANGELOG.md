# Changelog

## Unreleased
- Load tower and enemy stats from external JSON files for easier tuning.
- Add GDScript stubs for damage calculation and targeting priorities with accompanying JS tests.
- Railgun beam now deals damage along its full length to the grid edge while range still only limits targeting.
- Added costs for specialized towers and display them in the upgrade menu.
- Added a 5s delay before waves begin after the previous wave is cleared.
- Fixed upgrade menu height so Sell button doesn't shift when specialization options appear.
- Added difficulty selection with easy/medium/hard settings affecting rewards, starting cash, and enemy health.
- Added free mode difficulty with medium enemy health and 99999 starting cash.
- Kill rewards increase slightly after clearing each boss wave.
- Introduced Rocket Launcher tower with homing rockets and smoke trails.
- Rocket launchers keep up to three persistent rockets between waves, regenerating missing rockets even when no wave is active.
