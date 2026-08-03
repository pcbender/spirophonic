# Sound, Rhythm, and MIDI Design

Status: **implemented.** All eight packets have landed.

One acceptance criterion remains unverified because it needs software this
environment does not have: opening an exported `.mid` in a DAW (P3/P4). The
file is checked structurally instead, by an independent parser.

P8 was verified by playing a snippet on strudel.cc, which found a silent
pitched voice. See "Strudel vocabulary" below — the names in a snippet are an
external contract, and getting one wrong fails quietly.

This document is the contract for turning Spirophonic curves into music that
leaves the browser. It is written to survive hand-off between coding sessions
and between different coding agents. An agent picking this up cold should read
"Background" and "Architecture", then go straight to the packet it has been
assigned and work only inside that packet's file list.

## Progress

Update this table in the same commit that lands the work. Do not mark a packet
done until its acceptance criteria all pass.

| Packet | Title | Depends on | Status |
| --- | --- | --- | --- |
| P1 | Event extraction core | — | **done** |
| P2 | Rhythm shaping | P1 | **done** |
| P3 | MIDI file writer | P1 | **done** |
| P4 | Drum kit and download UI | P2, P3 | **done** |
| P5 | Curve families | — | **done** |
| P6 | Scale quantization | P1 | **done** |
| P7 | Multi-voice model | P5, P6 | **done** |
| P8 | Strudel export rewrite | P1, P6 | **done** |
| P9 | Browser preview | P2, P7 | **done** |

They landed in the order P1, P2, P3, P5, P6, P4, P7, P8, P9: the pure core
first, then the model and UI on top of it.

## Background

### What exists today

One sonification path: `pointToFrequency` (`src/core/mapping.ts:43`) maps a
curve point to a frequency, and `WebAudioEngine` glides an oscillator through
those frequencies continuously with `setTargetAtTime`.

`exportStrudelSnippet` (`src/export/strudelExport.ts`) samples **8** points from
the curve, runs them through the same `pointToFrequency`, and emits
`.freq("<a b c ...>")`. Angle brackets in Strudel mean *one value per cycle*.

With the default model (900 samples, `cyclesPerSecond` 0.2):

| | live audio | current export |
| --- | --- | --- |
| points read | 900 | 8 |
| time to traverse | 5s | 40s |
| motion | continuous glide | one step per cycle |

The export is not random and is not locked to a key. It is a 112x decimation of
the curve, stretched 8x in time. Same mapping function, opposite reading of
time. Fixing the string is not the answer; the missing concept is events.

### The gap

A curve is a continuous function. Music — and anything a DAW can import — needs
discrete events with onset, duration, pitch, and velocity. Everything below
exists to introduce an event layer and then treat audio, Strudel, and MIDI as
three thin adapters over it.

### What we are not doing

Tidal Cycles is out of scope. It requires Haskell, GHC, SuperCollider, and
SuperDirt as a *runtime* dependency for what should be an *export format*.
Strudel is the browser cousin, needs nothing installed, and this is already a
browser app. Strudel syntax stays close enough to Tidal that a snippet pastes
across with minor edits.

Strudel is also **not** the path to a DAW. Its GM soundfonts are for
auditioning. MIDI export (P3) is independent of Strudel (P8) and neither blocks
the other.

## Architecture

```text
SpirophonicModel
   |
   v
generateCurvePoints          Array<SpiroPoint>     P5
   |
   v
extractEvents                Array<CurveEvent>     P1
   |
   v
shapeRhythm                  quantize + velocity   P2
   |
   +---> buildMidiBytes      Uint8Array (.mid)     P3
   +---> exportStrudelSnippet  string              P8
   +---> previewPlan         browser audition      P9
```

### Invariants

These hold for every packet. A change that breaks one is a bug, not a
trade-off.

