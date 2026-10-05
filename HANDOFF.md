# TIME — handoff

> **TIME** — *A lifetime told through a single room.*
> One room, one fixed camera, no people. Scrolling moves through a life from 25 to 90. The story is told only through objects, traces and light.

This file is for picking the project up in a new chat. Read it first, then look at the latest screenshots in `screenshots/`.

---

## Run it

```bash
cd ~/Projects/time
npm install        # first time only
npm run dev        # Vite on http://localhost:5317
```

- Deep-link to a moment: `http://localhost:5317/?age=54.1`. The age is not shown in the UI; this is a dev convenience only.
- Stack: three.js r186 plus Vite, all procedural. There are no GLB or external assets, and every texture is drawn on a canvas.

---

## Where we are

- The full 25–90 life is implemented and has been reviewed through several passes.
- **The last pass** ("four fixes"):
  - the stray floor board is removed
  - the pregnancy test has champagne for him and milk for her
  - no pizza boxes linger after the young friends' night
  - the partner has their own chair on the date
- **Next planned step (not started):** rework the **sun / sunrise–sunset / time-of-day system**. The user said explicitly: *don't touch lighting, sun, sky, exposure or time-of-day until we get to it.*

### Working agreement with the user (important)
- Make **one focused pass, then STOP for visual review.** Never polish or redesign beyond the request. The user makes the final visual judgement.
- **Make a rollback checkpoint** (git tag) before every pass.
- Deliver screenshots of the moments that changed.
- Preserve what has been approved. When unsure, change less.

### Git checkpoints (tags, oldest → newest)
`checkpoint-base-room` → `checkpoint-approved-25-45` → `checkpoint-life-25-90` → `checkpoint-continuity` → `checkpoint-lived` → `checkpoint-refined` → `checkpoint-lived-in` → `checkpoint-simplified` → `checkpoint-four-fixes` → (HEAD: folded clothes, memories kept)

---

## Story and rules (approved; keep them)

**Arc:** possibility → intimacy → family chaos and love → fullness → quieter couple → noticeably quieter alone → absence.

