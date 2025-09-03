# Agent Instructions

**Never generate or commit binary audio files. Use plain text placeholders with a `.wav` extension for all sound assets.**

## Adding a new tower
1. **Assets**
   - Base image: `assets/towers/bases/<tower_id>.svg` (placeholder unless an existing image was specified)
   - Turret image: `assets/towers/turrets/<tower_id>_turret.svg` (placeholder unless an existing image was specified)
   - Fire sound: `assets/towers/tower configurations/<tower_id>-fire.wav` (text placeholder, not real audio unles an existing one was specified)
   - Config: `assets/towers/tower configurations/<tower_id>.json` (generate based on given desctiption)
2. **JSON config file**
   - Include `id`, `damage`, `fireRate`, `range`, optional `bulletSpeed`, `cost`, and `fireSound` (path to placeholder sound file unless an existing one was specified). Do **not** add a `hitSound`.
3. **Code updates (`main.js`)**
   - Add `<TOWER_ID>_BASE_SRC` and `<TOWER_ID>_TURRET_SRC` constants near similar declarations.
   - Append `<tower_id>` to `TOWER_CONFIG_IDS` array.
   - In `loadData()`, add an entry in the `ASSETS` object using the new constants.
4. **Placeholder assets**
   - Images: copy existing SVGs (e.g., `tower_base.svg`, `cannon_turret.svg`) and rename. (unless an existing images were specified)
   - Sound: create a text file named `<tower_id>-fire.wav` with a note to replace; do not commit binary audio. ( unless an existing sound was specified)
5. **Store everything as shown above.**

## Adding a new enemy under an existing type
1. **Assets**
   - Image: `assets/enemies/<type>/<enemy_name>.png`
   - Sound: `assets/enemies/sounds/<enemy_name>.wav` (text placeholder; create `sounds` directory if missing)
2. **JSON update** (`assets/enemies/enemies.json`)
   - Add an object with `id`, `name`, `src` (path to image), `baseHealth`, `baseSpeed`, and optional `sound` property.
3. **Placeholder assets**
   - Image: generate a simple placeholder svg with "-replace_me" in the file name.
   - Sound: create a `<enemy_name>.wav` text file with instructions to replace; never generate binary audio.
4. **Store everything as shown above.**

## Testing
Run `node tests/railgun.test.js` after adding assets or modifying code.

## Adding a new map
1. **Files**
   - Directory: `assets/maps/<map_id>/`
   - Map image: `assets/maps/<map_id>/<map_id>.png` (placeholder image with `-replace_me` in name if needed)
   - Config: `assets/maps/<map_id>/config.json`
     - Include `name`, `img` (path to map image), `grid` size (`small`\|`medium`\|`large`),
       `entries` array (enemy spawn cells), and `catLives` array of grid cells.
2. **main.js**
   - Add `<map_id>: './assets/maps/<map_id>/config.json'` to `MAP_CONFIG_FILES`.
3. **Map selector** (`index.html`)
   - In the `#battlefieldOptions` container, add a `<label class="map-choice">` block with a radio input
     (`value="<map_id>"`), preview `<img>` pointing at the map image, and a description `<span>`.
4. **Store everything as shown above and keep placeholder assets text-only.**
5. **Testing**
   - Run `node tests/railgun.test.js`.
