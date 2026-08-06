## Current work

Active design contract:
[docs/MUSIC-GENERATOR-BUILD-PLAN.md](docs/MUSIC-GENERATOR-BUILD-PLAN.md).
Read it before touching `src/core/`, `src/audio/`, or `src/export/`. It carries
the packet table with dependencies, per-packet file lists, architectural
invariants, and acceptance criteria. A packet must stay inside its named files
unless the contract is amended first, in the same commit.

Live state, validation evidence, risks, and handoffs are in
[docs/MUSIC-GENERATOR-PROGRESS.md](docs/MUSIC-GENERATOR-PROGRESS.md). Update the
Progress table in the build plan and the ledger in the tracker in the same
commit that lands the work.

`docs/SOUND-AND-MIDI-DESIGN.md` is the historical contract for the v0.2 curve
sonifier that MG-09 removed. It is useful background and is not the active
contract.

## Gates

```bash
npm test        # must exit 0
npm run lint
npm run build
```

**Check the exit code, not the summary line.** A runner can print "Tests 307
passed" and still exit non-zero; that happened here for several commits and the
failures were reported as green. Use `cmd; echo "EXIT: $?"`, and remember that
piping to `tail` hides failures printed above the part you read — `${PIPESTATUS[0]}`
holds the real status.

Browser checks run with `npm run test:e2e` (Playwright, Chromium and Firefox,
against the production preview build). They cover what jsdom cannot reach: real
layout, real Canvas painting, a real Web Audio clock, real IndexedDB, and a real
`OfflineAudioContext`. Run them for any change that is visual or audible.
Deterministic core and scheduler behaviour stays in the Vitest suite; the
browser checks supplement it and never replace it. First run on a new machine
needs `npx playwright install chromium firefox`.

Benchmarks live in `src/**/*.bench.test.ts` and assert deterministic work counts
rather than wall-clock time, so they mean the same thing on every machine. The
recorded reference measurements are in `docs/examples/BENCHMARKS.md`.

## Verifying a guard

A passing test is not evidence that it would catch anything. Before claiming a
fix is covered, break the thing on purpose and confirm the test fails. Several
real defects in this repository — a silenced note that still sounded, an ignored
cancellation time, an unseeded noise buffer — lived under a fully green suite.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
