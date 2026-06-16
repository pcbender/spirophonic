# Spirophonic POC Initial WBS and CP Packets

## Execution Guidance for CP

This is an early prototype. Keep the implementation small, clear, and working.

Do not add Canto, backend services, auth, database, Electron, SuperCollider, Haskell Tidal, or full Strudel integration yet.

Use:

```text
TypeScript
Vite
React
Canvas
WebAudio
Vitest
```

Prototype v0.1 goal:

```text
A local browser app that renders animated Spirophonic traces, maps color from the same relationship model, produces simple sound from that model, and can save/reload the model as JSON.
```

The prototype should run with:

```bash
npm install
npm run dev
npm test
```

## WBS Overview

```text
CP-001. Repo and project setup
CP-002. Core relationship model
CP-003. Spirograph math engine
CP-004. Geometry-derived mapping layer
CP-005. Canvas rendering
CP-006. UI control panel
CP-007. Animation transport
CP-008. WebAudio sound preview
CP-009. Color mapping
CP-010. JSON export/import
CP-011. Testing pass for v0.1
CP-012. README and demo polish for v0.1
CP-013. Presets
CP-014. SVG export
CP-015. Strudel snippet export
```

## CP-001 - Scaffold Vite React TypeScript App

### Goal

Create the initial Spirophonic web app scaffold.

### Scope

- Initialize Vite React TypeScript project.
- Add Vitest.
- Add basic app layout.
- Add docs folder.
- Add placeholder README.
- Confirm app runs locally.

### Suggested Commands

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Adjust as needed if the repo already has files.

### Required Files

```text
README.md
package.json
index.html
src/main.tsx
src/App.tsx
docs/VISION.md
docs/INITIAL-WBS-AND-CP-PACKETS.md
```

### Acceptance Criteria

- `npm install` succeeds.
- `npm run dev` starts the app.
- `npm test` runs successfully.
- Browser shows a simple Spirophonic landing screen.
- README includes local setup commands.

### Constraints

- Do not add backend.
- Do not add Strudel dependency yet.
- Do not add styling frameworks unless necessary.

---

## CP-002 - Define Core Model Types

### Goal

Create a typed model for Spirophonic relationship data.

### Scope

Add TypeScript types for:

- geometry
- time/playback
- sound mapping
- color mapping
- full document/model

### Suggested Files

```text
src/core/model.ts
src/core/defaultModel.ts
```

### Suggested Types

```ts
export type RotationMode = "inside" | "outside"

export type Waveform = "sine" | "triangle" | "square" | "sawtooth"

export type FrequencyMode = "radius" | "x" | "y" | "angle" | "ratio"

export type HueSource = "angle" | "radius" | "velocity" | "curvature"

export type SpirophonicModel = {
  id: string
  name: string
  version: "0.1"
  geometry: {
    fixedRadius: number
    movingRadius: number
    penOffset: number
    phase: number
    rotation: RotationMode
    samples: number
  }
  time: {
    cyclesPerSecond: number
    durationSeconds: number
  }
  sound: {
    enabled: boolean
    baseFrequencyHz: number
    frequencyMode: FrequencyMode
    minFrequencyHz: number
    maxFrequencyHz: number
    waveform: Waveform
  }
  color: {
    hueSource: HueSource
    saturation: number
    lightness: number
  }
}
```

### Acceptance Criteria

- Types compile.
- Default model is exported.
- No UI logic in model files.
- No rendering logic in model files.

---

## CP-003 - Implement Spirograph Math Engine

### Goal

Generate deterministic trace points from a Spirophonic model.

### Scope

Create pure functions that convert model geometry into sampled points.

Support:

- inside rotation/hypotrochoid
- outside rotation/epitrochoid
- phase
- sample count

### Suggested Files

```text
src/core/spirograph.ts
tests/spirograph.test.ts
```

### Suggested Output Type

```ts
export type SpiroPoint = {
  t: number
  x: number
  y: number
  radius: number
  angle: number
}
```

### Acceptance Criteria

