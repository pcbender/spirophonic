# Spirophonic

**Spirophonic turns relationships into sound, color, shape, and motion.**

It is a browser-based creative instrument. Cyclic relationships — gear ratios,
phase, offset, speed — generate a trochoid trace, a tone, and a color mapping
from one shared model. The shape is not a visualization of the music, and the
music is not a rendering of the shape. Both are projections of the same
generative structure.

*Hear the shape. See the sound.*

## Run the app

```bash
npm install     # dependencies may already be present
npm run dev
```

Vite prints a local URL, normally <http://localhost:5173/>.

Checks:

```bash
npm test
npm run lint
npm run build
npm run preview   # serve the production build on 127.0.0.1:4173
```

## Current state

Change a relationship and the trace redraws, the tone follows, the color
shifts — and the rhythm changes, because the same curve also places notes.

- Typed relationship model (`SpirophonicModel`) as the single source
- Five curve families: spirogram, lissajous, rose, superformula, harmonograph
- Canvas rendering with relationship-derived color
- Interactive geometry, time, sound, and color controls
- Animation transport with continuous or single-cycle playback
- WebAudio oscillator preview driven by the active trace point
- Preset library
- Multi-voice composition, each voice reading its own curve
- Browser preview, so a composition can be heard before it leaves
- Standard MIDI File export, for a DAW
- JSON model export/import, SVG export, Strudel snippet export

### Composing with curves

A closed curve is one bar. Where it crosses an axis, turns a cusp, or reaches a
petal tip becomes an onset, so the geometry hands you rhythm directly:

| curve | trigger | onsets per bar |
| --- | --- | --- |
| Lissajous 3:2 | crosses x | 3 |
| Lissajous 3:2 | crosses y | 2 |
| Rose, 5 petals | petal tips | 5 |

Two triggers on one Lissajous give an exact 3:2 against a shared bar line —
one shape read two ways. Each voice states only what it changes about the main
shape, so editing the relationship or loading a preset moves the music with the
drawing. Set a voice's shape to **Main shape** and it reads the curve on screen
directly: what you see is what you hear. Percussion voices hold a drum; pitched voices read the
curve where each onset landed and snap it onto a scale. A harmonograph is a
damped Lissajous closed by retracing itself, so it swells and fades across the
bar, which is the shape an ambient part wants.

The default kit shows this on first load. Enable voices in the panel, press
Preview to hear them loop, and MIDI to download the parts. Preview, the MIDI
file, and the Strudel snippet all read one event list, so they play the same
part; a test compares them against each other rather than against fixtures.

Preview synthesizes its own sounds from oscillators and filtered noise, so it
needs no samples and works offline. It is an audition, not the finished
instrument — the MIDI file carries note numbers and your DAW decides the rest.

## Project shape

The core stays pure and deterministic; every output is a replaceable renderer
hanging off it.

```text
src/
  core/     model.ts defaultModel.ts time.ts mapping.ts presets.ts
            trochoid.ts curves.ts   — five closed curve families
            events.ts rhythm.ts     — onsets, grid, velocity
            scales.ts voices.ts     — pitch, and one part per curve
            preview.ts              — one bar as sounds and times
  audio/    webAudioEngine.ts     — frequency from radius, x, y, angle, or ratio
            voicePreview.ts drumSynth.ts toneSynth.ts — looped audition
  render/   canvasRenderer.ts color.ts — hue from angle, radius, velocity, curvature
  ui/       ControlPanel CanvasView Transport PresetPicker
            VoicePanel ImportExportPanel StrudelExportPanel
  export/   jsonExport.ts svgExport.ts strudelExport.ts
            midiExport.ts midi/smf.ts
```

Geometry produces points, points produce events, and every output — preview,
MIDI, Strudel — is a thin adapter over those events. No exporter reaches back
into geometry, and nothing in `core/` touches an audio API.

Given the same model, the engine produces the same points and derived values.
Tests live beside the modules they cover.

## Docs

- [Vision](docs/VISION.md) — concept, thesis, MVP definition, design principles
- [Sound, Rhythm, and MIDI Design](docs/SOUND-AND-MIDI-DESIGN.md) — the approved
  contract for the event layer, MIDI export, and curve families
- [What is missing](docs/WHAT-IS-MISSING.md) — open exploration: the ratio that
  draws the shape is already an interval, and does not yet reach the pitch
- [Initial WBS and CP Packets](docs/INITIAL-WBS-AND-CP-PACKETS.md)

## Roadmap

The event layer and its three outputs are in, preview included. Natural next
steps: per-voice geometry controls in the UI, a longer form than the single
repeating bar, and optionally soundfonts for a more realistic audition —
which would replace the two synth modules and leave the rest alone.

Tidal Cycles is out of scope; Strudel covers the live-coding direction without
a runtime dependency. OSC and SuperCollider bridges remain later integrations.

## Boundaries

Spirophonic is not a DAW, a notation system, or a live-coding environment
replacement. Do not add backend services, auth, a database, or Electron to the
browser instrument.

The headless music-video renderer that briefly lived in this repository has
moved to the Maricopa Release Publisher project and is developed there.

Use artistic language such as "generative audio-visual instrument" or
"relationship-based sound and color system." Do not claim that frequencies or
patterns heal, treat, reset, or diagnose anything.