- **25:** alone. Laptop and a glass of wine, one chair, a small plant, half-empty shelves.
- **~27:** a date, with the partner's chair, coat and boots. **28–29:** they move in (boxes). One chair becomes two, books merge, their print goes up. The **candle** is lit at 29.
- **~33:** a pregnancy test on the table one morning (champagne for him, milk for her). Then baby things, the cradle, the bunny and the high chair. **One** first birthday (one candle).
- **Child growing up**, shown only through their belongings, never through birthdays: sippy cup and blocks → drawings on the wall and height marks (the child's age 2–16) → juice and school books → pencil case, ball and bike → the teen's laptop, headphones, jacket and guitar → adult shoes → **moving-out boxes at ~52**.
- **Social years ~53–61:** one dinner party and one games night. Each is a continuous sequence: setup → evening → dawn aftermath → cleared. Repaint at 50. New rug at 60. Trips leave keepsakes (photos, a sailboat model, a carved bird, a woven artwork).
- **Quieter couple ~61–73:** tea, the newspaper, a jigsaw, the tablet. The grandchild is implied only by a small cup and the old blocks (twice).
- **Loss at 73.5:** never shown. The partner's glass and mug simply stop appearing. Their **chair at the short end of the table** stays empty and stops moving. The boots go first (~73.8). The cardigan stays draped a little longer (to ~74.7), then lies folded on the seat until 80, when it is put away together with their bedside book. Their print and throw remain as memory.
- **Alone, 74–89:** mostly a book and a glass of water. Two suppers alone and two visits from the child (tea). Long still stretches. The room dims slightly.
- **90:** all signs of current living are gone, but the furniture and history remain. The lamps go off, then the **candle**, which has been lit since 29 and burned slowly, goes out.

**Hard rules from the user:**
- **No collisions, ever,** including during transitions. Run the audit after every change (see below). It currently reports 0.
- **Human-count continuity:** shoes, glasses, plates, chairs and coats must match who lives there or is visiting. After the loss there are no partner things in daily use, and there is no wine unless the scene justifies it.
- Every table object belongs to a person or activity at its place. **Table zones** (offsets from the table centre):
  - **P** — protagonist, back middle
  - **R** — partner, left short end
  - **C** — child or guest, front
  - **N** — shared, middle
  - **E** — right end: candle and vase
- Scenes are coherent human situations, not toggled props.
- **The high chair never returns.**
- **No age number** in the UI. Only "TIME", the subtitle, and a "SCROLL TO MOVE THROUGH TIME" hint that fades out.
- Not sentimental and no clichés of ageing. Absence is the storytelling device.

---

## Architecture (`src/`)

| file | what |
|---|---|
| `main.js` | Renderer, camera (fixed), scroll→age mapping with **time-warp** (scroll slows around `BEATS`), adaptive resolution, main loop, dev hooks |
| `room.js` | Static room: walls, floor (with history map), door, balcony, curtains, bed, nightstand, table (top with history map: scratches and rings), bookshelf, pendant, lights, sun-shaft volume. Exports `TABLE`, `ROOM` |
| `life.js` | **The whole life.** `SCENES` schedule (module top), baseline table routines (`daily([...])`), all scene objects, floor, walls, shelf, ending. Exports `BEATS`, `todLayers(age)` |
| `lifecore.js` | `Life` class: each object is a pure function of age. Options are `spans` (in/out with fades), `path`, `wob` (age-noise drift, with `until`), `follow` (garment on a chair), `scale`, `update`. Also contains the **collision audit** |
| `daylight.js` | Time-of-day presets (golden, morning, day, dusk, night, dawn), blended per scene. Owns all light intensities and the sky, water and city colours. **Next pass reworks this.** |
| `objects.js` | Procedural object factories: chairs, garments (`garment()` wraps the backrest rail), tableware, food (`plateWith`, `bowlWith`, `servingDish`), drinks, toys, frames, plants' pots, keepsakes |
| `plants.js` | Hero plant (left of the door; grows, is repotted at 34, leaves age), ivy on the shelf, olive on the balcony |
| `exterior.js` | Sky shader, water shader, far city (with lit windows at night), boats |
| `post.js` | GTAO (half-res), bloom, NaN guard, temporal smear (only when scrubbing fast), grade |
| `tex.js` | Canvas textures. `encAge` encodes ages 25–90 into history maps |
| `util.js` | `presence`, `smooth`, `keys`, `moves`, interval sets (`iv`, `union`, `subtract`) |

**Key mechanisms**
- **Scenes:** `sc(start, end, tod, kind, {table, keep, w})` in `life.js`. A table scene clears the baseline routine via `TABLE_HOLES`. `chain(k1, k2)` keeps things continuous through an evening and its aftermath. `win(kind)` returns the windows for a kind.
- **Time-warp:** `BEATS` (`SCENES` + `STILL` stretches) make scrolling slow down so short moments get dwell time.
- **Determinism:** everything is a function of age, so reverse scrolling works.

**Dev hooks (browser console)**

| hook | what it does |
|---|---|
| `__time.setAge(a)`, `__time.shot(a)` | jump to an age / render it |
| `await __time.save(a, 'name', [crop])` | writes a full-resolution PNG to `shots/name.png` (via the Vite middleware in `vite.config.js`) |
| `await __time.scrub(a, b, secs, 'name')` | simulates a fast scrub, which exercises the smear |
| `__time.audit(step=0.1, fine=0.02)` | **collision audit**; returns the list of overlapping pairs (should be `[]`). Use `__time.audit(0.05, 0.01)` for a thorough run |

**Helper scripts:** `sheet.py out cols name1 name2 …` builds a contact sheet from `shots/`. `shoot.sh name` makes a downscaled copy.

**Tip:** if the browser pane is hidden, `requestAnimationFrame` pauses, so use `__time.save`/`__time.render` rather than live viewing. Captures taken right after a reload can look washed out; render a warm-up frame first.

---

## Known open items / caveats
- A thin darker band at the very top of the curtains (the ceiling-corner shadow); left as is.
- Live scroll feel has only been verified frame by frame, never watched live in a visible browser.
- Performance hasn't been profiled on the target machine. Adaptive resolution is in place (pixel ratio 0.8–1.5).
