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
- [Settings](#settings)
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
| Top bar | **New**, **Load example**, the file actions, and **Settings** |
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
| **View zoom** | How large the geometry is drawn. 1 fits it to the canvas, 2 draws it twice as big. Affects the picture only. |
| **Pitch reference** | The size Spatial pitch measures positions against, in world units. Affects the notes only. |

**View zoom and Pitch reference were one field.** `space.scale` both zoomed the
canvas and calibrated Spatial pitch, so setting a reference that spread pitch
across a scale also zoomed the drawing away. They are now `scale` and
`pitchReference`, and each does one job. A Composition saved before the split
has no `pitchReference` and falls back to `scale`, so it sounds exactly as it
did.

**Loop length is the most consequential control in the app.** The compiler only
produces Encounters inside the window, so the window decides how much of a
curve you ever hear. A curve that takes 30 beats to close, observed through a
4-beat window, gives you the first eighth of itself on repeat. If an edit
appears to do nothing, lengthen the loop before changing anything else.

## Composition tree

The structure of the piece, and the selector for the Wheel and Head panels.
**Add Wheel** adds a Wheel, carrying one Head, and selects it.

Clicking a name does different things depending on what you clicked:

| Clicking | Does |
|---|---|
| A **Wheel** name | Shows it in the **Wheel** panel, further down the left rail. |
| A **Head** name | Shows it in the **Head and Trace** panel, further down the left rail. |
| A **Part** name | Highlights the row, and nothing else. Parts are not edited through the tree — the **Parts** panel in the right rail lists every Part, each with its own row. |

The Wheel and Head panels are an inspector, not a list: they always show
whatever the tree has selected.

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
| **wave** | Waveform, Amplitude, Periodicity | A sine, triangle, square, or sawtooth wrapped around a circle |

A Wheel cycle always comes from **Cycles / Cycle beats**, independently of
whether its Trace closes. The wave family deliberately requires a whole-number
Periodicity, so it draws that many evenly spaced radial waves and returns to its
starting point after one Wheel cycle. Amplitude is the radial excursion in world
units; `0` produces a circle. Square and sawtooth use short, fixed connector
segments so the Head traverses their sharp edges instead of teleporting.

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
| wave | **Base radius** — the radius around which the waveform oscillates |

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
Boundary — except **Add grid**, which starts with four. One ring is a ring and
one spiral is a spiral, but one grid line is a line: grid is the only kind
whose name describes a plurality, so it starts as a lattice of two lines per
axis, centred on the Field.

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
| spokes | Spoke | Angle (rad), Width (rad), Length |
| ellipses | Ellipse | Radius, Eccentricity |
| bands | Band | Inner radius, Outer radius |
| grid | Line | Axis (x / y), Offset. `x` is the line where *x* equals the offset — a vertical one. |
| spiral | Spiral | Start radius, Growth per turn, Turns |

Each Boundary also has an enable checkbox, a **Name**, `↑` `↓` reorder buttons,
and **Remove Boundary**.

A positive Spoke width makes a finite triangular wedge. **Length** is the
distance from the Field centre to each distal vertex, and the edge connecting
those vertices is part of the gate. A Head entering through either radial edge
or that outer edge starts one held note; the matching exit through any edge ends
it. This physical gate overrides the Part's ordinary **Fixed** or **Until next
note** duration and its quantization grid: entry remains note-on and exit remains
note-off. Motion that remains inside belongs to that held note and does not
create another onset. A zero-width Spoke is a finite point-crossing ray segment.
Only visits whose entry and exit both occur in the compiled window become notes;
a clipped or unmatched visit is skipped instead of being given a made-up
duration or left hanging across a loop.

**Add Boundary** places the new one where it will not land on an existing one:
rings, ellipses, and bands step outward from the widest sibling, while every
Spoke addition redistributes the complete set at exactly `360° / count`. One
Spoke starts 15° wide; a multi-Spoke wheel uses `22.5° / count`, so each wedge
narrows as the wheel gains spokes while remaining 50% wider than the earlier
rule. A grid fills whichever axis has fewer lines, mirroring an unpaired line
before reaching further out, so it stays square and centred however many you
add.

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
| **Listens to → Relations** | Which named Relations it fires on, shown once a Relation kind is accepted. Check none and it hears every Relation of those kinds. |
| **Min strength** | Ignore Encounters weaker than this, 0 to 1. A glancing crossing is weak, a square-on one strong, so this thins a Part to its firmest hits. |
| **Instrument** | Which Instrument renders this Part's notes. |
| **Pitch mapping** | How an Encounter chooses a pitch. All eight are listed below; the parameters beneath the dropdown change with the choice. |
| **Velocity** | Loudness from each Encounter's strength, or one constant value. |
| **Vel min**, **Vel max**, **Vel curve** | Under Encounter strength: the velocity range, and the gamma bending the curve between them. 1 is straight, below 1 favours louder, above 1 quieter. |
| **Duration** | For ordinary point crossings: `Fixed` is a set length and `Until next note` is the gap to this Part's next note. A band or positive-width Spoke is inherently region-gated regardless of this choice: entry starts one note and the exactly matched exit ends it. `Time inside a region` and `Time inside a band` remain valid explicit/legacy saved spellings. |
| **Duration (beats)** / **Max (beats)** | The length, or the cap on one derived from the gap. |
| **Grid (beats)** | Quantization grid. |
| **Grid pull** | How hard onsets are pulled to it. 0 keeps the geometry's own timing; 1 snaps exactly. |

A new Part starts at **Fixed MIDI note 60**, so your first sound is a rhythm on
one repeated pitch. Switch to **Boundary degree** to let which Boundary was
crossed choose the note.

#### Gate modulation

**Add mapping** makes motion inside a completed band or wedge visit shape the
one held note for that visit. The region is the outer gate: entry starts the
note, exit ends it, and interior oscillations never retrigger it. A wider wedge
at a greater radius therefore holds the same base pitch for longer and admits
more cycles of an unchanged-frequency oscillation, until the Trace crosses the
finite outer edge.

| Control | Notes |
|---|---|
| **Enabled**, **Name**, **Remove** | Disable a mapping without changing the Encounters, note, pitch, or gate duration. |
| **Source** | Position across the wedge, radius, speed, or curvature. |
| **Target** | Gain, pan, pitch offset, brightness, attack, or initial velocity. Attack and initial velocity are sampled only when the gate opens. |
| **Minimum**, **Maximum** | The bounded target range. |
| **Sample rate (Hz)** | How often motion is measured. This is saved and independent of canvas frame rate. |
| **Curve** | Bends the normalized source before it reaches the target. |
| **Smoothing (s)** | Dampens rapid changes without moving the exact gate edges. |

Continuous mappings also style only the corresponding portion of the drawn
Trace. Width and opacity show gain; hue shows brightness, pan, or pitch offset.
The geometric line itself is unchanged. A mapping needs a complete region
entry/exit pair; an incomplete visit is diagnosed and does not leave a lane or
held note hanging.

The native synth applies all six targets to one voice: attack and initial
velocity at note-on, then gain, pan, pitch offset, and low-pass brightness at
the saved lane times. Seeking into an already-open gate recreates one clipped
voice with the original entry values and only the remaining continuous lane;
pause, stop, panic, looping, voice stealing, and safe-boundary edits cancel
future automation with the voice.

SoundFont playback uses velocity, pitch wheel, and MIDI controllers 7 (gain),
10 (pan), and 74 (brightness). A preset's attack cannot be expressed reliably
in seconds, and overlapping independently modulated notes cannot share one
SoundFont channel; both cases are named in Performance diagnostics instead of
being flattened silently. Values beyond a backend's range are clipped with a
named warning.

MIDI export writes the same timed controllers, controller 73 for attack, and
pitch bends without adding note-ons. A channel collision or bend-range loss is
reported. Strudel emits sampled `gain`, `pan`, `transpose`, `lpf`, and `attack`
control patterns; when its 256-step ceiling reduces a denser lane, the export
message says which lane was reduced. WAV rendering uses the same native and
SoundFont engine path as live playback.

#### Pitch mappings

| Mapping | Parameters | Chooses pitch from |
|---|---|---|
| **Fixed MIDI** | MIDI note | Nothing — one note, so you hear the rhythm alone. |
| **Fixed frequency** | Frequency (Hz) | Nothing, but in hertz rather than MIDI. |
| **Boundary degree** | Root, Scale, Octaves | Which Boundary was crossed. For a trace crossing or a Relation, which *other Head* was met. |
| **Spatial** | Source, Root, Scale, Octaves | *Where* the Encounter happened — its x, y, distance from centre, or angle — mapped onto the scale. |
| **Contour** | Source, Root, Scale, Octaves | The same measurement, but normalised across this Part's own Encounters, so the full range is always used. |
| **Melodic line** | Source, Scale, Root, Restart, Max step, Direction bias, Low/High/Start degree | A line that *walks* the scale. The source steers direction rather than picking notes outright, so the result moves stepwise instead of leaping. |
| **Ratio** | Root (Hz), Octave fold | Which Boundary was crossed, as a whole-number frequency ratio above the root. |
| **Tuned ratio** | Tuning, and either an explicit numerator/denominator or a Wheel's motion | An exact interval. Taking it from a Lissajous or rose Wheel makes a 3:2 figure sound an actual perfect fifth. |

**Root** is a MIDI note, and the label names it: `Root (C3)` for 48. Degree 0 of
the scale lands there, so it is the key the mapping is in. Every scale mapping
has one, Melodic line included — before, that one was fixed at middle C.

**Restart** decides where the walk begins again, and it matters more than it
looks. The line's degree is a running sum, so left to drift it accumulates: the
*steps* repeat every Wheel cycle, but the degree they are applied to has moved
on, and a perfectly periodic Wheel produces a line that never repeats. **Each
bar** — the default — restarts at the start degree every bar, so every bar
opens on the same note and the phrase is repeatable. **Never** keeps the old
drifting behaviour, which is worth having when you want a long line that never
settles.

Anchoring bounds the drift; it cannot invent repetition the geometry does not
have. A Wheel cycle is not the same as the curve's period — the shipped
spirogram is 180/65, which closes after thirteen cycles — so bars still differ
from one another until the curve itself comes round. What changes is that each
bar starts from the same place instead of from wherever the last one ended.

**Tuning** appears on **Tuned ratio** only, because that is the only mapping
that resolves against a tuning context. Left at **Default** it uses C4 at
261.63 Hz in 12-tone equal temperament; other entries are the contexts you add
with **Add Tuning**, further up this panel. Choosing one is what makes a
`rational` system or a different root frequency audible — a context that no
Part points at changes nothing.

**Scales** are chromatic, major, minor, dorian, pentatonic-major, and
pentatonic-minor.

**Spatial is calibrated by Pitch reference**, in the Composition panel. Set it
near the size of your geometry — the shipped Compositions use 180, the radius
their Wheels sweep. Far below it, every position normalises to nearly the same
value and picks the same note, which reads as a broken mapping. `angle` is
unaffected, being modular, and **Contour** sidesteps the question entirely by
normalising against the Encounters actually present.

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

Uses SoundFont banks. Everything here is optional — every default Instrument is
native and needs no bank.

The work splits across two places. **This panel** is where you pick a sound:
find a preset, hear it, and add a new Instrument. **Settings → Sound banks** is
where banks themselves are managed — imported, relinked, removed. You set a bank
up once; you create playable Instruments constantly, so only that step lives in
the rail.

| Control | Notes |
|---|---|
| Bank name and state | `ready`, `loading`, or a failure. A bank that cannot be reached says why and offers **Open Settings**, which is where the fix is. |
| **Find preset** | Filters the preset list. |
| **Preset (n)** | The bank's presets matching both Playback and Find preset; `n` is the number shown. Pitched presets and entries ending in `· drums` never mix. |
| **Playback** | `Pitched` lists non-drum presets and follows the Part's pitch and duration. `Drums` lists only entries ending in `· drums`, always triggers the saved MIDI note, and lets a non-looping SF3 sample finish naturally. |
| **Preview note / MIDI note** | Integer MIDI note from 0 through 127. In Pitched mode it affects Preview only; in Drums mode it is saved on the Instrument. |
| **Preview** | Plays the selected preset and note without adding or assigning anything. A one-shot Preview sends no scheduled note-off. |
| **Instrument name** | Defaults to the preset name and remains editable. A duplicate receives the same numeric suffix used by **Add native drum**. |
| **Add instrument** | Appends a new SoundFont Instrument. Existing Instruments and Part assignments are unchanged. The new Instrument is silent until a Part is pointed at it. |
| **Manage banks** | Opens Settings. |

Drums mode uses one-shot playback for non-looping sampled drums. Because the
browser engine exposes note-on and note-off rather than a separate one-shot command,
Spirophonic sends note-on and lets the sample end under its SoundFont envelope.
A looping zone can therefore sustain until Stop, Pause, panic, or disposal.
Rendered WAV uses the same engine and is authoritative for the tail. MIDI and
Strudel preserve the fixed note but cannot carry the SF3 sample envelope.

Banks are stored in IndexedDB and keyed by SHA-256 digest, so the same bank
imported twice is stored once, and a Composition referencing a digest finds it
without re-import.

## Settings

Setup that is not part of the Composition. Opened from **Settings** in the top
bar, closed with Escape, the **Close** button, or a click outside it. Every
dialog in the app behaves this way. Nothing is
applied on close — every change takes effect when you make it.

### Sound banks

The bundled **MuseScore General** bank (38 MB, MIT licensed) is fetched in the
background on first run and cached in the browser. Its download status shows
here. If the download fails the app still works; the bank simply reports as
unavailable.

| Control | Notes |
|---|---|
| **SF2 or SF3 file** | Choose a bank to import. |
| **License / usage terms**, **Provenance / attribution** | Recorded with the bank. Redistribution terms travel with the file, which matters when you export a bundle with banks embedded. A bank will not import without a licence recorded. |
| **Import local bank** | Adds the chosen file to the browser's vault. |
| Format, Digest, Source, License, Attribution | The reference as the Composition stores it. The Composition holds this and never the audio. |
| **Relink bank** | Reconnects a Composition's bank reference to a file you supply — for a bundle that arrived as a manifest without its audio. The file must match the reference's format. |
| **Remove local bytes** | Evicts a bank's audio from the browser's vault, keeping the reference. The Composition still names the bank; it will not sound until relinked. |

## Instruments

Renders what Parts decide. Three kinds.

**Add native synth** and **Add native drum** expose every built-in Instrument
kind directly. Both work offline and start with playable defaults. A new
Instrument is silent until a Part is pointed at it; it appears immediately in
every note Part's **Instrument** list. To create a `soundfont` Instrument, add a
new one directly from the Sound banks panel. A SoundFont drum Instrument
displays and allows editing its fixed MIDI note here.

**Remove** is refused, with a reason, while any *note* Part still plays through
that Instrument, and a Composition must always keep one. Reassign those Parts
first — the refusal names them.

Control Parts are asked about rather than refused. Every Part carries an
Instrument because the field is common to all Parts, but a Control Part drives
a lane and never emits a note, so its Instrument is bookkeeping. Removing one
it names repoints it to a surviving Instrument, which the confirmation says
before it happens — and which changes nothing you hear.

Common to all kinds: **Name**, **Gain**, **Pan**.

| Kind | Controls |
|---|---|
| **native-synth** | **Waveform** — sine, triangle, square, sawtooth — and the full envelope: **Attack**, **Decay**, **Sustain**, **Release**. |
| **native-drum** | **Voice** — kick, snare, hat, tom, clap, cymbal. |
| **soundfont** | **Reverb** and **Chorus** sends. Bank, program, preset name, and the percussion flag come from the Sound banks panel when you add the Instrument. |

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
| **Export bundle** | Composition plus sound bank references as one `.spirophonic` file. Opens a dialog holding the one choice it needs — see below. |
| **Import bundle** | Opens one, reporting which banks resolved. |

### The Export bundle dialog

One decision, made where it applies rather than parked in the top bar.

| Control | Notes |
|---|---|
| **Embed sound banks in bundle** | On, the bundle carries the bank audio and opens on any machine. Off, it names banks by digest and expects them already in the vault. |
| Size line | What the choice actually costs, measured against the banks this Composition references and what is in this browser's vault. It also says when a referenced bank is not in the vault and so cannot be embedded whatever you tick. |
| **Export bundle** | Writes the file and closes. |
| **Close** | Closes without exporting. The tick is remembered for next time. |

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

Nothing that changes what you hear. Every field the Composition format defines
for geometry, selection, interpretation, and rendering now has a control.

Two things remain out of view, and neither is a choice:

- **`onset`** has exactly one kind, `encounter-time`. A crossing happens when it
  happens; there is no alternative to pick, so there is no control.
- **`id` fields** are generated and kept stable so that Parts, Instruments, and
  sound banks can refer to one another across an export.

Everything else is editable in the panels. If you still want to work in the
format directly — to script a Composition, or to diff two of them — **Export
JSON**, edit, and **Import JSON**. Imports are validated and a malformed edit is
refused with reasons rather than partly applied.

---

*Written against the interface as it stands. If a control here does not match
what you see, the app changed and this page did not — the code is the truth.*