1. **Determinism.** The same model produces byte-identical output. No `Math.random`, no `Date.now`, no iteration over unordered collections in the core or in any exporter.
2. **Pure core.** Everything under `src/core/` stays free of React, DOM, and Web Audio. Only `src/ui/`, `src/audio/`, and the download helpers touch browser APIs.
3. **The cycle is the bar.** `getCycleEnd` (`src/core/trochoid.ts:21`) already computes curve closure via GCD, and `cyclesPerSecond` already maps to tempo. One closed traversal of a curve is one musical bar by default. Never generate events beyond `t ∈ [0, 1)`; looping is the consumer's job.
4. **Existing exports keep loading.** `parseModelJson` currently hard-requires `version === '0.1'` (`src/export/jsonExport.ts:43`). Any model change ships with a migration — see "Model versioning".
5. **Renderers are replaceable.** No exporter may reach back into geometry. If an exporter needs curve data, it comes through `CurveEvent`.

## Model versioning

Packets P4, P5, and P7 all add model fields. The first of them to land does the
version bump; the rest extend what it established.

- Bump `SpirophonicModel['version']` from `'0.1'` to `'0.2'`.
- `parseModelJson` accepts **both**. A `'0.1'` document is upgraded on import:
  - `geometry.family` defaults to `'spirogram'`
  - `voices` defaults to `[]`
  - every other new field takes its documented default
- `exportModelToJson` always writes `'0.2'`.
- A test must load a verbatim v0.1 JSON document and assert the upgraded model
  renders the same points as before the bump.

## P1 — Event extraction core

**Files:** `src/core/events.ts`, `src/core/events.test.ts`

### Types

```ts
export type CurveEventSource =
  | 'zero-x'      // x coordinate crosses zero
  | 'zero-y'      // y coordinate crosses zero
  | 'curvature'   // local maximum of turn angle (a cusp)
  | 'radius-max'  // local maximum of radius (a petal tip)
  | 'radius-min'  // local minimum of radius (a petal root)

export type CurveEvent = {
  t: number            // position in the cycle, 0 <= t < 1
  strength: number     // normalized salience, 0..1
  source: CurveEventSource
  index: number        // nearest sample index, for debug overlays
}

export type ExtractOptions = {
  source: CurveEventSource
  direction?: 'rising' | 'falling' | 'both'  // zero-* only, default 'rising'
  threshold?: number        // curvature/radius only, 0..1, default 0.15
  minSeparation?: number    // minimum t gap between events, default 0.01
  maxEvents?: number        // hard cap, default 128
}

export const extractEvents = (
  points: Array<SpiroPoint>,
  options: ExtractOptions,
): Array<CurveEvent> => { /* ... */ }
```

### Algorithms

`generateSpiroPoints` emits `t = index / (pointCount - 1)`, so `t` spans 0..1
inclusive and the final point closes onto the first. Iterate consecutive pairs
`i` from `0` to `n - 2` and the cycle is covered exactly once with no wrap
handling.

**Zero crossings.** For `zero-y` rising, a crossing lies between `a` and `b`
when `a.y <= 0 && b.y > 0`. Interpolate:

```ts
const frac = -a.y / (b.y - a.y)
const t = a.t + frac * (b.t - a.t)
```

Falling is the mirror (`a.y >= 0 && b.y < 0`). `zero-x` uses the `x` field.
Strength is the local speed from `approximateVelocity` (`src/core/mapping.ts:82`),
min-max normalized across the whole curve.

**Curvature peaks.** Build the curvature array with `approximateCurvature`
(`src/core/mapping.ts:96`), min-max normalize it, then take local maxima that
clear `threshold`. Apply non-maximum suppression: walk candidates strongest
first and reject any within `minSeparation` of an already-accepted event.
Strength is the normalized curvature.

**Radial extrema.** Same shape as curvature peaks, over `point.radius`, taking
maxima for `radius-max` and minima for `radius-min`. Strength for minima is
inverted so that a deeper trough is stronger.

**Normalization guard.** Copy the relative-epsilon guard from mrp's
`_min_max_normalized` (`~/mrp/mrp/video/geometry.py:482`): when the span is
`<= max(|low|, |high|, 1.0) * 1e-9`, return 0.5 for every value. A zero-pen-offset
circle has constant radius, and without this guard float noise becomes a full
strength swing.

