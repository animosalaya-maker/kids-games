# Writing a game for "تحدّي الاثنين" (duel/)

Two kids share one phone lying flat. **Player 0 = red, bottom half. Player 1 = blue, top half** (they see the screen upside down).
A round ends when the game calls `api.win(0|1|null)`. The engine runs rounds until someone has 3, shows the ready screen,
the 3-2-1 countdown, round results and scores. A fresh `create(api)` is called for every round, so keep all state inside it.

## File
One file per game: `duel/games/<id>.js`, plain browser JS (no modules, no libraries, no external files). It must call:

```js
Duel.register({
  id: 'pong',               // ascii, same as file name
  title: 'تنس الطاولة',      // Arabic, short (shown on menu tile)
  emoji: '🏓',              // tile icon
  bg: '#3fa9ff',            // tile background colour
  help: 'حرّك المضرب بإصبعك ورجّع الطابة',  // one Arabic sentence, Levantine kid-friendly
  create(api){
    // set up round state here
    return {
      update(dt){},           // dt seconds (<= 0.033). Only called while the round is running.
      draw(c){},              // c = CanvasRenderingContext2D in CSS pixels. Paint the WHOLE screen (0,0,api.W,api.H) every frame.
      pointerDown(p){}, pointerMove(p){}, pointerUp(p){},  // optional; only while running
      resize(){}              // optional
    };
  }
});
```
`draw` is also called during countdown and result (show the starting state; don't advance time in draw).

## Pointer object
`{ id, x, y, startX, startY, player }` in CSS px. `player` is fixed by where the finger first touched (bottom half → 0, top half → 1).
Multi-touch works: both kids touch at the same time. Ignore touches from the wrong half where it matters.

## api
- `api.W`, `api.H`, `api.mid` (= H/2), `api.time` (seconds since round start)
- `api.players[i]` → `{ name, color, dark, light }` (red / blue)
- `api.win(i)` → end round, `i` = 0, 1, or `null` for a draw. Safe to call once; later calls are ignored.
- `api.say(str, player?, ms?)` → short floating message (for one player or both)
- `api.text(c, str, x, y, size, color, player, weight?)` → centred Arabic text; `player === 1` draws it upside down for the top kid
- `api.emoji(c, '🍉', x, y, size, rotation?)`
- `api.buddy(c, x, y, r, playerIndex, t, mood, look)` → the round blob characters ('idle' | 'happy' | 'sad'; look = {x,y} -1..1)
- `api.sfx.tap|tick|go|hit|bounce|coin|swoosh|splash|buzz|point|win()`; `api.tone(freq, dur, type, vol, delay, toFreq)`
- `api.rand(a,b)`, `api.clamp(v,a,b)`, `api.AR(n)` (Arabic-Indic digits)

## Rules of thumb
- Bright, simple, flat cartoon look; thick dark outlines (#1c1838) look good. Kids aged 4–10: big targets, forgiving.
- Symmetric and fair: whatever player 0 has at the bottom, player 1 has mirrored at the top. Draw each player's labels with `api.text(..., player)`.
- Keep the centre-left area (x < 90 around y = mid) free of important stuff: the engine draws the score there; the ✕ button sits at the right edge mid.
- Rounds should last ~10–40 s. Guarantee an end (time limit → higher score wins, or draw).
- Physics: integrate with dt, sub-step fast objects, scale sizes and speeds from `Math.min(W, H)` so it works on any screen.
- No `alert`, no network, no storage, no DOM changes. Use only the canvas.
- Test page: `duel/index.html?game=<id>` opens your game directly. `Duel._debug.forcePlay()` skips the ready screen.
