# Manual

Every control in the interface, what it does, and what it affects.

This is a reference, not a tutorial. If you have never used Spirophonic, read
[GETTING-STARTED.md](GETTING-STARTED.md) first — it builds a sound in four
clicks and explains the chain that makes it work.

This document describes **the interface**. For the precise definitions behind
the vocabulary — what an Encounter *is*, what guarantees a Trace makes — see
[Spirophonic-Domain-Model.md](Spirophonic-Domain-Model.md). Where the two
disagree, the domain model is correct and this page is stale.

Every control in the app also carries hover help — the short form of what is
written here. Those sentences live in `src/ui/help.ts`, and a test fails if a
control ships without one. **When you change an explanation here, change it
there too**; they are two lengths of the same sentence.

## Contents

- [The chain](#the-chain)
- [The screen](#the-screen)
- [Transport](#transport)
- [Composition](#composition)
- [Composition tree](#composition-tree)
- [Wheel](#wheel)
- [Head and Trace](#head-and-trace)
- [Fields](#fields)
- [Parts](#parts)
- [Sound banks](#sound-banks)
- [Instruments](#instruments)
- [Variation](#variation)
- [Recorder](#recorder)
- [Performance](#performance)
- [Files](#files)
- [Rules the app enforces](#rules-the-app-enforces)
- [What the interface does not reach](#what-the-interface-does-not-reach)

## The chain

Every panel is one link. Nothing in the app is outside this sequence.

```text
Wheel ──▶ Head ──▶ Trace
                     │
Field ──▶ Boundary ──┴──▶ Encounter ──▶ Part ──▶ Instrument ──▶ sound
```

A **Wheel** owns a motion system and a clock. A **Head** is a tracked point on
it, leaving a **Trace**. A **Field** is a set of **Boundaries**. When a Head
crosses a Boundary that is an **Encounter** — a fact with a time, a direction,
and a strength. A **Part** selects Encounters and decides what they mean
musically. An **Instrument** renders that decision and never sees the geometry.

The join in the middle is the one to hold onto: **an Encounter is not a note.**
Several Parts may read the same Encounter and disagree.

## The screen

| Region | Holds |
|---|---|
| Top bar | **New**, **Load example**, and the file actions |
| Left rail | Composition, Composition tree, Wheel, Head and Trace |
| Centre | The canvas, with the Transport beneath it |
| Right rail | Performance, Fields, Parts, Sound banks, Instruments, Variation, Recorder |

Every panel title is a disclosure — click it to collapse a panel you are not
using. The rails remember what you collapsed, per browser.

The left rail's Wheel and Head panels always show **the Wheel and Head selected
in the Composition tree**. They are not a list; they are an inspector.

## Transport

Beneath the canvas. Drives playback of the current loop window.

| Control | Effect |
|---|---|
| **Play / Pause** | Starts or suspends playback. The button becomes Pause while playing. |
| **Stop** | Stops and returns the position to the start of the loop. |
| **Loop** | When on, playback repeats the window forever. When off, it stops at the end. |
| Position slider | Shows and sets the playhead. Drag to seek, including while playing. |
| Status readout | `position · N events`, plus `compiling…` while a newer performance is still being built off the render thread. |
| Pending edit | Appears when an edit made during playback is waiting for a safe boundary to swap in. |

`N events` is the count of performed notes **in the current loop window**, not
in the Composition. Lengthening the loop usually raises it.

## Composition

Name and time. Everything here affects the whole Composition.

| Control | Notes |
|---|---|
| **Name** | Used for exported filenames and shown in the discard prompt. |
| **Tempo (BPM)** | Beats per minute. Wheel rates are expressed in beats, so tempo scales the whole piece. |
| **Beats per bar** / **Beat unit** | The meter. Affects quantization grids and MIDI export. |
| **Loop start (beats)** | Where the window begins. |
| **Loop length (beats)** | How long the window is. |

**Loop length is the most consequential control in the app.** The compiler only
produces Encounters inside the window, so the window decides how much of a
curve you ever hear. A curve that takes 30 beats to close, observed through a
4-beat window, gives you the first eighth of itself on repeat. If an edit
appears to do nothing, lengthen the loop before changing anything else.

## Composition tree

The structure of the piece, and the selector for the Wheel and Head panels.
Click any name to select it. **Add Wheel** adds a Wheel, carrying one Head, and
selects it.

**Wheel rows** — `On` (include in the performance), `↑` `↓` (reorder), `Copy`
(duplicate with its Heads), `+Head` (add a Head), `Remove`.

**Head rows** — `On`, `Show` (draw its Trace; independent of `On`), `↑` `↓`,
`Copy`, `Remove`.

**Part rows** — enable checkbox, `Mute`, `Solo`, `Remove`.

Mute and solo resolve in a fixed order:

1. A Part that is not enabled is never heard and cannot solo.
2. If **any** enabled Part is soloed, only soloed Parts are heard.
3. Otherwise every enabled, unmuted Part is heard.

So solo outranks mute: a Part that is both soloed and muted still sounds.

Removing anything that other objects depend on raises a confirmation naming
what else will go. Removal cascades — deleting a Wheel deletes its Heads, and
Parts that referenced them.

## Wheel

The selected Wheel's motion and clock.

| Control | Notes |
|---|---|
| **Name** | Shown in the tree. |
| **Motion** | Which curve family this Wheel draws. Changing it resets the motion parameters and every Head's attachment to that family's defaults. |
| **Cycles** / **Cycle beats** | The rate, as a ratio: *this many cycles per that many beats*. `1 / 4` is one full cycle per bar at 4/4. |
| **Wheel phase (turns)** | Rotates the starting point. `0.25` starts a quarter turn in. |
| **Direction** | Forward or Reverse. |

Rate is a ratio rather than a frequency so that Wheels stay in whole-number
relationships with each other and with the bar. Two Wheels at `1/4` and `3/4`
are locked in a 3:1 relationship at any tempo.

### Motion families

| Motion | Parameters | Shape |
|---|---|---|
| **spirogram** | Fixed radius, Moving radius, Rotation (inside / outside) | Spirograph curves — hypotrochoids and epitrochoids |
| **lissajous** | X frequency, Y frequency, Delta (rad) | Two perpendicular oscillations; the classic ratio figures |
| **rose** | Numerator, Denominator | Rose curves; petal count follows the ratio |
| **superformula** | Symmetry, N1, N2, N3 | A general family covering polygons through organic blobs |
| **harmonograph** | X frequency, Y frequency, Damping | Decaying pendulum figures that spiral inward |

A curve closes when its ratio is rational, and the app uses that to decide how
long a full cycle is. Irrational ratios never close.

## Head and Trace

The selected Head. A Head inherits its Wheel's clock — several Heads on one
Wheel draw different shapes on one timebase.

| Control | Notes |
|---|---|
| **Name** | Shown in the tree. |
| **Head phase (turns)** | Offsets this Head against its Wheel. Two Heads half a turn apart sit opposite each other. |
| **Offset X** / **Offset Y** | Translates the Head in world units. |

### Attachment

One parameter set, depending on the Wheel's motion family:

| Wheel motion | Head control |
|---|---|
| spirogram | **Pen offset** — distance from the rolling circle's centre |
| lissajous | **Head scale X**, **Head scale Y** |
| rose, superformula | **Radius scale** |
| harmonograph | **Amplitude scale** |

### Trace

| Control | Notes |
|---|---|
| **Trace color** | Drawing colour on the canvas. |
| **Trace width** | Line width. |
| **Trace history (seconds)** | How much of the past stays drawn. |

### Trace observation

Off by default. When on, **the Trace itself becomes something to cross** — a
Head can encounter its own or another Head's earlier path, producing
`trace-crossing` Encounters.

| Control | Notes |
|---|---|
| **Observe Trace** | Enables trace-crossing detection for this Head. |
| **Retention** | `Window` uses the drawn trace history; `Full` uses the whole performance window. |
| **Observation rate (Hz)** | Sampling rate for the stored path. Higher is more precise and more expensive. |
| **Max segments** | Hard cap on stored path segments. |
| **Allow self-crossing** | Whether a Head may encounter its *own* trace, not just other Heads'. |

Two things have to be true before a trace crossing makes a sound. **Two Heads
must be observing** — probes and paths both come from the observing set, so a
lone observer has only its own Trace to cross and may not, unless *Allow
self-crossing* is on. And a Part must **accept the trace kind** under *Listens
to*. The Part panel says which of these is missing.

## Fields

What there is to cross. A Field is a group of Boundaries sharing a centre,
a rotation, and a motion.

**Add rings**, **Add spokes**, **Add ellipses**, **Add bands**, **Add grid**,
and **Add spiral** each create a Field of that kind, already carrying one
Boundary.

### Per Field

| Control | Notes |
|---|---|
| Enable checkbox | Excludes the whole Field from detection when off. |
| **Name** | Shown in the Part panel's Boundary picker. |
| **Center X** / **Center Y** | Position in world units. |
| **Rotation (rad)** | Absent on rings and bands, which are rotationally symmetric. |
| **Motion** | See below. |
| `↑` `↓`, **Remove Field** | Reorder or delete. |
| **Add Boundary** | Adds another Boundary, placed clear of its siblings. |

### Field motion

| Motion | Parameters | Behaviour |
|---|---|---|
| **fixed** | — | Stationary. |
| **rotating** | Turns per second | Rotates in wall-clock time, independent of tempo. |
| **transport-rotating** | Turn cycles, Turn beats | Rotates in musical time, as a ratio like a Wheel rate. |
| **wheel-attached** | Attached Wheel, Follow rotation | Rides a Wheel; optionally inherits its rotation. |

Use **transport-rotating** if you want the Field to stay in step with the
music. **rotating** drifts against the beat by design.

### Boundary kinds

| Field kind | Boundary | Parameters |
|---|---|---|
| rings | Ring | Radius |
| spokes | Spoke | Angle (rad) |
| ellipses | Ellipse | Radius, Eccentricity |
| bands | Band | Inner radius, Outer radius |
| grid | Line | Axis (x / y), Offset |
| spiral | Spiral | Start radius, Growth per turn, Turns |

Each Boundary also has an enable checkbox, a **Name**, `↑` `↓` reorder buttons,
and **Remove Boundary**.

A Boundary outside a Head's reach is never crossed no matter how long the loop
runs. A Head sweeps a fixed range of distances from the centre set by its
Wheel's motion and its attachment.

## Parts

Where geometry becomes music. Four buttons create four different things.

### Add Part — a note Part

Turns Encounters into notes.

| Control | Notes |
|---|---|
| Enable checkbox, **Name**, **Remove** | |
| **Listens to → kinds** | Which kinds of Encounter this Part turns into notes: boundary, trace, and the six Relation kinds. Check none and it accepts every kind. The caption says how many are chosen, and names anything that cannot fire yet — a trace kind with fewer than two observing Heads, or a Relation kind with no Relation. |
| **Listens to → Wheels** | Which Wheels this Part hears. Check none and it hears every Wheel — the caption under the row always says which. |
| **Listens to → Heads** | Which Heads, among those on the Wheels above. Check none and it hears all of them. Only Heads on listened-to Wheels are offered, because a Head on any other Wheel could never match. |
| **Boundary** | `All boundaries`, or one specific Boundary. |
| **Direction** | `Any direction`, or one of inward, outward, clockwise, counterclockwise, approaching, receding. |
| **Instrument** | Which Instrument renders this Part's notes. |
| **Pitch mapping** | `Fixed MIDI` or `Boundary degree`. |
| **MIDI note** | Under Fixed MIDI: the single note used for every Encounter. |
| **Root**, **Scale** | Under Boundary degree: the scale and its root. Scales are chromatic, major, minor, dorian, pentatonic-major, pentatonic-minor. |
| **Duration (beats)** | Note length. |
| **Grid (beats)** | Quantization grid. Onsets are pulled toward it. |

A new Part starts at **Fixed MIDI note 60**, so your first sound is a rhythm on
one repeated pitch. Switch to **Boundary degree** to let which Boundary was
crossed choose the note.

A new Part listens to **every** Wheel and Head. Narrow it with the *Listens to*
checkboxes — several Wheels at once is normal, and is what the shipped example
does. Unchecking every box does not silence a Part; it widens it back to all,
which is why each row states in words what it currently means.

### Add Relation — a detector between Heads

Relations watch Heads against *each other* rather than against Boundaries.

| Control | Notes |
|---|---|
| **Kind** | conjunction, closest-approach, radial-alignment, angular-alignment, opposition, direction-match. |
| **Threshold** | In the detector's own units — world distance for conjunction and radial alignment, radians for angular ones. |
| **Hysteresis** | Dead band that stops a detector chattering when Heads hover at the threshold. |
| **Min separation (s)** | Minimum time between two firings of the same detector. |

A Relation feeds two things. A **Control Part** reads it as a continuous lane.
A **note Part** fires on it directly — check that Relation's kind under
*Listens to*, and every detection becomes a note.

### Add Control — a continuous lane

A Control Part produces a continuous signal rather than notes — for modulation
rather than melody.

| Control | Notes |
|---|---|
| **Source** | distance, angle, approach-rate, rotation-rate, or strength. |
| **Relation** | Which Relation the lane reads. |
| **Rate (Hz)** | Sampling rate of the lane. |

### Add Tuning — a shared pitch reference

A Tuning context lets several Parts derive from one root, so they land in the
same key rather than each carrying an unrelated root.

| Control | Notes |
|---|---|
| **Root (Hz)** | The reference frequency. Defaults to middle C, 261.63 Hz. |
| **System** | `equal-temperament` quantizes to a fixed number of divisions per octave. `rational` keeps exact frequency ratios, which is what makes a 3:2 an actual perfect fifth rather than a 700-cent approximation. |

## Sound banks

Manages SoundFont banks. Everything here is optional — every default Instrument
is native and needs no bank.

The bundled **MuseScore General** bank (38 MB, MIT licensed) is fetched in the
background on first run and cached in the browser. Its status shows in this
panel. If the download fails the app still works; the bank simply reports as
unavailable.

| Control | Notes |
|---|---|
| **SF2 or SF3 file** | Choose a bank to import. |
| **License / usage terms**, **Provenance / attribution** | Recorded with the bank. Redistribution terms travel with the file, which matters when you export a bundle with banks embedded. |
| **Import local bank** | Adds the chosen file to the browser's vault. |
| **Find preset** | Filters the preset list. |
| **Preset (n)** | The bank's presets; `n` is how many match the current filter. |
| Audition keyboard | A row of note buttons (C3 upward) that play the selected preset without assigning it, so you can hear a preset before committing to it. |
| **Assign to Instrument** | Chooses which Instrument the preset is destined for. |
| **Use preset** | Applies the selected preset to that Instrument, converting it to a `soundfont` Instrument. |
| **Relink bank** | Reconnects a Composition's bank reference to a file you supply — for a bundle that arrived as a manifest without its audio. |
| **Remove local bytes** | Evicts a bank's audio from the browser's vault, keeping the reference. The Composition still names the bank; it will not sound until relinked. |

Banks are stored in IndexedDB and keyed by SHA-256 digest, so the same bank
imported twice is stored once, and a Composition referencing a digest finds it
without re-import.

## Instruments

Renders what Parts decide. Three kinds.

Common to all kinds: **Name**, **Gain**, **Pan**.

| Kind | Controls |
|---|---|
| **native-synth** | **Waveform** — sine, triangle, square, sawtooth — plus **Attack** and **Release**. The format also carries decay and sustain; the panel does not expose them. |
| **native-drum** | **Voice** — kick, snare, hat, tom, clap, cymbal. |
| **soundfont** | **Reverb** and **Chorus** sends. Bank, program, preset name, and the percussion flag come from the Sound banks panel when you assign a preset. |

Buttons on each Instrument convert between kinds. Native instruments need no
assets and work offline; SoundFont instruments need their bank present.

## Variation

Controlled randomness. Off unless you enable it.

| Control | Notes |
|---|---|
| **Enabled** | Master switch. |
| **Seed** | Text seed. The same seed with the same Composition gives the same result, every time, on any machine. |

Three independent layers, each with its own enable and **Amount**:

| Layer | Varies |
|---|---|
| **Initial conditions** | Wheel phase, Head phase, Field rotation |
| **Interpretation** | Pitch choice within the Part's scale, and note probability |
| **Performance** | Timing, velocity, and duration |

The layers are ordered by how deeply they cut. Initial conditions change the
geometry, so the shape and the notes both move. Performance changes only the
delivery — the same notes, played less rigidly. **Performance** is the layer
enabled by default when you first switch Variation on, because it is the one
that humanises without rewriting.

Variation is deterministic. Nothing here makes a Composition unreproducible;
export carries the seed.

## Recorder

Captures a performance as data — Encounters, interpreted events, and performed
events, with provenance — so a run can be replayed exactly rather than
recompiled.

| Control | Notes |
|---|---|
| **Record** | Starts capturing from the current transport position. |
| **Stop** | Ends the capture. |
| **Export Recording** | Downloads the recording as JSON. |
| **Discard** | Throws it away. |

A Recording stores the engine and randomness versions it was made with, so a
later version of the app can tell you that replaying is exact but recompiling
might not be. Captures are capped at 50,000 encounters and 50,000 events; the
panel reports truncation rather than silently dropping.

## Performance

Not a control panel — a report. Read it when something is not doing what you
expect.

It shows compile diagnostics with severities, runtime errors from playback, and
plain-language explanations when a Composition is silent for a structural
reason:

- *No Fields* — nothing is crossed, so no Encounters happen.
- *No Parts* — Encounters happen, but nothing interprets them as notes.

An error here blocks playback; a warning does not.

## Files

Top bar. **New** and **Load example** replace the workspace and both confirm
first.

| Action | Produces |
|---|---|
| **Export JSON** | The Composition. Small, readable, the thing to keep. |
| **Import JSON** | Loads one, validating it and reporting what it rejected. |
| **Export MIDI** | The performed notes, for a DAW. |
| **Export SVG** | The Traces, as vector art. |
| **Copy Strudel** | The pattern as Strudel code, to the clipboard. |
| **Export WAV** | An offline render, faster than real time, with a progress bar and a cancel. |
| **Export bundle** | Composition plus sound bank references as one `.spirophonic` file. |
| **Import bundle** | Opens one, reporting which banks resolved. |
| **Embed sound banks in bundle** | Governs **Export bundle** only. On, the bundle carries the bank audio and opens anywhere, at tens of megabytes. Off, it references banks by digest and expects them present. |

Your work is also saved to this browser automatically and restored on reload —
the app says so when it restores. That is convenience, not backup. It lives in
one browser on one machine.

## Rules the app enforces

These are structural and cannot be turned off.

- A Composition keeps **at least one Wheel**.
- Every Wheel keeps **at least one Head**.
- A Composition keeps **at least one Instrument**.
- Fields and Parts may both be zero — that is what **New** gives you.
- Removal cascades to dependents, and asks first, naming what goes.
- Imports are validated; an invalid file is rejected with its reasons rather
  than partially applied.
- Selection can never dangle: deleting the selected object moves selection to
  something that exists.

## What the interface does not reach

The Composition format is larger than the panels. Everything below is valid,
supported, and reachable only by **Export JSON**, editing, and **Import JSON**.
Imports are validated, so a malformed edit is refused with reasons.

**Pitch mapping.** The dropdown offers two of eight: `fixed-midi` and
`boundary-degree`. Also available are `fixed-frequency`, `ratio`, `spatial`
(sample x, y, radius, or angle), `contour`, `tuned-ratio`, and
`melodic-contour` — a stateful line that walks the scale rather than sampling
coordinates independently.

**Velocity, onset, and quantize strength.** Parts are created with velocity
derived from Encounter strength (48–118), onset at encounter time, and
quantize strength 0.75. The panel exposes none of these.

**Naming a specific Relation.** A note Part accepting a Relation kind fires on
every Relation of that kind. `encounterQuery.relationIds` narrows it to named
ones; the panel filters by kind, not by instance.

**Minimum strength.** `encounterQuery.minStrength` filters weak Encounters. Not
exposed.

**Envelope decay and sustain.** `native-synth` instruments carry a four-stage
envelope; the panel offers Attack and Release.

---

*Written against the interface as it stands. If a control here does not match
what you see, the app changed and this page did not — the code is the truth.*
