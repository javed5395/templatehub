# LazyDog Editor v2 — the Editor API (THE WALL)

`js/core.js` owns the engine: fabric, lazydog_renderer, pages, state, autosave.
`js/ribbon.js` and `js/sidebar.js` are **pure UI**. They may use ONLY:

```js
Editor.run(command, arg)      // do something
Editor.query(key)             // read something
Editor.on(event, handler)     // react to engine changes
```

**Forbidden in ribbon.js / sidebar.js:** `fc`, `fabric`, `state`, any
`window._ld*`, any function from lazydog_renderer.js, direct canvas DOM
access. If a needed command is missing from this file, STOP and report —
never reach around the wall.

---

## Events — `Editor.on(name, fn)`

| event       | fires when                          | payload                             |
|-------------|-------------------------------------|-------------------------------------|
| `ready`     | engine booted, first slide painted  | —                                   |
| `selection` | selection changed                   | result of `Editor.query('selection')` |
| `slides`    | slide count/order/current changed   | `{ count, current }`                |
| `zoom`      | zoom changed                        | `{ pct }`                           |
| `history`   | undo/redo availability changed      | `{ canUndo, canRedo }`              |

## Queries — `Editor.query(key)`

| key            | returns                                                        |
|----------------|----------------------------------------------------------------|
| `selection`    | `null` or `{ kind: 'text'\|'shape'\|'image'\|'frame'\|'icon'\|'illustration'\|'group'\|'multi', locked: bool }` |
| `textState`    | `null` or `{ fontFamily, sizePt, bold, italic, underline, strike, align, colour, highlight, list: null\|'bullet'\|'number' }` |
| `fonts`        | `[ 'Arial', ... ]` full font list                              |
| `slides`       | `{ count, current }`                                           |
| `zoom`         | number (percent)                                               |
| `history`      | `{ canUndo, canRedo }`                                         |
| `view`         | `{ ruler, grid, guides }` booleans                             |
| `pageSize`     | `{ ratio: '16:9'\|'4:3'\|'other' }`                            |

## Commands — `Editor.run(cmd, arg)`

Clipboard / history
- `undo` · `redo` · `cut` · `copy` · `paste` · `duplicate` · `delete`

Text (all write through per-character styles — the engine guarantees it)
- `bold` · `italic` · `underline` · `strike` · `clearFormat`
- `fontFamily` (name) · `fontSize` (pt) · `fontStep` (+1 | -1)
- `textColour` (hex) · `highlight` (hex or null=remove)
- `align` ('left'|'center'|'right'|'justify')
- `bullets` · `numbering` · `lineSpacing` (number, e.g. 1.5)

Insert
- `insertText` ('heading'|'subheading'|'body')
- `insertShape` (kind) · `insertLine` · `insertFrame` (kind)
- `insertImage` (File or dataURL) · `insertChart` (type)

Arrange
- `front` · `back` · `forward` · `backward`
- `group` · `ungroup`
- `alignSlide` ('left'|'centerH'|'right'|'top'|'centerV'|'bottom')
- `distribute` ('h'|'v')
- `flipH` · `flipV` · `rotate` (deg)
- `lock` (toggles on selection) · `unlockAll`

Slides
- `addSlide` · `duplicateSlide` · `deleteSlide` · `gotoSlide` (index)

Design / view
- `background` (hex) · `pageSize` ('16:9'|'4:3')
- `zoom` (pct) · `zoomFit` · `fitWidth`
- `toggleRuler` · `toggleGrid` · `toggleGuides`

Present / file
- `presentFromStart` · `presentFromCurrent`
- `exportPptx` · `saveProject` · `newDesign`

Colour picking: UI parts own their pickers visually, but call
`Editor.run('textColour', hex)` etc. with the final value, and MAY call
repeatedly for live preview — the engine debounces history entries
(only the final call within 600ms creates an undo step).

Unknown command → the engine toasts "Not wired yet: <cmd>" and returns
false. Nothing crashes. UI can therefore be built ahead of the engine.
