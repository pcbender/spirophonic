# Spirophonic Music Generator Build Plan

Status: **implementation contract; all packets are planned.**

This document turns [Spirophonic-Domain-Model.md](Spirophonic-Domain-Model.md)
into a dependency-ordered build plan. It is the active contract for moving the
current curve sonifier into a relationship-first music generator. The domain
model remains the conceptual authority; this document supplies implementation
boundaries, packet ownership, and acceptance criteria.

[SOUND-AND-MIDI-DESIGN.md](SOUND-AND-MIDI-DESIGN.md) remains the historical
contract for the implemented curve-event system. Its code and tests are useful
inputs, but its assumptions that one curve is one bar, that a Voice reads its
own curve, and that exporters begin with `CurveEvent` do not govern this plan.

Update the progress table in the same commit that lands a packet. Do not mark a
packet done until its acceptance criteria and the repository gates pass.

Live ownership, blockers, validation evidence, and cross-agent handoffs are
maintained in [MUSIC-GENERATOR-PROGRESS.md](MUSIC-GENERATOR-PROGRESS.md).

## Decisions already made

- The new model is a clean cut. There is no v0.1 or v0.2 JSON migration path.
- The first playable slice is one Wheel with one Head encountering simple ring
  and spoke Fields.
- The roadmap covers the complete domain vision rather than stopping after the
  first slice.
- The build plan lives in this new contract; the conceptual and historical
  documents are not rewritten into implementation plans.
- SoundFont-backed instruments are required for Spirophonic to become a useful
  composition tool. The existing oscillator and drum synthesis remain a fast,
  dependency-light fallback.
- The engine and editor must support several concurrent Wheels, with several
  Heads per Wheel.

## Meaning of Wheel, Head, shape, and Trace

A Wheel owns one motion system. A Head is one attachment or phase-relative
tracked point on that system. Each Head produces one visible Trace, which is
the shape seen on the canvas.

```text
Wheel: shared motion and rate
  Head A: attachment/phase -> Trace A
  Head B: attachment/phase -> Trace B
  Head C: attachment/phase -> Trace C
```

This is how one Wheel produces several shapes without turning those shapes
into independent clocks. Two curves with different motion families are two
Wheels, even if the editor later groups them visually. That distinction keeps
encounters and variation well-defined.

## Product boundary

Spirophonic remains a local-first React/Vite browser instrument. This plan does
not add a backend, accounts, cloud storage, a DAW-style audio-track editor, or a
Tidal/SuperCollider runtime. It does not move Spirophonic into MRP.

MRP is a source of tested algorithms and design patterns. Spirophonic must not
acquire a runtime dependency on MRP, its Python environment, Admin application,
or project files.

The new engine is built beside the current running app through MG-08 so every
packet can keep the repository green. MG-09 performs the single product cutover
and deletes the old model. This temporary source-code coexistence is not a
legacy data adapter: the new parser never accepts old documents, and the app
does not ship two selectable engines.

## Target architecture

```text
Composition + PerformanceRequest
             |
             v
      Transport timeline
             |
             v
  Wheel/Head stateAt(time)  <---- seeded Variation
             |
             v
     Encounter Engine
      |             |
 discrete events   continuous relations
      |             |
      +------ Part interpretation
                    |
                    v
          Interpreted Musical Events
                    |
             performance variation
                    |
                    v
            Performed Events
       +------------+-------------+
       |            |             |
 browser scheduler  Recorder      exporters
       |                          /   |    \
 synth/SoundFont                MIDI Strudel audio
```

The compiler, not an exporter or audio engine, owns geometry evaluation,
encounter detection, interpretation, and variation. Every playback and export
surface consumes the same performed events.

## Architectural invariants

1. **Absolute deterministic time.** Core state is calculated from the
   Composition and requested time. Neither `requestAnimationFrame`, timer
   callbacks, nor audio scheduling determines Wheel or Head state.
2. **Transport is independent of closure.** Tempo and meter organize musical
   time. A Wheel may close several times per bar, across several bars, or not
   close in the performance window.
3. **One Wheel, one clock, many Heads.** All Heads on a Wheel inherit its motion
   and rate. A Head may add an attachment offset, phase offset, or scale but may
   not silently introduce an independent clock.
4. **Encounters are facts, not notes.** Encounter detection cannot import scales,
   instruments, MIDI, SoundFonts, or UI concepts.
5. **Parts do not own geometry.** A Part selects Encounters and maps them to
   musical intent. Several Parts may interpret the same Encounter.
6. **Instruments do not compose.** An Instrument renders notes and controls. It
   never reads Wheels, Fields, Heads, or Traces.
7. **Pure core.** `src/core/` has no React, DOM, Canvas, IndexedDB, Web Audio,
   worker, or network dependency.
8. **Stable identity.** Every Wheel, Head, Field, Boundary, Part, Instrument,
   Encounter, and Musical Event has a stable ID. Array order is not identity,
   although stable array order is retained for drawing and tie-breaking.
9. **Variation is explicit.** No hidden `Math.random`, current clock, or unstable
   iteration may affect core output. Every random choice is derived from a seed
   plus stable object/event identity.
10. **One canonical performance.** Browser playback, recording, MIDI, Strudel,
    and offline audio must agree on event identity, onset, pitch, velocity,
    duration, and control values to the extent the target format can represent
    them. Any lossy conversion is explicit and reported.
11. **Sound banks are assets, not model blobs.** Composition JSON stores a
    content-addressed bank reference and preset selection. Large SF2/SF3 bytes
    live in a local asset store or an explicit portable bundle.
12. **No implicit remote dependency.** Core composition and the fallback synth
    work offline. A SoundFont CDN may be an opt-in source, never the only way a
    saved work can sound.
13. **No legacy ambiguity.** The new parser accepts the new composition version
    only. Old files fail with a clear unsupported-version message rather than a
    partial or best-effort conversion.

## Proposed model boundary

The exact TypeScript declarations land in MG-01, but every later packet may
rely on this ownership shape:

