# Spirophonic Vision

## One-line Concept

**Spirophonic turns relationships into sound, color, shape, and motion.**

It is a browser-based creative instrument where cyclic relationships generate both visual traces and musical structures. A trochoid-style model becomes the common source for geometry, tone, rhythm, color, and eventually live-code pattern export.

## Working Tagline

**Hear the shape. See the sound.**

## Origin

Spirophonic grows out of earlier Lingua Aeternum work around wheel-based music notation, harmonic cycles, symbolic language, and visual music. The wheel model was useful but static. Spirophonic moves the idea from static notation to dynamic relationship.

The core shift:

```text
Wheel model:
  Notes and relationships placed on a circle.

Spirophonic model:
  Interacting cycles generate traces, tones, colors, and patterns.
```

This better expresses the deeper idea behind Lingua Aeternum:

```text
Music is not only notes over time.
Music is relationship becoming perceptible.
```

## Core Thesis

A cyclic relationship trace and a musical pattern can be siblings, not translations.

Both can arise from the same underlying relationship model:

```text
Relationship Engine
  gear ratios
  phase
  offset
  speed
  symmetry
  modulation
  tension

        |
        v

Renderers
  shape
  sound
  color
  motion
  rhythm
  code
  MIDI
```

The shape is not merely a visualization of the music.

The music is not merely an audio rendering of the shape.

Both are projections of the same generative structure.

## Product Identity

Spirophonic is not initially a DAW, notation system, therapy product, or live-coding environment replacement.

It is a small experimental creative instrument.

The first goal is to prove the loop:

```text
Choose cyclic relationships
-> see a trace
-> hear a pattern
-> change the relationship
-> hear and see the change immediately
```

## Non-medical Boundary

Spirophonic may explore ideas of resonance, balance, meditation, pattern, and coherence as artistic concepts.

It must not make medical or therapeutic claims.

Avoid claims like:

```text
This frequency heals X.
This pattern treats Y.
This system resets the brain.
```

Prefer language like:

```text
generative audio-visual instrument
meditative pattern exploration
relationship-based sound and color system
creative resonance laboratory
```

## First Platform Decision

The first version should be a **browser-based web app**.

Recommended stack:

```text
TypeScript
Vite
React
Canvas rendering
WebAudio for sound preview
Vitest for tests
```

The app can be developed from Windows or WSL, but the runtime target is the browser.

Do not begin with native Windows audio, Haskell Tidal, SuperCollider, Electron, or Canto integration.

Those are later integrations.

## Why Web First

A browser app gives the fastest path to the thing that matters:

```text
visual controls
live shape rendering
immediate sound
easy screenshots
easy demos
future Strudel integration
future MIDI/SVG export
```

It keeps the prototype lightweight and portable.

## Relationship to Tidal and Strudel

TidalCycles is the Haskell live-coding system that inspired part of this thinking. Strudel is the browser/JavaScript cousin of Tidal-like patterning.

Spirophonic should eventually support two directions:

### Direction A: Spirophonic -> Strudel/Tidal

User builds cyclic relationships in the UI.

Spirophonic exports pattern code.

Example future output:

```javascript
setcps(0.75)

note("<c2 g2 c3 e3>")
  .s("sine")
  .pan(sine.range(0, 1).slow(3))
  .cutoff(cosine.range(300, 3000).slow(7))
```

### Direction B: Strudel/Tidal -> Spirophonic

User writes live-code patterns.

Spirophonic renders the cycles as traces, colors, and geometry.

This is more complex and should come later.

## MVP Definition

The first meaningful milestone is:

> User changes two gear ratios and a pen offset, sees an animated trochoid-style trace, hears a simple tone pattern generated from the same relationship, sees color mapped from the same relationship, and can export the model as JSON.

That is Spirophonic v0.1.

## MVP Scope

### Must Have

- Browser app runs locally with `npm install` and `npm run dev`.
- User can adjust basic relationship parameters:
  - fixed radius
  - moving radius
  - pen offset
  - phase
  - speed
  - sample count