Always return events sorted by `t` ascending, then truncated to `maxEvents`
keeping the **strongest**, then re-sorted by `t`.

### Why this is the right trigger set

The geometry hands you polyrhythm for free. Over one closed cycle:

| curve | parameters | trigger | events per cycle |
| --- | --- | --- | --- |
| Lissajous | `a=3, b=2` | `zero-x` rising | 3 |
| Lissajous | `a=3, b=2` | `zero-y` rising | 2 |
| Rose | `n=5, d=1` | `radius-max` | 5 |
| Hypotrochoid | `180/65/95` | `curvature` | 13 |

Two triggers on one Lissajous give an exact 3:2 against a shared bar line.
That is the feature the whole drum idea rests on.

### Acceptance criteria

- A circle yields exactly 1 rising `zero-y` event and no curvature events. Use `fixedRadius` 180, `movingRadius` 60, `penOffset` 0: closure is `TAU * moving / gcd(fixed, moving)`, so those radii traverse the circle once. The default 180/65 closes after **13** turns and would yield 13 events.
- Lissajous 3:2 yields exactly 3 rising `zero-x` and 2 rising `zero-y` events (needs P5; until then assert via a hand-built point array).
- All `t` values satisfy `0 <= t < 1`.
- Events are strictly ascending in `t` with no pair closer than `minSeparation`.
- Calling `extractEvents` twice on the same input returns deep-equal arrays.

## P2 — Rhythm shaping

**Files:** `src/core/rhythm.ts`, `src/core/rhythm.test.ts`

```ts
export type QuantizeOptions = {
  divisions: number   // grid steps per cycle, e.g. 16
  strength: number    // 0 = keep raw timing, 1 = snap fully
}

export type VelocityOptions = {
  min: number         // 1..127
  max: number         // 1..127
  gamma: number       // curve on strength, 1 = linear
}
```

Quantize by interpolating toward the grid rather than snapping outright, which
keeps the curve's natural feel at low strength:

```ts
const snapped = Math.round(event.t * divisions) / divisions
const t = event.t + (snapped - event.t) * strength
```

A snapped `t` of exactly 1 wraps to 0. After quantizing, collapse events that
land on the same grid slot, keeping the strongest. Velocity is
`round(lerp(min, max, strength ** gamma))` clamped to 1..127.

### Acceptance criteria

- `strength: 0` returns timings unchanged.
- `strength: 1` puts every `t` exactly on a `1/divisions` boundary.
- No output event has `t >= 1`.
- Velocities are integers within 1..127 and within `[min, max]`.

## P3 — MIDI file writer

**Files:** `src/export/midi/smf.ts`, `src/export/midi/smf.test.ts`,
`src/export/midiExport.ts`, `src/export/midiExport.test.ts`

`smf.ts` is a dependency-free Standard MIDI File byte writer. `midiExport.ts`
maps voices and events onto it. Do not add an npm MIDI library.

### Tempo

One cycle is one bar. Default 4/4, so:

```text
BPM                 = 60 * cyclesPerSecond * beatsPerBar
microsecondsPerBeat = 60_000_000 / BPM
```

A bar lasts `1 / cps` seconds and holds `beatsPerBar` beats, so a beat lasts
`1 / (cps * beatsPerBar)` seconds.

At the default `cyclesPerSecond` 0.2 in 4/4 that is 48 BPM, a 5-second bar, and
1_250_000 microseconds per quarter note. Clamp `cyclesPerSecond` through
`getEffectiveCyclesPerSecond` (`src/core/time.ts:5`) first; its 0.01..2 range
maps to 2.4..480 BPM.

Use 480 ticks per quarter note. An event at cycle position `t` sits at tick
`round(t * beatsPerBar * ticksPerQuarter)`.

### Byte format

