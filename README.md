# Spirophonic

Spirophonic is a browser-based creative instrument where cyclic relationships generate shape, motion, color, and sound from the same underlying model.

The first prototype target is a local Vite + React + TypeScript app with Canvas rendering, WebAudio sound preview, Vitest coverage for the core math, and JSON save/load for Spirophonic relationship models.

## Current State

This repository currently contains the project vision and initial work breakdown. The app scaffold has not been created yet.

Start with:

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected development commands after scaffolding:

```bash
npm run dev
npm test
```

## Docs

- [Vision](docs/VISION.md)
- [Initial WBS and CP Packets](docs/INITIAL-WBS-AND-CP-PACKETS.md)

## Boundaries

Spirophonic v0.1 should stay small: relationship model, trace rendering, animation, color mapping, simple sound, JSON import/export, and tests.

Do not add backend services, auth, database, Electron, SuperCollider, Haskell Tidal, full Strudel integration, Canto integration, or medical/healing claims in the first prototype.
