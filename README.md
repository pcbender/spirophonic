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

The v0.1 loop is working end to end: change a relationship, see the trace
redraw, hear the tone follow, watch the color shift.

- Typed relationship model (`SpirophonicModel`) as the single source
- Inside/outside trochoid trace generation
- Canvas rendering with relationship-derived color
- Interactive geometry, time, sound, and color controls
- Animation transport with continuous or single-cycle playback
- WebAudio oscillator preview driven by the active trace point
- Preset library
- JSON model export/import, SVG export, Strudel snippet export
- Core math and export tests

## Project shape

The core stays pure and deterministic; every output is a replaceable renderer
hanging off it.

```text
src/
  core/     model.ts defaultModel.ts trochoid.ts time.ts mapping.ts presets.ts
  audio/    webAudioEngine.ts     — frequency from radius, x, y, angle, or ratio
  render/   canvasRenderer.ts color.ts — hue from angle, radius, velocity, curvature
  ui/       ControlPanel CanvasView Transport PresetPicker
            ImportExportPanel StrudelExportPanel
  export/   jsonExport.ts svgExport.ts strudelExport.ts
```

Given the same model, the engine produces the same points and derived values.
Tests live beside the modules they cover.

## Docs

- [Vision](docs/VISION.md) — concept, thesis, MVP definition, design principles
- [Sound, Rhythm, and MIDI Design](docs/SOUND-AND-MIDI-DESIGN.md) — the approved
  contract for the event layer, MIDI export, and curve families
- [Initial WBS and CP Packets](docs/INITIAL-WBS-AND-CP-PACKETS.md)

## Roadmap

Current work introduces an **event layer** between the geometry and its
outputs, so a curve can produce discrete notes and hits rather than only a
continuous glide. That unlocks Standard MIDI File export — compose an ambient
drum part from Lissajous and rose curves, then open it in a DAW — along with
additional curve families, scale quantization, and multi-voice composition.
See [the design doc](docs/SOUND-AND-MIDI-DESIGN.md) for the packet breakdown.

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