Everything is big-endian. Write format 1: track 0 carries tempo and time
signature only, tracks 1..n carry notes. DAWs read that layout cleanly.

Header chunk:

```text
4D 54 68 64   "MThd"
00 00 00 06   header length, always 6
00 01         format 1
00 NN         number of tracks, including the tempo track
01 E0         division, 480 ticks per quarter note
```

Track chunk: `4D 54 72 6B` ("MTrk"), a 4-byte big-endian byte length, then
delta-time/event pairs. Every delta time is a variable-length quantity: seven
bits per byte, high bit set on every byte except the last. Zero encodes as a
single `00`.

Events needed:

| purpose | bytes |
| --- | --- |
| track name | `FF 03 <len> <ascii>` |
| tempo | `FF 51 03 <usPerBeat as 3 bytes>` |
| time signature | `FF 58 04 <num> <log2(den)> 18 08` |
| note on | `9<ch> <note> <velocity>` |
| note off | `8<ch> <note> 40` |
| end of track | `FF 2F 00` (required, ends every track) |

Channel nibble is 0-based: GM percussion is channel 10, written as nibble `9`.

Percussion notes are one-shots; give them a fixed short duration (32 ticks) and
emit the note off explicitly. Sort every track's events by tick before encoding
deltas, and compute each delta against the previous event's absolute tick.

### GM percussion map

Expose at least these, keyed by a readable name:

| note | name | note | name |
| --- | --- | --- | --- |
| 35 | acoustic-bass-drum | 46 | open-hi-hat |
| 36 | bass-drum | 47 | low-mid-tom |
| 37 | side-stick | 48 | hi-mid-tom |
| 38 | acoustic-snare | 49 | crash-cymbal |
| 39 | hand-clap | 50 | high-tom |
| 40 | electric-snare | 51 | ride-cymbal |
| 41 | low-floor-tom | 53 | ride-bell |
| 42 | closed-hi-hat | 54 | tambourine |
| 43 | high-floor-tom | 56 | cowbell |
| 44 | pedal-hi-hat | 69 | cabasa |
| 45 | low-tom | 75 | claves |

### Acceptance criteria

- VLQ round-trips: 0, 127, 128, 8192, 0x0FFFFFFF encode and decode correctly.
- A one-note file is byte-exact against a committed golden fixture.
- Every emitted track ends with `FF 2F 00`, and every declared chunk length matches its actual payload length.
- Generated files open in a DAW with correct tempo and notes on the intended channel. Record which DAW was used in the commit message.
- Exporting the same model twice yields identical bytes.

## P4 — Drum kit and download UI

**Files:** `src/ui/DrumPanel.tsx`, `src/core/model.ts`, `src/export/jsonExport.ts`,
`src/App.tsx`

Adds the model fields, the panel, and a download button. This packet does the
version bump described in "Model versioning" if P5 or P7 has not already.

```ts
export type DrumVoice = {
  id: string
  name: string
  enabled: boolean
  geometry: SpirophonicModel['geometry']  // its own curve
  trigger: ExtractOptions
  note: number                            // GM percussion note
  velocity: VelocityOptions
  quantize: QuantizeOptions
}
```

`voices: Array<DrumVoice>` hangs off the model. Ship three defaults that
demonstrate polyrhythm immediately: a 5-petal rose on `radius-max` to note 36, a
Lissajous 3:2 on `zero-x` to note 42, and the same Lissajous on `zero-y` to note
38. Follow the existing download pattern in `downloadModelJson`
(`src/export/jsonExport.ts:24`) with a `.mid` extension and
`type: 'audio/midi'`.

### Acceptance criteria

- Toggling a voice changes the exported file.
- A v0.1 JSON document still imports and renders identically.
- The download produces a file a DAW opens.

## P5 — Curve families

**Files:** `src/core/curves.ts`, `src/core/curves.test.ts`, `src/core/model.ts`

Port the families that already exist in mrp. **Do not modify
`src/core/trochoid.ts`.** Its output is checked against golden fixtures, and
`spirogram` must stay byte-identical. Add `src/core/curves.ts` that dispatches
on `geometry.family` and delegates the `spirogram` case to the existing
`generateSpiroPoints`.