- `generateSpiroPoints(model)` returns deterministic points.
- Points include `t`, `x`, `y`, `radius`, and `angle`.
- Function does not touch DOM, Canvas, WebAudio, or React.
- Tests cover:
  - point count
  - deterministic output
  - inside vs outside mode produce different traces
  - phase changes output

---

## CP-004 - Add Mapping Utilities

### Goal

Convert geometry values into normalized musical and color control values.

### Scope

Add utility functions:

- normalize
- clamp
- mapRange
- point to frequency
- point to pan
- point to hue
- approximate velocity
- optional curvature placeholder

### Suggested Files

```text
src/core/mapping.ts
tests/mapping.test.ts
```

### Acceptance Criteria

- Mapping utilities are pure and tested.
- Frequency mapping respects min/max Hz.
- Pan mapping produces values in expected range.
- Hue mapping produces 0-360.
- No WebAudio or Canvas dependency.

---

## CP-005 - Implement Canvas Trace Renderer

### Goal

Render the generated trace in the browser.

### Scope

Create a Canvas component that draws the Spirophonic trace.

Support:

- auto-fit to canvas
- line drawing
- color per point or segment
- dark neutral background
- resize handling if practical

### Suggested Files

```text
src/render/canvasRenderer.ts
src/render/color.ts
src/ui/CanvasView.tsx
```

### Acceptance Criteria

- Browser displays the trace from the default model.
- Changing model values changes the trace.
- Rendering code is separated from math generation.
- Trace fits inside the visible canvas.

---

## CP-006 - Build Basic Control Panel

### Goal

Allow users to change the relationship model interactively.

### Scope

Add sliders/inputs for:

- fixed radius
- moving radius
- pen offset
- phase
- samples
- rotation mode
- cycles per second
- base frequency
- min/max frequency
- waveform
- hue source

### Suggested Files

```text
src/ui/ControlPanel.tsx
src/App.tsx
```

### Acceptance Criteria

- Controls update React state.
- Canvas updates immediately.
- Values are visible to the user.
- Controls are simple and reliable, not fancy.

---

## CP-007 - Add Animation Transport

### Goal

Animate the trace so the relationship feels alive.

### Scope

Add playback controls:

- play
- pause
- reset
- current progress/cycle
- animation speed tied to model time

Animation may reveal the trace progressively or show a moving point along the trace.

### Suggested Files

```text
src/ui/Transport.tsx
src/ui/CanvasView.tsx
```

### Acceptance Criteria

- User can play/pause animation.
- Moving point follows the generated trace.
- Reset returns to beginning.
- Animation does not break static rendering.

---

## CP-008 - Add WebAudio Sound Preview

### Goal

Generate simple sound from the same relationship model.

### Scope

Use WebAudio to play a simple oscillator-based preview.

First implementation can be intentionally basic:

- oscillator waveform from model
- frequency from current trace point
- gain envelope to avoid clicks
- pan if practical

### Suggested Files

```text
src/audio/webAudioEngine.ts
src/ui/Transport.tsx
```

### Acceptance Criteria

- User can enable sound.
- Sound starts/stops cleanly.
- Frequency changes based on trace position.
- No runaway audio nodes.
- No sound starts automatically before user interaction.

### Constraints

- Keep volume conservative.
- Avoid harsh default frequencies.
- Do not add Tone.js unless absolutely necessary.

---

## CP-009 - Add Color Mapping

### Goal

Make color a first-class renderer of the relationship model.

### Scope

Map geometry-derived values to color.

Initial mappings:

```text
angle    -> hue
radius   -> hue
velocity -> hue
curvature placeholder -> hue
```

### Suggested Files

```text
src/render/color.ts
src/core/mapping.ts
```

### Acceptance Criteria

- User can select hue source.
- Trace color changes according to selected mapping.
- Color comes from relationship data, not arbitrary decoration.

---

## CP-010 - JSON Export and Import

### Goal

Allow users to save and reload Spirophonic relationship models.

### Scope

Add:

- export current model as `.json`
- import `.json`
- basic version validation

### Suggested Files

