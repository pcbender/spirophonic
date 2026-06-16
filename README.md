# Spirophonic

Spirophonic is a browser-based creative instrument where cyclic relationships generate shape, motion, color, and sound from the same underlying model.

## Current State

This repository contains the project vision, initial work breakdown, and a local Vite + React + TypeScript prototype.

Current prototype features:

- Typed Spirophonic relationship model
- Inside/outside trochoid trace generation
- Canvas trace rendering with relationship-derived color
- Interactive geometry, time, sound, and color controls
- Animation transport
- WebAudio oscillator preview
- JSON model export/import
- Core math and export tests

Install dependencies:

```bash
npm install
```

Run the app and checks:

```bash
npm run dev
npm test
npm run build
npm run lint
```

Note: on this Windows setup, the global `npm` shim may point at a missing roaming npm install. If `npm --version` fails, run npm through the installed Node CLI directly:

```bash
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" --version
```

If Vite or Vitest reports a missing native binding on Windows, refresh optional dependencies with:

```bash
npm install --include=optional --os=win32 --cpu=x64
```

## Docs

- [Vision](docs/VISION.md)
- [Initial WBS and CP Packets](docs/INITIAL-WBS-AND-CP-PACKETS.md)

## Project Shape

Core relationship logic lives in `src/core/`. Browser rendering and audio are adapters over that model, not the source of truth.

The main areas are:

- `src/core/` - model types, defaults, math, mapping, presets
- `src/render/` - Canvas and color rendering helpers
- `src/audio/` - WebAudio preview engine
- `src/export/` - JSON, SVG, and pattern export helpers
- `src/ui/` - React controls and panels

## Boundaries

Spirophonic v0.1 should stay small: relationship model, trace rendering, animation, color mapping, simple sound, JSON import/export, and tests.

Do not add backend services, auth, database, Electron, SuperCollider, Haskell Tidal, full Strudel integration, Canto integration, or medical/healing claims in the first prototype.

Use artistic language such as "generative audio-visual instrument" or "relationship-based sound and color system." Do not claim that frequencies or patterns heal, treat, reset, or diagnose anything.

## Roadmap

Near-term follow-ups:

- Preset library
- SVG export
- Experimental Strudel snippet export
- MIDI/audio/video export experiments
- Multi-voice relationship layers

## Screenshots

Screenshot capture is pending. Run `npm run dev`, open the local Vite URL, and capture the app once the first visual pass is ready.