### Reference implementations

| family | Python | JavaScript mirror |
| --- | --- | --- |
| lissajous | `~/mrp/mrp/video/geometry.py:138` | `~/mrp/mrp/admin/static/spiro-preview.js` |
| rose | `~/mrp/mrp/video/geometry.py:151` | same |
| superformula | `~/mrp/mrp/video/geometry.py:168` | same |
| harmonograph | `~/mrp/mrp/video/geometry.py:189` | same |

`SpiroPoint` in mrp is field-identical to ours, so the port is mechanical. The
JavaScript mirror is the closer starting point. Skip the `path` family (SVG
resampling) for now; it needs a DOM probe and earns its place later.

New geometry fields, matching mrp's names and defaults so the two stay
comparable:

```ts
family: 'spirogram' | 'lissajous' | 'rose' | 'superformula' | 'harmonograph'
lissFreqX: 3, lissFreqY: 2, lissDelta: Math.PI / 2
roseN: 5, roseD: 1
sfM: 6, sfN1: 0.3, sfN2: 0.3, sfN3: 0.3
harmFreqX: 3.01, harmFreqY: 2, harmDelta: Math.PI / 2
harmDamping: 0.02, harmTurns: 12
```

Two behaviors to carry across:

- **Endpoint snap.** For every family except `spirogram`, overwrite the last point with the first point's coordinates (`~/mrp/mrp/video/geometry.py:453`). Fractional exponents amplify float residue at the wrap, and closure must be exact for event extraction to be stable.
- **Scale.** Non-spirogram families produce unit-scale coordinates (roughly -1..1) while `spirogram` produces pixel-scale. Normalize each family to a comparable radius before rendering, or the canvas view will show a dot. mrp handles this through casting's `base_scale`; here, scale unit families by a constant derived from `fixedRadius`.

### Musical significance

Worth stating so it does not get optimized away: **Lissajous** frequency ratios
*are* polyrhythms, and **harmonograph** is a damped Lissajous whose decay
envelope maps naturally onto velocity falling across a bar. Those two carry the
ambient use case.

### Acceptance criteria

- `spirogram` output is unchanged, verified against the existing trochoid tests.
- Every family's last point equals its first within 1e-9.
- Lissajous 3:2 produces exactly 3 rising `zero-x` and 2 rising `zero-y` events.
- Rose `n=5, d=1` produces exactly 5 `radius-max` events.

## P6 — Scale quantization

**Files:** `src/core/scales.ts`, `src/core/scales.test.ts`

```ts
frequencyToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440)
midiToFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12)
```

Quantize the continuous note number to the nearest degree of a named scale
rooted at a chosen note. Ship chromatic, major, natural minor, pentatonic
major, pentatonic minor, and dorian, as semitone-offset arrays. VISION.md
already lists chromatic, pentatonic, and harmonic-ratio modes as v0.1 stretch
scope, so this is sanctioned work.

### Acceptance criteria

- A440 maps to MIDI 69, and the round trip is stable to within 1e-9.
- Chromatic quantization equals plain rounding.
- Every quantized value is a member of the requested scale.

## P7 — Multi-voice model

**Files:** `src/core/model.ts`, `src/ui/`, `src/render/canvasRenderer.ts`

Generalize `DrumVoice` into a voice that can be pitched or percussive, each
with its own curve, trigger, and output channel. This is structurally identical
to mrp's *casting* — several traces per section, each with its own geometry and
its own drivers (`~/mrp/mrp/video/casting.py`). Read that before designing the
shape; the problem has been solved once already.

The canvas should draw every enabled voice's curve so the composition is
visible as one image. That is the "visually compose music" goal, and it is the
point of the whole project.

## P8 — Strudel export rewrite

**Files:** `src/export/strudelExport.ts`, `src/export/strudelExport.test.ts`

