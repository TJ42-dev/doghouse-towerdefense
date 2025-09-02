# Agent Instructions

## Adding a new tower
1. **Assets**
   - Base image: `assets/towers/bases/<tower_id>.svg`
   - Turret image: `assets/towers/turrets/<tower_id>_turret.svg`
   - Fire sound: `assets/towers/tower configurations/<tower_id>-fire.wav`
   - Config: `assets/towers/tower configurations/<tower_id>.json`
2. **JSON config file**
   - Include `id`, `damage`, `fireRate`, `range`, optional `bulletSpeed`, `cost`, and `fireSound` (path to sound file).
3. **Code updates (`main.js`)**
   - Add `<TOWER_ID>_BASE_SRC` and `<TOWER_ID>_TURRET_SRC` constants near similar declarations.
   - Append `<tower_id>` to `TOWER_CONFIG_IDS` array.
   - In `loadData()`, add an entry in the `ASSETS` object using the new constants.
4. **Placeholder assets**
   - Images: copy existing SVGs (e.g., `tower_base.svg`, `cannon_turret.svg`) and rename.
   - Sound: duplicate an existing `*-fire.wav` file.
5. **Store everything as shown above.**

## Adding a new enemy under an existing type
1. **Assets**
   - Image: `assets/enemies/<type>/<enemy_name>.png`
   - Sound: `assets/enemies/sounds/<enemy_name>.wav` (create `sounds` directory if missing)
2. **JSON update** (`assets/enemies/enemies.json`)
   - Add an object with `id`, `name`, `src` (path to image), `baseHealth`, `baseSpeed`, and optional `sound` property.
3. **Placeholder assets**
   - Image: copy or generate a simple placeholder PNG.
   - Sound: duplicate an existing WAV or create a short silent clip.
4. **Store everything as shown above.**

## Testing
Run `node tests/railgun.test.js` after adding assets or modifying code.
