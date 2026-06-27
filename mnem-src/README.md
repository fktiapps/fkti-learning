# Mnemonic gallery generator

Builds `../mnem-gallery.html` — the full-set hiragana mnemonic mock, showing each
character in two styles side by side:

- **STATIC** — a hook drawn into the shape (emoji = placeholder until a concept is approved; some are bespoke SVG).
- **MOTION** — "say it while you draw it": the character draws itself stroke-by-stroke and a chant lights up one beat per stroke.

## Core principle

**One stroke = one continuous motion = exactly one beat.** The build fails loudly if any
chant's beat count ≠ its real stroke count, so a chant can never drift out of sync with the strokes.

## Files

- `generate.js` — content (the `D` map: per-kana emoji/keyword/hook + chant beats + optional bespoke `artBack`/`artFront` SVG) and the HTML/CSS/JS template.
- `strokes.json` — stroke paths for all 46 hiragana, extracted from the repo's `kanjivg/` SVGs (KanjiVG, CC BY-SA 3.0, Ulrich Apel). Regenerate with the snippet in `generate.js`'s header comment if the source ever changes.

## Regenerate

```
node mnem-src/generate.js
```

Then open `mnem-gallery.html` in a browser. No build step, no dependencies (Node core only).

## Editing content

Edit the `D` map in `generate.js`. Each entry:

```js
ka:{ e:'🪁', k:'Kite', h:'short caption', b:['beat 1','beat 2','beat 3'] }
```

- `e` emoji (omitted/ignored when `artBack` or `artFront` is present).
- `k` keyword, `h` one-line hook caption.
- `b` chant — an array of strings, **one per stroke**, in stroke order.
- `artBack` / `artFront` — optional raw SVG drawn behind / in front of the navy strokes (in the 109×109 KanjiVG coordinate space) for bespoke static art.