Rebuild over `CurveEvent`. Emit scale degrees, not raw frequencies, so the
snippet stays editable in Strudel:

```javascript
setcps(0.2)

stack(
  s("bd*<5>").gain("0.8 0.5 0.6 0.5 0.7"),
  n("0 2 4 7").scale("C4:minor").s("gm_pad_warm").gain(0.45)
)
```

Percussion voices become `s()` patterns; pitched voices become
`n().scale().s()`. Use `stack()` to combine voices. Keep `setcps` driven by
`getEffectiveCyclesPerSecond`.

The current 8-sample `.freq("<...>")` behavior is replaced entirely. Delete it
rather than keeping a compatibility path.

### Acceptance criteria

- Output contains no raw `.freq(` call.
- Event count in the snippet matches the extracted event count.
- The snippet pastes into strudel.cc and plays. Note the tested Strudel version in the commit message.

## Testing

Vitest, colocated `*.test.ts` beside the module. Run `npm test`, `npm run lint`,
and `npm run build` before marking any packet done; all three gate CI.

Priorities, in order:

1. **Determinism.** Every exporter gets a "same input twice, deep-equal output" test.
2. **Golden fixtures.** The MIDI writer gets committed byte fixtures. Follow the precedent of `trochoid-golden.json`, which is how the Python port was verified.
3. **Musical assertions.** Assert *event counts* for known curves, as in the tables above. These catch real regressions in a way snapshot tests do not.
4. **Migration.** A verbatim v0.1 document loads and renders identically.

## Open questions

Decide these when the packet that needs them lands; do not block on them.

- Should one cycle be able to span multiple bars? A `cycleBars` field would let a slow harmonograph breathe over 4 bars. Defer until P7.
- Note duration for pitched voices: fixed, until the next event, or driven by curvature? Fixed is fine for P6.
- Web MIDI live output to a DAW is attractive but fiddly under WSL2. File export first.
- The `path` family (SVG subpath resampling) needs a DOM probe, so it does not belong in the pure core as currently drawn.

## References

- `docs/VISION.md` — the charter. Multi-voice layers, scale modes, MIDI export, and the casting/section-timeline idea are all already listed there.
- `~/mrp/mrp/video/geometry.py` — curve families, Python.
- `~/mrp/mrp/admin/static/spiro-preview.js` — the same families in JavaScript.
- `~/mrp/mrp/video/casting.py` — prior art for multi-voice composition.

## Keeping the exports in agreement

The MIDI file and the Strudel snippet are two adapters over one event list, so
they have to describe the same part. Two rules exist only to hold that:

**One grid step holds one hit.** `quantizeEvents` collapses to the loudest
onset per step at *every* strength, not only at a full snap. Collapsing only
coincident onsets — which an earlier draft of this doc allowed, to keep a near
miss as a flam — let the MIDI writer place a dozen onsets a few ticks apart
while the Strudel step sequence folded them into three. The winner keeps its
own timing, so a loose part still plays off the grid; to keep two close onsets
apart, raise `divisions`.

**A note fills its own step.** That is what a step sequence means and what
Strudel plays, and `gate` multiplies it in both exports — as ticks in MIDI, as
`clip()` in Strudel. At `gate <= 1` the MIDI writer additionally holds a note
no longer than the gap to the next onset, because loosely quantized onsets can
sit closer together than a step and would otherwise smear a line into a chord.
Above 1 the overlap is the explicit request, so it is left alone.

`src/export/agreement.test.ts` compares the outputs against each other rather
than against fixtures, and checks they still agree at several quantize
strengths. The browser preview is included, so all three stay in step.

The residual difference is sub-step timing: MIDI writes an onset where it
actually falls, while a Strudel step sequence can only place it on the grid.
Note counts, pitches, and dynamics match; a loosely quantized part will swing
in the DAW and sit square in Strudel.

## Strudel vocabulary

The names a snippet emits are an external contract, and Strudel fails quietly
when one is wrong: an unresolved scale or sound produces no event rather than
an error, so the voice simply goes silent. Verified 2026-08-03 against the
live docs and `packages/soundfonts/gm.mjs`.

