# Writing a single-player game for "ألعاب بوبو" (solo/)

One kid (age 4–10), phone in portrait, full screen. **Bobo** (the fluffy purple monster from the app, drawn by `api.bobo`) is the hero.
The engine shows a start card (title, help, best score, big "العب" button), then calls `create(api)` and runs the game until
the game calls `api.end({...})`. Then it shows the result card (score, best score, coins earned). Tapping "مرة كمان" calls `create` again.

## File
`solo/games/<id>.js`, plain browser JS, no modules/libraries/external files. Wrap everything inside `Solo.register` (no top-level `const`/`let`/`function` — all files share one page).

```js
Solo.register({
  id: 'memory', title: 'الذاكرة', emoji: '🃏', bg: '#ff8fa3',
  help: 'اقلب البطاقات ولاقي كل صورتين متل بعض',   // one short Arabic (Levantine) sentence
  create(api){
    return {
      update(dt){},            // dt seconds (<= 0.033), only while playing
      draw(c){},               // CSS-pixel 2D context. Paint the WHOLE screen every frame.
      pointerDown(p){}, pointerMove(p){}, pointerUp(p){},   // p = { id, x, y, startX, startY }
      resize(){}
    };
  }
});
```

## api
- `api.W`, `api.H`, `api.time` (seconds since start)
- `api.end({ score, coins?, win?, msg? })` → finish. `score` = a number (higher is better; shown and saved as best).
  `coins` = 1–25 reward (default ceil(score/2), capped 25). `win: true` for "finished the level/puzzle". `msg` = optional Arabic headline.
- `api.bobo(c, x, y, r, mood, look, t)` → Bobo in the kid's chosen colour + hat + glasses. mood: 'idle' | 'happy' | 'wow' | 'sad' | 'sleep'; look {x,y} in -1..1. Height ≈ 2r (hat adds ~0.8r on top).
- `api.text(c, str, x, y, size, color, weight?)` centred Arabic text with outline; `api.emoji(c, '🍎', x, y, size, rot?)`
- `api.toast(str, ms?)` short centred message; `api.say(str)` speaks Arabic (text-to-speech, may be silent on some phones — never rely on it alone, always also show the text)
- `api.sfx.tap|good|bad|pop|coin|jump|hit|swoosh|win|over()`; `api.tone(freq, dur, type, vol, delay, toFreq)`
- `api.rand(a,b)`, `api.clamp`, `api.pick(arr)`, `api.shuffle(arr)`, `api.AR(n)` (Arabic-Indic digits)

## Rules of thumb
- Kids 4–10: big targets (≥ 60px), forgiving, lots of happy feedback (sound + bounce + stars). Never scary.
- Bright flat cartoon look, thick dark outlines (#1c1838), playful backgrounds. Show score (and lives/timer if any) at the top, below y ≈ 64 is free; keep the top-left 60×60 free (✕ button).
- Endless games get harder slowly and end on a mistake (or 3 lives). Puzzle/learning games: rounds of ~10 questions or one board, then `api.end({ score, win:true })`.
- Scale everything from `Math.min(W, H)`. Integrate with dt. Must work on 360×640 up to tablets.
- No alert, no network, no storage (the engine saves best scores), no DOM changes — canvas only.
- Test page: `solo/index.html#<id>` opens your game's start card; `Solo._debug.start()` starts it.