```ts
type Composition = {
  version: '1.0'
  id: string
  name: string
  space: SpaceSpec
  transport: TransportSpec
  wheels: WheelSpec[]
  fields: FieldSpec[]
  parts: PartSpec[]
  instruments: InstrumentSpec[]
  variation?: VariationSpec
}

type WheelSpec = {
  id: string
  name: string
  enabled: boolean
  center: { x: number; y: number }
  rate: { cycles: number; beats: number }
  phase: number
  direction: 'forward' | 'reverse'
  motion: MotionSpec
  heads: HeadSpec[]
}

type HeadSpec = {
  id: string
  name: string
  enabled: boolean
  phaseOffset: number
  attachment: HeadAttachmentSpec
  trace: TracePresentationSpec
}

type PartSpec = {
  id: string
  name: string
  enabled: boolean
  encounterQuery: EncounterQuery
  onset: OnsetMapping
  pitch: PitchMapping
  velocity: ValueMapping
  duration: DurationMapping
  quantize?: QuantizeSpec
  instrumentId: string
}
```

`MotionSpec` is a discriminated union. Family-specific values must not remain in
one widened bag. For a spirogram, fixed/moving radii and rotation belong to the
Wheel while pen offset belongs to each Head. Other families define the smallest
shared motion plus attachment fields that preserve the same Wheel/Head rule.

The model stores references by ID and validates them at its boundary. A Part
cannot reference a missing Head, Field, Boundary, or Instrument. IDs are unique
within the Composition and remain stable through edits.

## Time contract

The first Transport supports a constant tempo, one meter, and a finite
performance window:

```ts
type TransportSpec = {
  tempoBpm: number
  meter: { beatsPerBar: number; beatUnit: 2 | 4 | 8 | 16 }
  loop: { startBeat: number; lengthBeats: number }
}

type PerformanceRequest = {
  startSeconds: number
  durationSeconds: number
  sampleRateHz: number
  seed?: string
}
```

Wheel rates use rational musical units: `cycles / beats`. One cycle per four
beats is `{ cycles: 1, beats: 4 }`; three cycles per two beats is
`{ cycles: 3, beats: 2 }`. This avoids deriving tempo from geometry and gives
polymetric Wheels a common timeline.

Encounter extraction samples the requested time window but refines crossings
between samples. `sampleRateHz` is part of the PerformanceRequest and therefore
part of reproducibility. Animation may sample more coarsely for display, but
recording and export use the compiler request recorded with the artifact.

## Canonical event layers

```ts
type EncounterEvent = {
  id: string
  kind: RelationEventKind
  timeSeconds: number
  subjects: string[]
  boundaryId?: string
  position?: { x: number; y: number }
  direction?: string
  strength: number
  measurements: Record<string, number>
}

type MusicalEvent = {
  id: string
  sourceEncounterId: string
  partId: string
  instrumentId: string
  timeSeconds: number
  kind: 'note' | 'control' | 'rest'
  pitch?: { kind: 'midi'; note: number } | { kind: 'frequency'; hz: number }
  velocity?: number
  durationSeconds?: number
  control?: { name: string; value: number }
}

type CompiledPerformance = {
  request: PerformanceRequest
  encounters: EncounterEvent[]
  interpretedEvents: MusicalEvent[]
  performedEvents: MusicalEvent[]
}
```

Event arrays are sorted by time, then stable source identity, then event kind.
IDs derive from stable subject IDs, event kind, and occurrence ordinal within
the request. They must never derive from display frame count or object address.

## SoundFont strategy

The durable interface is a Spirophonic instrument engine, not a third-party
library type:

```ts
interface InstrumentEngine {
  prepare(instruments: InstrumentSpec[]): Promise<void>
  schedule(event: MusicalEvent, audioTime: number): void
  cancelFrom(audioTime: number): void
  dispose(): Promise<void>
}
```

Two implementations ship:

- `NativeSynthEngine` preserves the current oscillator/noise preview as an
  always-available fallback and test double.
- `SoundFontEngine` renders SF2/SF3 presets through an AudioWorklet-capable
  library behind the interface.