**Scales.** `scale()` resolves against TonalJS scale-type names. Strudel parses
the argument as `root:type` and cannot contain a space, because a space would
make it a multi-step pattern; the documented escape is to write every space as
another colon.

| model | TonalJS | emitted |
| --- | --- | --- |
| `pentatonic-minor` | `minor pentatonic` | `c3:minor:pentatonic` |
| `pentatonic-major` | `major pentatonic` | `c3:major:pentatonic` |
| `minor` | `minor` | `c3:minor` |

`minPent` and `majPent` are **not** TonalJS names and resolve to nothing.

**Sounds.** Strudel groups all 128 GM instruments under 125 keys in
`packages/soundfonts/gm.mjs`, and the keys are shortened rather than being the
full GM instrument names — `gm_piano`, not `gm_acoustic_grand_piano`. Program
numbers in `strudelInstruments` are zero-based, matching the MIDI program byte,
so `89` is Pad 2 (warm) and maps to `gm_pad_warm`.

Built-in oscillators (`sine`, `sawtooth`, `square`, `triangle`) need no
soundfont and are the fallback when a program has no mapped name.

When adding a scale or an instrument, add a test asserting the exact emitted
string. A snippet that parses is not a snippet that plays.


## P9 — Browser preview

**Files:** `src/core/preview.ts`, `src/core/preview.test.ts`,
`src/audio/drumSynth.ts`, `src/audio/toneSynth.ts`,
`src/audio/voicePreview.ts`, `src/ui/VoicePanel.tsx`

A fourth adapter over the same events, so the composition can be heard before
it is exported.

`previewPlan` is pure and lives in the core: it turns the model into one bar of
`{ offset, duration, note, level }` in seconds, sharing `noteLengths` with the
MIDI writer so the two cannot describe different music. Everything touching an
audio API stays under `src/audio/`.

**Synthesis, not samples.** Percussion is built from oscillators and filtered
noise, pitched voices from one oscillator and an envelope. No soundfont, no
samples, no network, nothing added to the repository. It is a drum machine
rather than a kit, and it is only ever an audition — the exported MIDI carries
note numbers and the DAW decides what they sound like.

Swapping in soundfonts later means replacing `drumSynth` and `toneSynth` and
leaving `previewPlan` and `VoicePreview` untouched. That is the point of
keeping the plan pure.

**Scheduling.** Notes are queued 0.25s ahead on a 60ms timer and given explicit
start times, because scheduling on timer callbacks alone drifts audibly. Edits
apply at the next bar rather than restarting playback, so a pattern can be
shaped while it loops.

### Acceptance criteria

- The preview sounds the same notes, in the same order, as the MIDI export.
- Note lengths match the MIDI file's as a share of the bar.
- Nothing under `src/core/` references an audio API.
- No dependency is added.


## One relationship, several voices

A voice's `geometry` is a **partial override of the model's**, not a curve of
its own. Anything it leaves out is inherited, so editing the relationship or
loading a preset moves the music with the drawing. A voice that overrides
nothing reads the main curve itself, which is the plainest statement of the
thesis: the shape you see is the rhythm you hear.

This was not true at first. `defaultVoices` built each voice a complete
geometry with hardcoded radii, so the app held N+1 unrelated curves and the
control panel drove only the one on screen. Changing a preset redrew the trace
and left the part untouched.

What inheritance can and cannot reach is worth being clear about. A voice that
overrides `family` still inherits `phase` and `samples`, so a preset that
rotates the relationship shifts every onset. It does not inherit the parameters
its family has no use for: a rose reads `roseN`, not `fixedRadius`, so changing
the moving radius will not move a rose voice. Set the voice to the main shape
and everything reaches it.

`src/core/voices.test.ts` pins this: onsets shift with `phase`, follow `roseN`
when the family is inherited, and a voice overriding nothing renders exactly
`generateCurvePoints(model)`.
