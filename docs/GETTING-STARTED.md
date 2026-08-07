# Getting started

Spirophonic is a browser instrument where **geometry decides the music**. You
set shapes in motion, you place things for them to cross, and the crossings
become notes. Nothing is drawn from the audio and nothing is sequenced by hand.

This page takes you from a blank screen to a sound you made on purpose. It
should take about ten minutes. It does not explain everything — see
[the map at the end](#where-to-go-next) for that.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints, normally <http://localhost:5173/>.

On the very first run the app fetches a 38 MB General MIDI sound bank in the
background. **You do not need to wait for it.** Every Instrument you meet in
this guide is native — synthesised in the browser — so the app is fully playable
offline and from the first second. The bank only matters when you want a piano
instead of a triangle wave.

## What you see on first load

A Composition called **Simple Ring Crossing**, already built and already making
sound. Press **Play**, under the canvas. A dot travels a looping curve, and you
hear a short pattern of notes. The readout beside the transport says
`13 events` — that Composition produces thirteen notes per loop.

That is the demo. Now build one yourself, because the four clicks that make a
sound are also the four ideas the whole app is made of.

## Your first sound, in four clicks

Press **New** in the top right, then **Discard and start new**.

You now have a clean slate: one Wheel, one Head, one Instrument, and nothing
else. That is as empty as a Composition is allowed to be. The canvas shows a
single dot and the transport says `0 events`. Press Play and you will hear
nothing at all — correctly.

The **Performance** panel, top right, tells you why:

> No Fields, so nothing is crossed and no Encounters happen.

Follow it.

**1. Add something to cross.** In the **Fields** panel, click **Add rings**. A
circle appears on the canvas at radius 50. Still `0 events`, and Performance
now says something new:

> No Parts, so Encounters happen but nothing interprets them as notes.

The dot is crossing that ring. The app knows. It just has no instructions about
what a crossing *means* yet.

**2. Say what a crossing means.** In the **Parts** panel, click **Add Part**.

The readout jumps to `6 events`.

**3. Play.** You hear six evenly-ish spaced notes per loop, all the same pitch.

That is the whole machine. You added a thing to cross and a rule for
interpreting crossings, and the geometry did the rest.

## What actually happened

Six words, in order. Each one is a panel on screen.

| | | |
|---|---|---|
| **Wheel** | a motion system and a clock | one Wheel = one tempo relationship |
| **Head** | a tracked point on that Wheel | several Heads can share one Wheel |
| **Trace** | the path a Head leaves | what you see on the canvas |
| **Field** | a set of **Boundaries** — rings, spokes, grids | what there is to cross |
| **Encounter** | a Head crossing a Boundary | a fact about geometry: time, direction, strength |
| **Part** | selects Encounters, maps them to musical intent | pitch, velocity, duration |
| **Instrument** | renders what a Part decided | never sees the geometry |

The important join is in the middle. **An Encounter is not a note.** It is a
recorded fact that a crossing happened at a certain time, in a certain
direction, with a certain force. A Part is what turns that fact into music —
and several Parts may read the same Encounter and disagree about what it means.

That is why the empty Composition was silent in two different ways, and said so
in two different sentences.

## Making it a melody

Your six notes are all the same pitch. That is not a bug — a new Part defaults
to **Fixed MIDI**, note 60, middle C. It gives you the *rhythm* the geometry
implies, with pitch held constant so you can hear the timing clearly.

To get a melody, find **Pitch mapping** in the Parts panel and change it from
`Fixed MIDI` to `Boundary degree`.

Now which Boundary got crossed decides the note. With one ring you will not
hear much difference — there is only one degree to land on. Add a second ring
(**Add Boundary**, in the Fields panel) and the two rings become two different
pitches.

Boundary degree comes with a **Scale** (default `pentatonic-minor`), a root of
MIDI 48, and a three-octave span. Pentatonic minor is a forgiving default:
almost any set of crossings lands on something that sounds intentional.

## "I changed something and nothing happened"

Read this section before you conclude anything is broken. Both causes below are
the geometry behaving correctly.

**Your loop is shorter than your curve.** This is the big one. The transport
loops a *window* of time — by default four beats — and you only hear the
Encounters inside it. A curve can take far longer than that to close.

Add a second ring to the clean slate above and the count stays at `6 events`,
because the Head does not reach the outer ring within four beats. Lengthen
**Loop length (beats)** in the Composition panel and it appears:

| Loop length | Events |
|---|---|
| 4 beats | 6 |
| 8 beats | 12 |
| 16 beats | 23 |
| 32 beats | 46 |
| 64 beats | 93 |

If an edit seems to do nothing, lengthen the loop before you change anything
else.

**Your Boundary is out of reach.** A Head sweeps a fixed range of distances
from the centre, set by its Wheel's motion. A ring outside that range is never
crossed, no matter how long the loop. Move the ring, or change the Wheel.

## Three ways to start

| | What you get |
|---|---|
| **New** | A clean slate. One Wheel, one Head, one Instrument. Silent until you add a Field and a Part. |
| First-ever load | **Simple Ring Crossing** — one Wheel, two Fields, one Part, 13 events. The small demo. |
| **Load example** | **Concurrent Wheels Reference** — four Wheels, twelve Heads, four Instruments, 110 BPM over an 8-beat loop. What a real Composition looks like. |

Both **New** and **Load example** replace everything and ask before they do.

**Your work is saved in this browser automatically**, and comes back when you
reload — the app says so when it restores. That is convenience, not safety: it
lives in one browser on one machine. Anything you care about, export.

## Where things are

- **Top bar** — New and Load example on the right; the file actions on the row
  below.
- **Left rail** — Composition (name, tempo, meter, loop), Composition tree
  (the Wheel/Head/Part structure), and the controls for whichever Wheel and
  Head you have selected in the tree.
- **Centre** — the canvas, with the transport underneath it: Play, Stop, Loop,
  a seek slider, and the position + event count.
- **Right rail** — Performance (read this when confused), Fields, Parts, Sound
  banks, Instruments, Variation, Recorder.

Every panel title collapses. Click one to fold a panel you are not using; the
rails remember what you folded.

## Saving and exporting

- **Export JSON** — the Composition itself. Small, readable, the thing to keep.
- **Export bundle** — Composition plus its sound bank references, as one
  `.spirophonic` file. Tick **Embed sound banks in bundle** to include the
  audio data so it opens on a machine that has never seen those banks; leave it
  off and the bundle stays small but expects them present.
- **Export MIDI** — the performed notes, for a DAW.
- **Export WAV** — an offline render of what you hear.
- **Export SVG** — the traces, as vector art.
- **Copy Strudel** — the pattern as Strudel code.

## What the interface does not reach

The model is a little larger than the panels. A Part's velocity curve, its
onset rule, and how hard quantization pulls are all configurable in the
Composition format and are not offered as controls.

They are reachable by exporting JSON, editing by hand, and importing it back.
Anything valid will load; the app validates on import and tells you what it
rejected. The [manual](MANUAL.md) lists everything in this category.

## Where to go next

- [`docs/MANUAL.md`](MANUAL.md) — every control in every panel, and a list of
  what the interface cannot reach.
- [`docs/Spirophonic-Domain-Model.md`](Spirophonic-Domain-Model.md) — the
  precise definitions of every term used above.
- [`docs/SOUND-AND-MIDI-DESIGN.md`](SOUND-AND-MIDI-DESIGN.md) — how Parts,
  Instruments, and export agree with each other. This one is a contract.
- [`docs/VISION.md`](VISION.md) — what the instrument is for.
- [`docs/WHAT-IS-MISSING.md`](WHAT-IS-MISSING.md) — an open question about
  ratio and pitch that the app does not yet answer. Explicitly unapproved
  thinking, not a description of what exists.
