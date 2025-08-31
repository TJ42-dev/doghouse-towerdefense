# Godot Web Starter

This repository provides a minimal HTML5 menu that links to a Godot Web export.
The menu saves simple options in `localStorage` and forwards them to the game via query string.

## Structure

- `index.html` – entry menu page
- `styles.css` – basic styling
- `main.js` – menu logic and option handling
- `vercel.json` – headers for cross-origin isolation
- `game/` – place your Godot web export here (`index.html`, `.wasm`, `.pck`, loader `.js`)
- `data/` – JSON definitions for towers and enemies used by the prototype

## Development

1. Create your project in Godot 4.x and export for Web.
2. Place the exported files inside the `game/` directory.
3. Test locally with a server such as `python -m http.server` and open `http://localhost:8000`.

## Deployment

Connect the repository to Vercel with the **Other** framework preset. Leave the build command blank and use `/` as the output directory. Vercel will serve the menu at `/` and the game at `/game/`.
