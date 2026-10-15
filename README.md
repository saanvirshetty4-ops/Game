# Drop & Merge

A React + Vite port of the original single-file `Drop & Merge.html` game.
All gameplay, styling, animations and assets are unchanged — only the project
structure is new.

## Run it

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve the production build
```

> The npm scripts call `node ./node_modules/vite/bin/vite.js` instead of the bare
> `vite` command because this folder name contains `&`, which breaks the
> `node_modules/.bin` PATH shim that npm sets up on Windows. Renaming the folder
> (no `&`) would let you use the normal `"dev": "vite"` scripts.

## Project layout

```
index.html                    entry HTML (fonts + viewport, as before)
src/
  main.jsx                    React entry point
  App.jsx                     screen + sheet routing, global click sounds/music
  styles/game.css             the original stylesheet, copied verbatim
  game/
    constants.js              jelly tiers, colours, level curve, save key
    store.js                  saved state, per-run runtime state, pub/sub hook, toast
    audio.js                  all sound effects, music and haptics
    shop.js                   shop catalogue and purchase logic
    threeUtils.js             Three.js helpers (colours, textures, jelly mesh)
    engine.js                 the game itself: Matter.js world + Three.js jar + loop
    homeScene.js              the 3D jelly scene behind the home screen
  components/
    SplashScreen.jsx          loading screen
    HomeScreen.jsx            currency, logo, 3D stage, PLAY, dock
    GameScreen.jsx            boots/tears down the engine, lays out the HUD
    Hud.jsx                   pause, coins, best, score, "next" ball
    PowerRow.jsx              shake / bomb / tiny-pop / undo / shop buttons
    EvoStrip.jsx              the tier strip along the bottom of the jar
    Toast.jsx                 transient message pill
    PauseOverlay.jsx          pause sheet
    ProfileOverlay.jsx        profile sheet
    ShopOverlay.jsx           shop sheet (skins, themes, power, more)
    SettingsOverlay.jsx       sound / music / vibrate toggles
    GameOverOverlay.jsx       game-over sheet with confetti
```

## How React and the engine fit together

* React owns the DOM: screens, sheets, buttons and the HUD.
* `game/engine.js` owns the canvas inside `#gcWrap`, the physics world and the
  `requestAnimationFrame` loop. It starts when the game screen mounts and is torn
  down when that screen unmounts (going home or restarting a run).
* The engine never touches the DOM for UI values. It mutates `state` (saved) or
  `runtime` (current run) in `game/store.js` and calls `emit()`; components
  subscribe with the `useStore()` hook (`useSyncExternalStore`) and re-render.
* Progress still lives in `localStorage` under the original `dropMergeSave3D` key,
  so an existing save carries over.

The game libraries are the same versions the original page loaded from CDNs:
`three@0.128.0` and `matter-js@0.19.0` (now bundled by Vite instead).

## One deliberate behaviour fix

In the original file the Game Over sheet was only closed by its **Home** button,
so pressing **Next** started a run behind a still-open overlay and the game was
unplayable until you went home first. Starting a run now always closes the sheet.
Everything else is a faithful port.