- App renders a live trace.
- App can animate the trace over time.
- App can generate simple audio using WebAudio.
- App maps geometry to color.
- App can save/export and reload the current relationship model as JSON.
- Core math is separated from UI.
- Core math has tests.

### Stretch for v0.1

- Presets for a few interesting patterns.
- Frequency mode:
  - direct Hz
  - ratio-from-base-frequency
- Simple scale mode:
  - chromatic
  - pentatonic
  - harmonic ratio mode

### Post-v0.1

- SVG export.
- Basic Strudel snippet export.
- MIDI routing or MIDI file export.
- Full Strudel dependency.
- Full Tidal/Haskell integration.
- SuperCollider integration.
- Electron desktop app.
- Login/account system.
- Database.
- Canto integration.

### Never

- Medical or healing claims.

## Conceptual Model

A Spirophonic document should describe a relationship, not a finished rendering.

Possible model:

```ts
type SpirophonicModel = {
  id: string
  name: string
  version: "0.1"
  geometry: {
    fixedRadius: number
    movingRadius: number
    penOffset: number
    phase: number
    rotation: "inside" | "outside"
    samples: number
  }
  time: {
    cyclesPerSecond: number
    durationSeconds: number
  }
  sound: {
    enabled: boolean
    baseFrequencyHz: number
    frequencyMode: "radius" | "x" | "y" | "angle" | "ratio"
    minFrequencyHz: number
    maxFrequencyHz: number
    waveform: "sine" | "triangle" | "square" | "sawtooth"
  }
  color: {
    hueSource: "angle" | "radius" | "velocity" | "curvature"
    saturation: number
    lightness: number
  }
}
```

The exact model may evolve, but the separation should remain:

```text
relationship data
geometry generation
sound mapping
color mapping
rendering
export
```

## Suggested Repo Structure

```text
Spirophonic/
  README.md
  package.json
  index.html
  docs/
    VISION.md
    INITIAL-WBS-AND-CP-PACKETS.md
  src/
    main.tsx
    App.tsx
    core/
      model.ts
      trochoid.ts
      mapping.ts
      presets.ts
    audio/
      webAudioEngine.ts
    render/
      canvasRenderer.ts
      color.ts
    export/
      jsonExport.ts
      svgExport.ts
      strudelExport.ts
    ui/
      ControlPanel.tsx
      CanvasView.tsx
      Transport.tsx
      PresetPicker.tsx
  tests/
    trochoid.test.ts
    mapping.test.ts
    export.test.ts
```

## Design Principles

### 1. Relationship first

Do not hard-code music as the primary object.

The primary object is the relationship model.

### 2. Pure core

The math engine should be deterministic and testable.

Given the same model, it should produce the same points and derived values.

### 3. Renderers are replaceable

Canvas, SVG, WebAudio, MIDI, Strudel, and Tidal are all output renderers/adapters.

### 4. No premature dependency on Strudel

Strudel is useful, but the first Spirophonic engine should remain original and independent.

Add Strudel export first. Add Strudel import/query later.

### 5. Immediate feedback

Every parameter change should visibly and audibly matter.

### 6. Small first success

A beautiful small demo beats an overdesigned architecture.

## Future Directions

After v0.1:

- Preset library
- SVG export
- Strudel export
- MIDI file export
- Reaper workflow
- OSC bridge
- SuperCollider/Tidal bridge
- Pattern import from Strudel
- Color palette systems
- Multi-voice relationship layers
- Recording/export of audio/video
- Lingua Aeternum mode
- Album/visualizer mode for PCBender/Lingua Aeternum works

## Long-term Dream

Spirophonic becomes a relationship instrument.

A user can:

```text
draw with cycles
compose with geometry
hear color
see rhythm
export patterns
perform relationships live
```

The deepest idea:

```text
Essence is not the shape.
Essence is the pattern that gives rise to the shape.
```