The leading implementation candidate is
[`spessasynth_lib`](https://spessasus.github.io/spessasynth_lib/), whose current
browser wrapper supports SoundFont/DLS banks and Worklet-based playback. Its
official browser guidance requires deliberate worklet packaging, and its API
has had breaking releases. MG-10 therefore records a pinned, tested choice
before MG-11 integrates it. The adapter must make later replacement possible.

Sound bank licensing is separate from synthesizer-library licensing. No bank is
committed or remotely loaded by default until its redistribution, attribution,
and derivative-work terms are recorded. User-imported local `.sf2`, `.sf3`, and
optionally `.dls` files are the first supported source.

A bank reference contains a stable ID, SHA-256 digest, display name, format,
and provenance/license metadata. The binary is stored in IndexedDB. Missing
banks never silently fall back to a different timbre: the UI reports the
missing digest and offers relink, while the user may explicitly choose the
native fallback.

## MRP reuse map

MRP provides prior art, not a package dependency:

| Need | MRP source | Reuse mode |
| --- | --- | --- |
| Existing curve-family parity | `mrp/video/geometry.py`, `mrp/admin/static/spiro-preview.js` | Port algorithms and share golden cases; Spirophonic already carries the main five families. |
| One identity with several shapes | `ActorConfig.components` in `mrp/video/project.py` | Reuse uniqueness, bounded-list, and stable flattening ideas for Wheel/Head authoring. Do not copy Actor/scene semantics. |
| Compile hierarchical objects to draw-ready items | `compile_actor_cast` in `mrp/video/casting.py` | Reuse stable derived-ID and ordered-flattening patterns. |
| Path and text geometry | `mrp/video/geometry.py` and its engine tests | Port arc-length resampling and fixtures in a later geometry packet. |
| Multi-shape Canvas drawing | `mrp/admin/static/spiro-preview.js` | Reuse placement, stable paint order, and trace presentation ideas where they fit the domain. |
| Deterministic cross-language fixtures | `tests/video/engine/test_geometry.py` | Keep fixture-based parity; do not call Python at runtime. |

MRP's visual components currently carry independent trace speeds. That is not
the Spirophonic Wheel/Head model and must not be transplanted. MRP also has no
SoundFont or musical Encounter engine to reuse.

## Progress

| Packet | Title | Depends on | Status |
| --- | --- | --- | --- |
| MG-01 | Composition schema and validation | — | **done** |
| MG-02 | Deterministic Transport and performance window | MG-01 | **done** |
| MG-03 | Wheel and multi-Head state engine | MG-01, MG-02 | **done** |
| MG-04 | Space projection and composition renderer | MG-03 | **done** |
| MG-05 | Ring and spoke Fields | MG-01, MG-03, MG-04 | **done** |
| MG-06 | Boundary-crossing Encounter engine | MG-02, MG-03, MG-05 | **done** |
| MG-07 | Parts and canonical performance compiler | MG-01, MG-02, MG-06 | **done** |
| MG-08 | Native instrument engine and live scheduler | MG-02, MG-07 | **done** |
| MG-09 | First playable generator and clean model cutover | MG-01–MG-08 | **done** |
| MG-10 | Sound bank vault and SoundFont engine decision | MG-01, MG-08 | **done** |
| MG-11 | SoundFont playback and instrument browser | MG-07, MG-08, MG-10 | **done** |
| MG-12 | Concurrent multi-Wheel/multi-Head authoring | MG-09, MG-11 | **done** |
| MG-13 | Ellipse, band, grid, spiral, and moving Fields | MG-05, MG-06, MG-12 | **planned** |
| MG-14 | Head-to-Head relations and continuous controls | MG-06, MG-07, MG-12 | **planned** |
| MG-15 | Trace encounters and retained trace state | MG-04, MG-06, MG-12 | **planned** |
| MG-16 | Relationship tuning, melody, and harmony | MG-07, MG-11, MG-14 | **planned** |
| MG-17 | Seeded variation | MG-03, MG-06, MG-07, MG-16 | **planned** |
| MG-18 | Recorder, replay, and reinterpretation | MG-07, MG-17 | **planned** |
| MG-19 | MIDI and Strudel exporter rebuild | MG-16, MG-18 | **planned** |
| MG-20 | Offline audio and portable project bundles | MG-10, MG-11, MG-18, MG-19 | **planned** |
| MG-21 | Scalability hardening, example works, and release | MG-12–MG-20 | **planned** |

The first user-visible milestone is MG-09. MG-11 makes that slice sound like a
composition tool. MG-12 proves concurrent Wheels and Heads before advanced
relations make the engine more expensive.

## MG-01 — Composition schema and validation

**Goal:** Define the relationship-first v1.0 Composition and its strict runtime
boundary beside the current model, ready for the MG-09 cutover.

**Files:** `src/core/composition.ts`, `src/core/defaultComposition.ts`,
`src/core/compositionValidation.ts`, `src/core/composition.test.ts`,
`src/core/compositionValidation.test.ts`, `src/export/compositionJson.ts`,
`src/export/compositionJson.test.ts`

**Deliverables:**

- Discriminated model types for Composition, Space, Transport, Wheel, Head,
  Field, Part, Instrument, and references between them.
- One minimal default Composition containing one spirogram Wheel, one Head,
  empty Fields/Parts, and the native fallback Instrument.
- Runtime validation for finite ranges, unique IDs, non-empty required lists,
  family-specific motion/attachment fields, and referential integrity.
- JSON parse/export for version `1.0` only.

**Acceptance criteria:**

- A valid default Composition parses and round-trips deterministically.
- Duplicate IDs and dangling Part/Instrument/Head/Field references fail with a
  path-specific error.
- Family-specific fields cannot appear on the wrong motion or attachment kind.
- A v0.1 or v0.2 document returns an explicit unsupported-version result.
- The new v1 modules contain no legacy upgrade function or compatibility branch.

## MG-02 — Deterministic Transport and performance window

**Goal:** Make musical time independent of curve closure and display time.

**Files:** `src/core/transport.ts`, `src/core/transport.test.ts`

**Deliverables:**

- Pure conversions among seconds, beats, bars, bar phase, and Wheel phase.
- Rational Wheel rate support using cycles per beats.
- Validation and clamping policies for tempo, meter, loop, start, duration, and
  compiler sample rate.
- A stable time-grid iterator that includes the request start and end exactly
  once and does not accumulate floating-point drift by repeated addition.

**Acceptance criteria:**

- At 120 BPM, four beats equal two seconds regardless of any Wheel's geometry.
- Wheels at `1/4`, `3/2`, and `5/8` cycles per beat have exact expected phases
  at representative beat boundaries.
- A request beginning mid-bar reports correct bar, beat, and phase addresses.
- Repeated evaluation and different display frame rates produce identical core
  time states.
- No rule equates closure, cycle, or trace completion with a bar.

## MG-03 — Wheel and multi-Head state engine

**Goal:** Evaluate one or many Heads from one Wheel's shared motion at any
requested absolute time.

**Files:** `src/core/motion.ts`, `src/core/motion.test.ts`,
`src/core/wheels.ts`, `src/core/wheels.test.ts`, `src/core/heads.ts`,
`src/core/heads.test.ts`, `src/core/curves.ts`, `src/core/curves.test.ts`,
`src/core/trochoid.ts`, `src/core/trochoid.test.ts`

**Deliverables:**

- `wheelStateAt(composition, wheelId, timeSeconds)` and
  `headStateAt(..., headId, timeSeconds)` as pure functions.
- Motion adapters for current spirogram, Lissajous, rose, superformula, and
  harmonograph families.
- A family-specific split between shared Wheel motion and per-Head attachment.
- Position, velocity, speed, angle, radius, Wheel phase, and stable subject IDs
  in each HeadState.
- Multi-Head fixtures proving shared time with independent attachments.

**Acceptance criteria:**

- Existing curve-family golden math is retained where semantics are unchanged.
- Two Heads on one Wheel share Wheel phase at every time while distinct phase
  or attachment offsets produce distinct positions.
- Reversing a Wheel reverses velocity and traversal without changing identity.
- An open/damped trajectory evaluates past one notional cycle without forced
  endpoint closure.
- State depends only on Composition and requested time.

## MG-04 — Space projection and composition renderer

**Goal:** Draw Wheels, Heads, and Traces from absolute state without making the
renderer part of the simulation.

**Files:** `src/render/compositionRenderer.ts`,
`src/render/compositionRenderer.test.ts`, `src/ui/CompositionCanvas.tsx`,
`src/ui/CompositionCanvas.test.tsx`, `src/App.css`

**Deliverables:**

- Shared Space-to-canvas projection, fit, center, and scale operations.
- Stable render order: configured Wheel order, then Head order.
- Retained trace sampling over an explicit observation interval.
- Visual switches for full Trace, animated Trace, Head marker, and debug IDs.
- Rendering inputs that are immutable state snapshots rather than a mutating
  pen advanced by animation frames.

**Acceptance criteria:**

- Seeking directly to a time draws the same image-state data as playing to it.
- Two Heads on one Wheel draw two stable, independently styled Traces.
- Resizing changes projection only; it does not change states or encounters.
- Renderer tests assert draw commands/state, not browser antialiasing pixels.
- Canvas code never becomes an input to core motion or encounter calculations.

## MG-05 — Ring and spoke Fields

**Goal:** Supply the simple spatial structures for the first playable slice.

**Files:** `src/core/fields.ts`, `src/core/fields.test.ts`,
`src/render/compositionRenderer.ts`, `src/render/compositionRenderer.test.ts`,
`src/ui/FieldPanel.tsx`, `src/ui/FieldPanel.test.tsx`

**Deliverables:**

- Stationary concentric-ring and radial-spoke Field specs.
- Stable Boundary IDs derived from explicit boundary entries, not display
  indices alone.
- Pure signed-distance/crossing functions for rings and oriented spoke rays.
- Field rendering and optional Boundary labels.
- Add, remove, reorder, enable, and edit operations that preserve unaffected IDs.

**Acceptance criteria:**

- Ring boundaries remain stable when a sibling ring is edited or reordered.
- Spokes distinguish ray crossing from crossing the infinite line behind it.
- Field drawing and encounter geometry use the same center/orientation data.
- A five-ring Field can be addressed as five distinct Boundaries.
- Disabled Fields and Boundaries create neither draw items nor Encounters.

## MG-06 — Boundary-crossing Encounter engine

**Goal:** Detect Head crossings of rings and spokes over a performance window.

**Files:** `src/core/encounters.ts`, `src/core/encounters.test.ts`,
`src/core/crossings.ts`, `src/core/crossings.test.ts`

**Deliverables:**

- A deterministic interval scan over the PerformanceRequest time grid.
- Bracketed interpolation/refinement of crossing time and position between
  samples.
- Ring inward/outward direction and spoke clockwise/counterclockwise direction.
- Strength, speed, incidence angle, Wheel phase, and bar address measurements.
- Stable Encounter sorting, deduplication at sample boundaries, maximum-count
  protection, and diagnostics when resolution is too low.

**Acceptance criteria:**

- Hand-constructed paths yield byte-stable expected Encounter fixtures.
- A crossing that lands exactly on a sample appears once, not twice.
- Increasing sample rate within the documented convergence range changes a
  refined crossing by less than the specified tolerance.
- Simultaneous crossings sort deterministically by subject and Boundary ID.
- Encounter output contains no note, scale, velocity, or instrument choice.

## MG-07 — Parts and canonical performance compiler

**Goal:** Turn selected Encounters into musical intention once, upstream of all
playback and export surfaces.

**Files:** `src/core/parts.ts`, `src/core/parts.test.ts`,
`src/core/performance.ts`, `src/core/performance.test.ts`,
`src/core/rhythm.ts`, `src/core/rhythm.test.ts`, `src/core/scales.ts`,
`src/core/scales.test.ts`

**Deliverables:**

- Encounter queries by kind, Wheel, Head, Field, Boundary, direction, and
  threshold.
- Mapping primitives for onset, pitch, velocity, duration, rest/probability
  placeholder, and quantization in musical time.
- A `compilePerformance` function producing Encounter, interpreted, and
  performed event layers; performed initially equals interpreted.
- Adapters for useful current rhythm, scale, and event-strength functions
  without carrying the old Voice-owned geometry model forward.
- Referential and musical range validation with actionable diagnostics.

**Acceptance criteria:**

- Two Parts can interpret one Encounter into different Instruments and pitches.
- One Part can ignore the same Encounter without changing its stable ID.
- Quantization operates in Transport beats, not normalized curve position.
- The same Composition and PerformanceRequest produce deep-equal performance
  objects on repeated runs.
- Adding an unrelated Part does not change existing event IDs or values.

## MG-08 — Native instrument engine and live scheduler

**Goal:** Hear the canonical performance through a replaceable audio backend.

**Files:** `src/audio/instrumentEngine.ts`,
`src/audio/nativeSynthEngine.ts`, `src/audio/nativeSynthEngine.test.ts`,
`src/audio/performanceScheduler.ts`,
`src/audio/performanceScheduler.test.ts`, `src/audio/drumSynth.ts`,
`src/audio/toneSynth.ts`

**Deliverables:**

- The `InstrumentEngine` lifecycle and event scheduling contract.
- A native synth implementation using the existing oscillator/noise voices.
- AudioContext look-ahead scheduling against absolute audio time.
- Start, pause, resume, seek, loop, stop, panic/all-notes-off, and disposal.
- Edit handoff at an explicit Transport boundary, defaulting to the next beat.
- A fake clock and fake engine for deterministic scheduler tests.

**Acceptance criteria:**

- The scheduler submits the same performed events and durations emitted by the
  compiler, in stable order.
- Timer jitter changes when scheduling calls occur, not their requested audio
  timestamps.
- Pause/seek/stop cancel future events and cannot leave hanging notes.
- Several simultaneous Parts play without routing every note through one global
  waveform setting.
- Core modules contain no Web Audio references.

## MG-09 — First playable generator and clean model cutover

**Goal:** Deliver one complete composition loop with the new architecture and
remove the old model from the running app.

**Files:** `src/App.tsx`, `src/App.test.tsx`, `src/ui/Transport.tsx`,
`src/ui/ControlPanel.tsx`, `src/ui/WheelPanel.tsx`,
`src/ui/HeadPanel.tsx`, `src/ui/FieldPanel.tsx`, `src/ui/PartPanel.tsx`,
`src/ui/InstrumentPanel.tsx`, `src/ui/ImportExportPanel.tsx`,
`src/ui/CompositionCanvas.tsx`, `src/export/compositionJson.ts`,
`src/export/jsonExport.ts`, `src/core/defaultComposition.ts`,
`src/core/model.ts`, `src/core/defaultModel.ts`,
`src/core/defaultModel.test.ts`, `src/core/voices.ts`,
`src/core/voices.test.ts`, `src/core/preview.ts`,
`src/core/preview.test.ts`, `src/core/events.ts`, `src/core/events.test.ts`,
`src/core/time.ts`, `src/core/time.test.ts`, `src/render/canvasRenderer.ts`,
`src/render/color.ts`, `src/ui/CanvasView.tsx`, `src/audio/voicePreview.ts`,
`src/audio/webAudioEngine.ts`, `src/core/mapping.ts`,
`src/core/mapping.test.ts`, `src/core/presets.ts`,
`src/ui/VoicePanel.tsx`, `src/ui/PresetPicker.tsx`,
`src/ui/StrudelExportPanel.tsx`, `src/export/jsonExport.test.ts`,
`src/export/midiExport.ts`, `src/export/midiExport.test.ts`,
`src/export/strudelExport.ts`, `src/export/strudelExport.test.ts`,
`src/export/agreement.test.ts`, `src/export/svgExport.ts`,
`src/export/svgExport.test.ts`, `src/App.css`,
`src/ui/CompositionCanvas.test.tsx`, `src/core/rhythm.ts`,
`src/core/rhythm.test.ts`, `src/core/curves.ts`, `src/core/curves.test.ts`,
`src/core/trochoid.ts`, `src/core/trochoid.test.ts`,
`src/audio/toneSynth.ts`, `src/core/composition.test.ts`, and
`src/core/compositionValidation.test.ts`. The final group
is the explicit transitive cutover surface: shared v1 code currently imports
legacy model/event types from those files, so they must be narrowed rather
than leaving a hidden retired dependency in production.

**Deliverables:**

- An editor for one Wheel, one Head, ring/spoke Fields, one or more Parts, one
  native Instrument, and a finite/looping Transport.
- Canvas overlays showing the active Head, Boundaries, and recent Encounters.
- Live compile diagnostics and a pending-edit indicator during playback.
- Version 1.0 JSON save/load only.
- Initial MIDI and Strudel adapters over `CompiledPerformance`, plus SVG export
  over the composition render plan, so the cutover does not remove existing
  export capabilities. MG-19 extends these adapters for later event kinds,
  Recordings, continuous control, and microtonal pitch.
- Removal of old SpirophonicModel, Voice, normalized one-bar preview, continuous
  trace-tone path, and old-model UI after replacement tests pass.

**Acceptance criteria:**

- Changing Wheel rate visibly and audibly changes encounters while tempo stays
  fixed.
- Changing tempo changes event spacing in seconds without changing spatial
  encounter order.
- Ring and spoke edits alter Parts that observe them and leave unrelated Parts
  unchanged.
- Refreshing from exported v1.0 JSON recreates the same drawing and performance.
- No production path imports the retired Voice/CurveEvent architecture.

## MG-10 — Sound bank vault and SoundFont engine decision

**Goal:** Establish safe local asset ownership and prove the browser SoundFont
backend before building product UI around it.

**Files:** `src/audio/soundbankStore.ts`,
`src/audio/soundbankStore.test.ts`, `src/audio/soundfontProbe.ts`,
`src/audio/soundfontProbe.test.ts`, `src/core/composition.ts`,
`src/audio/spessasynthWorklet.ts`,
`scripts/sync-spessasynth-worklet.mjs`, `.gitignore`,
`docs/decisions/0001-soundfont-engine.md`, `package.json`, `package-lock.json`.
The worklet module, sync script, and ignore rule are the explicit packaging
surface required to prove a package-matched, non-CDN AudioWorklet.

**Deliverables:**

- IndexedDB storage keyed by SHA-256 digest, with metadata, quota/error handling,
  list/get/delete/relink operations, and no bank bytes in Composition JSON.
- A technical probe of the current supported `spessasynth_lib` release against
  Vite, TypeScript, Chromium, Firefox, AudioWorklet packaging, SF2, and SF3.
- Measurement of initialization latency, memory, note-on scheduling, preset
  enumeration, percussion bank behavior, disposal, and missing/corrupt banks.
- A decision record pinning the accepted library/version and packaging method,
  or documenting why another SF2/SF3-capable engine won.
- A redistribution checklist separate from code-library licensing.

**Acceptance criteria:**

- Importing the same bank twice deduplicates it by digest.
- A bank survives reload and can be removed without damaging a Composition.
- The probe plays overlapping notes on at least two presets and one drum preset
  in supported browsers.
- The worklet is packaged reproducibly; no hand-edited vendor artifact or CDN
  runtime requirement is introduced.
- The decision record names tested versions, browsers, licenses, known limits,
  and the fallback plan.

## MG-11 — SoundFont playback and instrument browser

**Goal:** Make SoundFont presets normal Spirophonic Instruments.

**Files:** `src/audio/soundfontEngine.ts`,
`src/audio/soundfontEngine.test.ts`, `src/audio/instrumentRouter.ts`,
`src/audio/instrumentRouter.test.ts`, `src/ui/SoundBankPanel.tsx`,
`src/ui/SoundBankPanel.test.tsx`, `src/ui/InstrumentPanel.tsx`,
`src/ui/InstrumentPanel.test.tsx`, `src/core/composition.ts`,
`src/core/compositionValidation.ts`, `src/core/compositionValidation.test.ts`,
`src/App.tsx`, `src/App.test.tsx`, `src/App.css`,
`src/audio/soundbankStore.ts`, `src/audio/soundbankStore.test.ts`,
`src/audio/spessasynthWorklet.ts`,
`scripts/sync-spessasynth-worklet.mjs`, `package.json`, and
`package-lock.json`. The final four paths are the exact package-matched worklet
packaging surface selected and proven in MG-10. The App, validation, and test
paths are the explicit integration surface required for visible runtime
readiness, page-reload restoration, the new required preset name, and the
real-browser missing-digest transaction path.

**Deliverables:**

- SoundFont Instrument specs with bank digest, bank/program numbers, preset
  name, gain, pan, and optional reverb/chorus sends supported by the backend.
- Local SF2/SF3 import, preset browser, audition keyboard, relink, explicit
  fallback selection, and bank license/provenance display.
- Instrument routing that permits several Parts and presets concurrently.
- Loading, ready, missing-bank, unsupported-bank, and failure states that never
  masquerade as successful silence.
- Disposal and voice-stealing limits appropriate for interactive editing.

**Acceptance criteria:**

- Two Parts using different presets play concurrently from one or more banks.
- Program, bank, drums, velocity, duration, gain, and pan reach the backend.
- A missing digest prevents playback for that Instrument with a visible error;
  another ready Instrument continues playing.
- Reloading the page restores bank references and presets from local storage.
- The native synth remains usable with no SoundFont installed.

## MG-12 — Concurrent multi-Wheel/multi-Head authoring

**Goal:** Scale the proven slice to the core product requirement: several
Wheels, each with several simultaneous shapes.

**Files:** `src/core/composition.ts`, `src/core/compositionValidation.ts`,
`src/core/compositionEdits.ts`, `src/core/defaultComposition.ts`,
`src/core/performance.ts`, `src/core/wheels.ts`,
`src/render/compositionRenderer.ts`, `src/audio/performanceScheduler.ts`,
`src/ui/CompositionTree.tsx`, `src/ui/WheelPanel.tsx`,
`src/ui/HeadPanel.tsx`, `src/ui/PartPanel.tsx`, `src/App.tsx`,
`src/core/compositionValidation.test.ts`, `src/core/compositionEdits.test.ts`,
`src/core/defaultComposition.test.ts`,
`src/core/performance.test.ts`, `src/core/wheels.test.ts`,
`src/render/compositionRenderer.test.ts`,
`src/audio/performanceScheduler.test.ts`,
`src/ui/CompositionTree.test.tsx`, `src/ui/WheelPanel.test.tsx`,
`src/ui/HeadPanel.test.tsx`, `src/ui/PartPanel.test.tsx`, `src/App.test.tsx`

**Scope note (2026-08-05):** the original file list could not satisfy its own
deliverables. Solo/mute for Parts is a Composition-level distinction from
`enabled`, so `PartSpec` and its validation are in scope. The structural
add/duplicate/remove/reorder/enable operations and their reference-integrity
reporting belong in a pure `src/core/compositionEdits.ts` rather than in
`wheels.ts`, which owns Wheel state derivation. The reference Composition ships
beside the default in `src/core/defaultComposition.ts` so the simple starting
Composition stays the first-run experience.

**Deliverables:**

- Add/duplicate/remove/reorder/enable operations for Wheels and Heads with
  collision-free stable IDs.
- A composition tree separating Wheel settings from Head attachment/Trace
  settings and Parts from Instruments.
- Concurrent compilation, rendering, and scheduling across all enabled objects.
- Solo/mute for Parts and visual hide/show for Heads without conflating them.
- A reference Composition with at least four Wheels, three Heads per Wheel,
  several Parts, and at least four simultaneous Instruments.

**Acceptance criteria:**

- All Heads on a Wheel respond to its rate/phase edit; Heads on other Wheels do
  not.
- Removing a referenced object is blocked or requires an explicit cascade whose
  full impact is shown before mutation.
- Solo/mute does not rewrite geometry or lose Part configuration.
- Concurrent event ordering is deterministic when several Encounters share a
  timestamp.
- The reference Composition plays, seeks, loops, saves, and reloads correctly.

## MG-13 — Ellipse, band, grid, spiral, and moving Fields

**Goal:** Expand spatial structure without changing Part or Instrument APIs.

**Files:** `src/core/fields.ts`, `src/core/fields.test.ts`,
`src/core/crossings.ts`, `src/core/crossings.test.ts`,
`src/render/compositionRenderer.ts`,
`src/render/compositionRenderer.test.ts`, `src/ui/FieldPanel.tsx`,
`src/ui/FieldPanel.test.tsx`

**Deliverables:**

- Concentric ellipse, radial band, grid, and spiral Boundary kinds.
- Fixed, independently rotating, Transport-rotating, and Wheel-attached Fields.
- Entry/exit pairs for bands so duration may emerge from time inside.
- Family-specific crossing solvers and tolerance policies.
- Editor controls and overlays for orientation, eccentricity, spacing, rotation,
  attachment, and Boundary identity.

**Acceptance criteria:**

- Entering then leaving a band yields a paired duration source.
- A rotating ellipse changes Encounters while a stationary Head path remains
  unchanged.
- Wheel-attached Fields use the referenced Wheel's absolute state and validate
  missing/cyclic references.
- New Field kinds work through existing EncounterQuery and Part mappings.
- Simple ring/spoke fixtures remain unchanged.

## MG-14 — Head-to-Head relations and continuous controls

**Goal:** Make changing relationships between Wheels a first-class event and
control source.

**Files:** `src/core/relations.ts`, `src/core/relations.test.ts`,
`src/core/encounters.ts`, `src/core/parts.ts`,
`src/core/performance.ts`, `src/ui/PartPanel.tsx`,
`src/core/encounters.test.ts`, `src/core/parts.test.ts`,
`src/core/performance.test.ts`, `src/ui/PartPanel.test.tsx`

**Deliverables:**

- Conjunction, closest-approach, shared-radius, angular-alignment, opposition,
  and direction-match detectors.
- Pair selection that forbids self-pairs and treats A/B identity consistently.
- Vector measurements: distance, angle, approach rate, and rotational rate.
- Deterministically sampled continuous control lanes for pan, gain, filter,
  modulation, or future visual control.
- Hysteresis/debounce policies for threshold-based relational events.

**Acceptance criteria:**

- Analytic two-Head fixtures produce expected relation times and measurements.
- A closest approach produces one local-minimum event rather than a dense run.
- Swapping pair order follows a documented direction/sign rule without changing
  symmetric measurements.
- A control lane is bounded, ordered, and reproducible at its declared rate.
- Parts can consume new relations without Instruments or exporters reading
  HeadState directly.

## MG-15 — Trace encounters and retained trace state

**Goal:** Allow Heads to encounter the paths left by other Heads.

**Files:** `src/core/traces.ts`, `src/core/traces.test.ts`,
`src/core/traceEncounters.ts`, `src/core/traceEncounters.test.ts`,
`src/core/encounters.ts`, `src/render/compositionRenderer.ts`,
`src/ui/HeadPanel.tsx`, `src/core/encounters.test.ts`,
`src/render/compositionRenderer.test.ts`, `src/ui/HeadPanel.test.tsx`

**Deliverables:**

- Explicit Trace observation windows, retention modes, age, and sampling
  resolution.
- Segment spatial indexing so crossing cost does not grow as an unbounded
  all-pairs scan.
- Head-versus-other-Trace crossing with source Head, target Trace, crossing
  position, age, direction, and incidence measurements.
- Clear treatment of self-Trace encounters, retracing, tangency, and crossings
  at retained-window boundaries.
- Matching retained-Trace visualization.

**Acceptance criteria:**

- A hand-built crossing fixture yields one stable event at the expected point.
- Tangency and retracing policies are explicit and covered by tests.
- A Head cannot encounter future Trace segments.
- Retention changes are part of input and therefore reproduce the same events.
- The MG-12 reference load stays within the performance budget established in
  this packet, with diagnostics when a request would exceed configured limits.

## MG-16 — Relationship tuning, melody, and harmony

**Goal:** Let ratios and trajectories create pitch relationships instead of
only sampling coordinates into an unrelated scale.

**Files:** `src/core/tuning.ts`, `src/core/tuning.test.ts`,
`src/core/melody.ts`, `src/core/melody.test.ts`, `src/core/parts.ts`,
`src/core/performance.ts`, `src/ui/PartPanel.tsx`,
`src/core/parts.test.ts`, `src/core/performance.test.ts`,
`src/ui/PartPanel.test.tsx`

**Deliverables:**

- Equal-tempered scale, direct frequency, ratio-from-root, Boundary-degree, and
  contour-following pitch mappings.
- Rational reduction and octave folding for Lissajous/rose-friendly ratios,
  with explicit unsupported/undesirable policies for arbitrary spirogram ratios.
- Shared tuning contexts so several Parts can derive consonant relationships
  from one generator rather than carrying unrelated roots/scales.
- Stateful melodic contour rules that remain deterministic and are isolated
  from Instrument rendering.
- Exact internal frequency representation where equal-tempered MIDI note
  numbers are insufficient.

**Acceptance criteria:**

- Changing a Lissajous relationship from 3:2 to 5:4 changes both shape and the
  configured ratio interval from a fifth to a major third.
- Two Parts in one tuning context agree on root and ratio interpretation.
- A contour fixture produces a stable rising/falling musical line rather than
  independent coordinate samples.
- Unsupported ratio sources report a diagnostic instead of choosing a hidden
  scale.
- SoundFont pitch bend/range behavior is tested where exact frequency is used.

## MG-17 — Seeded variation

**Goal:** Add reproducible change at initial-condition, continuous,
interpretation, and performance layers.

**Files:** `src/core/random.ts`, `src/core/random.test.ts`,
`src/core/variation.ts`, `src/core/variation.test.ts`,
`src/core/performance.ts`, `src/core/composition.ts`,
`src/ui/VariationPanel.tsx`, `src/core/performance.test.ts`,
`src/core/composition.test.ts`, `src/ui/VariationPanel.test.tsx`

**Deliverables:**

- A documented, versioned seeded PRNG with stable string-to-seed behavior.
- Scoped derivation from seed + object ID + bar/cycle + event ID.
- Bounded Wheel/Head/Field initial-condition and continuous variation.
- Part probability/pitch-choice variation and performed timing/velocity/duration
  variation.
- A variation trace explaining which rule changed an output value.

**Acceptance criteria:**

- Same Composition, request, engine version, and seed are deep-equal.
- Changing the seed changes at least one enabled varied property.
- Adding an unrelated Part does not reroll existing Parts.
- Disabled variation is exactly identical to the unvaried compiler path.
- Every performed event retains its interpreted-event identity and bounded
  delta history.

## MG-18 — Recorder, replay, and reinterpretation

**Goal:** Preserve relational, interpreted, and performed layers as a durable
Spirophonic artifact.

**Files:** `src/core/recording.ts`, `src/core/recording.test.ts`,
`src/core/replay.ts`, `src/core/replay.test.ts`,
`src/export/recordingJson.ts`, `src/export/recordingJson.test.ts`,
`src/ui/RecorderPanel.tsx`, `src/ui/RecorderPanel.test.tsx`

**Deliverables:**

- Versioned Recording schema containing engine version, Composition snapshot,
  PerformanceRequest, resolution, seed/VariationSpec, and all three event layers.
- Record start/stop over explicit Transport windows.
- Exact performed-event replay without Wheel or Encounter evaluation.
- Reinterpretation of recorded Encounters through a selected current Part set.
- Provenance and warnings when a Recording's engine version differs.

**Acceptance criteria:**

- Replay performs recorded events after the source Wheels and Fields are removed
  from a test fixture.
- Reinterpretation changes musical events while Encounter IDs and measurements
  remain unchanged.
- Recording JSON round-trips deterministically.
- A recorded seeded performance replays the captured result rather than rerolling
  variation.
- Large-recording limits and truncation are explicit; silent data loss is not
  allowed.

## MG-19 — MIDI and Strudel exporter rebuild

**Goal:** Rebase existing exports on recorded or compiled Musical Events across
arbitrary performance windows.

**Files:** `src/export/midiExport.ts`, `src/export/midiExport.test.ts`,
`src/export/midi/smf.ts`, `src/export/midi/smf.test.ts`,
`src/export/strudelExport.ts`, `src/export/strudelExport.test.ts`,
`src/export/agreement.test.ts`, `src/ui/ImportExportPanel.tsx`,
`src/ui/StrudelExportPanel.tsx`

**Deliverables:**

- MIDI tempo/meter, notes, programs, banks, drums, pan/CC, and arbitrary-length
  event tracks from performed events.
- A documented microtonal policy: exact pitch-bend channel allocation when
  representable, explicit failure/warning when channel/polyphony limits prevent
  it, and no silent nearest-note substitution.
- Strudel export that uses note/scale patterns for equal-tempered events and
  frequency patterns when required to preserve ratio tuning.
- Export from either a fresh CompiledPerformance or a Recording.
- Cross-adapter semantic agreement tests.

**Acceptance criteria:**

- Exporters import no Wheel, Head, Field, Trace, or geometry module.
- MIDI event times match Transport ticks across multi-bar and mid-bar windows.
- Bank/program and drum selections agree with SoundFont Instrument intent where
  General MIDI can represent them.
- Ratio-tuned fixtures retain pitch within the declared MIDI bend tolerance or
  fail with a specific capacity diagnostic.
- MIDI, Strudel, and preview agree on event count, order, onset, duration,
  velocity, and pitch under their documented representations.

## MG-20 — Offline audio and portable project bundles

**Goal:** Let a Composition leave the live browser with its intended sound and
asset manifest.

**Files:** `src/export/audioRender.ts`, `src/export/audioRender.test.ts`,
`src/export/wav.ts`, `src/export/wav.test.ts`,
`src/export/projectBundle.ts`, `src/export/projectBundle.test.ts`,
`src/ui/ImportExportPanel.tsx`, plus the worker files selected in MG-10

**Deliverables:**

- Offline stereo render of performed events through supported native and
  SoundFont Instruments.
- WAV encoding with explicit sample rate, channel count, bit depth, and tail.
- Progress, cancellation, memory estimates, and failure cleanup.
- A versioned `.spirophonic` bundle containing Composition/Recording JSON,
  asset manifest, license/provenance records, and optionally the exact bank
  bytes when their terms and user choice allow embedding.
- Bundle import with digest verification, missing/conflicting asset resolution,
  and no automatic overwrite of the local vault.

**Acceptance criteria:**

- Offline render duration, note order, and silence/tail boundaries match the
  performed event fixture.
- Repeated render under the pinned engine is byte-identical where the backend
  promises determinism; otherwise decoded PCM is equal within a documented
  tolerance.
- A portable bundle restores a Composition and its permitted banks in a clean
  browser profile.
- A manifest-only bundle reports every missing digest before playback.
- Bank license/provenance metadata survives export/import.

## MG-21 — Scalability hardening, example works, and release

**Goal:** Validate the complete instrument under realistic concurrent musical
loads and make its architecture legible to future work.

**Files:** `src/core/performance.bench.test.ts`,
`src/core/encounters.bench.test.ts`, `src/audio/audio.integration.test.ts`,
`src/App.test.tsx`, `src/test/fixtures/`, `docs/examples/`, `README.md`,
`docs/MUSIC-GENERATOR-BUILD-PLAN.md`

**Deliverables:**

- Reference fixtures for the simple ring/spoke composition, multi-Head Wheel,
  concurrent multi-Wheel work, relation-driven harmony, seeded variation, and
  recorded reinterpretation.
- At least one showcase using four Wheels, three Heads per Wheel, multiple
  Fields/Parts, and four simultaneous Instruments including SoundFonts.
- Benchmarks for state evaluation, Encounter compilation, trace indexing,
  scheduling load, sound-bank initialization, and offline render memory.
- Browser checks for supported current Chromium and Firefox versions, including
  AudioWorklet, IndexedDB, reload, background-tab recovery, and device change.
- Updated product documentation, keyboard/accessibility pass, error recovery,
  and packet-close audit.

**Acceptance criteria:**

- The showcase can play, seek, edit at a safe boundary, loop, record, replay,
  reinterpret, export MIDI/Strudel/WAV, save JSON, and round-trip a bundle.
- Benchmarks define and meet release budgets on the recorded reference machine;
  later regressions fail against those checked-in budgets or approved baselines.
- SoundFont failure never takes down the native engine or loses Composition data.
- No exporter or audio backend reaches backward into geometry.
- Every planned packet is done, deferred with a named replacement milestone, or
  explicitly removed from scope in this contract.

## Packet rules

Every packet must:

1. stay inside its named files unless this contract is updated first;
2. add deterministic tests for new core behavior;
3. preserve the canonical event boundary between compiler and consumers;
4. update the Progress table in the same commit;
5. run `graphify update .` after code changes;
6. pass the repository gates:

```bash
npm test
npm run lint
npm run build
```

Use targeted tests while developing, then run all three gates before the packet
is marked done. Manual audio/browser acceptance is additional evidence, not a
replacement for automated event and scheduler tests.

The plan and progress documents are coordination metadata and may always be
updated alongside a packet. They do not expand that packet's implementation
file scope.

## Definition of the first meaningful generator

MG-09 is complete when a user can:

```text
set Transport tempo and meter
create one Wheel and one Head
place ring and spoke Fields
route selected crossings through Parts
hear native Instruments on one shared timeline
see the same Wheels, Heads, Fields, and Encounters
save and reload the v1.0 Composition
```

MG-11 upgrades the timbre but not the musical architecture. MG-12 proves the
concurrent composition requirement. The remaining packets deepen what can be
encountered, how it can be interpreted, and how a performance can be preserved
or exported without changing that foundation.
