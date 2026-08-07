# Spirophonic

**Spirophonic turns relationships into sound, color, shape, and motion.**

It is a browser-based creative instrument. Cyclic relationships — gear ratios,
phase, offset, speed — generate a trace, a tone, and a color mapping from one
shared model. The shape is not a visualization of the music, and the music is
not a rendering of the shape. Both are projections of the same generative
structure.

*Hear the shape. See the sound.*

**New here?** [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) takes you from
a blank screen to a sound you made on purpose, in about ten minutes.

## Run the app

```bash
npm install
npm run dev
```

Vite prints a local URL, normally <http://localhost:5173/>.

The first `npm run dev` or `npm run build` downloads the bundled General MIDI
sound bank (38 MB) into `public/soundbanks/` and verifies its SHA-256. It is
cached on disk afterwards, and it is not committed — a binary that size and that
static belongs in a download, not in every clone. If the download fails the
build still succeeds; the app reports the bundled bank as unavailable and every
native Instrument plays as usual.

Checks:

```bash
npm test          # deterministic core, scheduler, and export suites
npm run lint
npm run build
npm run preview   # serve the production build on 127.0.0.1:4173
npm run test:e2e  # browser checks in Chromium and Firefox
```

The browser checks need their engines once per machine:

```bash
npx playwright install chromium firefox
```

## The model

A **Wheel** owns one motion system and one clock. A **Head** is a tracked point
on that Wheel; every Head on a Wheel inherits its rate, so one Wheel can draw
several shapes without becoming several clocks. Each Head leaves a **Trace**.

A **Field** is a set of **Boundaries** in the same space — rings, spokes,
ellipses, bands, a grid, a spiral — and it may move over time. When a Head
crosses a Boundary, that is an **Encounter**: a fact about geometry, with a
time, a direction, and a strength. Heads also encounter *each other*
(conjunction, opposition, alignment) and their own earlier Traces.

Encounters are not notes. A **Part** selects Encounters and maps them to musical
intent — pitch, velocity, duration, or a continuous control lane. Several Parts
may interpret the same Encounter differently. An **Instrument** renders what a
Part decides and never looks back at the geometry.

```text
Composition + PerformanceRequest
        |
   Transport timeline
        |
 Wheel/Head state at time   <--- seeded Variation
        |
  Encounter engine
        |
  Part interpretation
        |
 Interpreted events -> performance variation -> Performed events
        |
  +-----+---------+-----------+
  |               |           |
scheduler      Recorder    exporters
  |                        /   |   \   \
synth / SoundFont      MIDI Strudel WAV bundle
```

Everything downstream — live playback, recording, MIDI, Strudel, offline audio,
portable bundles — consumes the same performed events. No exporter or audio
backend reaches back into geometry, and `src/core/` touches no React, DOM,
Canvas, IndexedDB, Web Audio, worker, or network API.

## What it does

- Several concurrent Wheels, each with several Heads
- Ring, spoke, ellipse, band, grid, and spiral Fields, including moving ones
- Boundary crossings, Head-to-Head relations, and Trace self-crossings
- Parts with scale, spatial, and ratio-tuned pitch, plus continuous control lanes
- Native oscillator and drum voices with no dependencies, and SoundFont
  playback through a bundled General MIDI bank or your own SF2/SF3 banks,
  held in a local vault
- Seeded variation across initial conditions, interpretation, and performance,
  with a trace explaining every difference
- Recording, exact replay, and reinterpretation of a recorded performance
- Export to MIDI, Strudel, SVG, WAV, and a portable `.spirophonic` bundle
- Composition JSON save and load, versioned and strictly validated

## Sound banks

Spirophonic ships with **MuseScore General**, a 309-preset General MIDI bank
under the MIT licence, fetched at build time and cached in the browser's vault
on first run. Its licence and copyright notices travel with it, as that licence
requires.

Your own SF2 and SF3 banks are **user-supplied and stay local**. Composition JSON stores
a content-addressed reference — name, SHA-256 digest, licence, attribution —
never the bank bytes, so a saved Composition is small and shareable while the
audio assets remain yours.

A portable bundle is manifest-first for the same reason. Bank bytes travel only
when you choose to embed that specific bank; otherwise the bundle names what it
needs and the importer reports any digest it cannot resolve before playback.

If a bank is missing, the SoundFont Instruments that need it are reported and
stay silent. Everything else keeps playing, and nothing is lost from the
Composition.

## Project shape

```text
src/
  core/       composition.ts compositionValidation.ts  — the v1.0 model
              transport.ts motion.ts heads.ts          — deterministic time and state
              fields.ts crossings.ts encounters.ts     — Boundaries and Encounters
              relations.ts traces.ts traceEncounters.ts
              parts.ts performance.ts                  — canonical performance
              scales.ts tuning.ts melody.ts rhythm.ts  — musical mapping
              random.ts variation.ts                   — seeded variation
              recording.ts replay.ts                   — Recordings
  audio/      instrumentRouter.ts nativeSynthEngine.ts soundfontEngine.ts
              soundbankStore.ts performanceScheduler.ts
  render/     compositionRenderer.ts                   — scene from Composition
  ui/         panels for Transport, Wheels, Heads, Fields, Parts, Instruments
  export/     compositionJson.ts recordingJson.ts midiExport.ts strudelExport.ts
              svgExport.ts audioRender.ts wav.ts projectBundle.ts
  test/       fixtures/                                — reference Compositions
e2e/          browser checks against the production build
```

Given the same Composition and request, the compiler produces the same events.
Tests live beside the modules they cover; benchmarks with checked-in budgets sit
in `*.bench.test.ts`.

## Docs

- [Vision](docs/VISION.md) — concept, thesis, MVP definition, design principles
- [Domain Model](docs/Spirophonic-Domain-Model.md) — the conceptual authority
- [Music Generator Build Plan](docs/MUSIC-GENERATOR-BUILD-PLAN.md) — the active
  implementation contract: packets, file lists, invariants, acceptance criteria
- [Progress Tracker](docs/MUSIC-GENERATOR-PROGRESS.md) — live state, validation
  evidence, risks, and handoffs
- [Examples and benchmarks](docs/examples/) — the reference Compositions and
  their recorded budgets
- [Sound, Rhythm, and MIDI Design](docs/SOUND-AND-MIDI-DESIGN.md) — historical
  contract for the v0.2 curve sonifier, superseded by the build plan
- [What is missing](docs/WHAT-IS-MISSING.md) — open exploration

## Boundaries

Spirophonic is not a DAW, a notation system, or a live-coding environment
replacement. Do not add backend services, auth, a database, or Electron to the
browser instrument.

Tidal Cycles is out of scope; Strudel covers the live-coding direction without a
runtime dependency. OSC and SuperCollider bridges remain later integrations.

The headless music-video renderer that briefly lived in this repository has
moved to the Maricopa Release Publisher project and is developed there.

Use artistic language such as "generative audio-visual instrument" or
"relationship-based sound and color system." Do not claim that frequencies or
patterns heal, treat, reset, or diagnose anything.