```text
src/export/jsonExport.ts
src/ui/ImportExportPanel.tsx
tests/export.test.ts
```

### Acceptance Criteria

- Export downloads a JSON file.
- Import restores model state.
- Invalid JSON fails gracefully.
- Version field is checked.

---

## CP-011 - Testing Pass for v0.1

### Goal

Improve reliability of the core prototype.

### Scope

Add or improve tests for:

- spirograph point generation
- mapping functions
- JSON export/import
- default model validity

### Acceptance Criteria

- `npm test` passes.
- Core math has meaningful coverage.
- Tests avoid brittle UI snapshots.

---

## CP-012 - README and Demo Polish for v0.1

### Goal

Make the prototype understandable to a new contributor or reviewer.

### Scope

Update README with:

- project description
- setup
- scripts
- current features
- non-goals
- roadmap
- safety/non-medical note
- screenshots placeholder

### Acceptance Criteria

README answers:

```text
What is Spirophonic?
How do I run it?
What can it do now?
What is deliberately out of scope?
What comes next?
```

---

## CP-013 - Add Presets

### Goal

Provide a few interesting starting points.

### Scope

Add preset models:

- Simple Flower
- Orbit Knot
- Slow Breather
- Fibonacci-ish
- Lingua Wheel Echo

### Suggested Files

```text
src/core/presets.ts
src/ui/PresetPicker.tsx
```

### Acceptance Criteria

- User can select presets.
- Presets update the full model.
- Presets are named and documented briefly in code.
- Default preset is visually and sonically pleasant.

---

## CP-014 - SVG Export

### Goal

Allow users to export the visual trace as SVG.

### Scope

Generate SVG path/segments from current trace.

### Suggested Files

```text
src/export/svgExport.ts
src/ui/ImportExportPanel.tsx
```

### Acceptance Criteria

- User can download SVG.
- SVG opens in browser or vector editor.
- Export respects current trace geometry.
- Basic color support included if practical.

---

## CP-015 - Strudel Snippet Export

### Goal

Generate simple Strudel-style code from the current model without depending on Strudel runtime.

### Scope

Add text export that creates a basic Strudel snippet.

This is an export target only.

Do not add Strudel as a dependency yet.

### Suggested Files

```text
src/export/strudelExport.ts
src/ui/StrudelExportPanel.tsx
```

### Example Output

```javascript
setcps(0.5)

note("<c2 g2 c3 e3>")
  .s("sine")
  .gain(0.6)
```

Or frequency-oriented:

```javascript
s("sine")
  .freq("<110 165 220 330>")
  .gain(0.5)
```

### Acceptance Criteria

- User can copy generated Strudel snippet.
- Snippet includes model-derived values.
- README clearly says this is experimental export, not full Strudel integration.
- No Strudel runtime dependency added.

---

# First Implementation Slice

For first Codex Desktop session, execute only:

```text
CP-001
CP-002
CP-003
CP-004
CP-005
CP-006
```

Stop after CP-006 and review.

That should produce:

```text
running app
typed model
math engine
mapping layer
canvas trace
interactive controls
tests
```

This first slice is not the full v0.1 goal. It is the smallest useful foundation before animation, sound, color, and JSON import/export.

Do not attempt sound, export, SVG, or Strudel in the first pass unless the first six packets are clean.

# Definition of Done for v0.1

Spirophonic v0.1 is done when:

```text
1. The app runs locally in the browser.
2. User can manipulate Spirophonic relationship parameters.
3. The trace updates immediately.
4. The trace can animate.
5. Sound can be enabled and follows the trace.
6. Color is mapped from geometry.
7. JSON export/import works.
8. Core math and mappings are tested.
9. README explains the project clearly.
```

Presets, SVG export, and experimental Strudel snippet export are valuable follow-up packets after v0.1 is solid.

# Important Design Warning

Do not let the project become a Tidal clone, DAW, notation system, or therapy platform in v0.1.

The first project is simpler and stronger:

```text
A relationship engine with visual, sonic, and color renderers.
```

Build that first.
