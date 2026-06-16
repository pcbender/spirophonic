# Spirophonic

Spirophonic is a browser-based creative instrument where cyclic relationships generate shape, motion, color, and sound from the same underlying model.

The first prototype target is a local Vite + React + TypeScript app with Canvas rendering, WebAudio sound preview, Vitest coverage for the core math, and JSON save/load for Spirophonic relationship models.

## Current State

This repository contains the project vision, initial work breakdown, and a minimal Vite + React + TypeScript scaffold.

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

## Boundaries

Spirophonic v0.1 should stay small: relationship model, trace rendering, animation, color mapping, simple sound, JSON import/export, and tests.

Do not add backend services, auth, database, Electron, SuperCollider, Haskell Tidal, full Strudel integration, Canto integration, or medical/healing claims in the first prototype.
