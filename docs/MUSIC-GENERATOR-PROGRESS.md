# Spirophonic Music Generator Progress Tracker

Status: **active roadmap**

Initialized: **2026-08-05**

This document coordinates implementation of the
[Music Generator Build Plan](MUSIC-GENERATOR-BUILD-PLAN.md) across coding
sessions and agents. It records live ownership, readiness, blockers, validation,
commits, and handoffs. The build plan remains authoritative for packet scope,
dependencies, file lists, architectural invariants, and acceptance criteria.

## Current snapshot

| Measure | Current value |
| --- | --- |
| Packets complete | 27 / 27 |
| Maintenance packets complete | 1 / 2 |
| Packets active | 1 |
| Packets blocked | 0 |
| Next ready packet | None — DOC-01 is in review |
| Active agents | Codex/root on DOC-01 review candidate |
| Integration branch | `main` |
| Last tracker update | 2026-08-14 |

## Status rules

Use only these states:

| State | Meaning |
| --- | --- |
| `waiting` | One or more dependencies are incomplete. This is not a blocker. |
| `ready` | Dependencies are complete and no agent owns the packet. |
| `claimed` | An agent has reserved the packet and recorded its branch/cwd, but implementation has not begun. |
| `in_progress` | Implementation or packet validation is underway. |
| `blocked` | Dependencies are complete, but a named technical or product decision prevents progress. |
| `in_review` | Implementation and author validation are complete; review or integration is pending. |
| `done` | All acceptance criteria, automated gates, required manual checks, documentation, and integration are complete. |
| `deferred` | The packet was explicitly moved out of the roadmap with a recorded decision and replacement milestone. |

Normal transitions are:

```text
waiting -> ready -> claimed -> in_progress -> in_review -> done
                                  |
                                  +-> blocked -> in_progress
```

Do not use `blocked` for unmet dependencies; use `waiting`. Do not mark a packet
`done` merely because its code exists on an unmerged branch.

## Source-of-truth rules

- The build plan owns packet definitions and its planned/done summary.
- This tracker owns live states, claims, evidence, and handoffs.
- A transition to `claimed`, `in_progress`, `blocked`, or `in_review` changes
  this tracker only.
- A transition to `done` or `deferred` updates this tracker and the build plan's
  Progress table in the same integration commit.
- If the two documents disagree about a terminal state, treat the packet as not
  done until the discrepancy is resolved.
- Changing scope, dependencies, file lists, or acceptance criteria requires an
  explicit build-plan edit, not a note hidden in this tracker.

## Multi-agent coordination protocol

Before claiming a packet, an agent must:

1. read the packet in the build plan and this tracker;
2. verify every dependency is `done`;
3. run `git status -sb` and preserve unrelated user/agent changes;
4. confirm no active claim owns the packet or overlapping files;
5. record the claim below with agent ID, branch, cwd, and UTC timestamps;
6. change the ledger state from `ready` to `claimed` before editing packet code.

While working:

- One agent owns a packet at a time.
- An agent should own only one packet unless the tracker explicitly records an
  approved exception.
- Two packets may run concurrently only when their dependencies permit it and
  their file lists do not overlap. If files overlap, record the coordination
  order in both claims before either agent edits them.
- Re-read `git status -sb` before broad edits, validation, commits, and handoff.
- Update the claim's heartbeat after a material checkpoint or at least once per
  working day.
- A claim with no heartbeat for 24 hours is stale. A new agent may take it over
  only after inspecting the branch/worktree and recording what work already
  exists; never discard uncommitted work.
- Tracker edits belong in the same branch/commit series as the packet work and
  must survive integration.

## Active claims

DOC-01 is owned by Codex/root on `agent/generated-web-documentation` in
`/home/mrose/spirophonic`.
Claimed at `2026-08-14T18:18:07Z`; last updated at
`2026-08-14T19:07:55Z`.

Move completed or abandoned claims to the Activity log rather than erasing
their history.

## Packet ledger

| Packet | Title | Depends on | State | Owner | Last update | Evidence or next action |
| --- | --- | --- | --- | --- | --- | --- |
| MG-01 | Composition schema and validation | — | `done` | — | 2026-08-05 | Integrated at `1aaaa07`; cumulative review passed on `13ba9f5`. |
| MG-02 | Deterministic Transport and performance window | MG-01 | `done` | — | 2026-08-05 | Integrated at `0afa4e3`; cumulative review passed on `13ba9f5`. |
| MG-03 | Wheel and multi-Head state engine | MG-01, MG-02 | `done` | — | 2026-08-05 | Integrated at `a454b7c`; cumulative review passed on `13ba9f5`. |
| MG-04 | Space projection and composition renderer | MG-03 | `done` | — | 2026-08-05 | Integrated at `6960442`; cumulative review passed on `13ba9f5`. |
| MG-05 | Ring and spoke Fields | MG-01, MG-03, MG-04 | `done` | — | 2026-08-05 | Integrated at `68631b5`; cumulative review passed on `13ba9f5`. |
| MG-06 | Boundary-crossing Encounter engine | MG-02, MG-03, MG-05 | `done` | — | 2026-08-05 | Integrated at `7baa1a7`; sample-rate invariance and window-seam probes pass. |
| MG-07 | Parts and canonical performance compiler | MG-01, MG-02, MG-06 | `done` | — | 2026-08-05 | Integrated at `842acb7`; repeat-compile deep-equality probe passes. |
| MG-08 | Native instrument engine and live scheduler | MG-02, MG-07 | `done` | — | 2026-08-05 | Integrated at `7f2d487`; cancel-window semantics verified against the SoundFont backend. |
| MG-09 | First playable generator and clean model cutover | MG-01–MG-08 | `done` | — | 2026-08-12 | Integrated at `ff6af91`; the working-tree listened-trigger correction keeps canonical crossings complete while limiting yellow canvas markers to audible note Part queries. |
| MG-10 | Sound bank vault and SoundFont engine decision | MG-01, MG-08 | `done` | — | 2026-08-05 | Integrated at `992a97e`; vault transaction ordering confirmed correct. |
| MG-11 | SoundFont playback and instrument browser | MG-07, MG-08, MG-10 | `done` | — | 2026-08-11 | Integrated at `7685bb6`; `fix/expose-native-instruments` adds an exhaustive native creation palette so native drums and future native kinds cannot remain hidden from Part assignment. |
| MG-12 | Concurrent multi-Wheel/multi-Head authoring | MG-09, MG-11 | `done` | — | 2026-08-14 | Integrated at `b00847a`; the working-tree correction adds independently editable duplication for note and Control Parts with fresh nested identities. |
| MG-13 | Ellipse, band, grid, spiral, and moving Fields | MG-05, MG-06, MG-12 | `done` | — | 2026-08-05 | Integrated at `27e0390` with panel-overflow fix `b37e574`; user confirmed the new Field overlays working in a browser. |
| MG-14 | Head-to-Head relations and continuous controls | MG-06, MG-07, MG-12 | `done` | — | 2026-08-05 | Integrated at `f2adb33`; browser evidence from the Playwright suite added in `11079d6`. |
| MG-15 | Trace encounters and retained trace state | MG-04, MG-06, MG-12 | `done` | — | 2026-08-05 | Integrated at `9c8096d`; unit and browser gates pass on that commit. |
| MG-16 | Relationship tuning, melody, and harmony | MG-07, MG-11, MG-14 | `done` | — | 2026-08-05 | Integrated at `32b7b37`; unit and browser gates pass on that commit. |
| MG-17 | Seeded variation | MG-03, MG-06, MG-07, MG-16 | `done` | — | 2026-08-06 | Integrated at `7d30989`; unit and browser gates pass on that commit, exit code verified. |
| MG-18 | Recorder, replay, and reinterpretation | MG-07, MG-17 | `done` | — | 2026-08-06 | Integrated at `592b8d6`; unit and browser gates pass, exit code verified. |
| MG-19 | MIDI and Strudel exporter rebuild | MG-16, MG-18 | `done` | — | 2026-08-06 | Integrated at `c2b00e0`; unit and browser gates pass, exit code verified. |
| MG-20 | Offline audio and portable project bundles | MG-10, MG-11, MG-18, MG-19 | `done` | — | 2026-08-06 | Integrated at `90c809d`; unit and browser gates pass, exit code verified. |
| MG-21 | Scalability hardening, example works, and release | MG-12–MG-20 | `done` | — | 2026-08-06 | Integrated at `44ea458`; unit and two-engine browser gates pass, exit code verified. |
| WIN-01 | Native Windows development portability | MG-21 | `done` | — | 2026-08-09 | Integrated by PR 8 at `01ae008`; native Windows and isolated WSL2 gates pass. |
| MG-22 | Wedge-spoke regions and exact gate spans | MG-21 | `done` | — | 2026-08-11 | Integrated at `653aee1`; `fix/spoke-gate-duration` corrects gate ownership so fixed/quantized Parts still hold one region note from exact entry to exact exit. |
| MG-23 | In-gate modulation lanes and Trace notation | MG-22 | `done` | — | 2026-08-10 | Integrated at `3b8bfd4`; exact-commit unit, lint, build, two-engine browser, mutation, and Graphify gates pass. |
| MG-24 | Modulated playback and export agreement | MG-19, MG-20, MG-23 | `done` | — | 2026-08-10 | Integrated at `4a87f1f`; exact-commit unit, lint, build, two-engine browser, mutation, cancellation, capability, and Graphify gates pass. |
| MG-25 | Closed radial waveform motion | MG-03, MG-04, MG-06, MG-09 | `done` | — | 2026-08-13 | Working tree passes core gates, targeted mutation guards, and the Chromium/Firefox radial-wave author/play/reload check. A loop-seam correction keeps the closing endpoint from doubling the repeated opening attack; see validation row. |
| MG-26 | SoundFont creation and fixed-note one-shots | MG-11, MG-19, MG-20 | `done` | — | 2026-08-14 | Integrated by PR 15 at `89179eb`; author validation covered 637 tests, lint, build, focused mutation guards, and the Chromium/Firefox real-SoundFont author/preview/reload check. |
| MG-27 | Figure-sequence pitch mapping | MG-16, MG-18, MG-19 | `done` | — | 2026-08-14 | Integrated by PR 16 at `55e1c8c`; author validation passed 659 tests, lint, build, focused mutation guards, and Chromium/Firefox workflows. |
| DOC-01 | Generated web documentation | MG-09, MG-21 | `in_review` | Codex/root | 2026-08-14 | Getting Started now matches current first-visit/restored behavior, teaches Performance diagnostics, and has a two-engine workflow guard for every documented event count. Review and integration are next. |

When a packet becomes `done`, evaluate every direct dependent immediately and
promote it from `waiting` to `ready` if all dependencies are complete.

## Milestone rollup

| Milestone | Packets | Exit condition | Progress |
| --- | --- | --- | --- |
| Foundation engine | MG-01–MG-08 | Canonical performance can be compiled and scheduled through the native engine. | 8 / 8 — complete |
| First playable generator | MG-09 | New editor replaces the old model without losing basic JSON/MIDI/Strudel/SVG capabilities. | 1 / 1 — complete |
| SoundFont instruments | MG-10–MG-11 | Local banks, presets, concurrent playback, and explicit missing-bank handling work. | 2 / 2 — complete |
| Concurrent composition | MG-12 | Several Wheels with several Heads play, render, seek, loop, save, and reload together. | 1 / 1 — complete |
| Relational composition depth | MG-13–MG-18 | Advanced Fields, relations, Trace encounters, tuning, variation, and Recording work. | 6 / 6 — complete |
| Portable outputs | MG-19–MG-20 | MIDI, Strudel, audio render, and bundles consume canonical events/Recordings. | 2 / 2 — complete |
| Release | MG-21 | Reference works, performance budgets, browser checks, and full workflow pass. | 1 / 1 — complete |
| Native Windows portability | WIN-01 | Native Windows development works without changing the WSL2 workflow. | 1 / 1 — complete |
| Region-gated expression | MG-22–MG-24 | Wedges create one held note per visit; interior motion modulates that voice consistently in notation, playback, Recording, and export. | 3 / 3 — complete |
| Closed radial motion | MG-25 | Common waveforms close on one Wheel cycle and flow through authoring, Encounters, rendering, persistence, and playback. | 1 / 1 — complete |
| SoundFont one-shots | MG-26 | Presets append Instruments and optionally trigger one fixed SF3 note without a duration-based note-off. | 1 / 1 — complete |
| Figure sequences | MG-27 | Encounter streams deterministically traverse and transform authored pitch figures, including chords. | 1 / 1 — complete |
| Web documentation | DOC-01 | Current guides are generated, linked, and deployed with the application. | 0 / 1 — in review |

## Validation ledger

Add one row when a packet enters `in_review`. Link or name manual evidence in
the final column rather than relying on a statement that it was checked.

| Packet | Commit | `npm test` | `npm run lint` | `npm run build` | Graphify | Manual/browser evidence | Reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DOC-01 | working tree on `55e1c8c` | 67 files, 662 tests pass in isolated gate (exit 0 verified) | pass | pass; three pages copied to `dist/docs/`; existing >500 kB advisory | 1,979 nodes / 4,370 edges | `npm run dev` regenerated the pages and served the app plus all three `/docs/*.html` routes with HTTP 200. The pre-change app-link guard, stale-output mutation, and visible build-note guard each failed as intended. Generated routes and the audited Getting Started workflow pass in Chromium and Firefox (4/4): first visit is 12 events; New reports No Fields; Add rings reports No Parts; Add Part produces 6 events; the documented 4/8/16/32/64-beat counts are 6/12/23/46/93. A parallel gate run timed out one existing five-second benchmark under build load; the immediate isolated `npm test` rerun passed all 662. The earlier full browser run's sole pre-existing Firefox frame-gap failure reproduced with the new links removed. | Codex/root |
| MG-12 Part duplication correction | working tree | 66 files, 659 tests pass (exit 0 verified) | pass | pass; existing >500 kB advisory | update refused safely: 1,959 extracted vs 1,972 existing nodes | The pre-change UI guard fails because `Duplicate part-1` is absent. Chromium and Firefox place Duplicate immediately before Remove, persist a complete settings copy, and expose the new Part for independent editing (2/2). Core and panel coverage includes note and Control Parts plus fresh gate-modulation identities. | Codex/root |
| MG-27 | working tree | 66 files, 654 tests pass (exit 0 verified) | pass | pass; existing >500 kB advisory | update refused safely: 1,958 extracted vs 1,972 existing nodes | Chromium and Firefox both author indexed retrograde-inversion, edit a chord, play, persist, and reload (2/2). Disabling sequence advancement and inversion made their focused guards fail with the wrong pitch streams. Strudel preserves simultaneous tones as documented `[c4,e4,g4]` polyphony. | Codex/root |
| MG-26 | working tree | 65 files, 637 tests pass (exit 0 verified) | pass | pass | update refused safely: 1,921 extracted vs 1,972 existing nodes | The Apache-2.0 940-byte SoundFont enumerates separate Saw Wave and Sample Drums presets; playback-family filtering, fixed C2 preview, append-only creation, unchanged Part routing, no per-item fallback conversion, saved trigger, and reload pass in Chromium and Firefox (2/2). The focused mutation guards fail as intended. | Codex/root |
| MG-25 | working tree | 65 files, 626 tests pass (exit 0 verified) | pass | pass | update refused safely: 1,921 extracted vs 1,972 existing nodes | Radial-wave author/play/reload passes in Chromium and Firefox (2/2); the remaining functional browser matrix passes 60/60. The unfiltered run passes 61/62: only the pre-existing Firefox frame-gap budget fails (116 ms vs 100 ms), reproducing at 152 ms on an isolated clean `main`. The supplied square fixture has equal crossing time, speed, and strength through closure. Without the half-open scheduler filter, the seam guard fails with opening, repeated opening, and closing attacks instead of one seam attack. The earlier waveform mutations also fail their focused guards. | Codex/root |
| MG-09 listened-trigger correction | working tree | 64 files, 604 tests pass (exit 0 verified) | pass | pass | update refused safely: 1,912 extracted vs 1,972 existing nodes | The supplied multi-Head/multi-ring pattern detects all four Head/Boundary pairs but draws only the two pairs selected by audible note Parts. Restoring the old all-crossings overlay makes the component guard fail with 2 markers instead of 1. The focused production-preview check passes in Chromium and Firefox. A full browser run reached the new check in both engines, but the preview server later died while streaming an unrelated bundled-bank request; the remaining failures are connection refusals after that server loss. | Codex/root |
| MG-11 correction | `fix/expose-native-instruments` based on `a9c801b` | 63 application files, 597 tests pass when `scripts/deploy.test.mjs` is excluded; exact `npm test` exits 1 on the pre-existing Vite/Rolldown imported-script shebang transform | pass | pass | 1,971 nodes / 4,590 edges | The pre-fix UI guard cannot find either native creation action and fails as intended. Chromium production preview passes creation of `native-drum`, all six voices, assignment to the default Part, and narrow-rail layout. Playwright then times out in plugin teardown; Firefox does not start before the bounded global timeout. | Codex/root |
| MG-22 correction | `fix/spoke-gate-duration` based on `a9c801b` | 63 application files, 597 tests pass when `scripts/deploy.test.mjs` is excluded; exact `npm test` exits 1 because Vite/Rolldown moves the imported script's shebang after transformed imports | pass | pass | 1,969 nodes / 4,588 edges | The pre-fix compiler produced 2 notes from one wedge visit and failed the new one-note guard. The supplied 82 BPM rose/Spoke document now has its own compile-through-geometry regression. Chromium production-preview checks for persisted gate mapping and real Web Audio near/far note lifetimes pass twice with a fixed 0.25-beat, quantized Part. The Windows Firefox runner did not start its cases before timeout; the full browser run also timed out in an unrelated unavailable bundled-bank path. | Codex/root |
| MG-24 | `4a87f1f` | 63 files, 592 tests pass (exit 0 verified) | pass | pass | 1,875 nodes / 4,163 edges | Playwright 1.62.1: Chromium 151 and Firefox 153, 27 checks per engine, 54 total. Real Web Audio keeps near/far attack counts equal while the far gate schedules a longer voice and more same-frequency automation. Retrigger mutation made live 6 vs 2, offline 88 vs 2, MIDI 87 vs 1, and agreement 122 vs 1, failing all intended guards. Both engines loaded the redistributable MIT MuseScore General SF3, digest `5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3`, and enumerated Grand Piano; the user-local fixture enumerated Saw Wave with Apache-2.0 provenance. | Codex/root |
| MG-23 | `3b8bfd4` | 63 files, 576 tests pass (exit 0 verified) | pass | pass | 1,859 nodes / 4,072 edges | Playwright Chromium and Firefox: 26 checks per engine, 52 total, all pass. An authored mapping changes only the in-gate Trace contour and survives seek, resize, playback, and persisted reload. Bypassing lane styling fails the renderer contour guard as intended. | Codex/root |
| MG-22 | `653aee1` | 62 files, 564 tests pass (exit 0 verified) | pass | pass | 1,812 nodes / 3,930 edges | Playwright Chromium and Firefox: 25 checks per engine, 50 total, all pass; newly authored Spoke visibly widens as a wedge. The exact-duration agreement guard covers live scheduling, MIDI, Strudel, and offline rendering. No-retrigger mutation produced 7 notes from 4 entries and failed as intended. | Codex/root |
| WIN-01 | `01ae008` | 62 files, 555 tests pass (exit 0 verified) on Windows and WSL2 | pass on Windows and WSL2 | pass on Windows and WSL2 | 1,861 nodes / 4,264 edges | Merge tree matches reviewed `9702c9c`; native Windows clean install resolved both pinned bindings; `npm run dev` served HTTP 200; Chromium 151 canvas and platform-API smokes pass. Firefox 153 hung in the restricted Windows runner and is not claimed. | Michael Rose |
| MG-01 | `1aaaa07` | 20 files, 194 tests pass | pass | pass | refreshed after code | Not required for schema packet | Claude Opus 5 |
| MG-02 | `0afa4e3` | 21 files, 217 tests pass | pass | pass | refreshed after code | Not required for pure time-core packet | Claude Opus 5 |
| MG-03 | `a454b7c` | 24 files, 237 tests pass | pass | pass | refreshed after code | Not required for pure state-core packet | Claude Opus 5 |
| MG-04 | `6960442` | 26 files, 249 tests pass | pass | pass | refreshed after code | Command/component tests; no route before MG-09 | Claude Opus 5 |
| MG-05 | `68631b5` | 28 files, 267 tests pass | pass | pass | refreshed after code | Geometry, command, and component tests; no route before MG-09 | Claude Opus 5 |
| MG-06 | `7baa1a7` | 30 files, 281 tests pass | pass | pass | refreshed after code | Deterministic core fixtures; no browser/audio surface | Claude Opus 5 |
| MG-07 | `842acb7` | 32 files, 298 tests pass | pass | pass | refreshed after code | Deterministic compiler fixtures; no browser/audio surface | Claude Opus 5 |
| MG-08 | `7f2d487` | 34 files, 309 tests pass | pass | pass | refreshed after code | Fake clock/engine and native routing tests; app integration is MG-09 | Claude Opus 5 |
| MG-09 | `ff6af91` | 25 files, 179 tests pass | pass | pass | refreshed after code | Hermes: Wheel cycles 1→2 changed 13→17 events; Play advanced to 1.25s; no page errors; 1600x1000 capture at `/tmp/spirophonic-mg09-hermes.png` | Claude Opus 5 |
| MG-10 | `992a97e` | 27 files, 190 tests pass | pass | pass; matched worklet SHA-256 | refreshed after code | Hermes Chromium 147 + Firefox 148: SF2/SF3, 287 presets, two pitched presets + drums overlap, missing/corrupt rejection, clean disposal; bank/worklet digests in ADR 0001 | Claude Opus 5 |
| MG-11 | `7685bb6` | 31 files, 204 tests pass | pass | pass; matched worklet SHA-256 | 1,199 nodes / 2,353 edges | Hermes Chromium 147: local SF2/SF3 banks, 287 presets each, two assigned presets/26 events concurrently, reload, missing-digest isolation, exact-digest relink, and no final page errors; digests in handoff | Claude Opus 5 |
| Post-release | `9dc15b7` | 57 files, 455 tests pass (exit 0 verified) | pass | pass | 1,660 nodes / 3,632 edges | Playwright Chromium 151 and Firefox 153: 21 checks per engine, 42 total. Frame-gap check measures 22.1 ms with the worker against 128.8 ms without, verified by reverting. The bundled 38 MB MuseScore General bank is served, digest-verified, stored, and its 309 presets listed through the app's own engine. | Claude Opus 5 |
| Post-release | `99c5ffb` | 55 files, 440 tests pass (exit 0 verified) | pass | pass | 1,633 nodes / 3,551 edges | Playwright Chromium 151 and Firefox 153: 17 checks per engine, 34 total. A real 890-byte SoundFont generated by `spessasynth_core` is imported through the actual UI, its preset listed and assigned, and its bytes confirmed surviving a reload. Sound-bank initialization and SoundFont render memory now have checked-in budgets. | Claude Opus 5 |
| Post-release | `d315929` | 54 files, 433 tests pass (exit 0 verified) | pass | pass | 1,623 nodes / 3,526 edges | Bundle measured by stubbing the import: SpessaSynth was 207 kB of 606 kB. Main chunk 606.23 -> 401.00 kB, advisory cleared. 30 Playwright checks pass unchanged. | Claude Opus 5 |
| MG-21 | `44ea458` | 54 files, 433 tests pass (exit 0 verified) | pass | pass | 1,623 nodes / 3,526 edges | Playwright Chromium 151 **and Firefox 153**: 15 checks per engine, 30 total, all pass. Both engines render byte-identical offline audio. Guard removal verified for error recovery, the trace spatial index, and SoundFont failure isolation. Reference measurements recorded in `docs/examples/BENCHMARKS.md`. | Claude Opus 5 |
| Defect: `rest` | `11fd8c2` | 49 files, 388 tests pass (exit 0 verified) | pass | pass | 1,571 nodes / 3,389 edges | Playwright Chromium 151: 9 checks pass. Fix verified by reverting all four consumer changes and confirming all four new tests fail; the pre-fix suite passed, so the guard is the evidence, not the suite. | Claude Opus 5 |
| MG-20 | `90c809d` | 52 files, 383 tests pass (exit 0 verified) | pass | pass | 1,568 nodes / 3,368 edges | Playwright Chromium 151: 9 checks pass. Two independent OfflineAudioContext renders of the same schedule differ by 0.0 at every sample, against 1000+ non-silent samples, so the criterion's byte-identical branch is measured rather than assumed. Guard removal verified for the window offset, seeded noise, bundle digest check, and no-overwrite rule. | Claude Opus 5 |
| MG-19 | `c2b00e0` | 46 files, 343 tests pass (exit 0 verified) | pass | pass | 1,505 nodes / 3,199 edges | Playwright Chromium 151: 7-check browser suite passes. Geometry-independence of the exporters verified by adding a forbidden import and confirming the test fails. | Claude Opus 5 |
| MG-18 | `592b8d6` | 45 files, 334 tests pass (exit 0 verified) | pass | pass | 1,492 nodes / 3,159 edges | Playwright Chromium 151: the 7-check browser suite passes on this commit. Geometry-independence of replay verified by adding a forbidden import and confirming the test fails. | Claude Opus 5 |
| MG-17 | `7d30989` | 42 files, 322 tests pass (exit 0 verified) | pass | pass | 1,455 nodes / 3,050 edges | Playwright Chromium 151: the 7-check browser suite passes on this commit. | Claude Opus 5 |
| MG-16 | `32b7b37` | 40 files, 307 tests pass (command exited 1; see tooling note) | pass | pass | 1,415 nodes / 2,941 edges | Playwright Chromium 151: the 7-check browser suite passes on this commit. SoundFont pitch bend for exact frequency is covered by unit tests including the out-of-range boundary. | Claude Opus 5 |
| MG-15 | `9c8096d` | 38 files, 297 tests pass (command exited 1; see tooling note) | pass | pass | 1,383 nodes / 2,853 edges | Playwright Chromium 151: Trace observation authoring produces no compile or page errors and does not blank the canvas. Causality guard verified by removal: ages go negative and three tests fail. | Claude Opus 5 |
| MG-14 | `f2adb33` | 37 files, 281 tests pass | pass | pass | 1,338 nodes / 2,741 edges | Playwright Chromium 151 headless: relation and Control Part authoring produce no compile errors and no page errors; reference Composition plays and the audio clock advances the Transport. See `e2e/app.spec.ts`. | Claude Opus 5 |
| MG-13 | `27e0390` | 35 files, 258 tests pass | pass | pass | 1,298 nodes / 2,636 edges | User confirmed the new Field overlays working in a browser on 2026-08-05, and reported the Fields panel action buttons overflowing the rail, fixed in `b37e574`. Not independently observed by the packet author. | Michael Rose |
| MG-12 | `b00847a` | 34 files, 243 tests pass | pass | pass | 1,244 nodes / 2,512 edges | User ran the reference Composition in a browser on 2026-08-05 and confirmed it working. Not independently observed by the packet author. | Michael Rose |
| MG-01–MG-11 | `3576320` | 31 files, 206 tests pass | pass | pass; matched worklet SHA-256 | 1,199 nodes / 2,353 edges | Cumulative integration review: two SoundFont defects found, fixed, and covered by regression tests that fail against `13ba9f5`. See [cumulative review](#2026-08-05-mg-01mg-11-cumulative-review). | Claude Opus 5 |

Validation rules:

- Record the exact commit SHA tested. Results from an earlier commit do not
  validate later edits.
- Run the full three repository gates before `in_review` and again after
  conflict resolution or integration changes.
- Run `graphify update .` after code changes and record completion here.
- Manual audio and browser checks supplement automated tests; they never replace
  deterministic core or scheduler coverage.
- A SoundFont packet records the bank digest, preset, browser/version, and
  whether the bank is redistributable or user-local.

## Active packet records

MG-01 through MG-27 and WIN-01 are `done`; DOC-01 is `in_review`.

### DOC-01 active record

- Branch/cwd: `agent/generated-web-documentation` at
  `/home/mrose/spirophonic`.
- Started: `2026-08-14T18:18:07Z`; last updated:
  `2026-08-14T19:07:55Z`.
- Scope: generated HTML for the Getting Started guide, Manual, and Domain
  Model; `predev`/`prebuild` freshness; top-bar links; unit and browser checks.
- Result: Getting Started now distinguishes first visits from restored work,
  describes the default as ready rather than already sounding, uses the live
  12-event count, teaches Performance diagnostics before editing, covers
  Figure sequence mapping, and corrects stale historical references. Its
  first-sound and loop-length claims pass in both browser engines.
- Next: review and commit the working tree, then mark DOC-01 `done` in both
  tracking documents after integration.

Keep one subsection here for every `claimed`, `in_progress`, `blocked`, or
`in_review` packet, then move each finished record into the Activity log,
Validation ledger, and Handoff records.

## Blockers

There are no active blockers.

When adding one, use this table and set the packet ledger state to `blocked`:

| ID | Packet | Opened | Owner | Blocking condition | Evidence | Resolution needed | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — |

A blocker entry stays until resolved. On resolution, append the decision or
commit, restore the packet to `in_progress` or `ready`, and retain the row as
`resolved` rather than deleting it.

## Risk register

Risks are not current blockers. Their owning packets must turn them into tests,
decisions, or explicit limits before completion.

| Risk | Owning packet | Current mitigation | Status |
| --- | --- | --- | --- |
| A gate reported green while its command failed | All | `npm test` exited 1 from 11079d6 through 32b7b37 because Vitest matched the Playwright specs in `e2e/`; the summary line still read "passed", and reading `tail -4` hid the failure. Fixed in `7d30989` by excluding `e2e/`, and gate checks now read the exit code rather than the summary. | Mitigated |
| Visual and audible regressions invisible to jsdom | All | Playwright Chromium checks in `e2e/` run against the production preview build, including a guard that no panel overflows its rail. Added 2026-08-05 after three packets shipped layout or paint bugs that only a real browser caught. | Mitigated |
| SoundFont browser API churn and worklet packaging | MG-10 | SpessaSynth 4.3.12/core 4.3.16 are pinned, their matched worklet is copied and hash-checked automatically, and the adapter remains replaceable. | Mitigated |
| A native engine kind exists in the model but cannot be created or assigned in the UI | MG-08, MG-11 | The 2026-08-11 correction derives an exhaustive native-kind definition map from `InstrumentSpec`. Every native kind must supply a visible label and valid playable template at compile time; created instances flow through the existing Part Instrument picker. | Mitigated |
| Sound bank redistribution and attribution | MG-10, MG-20 | Bundles are manifest-first: bank bytes travel only when the caller permits that specific bank, and licence plus attribution are written into every asset entry whether or not the bytes go with it. Import verifies each embedded digest and never overwrites a local bank. | Mitigated |
| Event growth with many Heads, Fields, and long windows | MG-12, MG-15, MG-21 | Checked-in budgets in `src/**/*.bench.test.ts` assert exact Encounter counts, linear growth in window/Boundary/Head count, and an index that beats a linear scan by 10x and widens that gap as the Trace grows. A 10,000-Encounter cap with a visible diagnostic bounds the pathological case. | Mitigated |
| Exact microtonal pitch in MIDI 1.0 | MG-16, MG-19 | Preserve exact internal frequency; use explicit pitch-bend allocation and fail visibly when capacity is exceeded. Covered by per-event `bend-capacity` diagnostics. | Mitigated |
| Compilation blocks the render thread | none — post-release | Fixed in `9dc15b7`. Compilation moved to a Web Worker; the compiler is pure, so the worker imports core and nothing else. Longest frame gap across five consecutive edits of the reference Composition fell from **128.8 ms to 22.1 ms** in Chromium, asserted in the browser suite and verified by moving the work back and watching the check fail. Exposed a real hazard in the process: performance and Composition can disagree mid-compile, so the hook returns the pair it compiled and every consumer reads Instruments from that document. | Mitigated |
| Production chunk exceeds the bundle advisory | none — post-release | Fixed in `d315929`. SpessaSynth was 207 kB of the 606 kB chunk and is now behind a dynamic import, loaded only when a Composition uses a SoundFont Instrument. Main chunk 401 kB, under the advisory; the warning no longer fires. | Mitigated |
| The `rest` flag on a performed event is written but never read | — | Found during MG-20 and fixed in `11fd8c2`. `core/performance.ts` now exports `eventSounds`/`soundingEvents` as the single definition of what is audible, and the live scheduler, offline renderer, MIDI exporter, and Strudel exporter all consult it. Guarded by a cross-consumer suite in `src/export/agreement.test.ts` that fails on all four when the fix is reverted. | Mitigated |
| Multi-agent edits to shared files or tracker rows | All | Single packet owner, overlap check, frequent heartbeat, and explicit handoff. No conflict occurred across 21 packets. | Mitigated |
| Windows locks loaded native bindings during dependency replacement | WIN-01 | Stop Vite/Vitest before `npm ci` or dependency upgrades. A fresh isolated Windows install succeeds and installs both required bindings; the setup rule is documented in `README.md`. | Mitigated |
| Wedge centre singularity or edge sampling chatters into duplicate gate transitions | MG-22 | `653aee1` adds deterministic centre, exact-sample, tangency, entry/exit, and no-retrigger guards; incomplete window visits are skipped rather than left hanging. | Mitigated |
| A Part's fixed duration or quantize settings turn one region visit back into two short edge notes | MG-22 | The 2026-08-11 correction makes region transitions authoritative in `performance.ts`: entry bypasses note-grid competition, exit is never an onset, and exact same-Head/Field/Boundary pairing supplies note-off. The shared compiler/export/browser fixture deliberately retains fixed 0.25-beat duration and quantization. | Mitigated |
| Dense in-gate automation grows artifacts or diverges across audio/export backends | MG-23, MG-24 | Saved sample rates, bounds, and size limits feed one canonical lane to live native, SoundFont, offline, MIDI, and Strudel consumers. Near/far agreement, explicit capability diagnostics, channel isolation, controller resets, and lossy-resolution warnings are covered. | Mitigated |

## Decision log

The build plan contains the full rationale. This compact log prevents later
sessions from reopening settled foundations accidentally.

| ID | Date | Decision | Status | Contract location |
| --- | --- | --- | --- | --- |
| D-001 | 2026-08-05 | No v0.1/v0.2 compatibility or migration path. | Locked | [Decisions already made](MUSIC-GENERATOR-BUILD-PLAN.md#decisions-already-made) |
| D-002 | 2026-08-05 | Begin with one Wheel/Head crossing ring and spoke Fields. | Locked | [Decisions already made](MUSIC-GENERATOR-BUILD-PLAN.md#decisions-already-made) |
| D-003 | 2026-08-05 | Maintain a complete roadmap, not only the first milestone. | Locked | [Progress](MUSIC-GENERATOR-BUILD-PLAN.md#progress) |
| D-004 | 2026-08-05 | SoundFont support is required, with native synthesis as fallback. | Locked | [SoundFont strategy](MUSIC-GENERATOR-BUILD-PLAN.md#soundfont-strategy) |
| D-005 | 2026-08-05 | One Wheel may carry several Heads/Traces; distinct motion families are distinct Wheels. | Locked | [Meaning of Wheel, Head, shape, and Trace](MUSIC-GENERATOR-BUILD-PLAN.md#meaning-of-wheel-head-shape-and-trace) |
| D-006 | 2026-08-05 | MRP supplies algorithms and patterns only; it is not a runtime dependency. | Locked | [MRP reuse map](MUSIC-GENERATOR-BUILD-PLAN.md#mrp-reuse-map) |
| D-007 | 2026-08-10 | A wedge-shaped Spoke is one outer gate: entry starts a held note, exit ends it, and interior oscillations modulate without retriggering. Decided by Michael Rose. | Locked | [MG-22](MUSIC-GENERATOR-BUILD-PLAN.md#mg-22--wedge-spoke-regions-and-exact-gate-spans) |
| D-008 | 2026-08-12 | Yellow canvas trigger markers represent Encounters selected by the audible note mix, not every physical Boundary crossing. Decided by Michael Rose. | Locked | [MG-09](MUSIC-GENERATOR-BUILD-PLAN.md#mg-09--first-playable-generator-and-clean-model-cutover) |
| D-009 | 2026-08-13 | Begin SF3 drums with one Instrument per preset/note and natural one-shot playback; defer a shared kit model until demonstrated necessary. Decided by Michael Rose. | Locked | [MG-26](MUSIC-GENERATOR-BUILD-PLAN.md#mg-26--soundfont-creation-and-fixed-note-one-shots) |

New decisions receive the next ID, name the deciding user/reviewer, and link the
build-plan change or decision record that made them authoritative.

## Activity log

Append one concise row for claims, handoffs, blockers, reviews, integrations,
and releases. Do not log every edit.

| UTC time | Agent | Packet | Event | Branch/commit | Summary and next step |
| --- | --- | --- | --- | --- | --- |
| 2026-08-14T19:07:55Z | Codex/root | DOC-01 | Publish branch created | `agent/generated-web-documentation` / uncommitted | Scoped working tree moved from updated `main`; commit, push, and draft PR are next. |
| 2026-08-14T19:03:10Z | Codex/root | DOC-01 | Guide review completed | `main` / uncommitted | Getting Started now matches the live first-visit and New workflows, foregrounds Performance diagnostics, and has Chromium/Firefox guards for all stated event counts. Repository gates pass; review and commit are next. |
| 2026-08-14T18:55:40Z | Codex/root | DOC-01 | Guide review requested | `main` / uncommitted | Audit Getting Started for current first-load behavior and add an explicit, accurate explanation of the Performance report and diagnostics. |
| 2026-08-14T18:42:18Z | Codex/root | DOC-01 | Review correction completed | `main` / uncommitted | Removed the two build-oriented reader notes; their regression guard, 662 tests, lint, build, Graphify, and the focused Chromium/Firefox workflow pass. Review and commit are next. |
| 2026-08-14T18:40:21Z | Codex/root | DOC-01 | Review correction requested | `main` / uncommitted | Remove source-provenance and regeneration instructions from reader-facing generated pages; retain those details only in contributor documentation. |
| 2026-08-14T18:28:56Z | Codex/root | DOC-01 | Author handoff | `main` / uncommitted | Three Markdown guides now generate during dev/build, ship in `dist/docs/`, and open from the app. Unit, lint, build, freshness mutation, and focused Chromium/Firefox checks pass; review and commit are next. |
| 2026-08-14T18:18:07Z | Codex/root | DOC-01 | Packet claimed | `main` / `55e1c8c` | Scope generated web documentation before editing implementation files; convert three authored guides during dev/build and expose them from the app. |
| 2026-08-14T18:05:51Z | Codex/root | MG-27 | Integrated and closed | `main` / `55e1c8c` | PR 16 merged the deterministic figure-sequence mapper, canonical chords, editor, exports, docs, UI layout correction, and Part duplication. |
| 2026-08-14T17:50:09Z | Codex/root | MG-12 | Part duplication correction implemented | `main` / uncommitted | Note and Control Parts now duplicate beside their source with complete settings, unique Part and gate-modulation identities, adjacent Duplicate/Remove actions, and passing unit plus Chromium/Firefox coverage. |
| 2026-08-14T16:55:01Z | Codex/root | MG-27 | Author handoff | `main` / uncommitted | Figure-sequence mapping, canonical chords, strict JSON/editor authoring, replay, Strudel polyphony, docs, and examples pass 654 tests, lint, build, two browser engines, and two mutation guards. Review and commit are next. |
| 2026-08-14T16:37:05Z | Codex/root | MG-27 | Packet claimed | `main` / `89179eb` | MG-16, MG-18, and MG-19 are done, MG-26 is merged, and no active claim overlaps. Define the packet contract before changing its named source files. |
| 2026-08-13T16:35:00Z | Codex/root | MG-26 | Author handoff | `agent/soundfont-fixed-note-drums` / uncommitted | Append-only SoundFont Instruments, playback-constrained preset lists, and fixed-note drum one-shots pass 637 tests, lint, build, targeted mutation checks, and the Chromium/Firefox real-SoundFont author/preview/reload regression. Review and commit are next. |
| 2026-08-12T16:49:52Z | Codex/root | MG-09 | Listened-trigger correction implemented | working tree | Canonical geometry still records every Head/Boundary crossing, but the yellow canvas overlay now filters through audible note Part queries. The exact two-Head/two-ring regression and its old-behavior mutation pass, as do 604 tests, lint, build, and the focused Chromium/Firefox production-preview check. Graphify preserved the existing graph after its safety check rejected a 60-node shrink. |
| 2026-08-12T01:35:16Z | Codex/root | MG-11 | Native discovery correction implemented | `fix/expose-native-instruments` / based on `a9c801b` | The default workspace can now create native synth and native drum instances, configure every drum voice, and assign either to a Part. Mutation guard, 597 application tests, lint, build, and Chromium workflow pass; exact Vitest and Playwright exits retain separately recorded runner failures. |
| 2026-08-12T01:00:17Z | Codex/root | MG-22 | Gate-ownership correction implemented | `fix/spoke-gate-duration` / based on `a9c801b` | Region entry/exit now overrides fixed duration and quantization; the supplied document regression, mutation, 597 application tests, lint, build, Graphify, and Chromium real-audio checks pass. Exact `npm test` remains red on the unrelated deploy-script shebang transform, and Firefox hangs before its filtered cases start. |
| 2026-08-10T18:18:25Z | Codex/root | MG-24 | Integrated and closed | `4a87f1f` | Exact commit passes 592 tests, lint, build, 54 Chromium/Firefox checks, retrigger mutation, `git diff --check`, and Graphify refresh. All 24 planned packets and the region-gated expression milestone are complete. |
| 2026-08-10T18:14:17Z | Codex/root | MG-24 | Author handoff | `agent/wedge-gate-modulation` / uncommitted | All consumer, cancellation, capability, near/far browser, mutation, repository, and Graphify gates pass with 592 tests. Commit and validate the exact review tree. |
| 2026-08-10T17:51:55Z | Codex/root | MG-24 | Implementation checkpoint | `agent/wedge-gate-modulation` / uncommitted | One absolute-time lane bundle now drives normal, looped, resumed, native, SoundFont, offline, MIDI, and Strudel paths. Finish browser audio and cancellation/capability guards. |
| 2026-08-10T17:32:48Z | Codex/root | MG-24 | Packet claimed | `agent/wedge-gate-modulation` / `3b8bfd4` | All dependencies are done and no overlapping claim exists. Apply canonical gate lanes to live, offline, MIDI, and Strudel consumers without adding note onsets. |
| 2026-08-10T17:32:48Z | Codex/root | MG-23 | Integrated and closed | `3b8bfd4` | Exact commit passes 576 tests, lint, build, 52 Chromium/Firefox checks, mutation guard, `git diff --check`, and Graphify refresh. MG-24 promoted and claimed. |
| 2026-08-10T17:26:13Z | Codex/root | MG-23 | Author handoff | `agent/wedge-gate-modulation` / uncommitted | Deterministic note-scoped lanes, Recording/replay, Trace styling, authoring, and two-engine reload/playback evidence pass with 576 tests. The renderer mutation fails as intended; commit and validate the exact review tree. |
| 2026-08-10T16:57:43Z | Codex/root | MG-23 | Implementation started | `agent/wedge-gate-modulation` / `bb93964` | Mapping and lane contract fixed: bounded source sampling, entry-only targets, stable note/lane identity, saved Recording data, and lane-driven Trace segments. Implement the core compiler first. |
| 2026-08-10T16:54:20Z | Codex/root | MG-23 | Packet claimed | `agent/wedge-gate-modulation` / `653aee1` | MG-22 is done and no overlapping claim exists. Implement canonical in-gate modulation lanes and Trace notation inside the declared contract. |
| 2026-08-10T16:54:20Z | Codex/root | MG-22 | Integrated and closed | `653aee1` | Exact commit passes 564 tests, lint, build, 50 Chromium/Firefox checks, mutation guard, `git diff --check`, and Graphify refresh. MG-23 promoted and claimed. |
| 2026-08-10T16:48:34Z | Codex/root | MG-22 | Author handoff | `agent/wedge-gate-modulation` / uncommitted | All deliverables and acceptance guards pass: 564 unit checks, lint, build, 50 two-engine browser checks, mutation guard, and Graphify refresh. Commit and validate the exact review tree. |
| 2026-08-10T16:44:50Z | Codex/root | MG-22 | Implementation checkpoint | `agent/wedge-gate-modulation` / uncommitted | Positive-width Spokes render as wedges; band/wedge transitions pair exact region spans; near/far and no-retrigger guards pass. Full unit/lint/build and the prior 48 browser checks pass; rerun the expanded browser suite next. |
| 2026-08-10T16:33:53Z | Codex/root | MG-22 | Packet claimed | `agent/wedge-gate-modulation` / uncommitted | Dependencies are done and no overlapping claim exists. Implement wedge geometry and exact gate spans inside the amended contract. |
| 2026-08-10T16:28:19Z | Codex/root | MG-22–MG-24 | Roadmap extended | `main` / uncommitted | User locked wedge Spokes as angular outer gates whose interior oscillations modulate one held note. MG-22 is ready; MG-23 and MG-24 wait on its canonical spans and modulation lanes. |
| 2026-08-10T01:52:49Z | Codex/root | WIN-01 | Author handoff | `agent/windows-portability` / uncommitted | Native Windows and isolated WSL2 clean installs and full gates pass with 555 tests. Windows Chromium production-preview smoke passes; Firefox hangs in the restricted runner and is not claimed. Graphify refreshed; commit/integration review remains. |
| 2026-08-10T02:02:45Z | Codex/root | WIN-01 | Implementation committed | `24f1271` | Windows portability implementation and generated Graphify refresh committed on `agent/windows-portability`; push and integration review remain. |
| 2026-08-10T02:09:14Z | Codex/root | WIN-01 | Integrated and closed | PR 8 / `01ae008` | Merge tree matches the reviewed branch HEAD. WIN-01 is `done`, its owner is cleared, and every planned and maintenance packet is complete. |
| 2026-08-05 | Codex | Roadmap | Tracker initialized | `main` / uncommitted | MG-01 is ready; no packet is claimed. Baseline: 170 tests, lint, and build pass. |
| 2026-08-05T16:52:55Z | Codex/root | MG-01 | Packet claimed | `agent/music-generator-planning` / uncommitted | Implement the v1 Composition, validation, and JSON boundary beside the current app. |
| 2026-08-05T17:06:38Z | Codex/root | MG-01 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-01 acceptance criteria and working-tree gates pass; review and commit are next. |
| 2026-08-05T17:12:04Z | Codex/root | MG-02 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over the local MG-01 dependency; implement deterministic Transport in its isolated packet files. |
| 2026-08-05T17:18:28Z | Codex/root | MG-02 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-02 acceptance criteria and working-tree gates pass; dependency-chain review and commits are next. |
| 2026-08-05T17:22:14Z | Codex/root | MG-01 | Implementation committed | `1aaaa07` | Exact packet source is committed and validated; integration review remains. |
| 2026-08-05T17:23:12Z | Codex/root | MG-02 | Implementation committed | `0afa4e3` | Exact packet source passes 217 tests, lint, and build; integration review remains. |
| 2026-08-05T17:23:58Z | Codex/root | MG-03 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; implement pure Wheel and multi-Head state in the packet files. |
| 2026-08-05T17:30:34Z | Codex/root | MG-03 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-03 acceptance criteria and working-tree gates pass; packet commit is next. |
| 2026-08-05T17:31:47Z | Codex/root | MG-03 | Implementation committed | `a454b7c` | Exact packet source passes 237 tests, lint, and build; integration review remains. |
| 2026-08-05T17:36:24Z | Codex/root | MG-04 | Packet claimed | `agent/music-generator-planning` / uncommitted | Build the pure Composition scene/command renderer and a side-by-side canvas adapter. |
| 2026-08-05T17:41:27Z | Codex/root | MG-04 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-04 acceptance criteria and working-tree gates pass; packet commit is next. |
| 2026-08-05T17:42:34Z | Codex/root | MG-04 | Implementation committed | `6960442` | Exact packet source passes 249 tests, lint, and build; integration review remains. |
| 2026-08-05T17:53:05Z | Codex/root | MG-05 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; implement ring/spoke Field geometry, rendering, and authoring controls. |
| 2026-08-05T17:55:03Z | Codex/root | MG-05 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-05 acceptance criteria and working-tree gates pass; packet commit is next. |
| 2026-08-05T17:56:09Z | Codex/root | MG-05 | Implementation committed | `68631b5` | Exact packet source passes 267 tests, lint, and build; integration review remains. |
| 2026-08-05T17:59:01Z | Codex/root | MG-06 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; implement deterministic boundary-crossing Encounters. |
| 2026-08-05T18:07:52Z | Codex/root | MG-06 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-06 acceptance criteria and working-tree gates pass; packet commit is next. |
| 2026-08-05T18:09:08Z | Codex/root | MG-06 | Implementation committed | `7baa1a7` | Exact packet source passes 281 tests, lint, and build; integration review remains. |
| 2026-08-05T18:11:29Z | Codex/root | MG-07 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; implement canonical Part interpretation and performance layers. |
| 2026-08-05T18:20:40Z | Codex/root | MG-07 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-07 acceptance criteria and working-tree gates pass; packet commit is next. |
| 2026-08-05T18:21:38Z | Codex/root | MG-07 | Implementation committed | `842acb7` | Exact packet source passes 298 tests, lint, and build; integration review remains. |
| 2026-08-05T18:23:26Z | Codex/root | MG-08 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; implement native Instrument routing and deterministic live scheduling. |
| 2026-08-05T18:36:04Z | Codex/root | MG-08 | Author handoff | `agent/music-generator-planning` / uncommitted | All MG-08 acceptance criteria and working-tree gates pass; implementation commit and exact-commit validation are next. |
| 2026-08-05T18:37:10Z | Codex/root | MG-08 | Implementation committed | `7f2d487` | Exact packet source passes 309 tests, lint, and build; integration review remains. |
| 2026-08-05T18:39:36Z | Codex/root | MG-09 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; replace the running app with the playable v1 Composition workflow. |
| 2026-08-05T19:02:08Z | Codex/root | MG-09 | Author handoff | `agent/music-generator-planning` / uncommitted | The v1 editor, playback, visualization, diagnostics, JSON/MIDI/Strudel/SVG adapters, and legacy cutover pass automated and Hermes browser validation; implementation commit is next. |
| 2026-08-05T19:03:51Z | Codex/root | MG-09 | Implementation committed | `ff6af91` | Exact packet source passes 179 tests, lint, build, Graphify refresh, and Hermes browser playback; integration review remains. |
| 2026-08-05T19:07:49Z | Codex/root | MG-10 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; implement local SoundFont ownership and select a reproducible browser engine. |
| 2026-08-05T19:32:36Z | Codex/root | MG-10 | Author handoff | `agent/music-generator-planning` / uncommitted | Digest-keyed vault, pinned SpessaSynth worklet, SF2/SF3 probes, packaging, licensing boundary, and all working-tree gates pass; commit and exact-commit validation are next. |
| 2026-08-05T19:34:43Z | Codex/root | MG-10 | Implementation committed | `992a97e` | Exact packet source passes 190 tests, lint, build, reproducible worklet sync, Graphify refresh, and Hermes Chromium/Firefox probes; integration review remains. |
| 2026-08-05T19:45:18Z | Codex/root | MG-11 | Packet claimed | `agent/music-generator-planning` / uncommitted | User directed work to continue over committed dependencies; make local SoundFont banks and presets a visible, concurrent Instrument workflow. |
| 2026-08-05T20:10:54Z | Codex/root | MG-11 | Author handoff | `agent/music-generator-planning` / uncommitted | SF2/SF3 import, preset browsing/audition/assignment, concurrent routing, reload, missing-bank isolation/relink, explicit native fallback, and all working-tree gates pass; commit is next. |
| 2026-08-05T20:14:04Z | Codex/root | MG-11 | Implementation committed | `7685bb6` | Exact packet source passes 204 tests, lint, build, reproducible worklet sync, Graphify refresh, and Hermes SF2/SF3 concurrent playback; integration review remains. |
| 2026-08-05T20:32:00Z | Claude Opus 5 | MG-01–MG-11 | Cumulative review | `agent/music-generator-planning` / `13ba9f5` | Reviewed the whole stacked series at the user's direction. Core determinism, sample-rate invariance, and window-seam behavior verified by probe. Two SoundFont defects found: `cancelScheduledFrom` ignored its time argument, and `prepare` cleared routes before awaiting, silently dropping notes. |
| 2026-08-05T20:32:00Z | Claude Opus 5 | MG-11 | Review fixes committed | `3576320` | Both defects fixed with regression tests that fail against `13ba9f5`. Full gates rerun on the integrated commit: 206 tests, lint, build with matched worklet SHA-256, `git diff --check`, and Graphify refresh. |
| 2026-08-05T20:32:00Z | Claude Opus 5 | MG-01–MG-11 | Packets integrated and closed | `3576320` | All eleven packets are `done` in this tracker and the build plan Progress table. Claims cleared, milestone rollup refreshed, MG-12 promoted from `waiting` to `ready`. |
| 2026-08-05T20:38:08Z | Claude Opus 5 | MG-12 | Packet claimed | `agent/music-generator-planning` / `7e97a5c` | Dependencies verified `done`; build-plan file list amended explicitly before any packet code changed. |
| 2026-08-06T10:35:00Z | Claude Opus 5 | Post-release | Compilation moved off the render thread | `9dc15b7` | The last risk with real user impact. 128.8 ms → 22.1 ms longest frame gap on the reference Composition. Asynchronous compilation introduced a correctness hazard the browser suite caught: pairing a new Composition's Instruments with an older compile made the scheduler reject every event, so the hook now hands back the Composition its performance was compiled from and all consumers use it. |
| 2026-08-06T10:05:00Z | Claude Opus 5 | Post-release | MuseScore General bundled | `80dbf8d` | 38 MB MIT-licensed General MIDI bank in `public/soundbanks/` with its licence beside it. Fetched on idle, digest-verified before storage, never blocking first paint; default Instruments stay native so first run is instant and offline. The showcase's SoundFont Instrument now names a preset that actually exists. Adding a bank to the default Composition exposed a defect: the panel reported a not-yet-downloaded bank as an error. |
| 2026-08-06T09:35:00Z | Claude Opus 5 | Post-release | SoundFont verification gap closed | `99c5ffb` | The MG-21 packet-close audit said the SoundFont path could not be measured or heard because no bank ships here. `spessasynth_core` — already a dependency — generates a valid 890-byte SF2 under Apache 2.0. Both missing benchmark budgets are now checked in, and the browser suite imports a real bank through the real UI in both engines. The audit is corrected rather than left standing; the narrower limit that remains is that the showcase's *intended* sound still needs a user-supplied GM bank. |
| 2026-08-06T09:20:00Z | Claude Opus 5 | Post-release | Bundle advisory cleared | `d315929` | SpessaSynth moved behind a dynamic import: 606 kB -> 401 kB main chunk, 206 kB lazy. Both static imports already sat inside async functions, so the change was contained. |
| 2026-08-06T09:05:00Z | Claude Opus 5 | MG-21 | Packet closed | `44ea458` | Reference fixtures and the showcase, benchmark budgets for five of six named subjects, a Chromium + Firefox browser matrix, SoundFont failure isolation, an accessibility and error-recovery pass, and rewritten product documentation. **Every packet MG-01 through MG-21 is now `done`; none was removed from scope or deferred to a replacement milestone.** Two limits are recorded rather than hidden: the showcase's SoundFont Instrument is verified structurally but not audibly, because no redistributable bank exists to ship, and the two benchmark subjects that need a real bank have no budget for the same reason. See the packet-close audit in the build plan. |
| 2026-08-06T08:55:00Z | Claude Opus 5 | MG-21 | File list amended | `44ea458` | `src/App.tsx` added before code changed. Fourth packet to alter app behaviour without listing the mounting file; the amendment names the pattern rather than only fixing the instance. |
| 2026-08-06T08:35:00Z | Claude Opus 5 | Defect | Silenced notes made audible everywhere | `11fd8c2` | `NoteMusicalEvent.rest` had been written by the compiler and read by no consumer since MG-17, so interpretation variation could not actually silence anything: the note sounded in live playback, MIDI, Strudel, and the offline render. Fixed by giving the compiler one exported definition of audibility and having every consumer use it. The full suite passed before the fix, which is why the defect survived four packets; the new tests fail on all four consumers when it is reverted. Not folded into MG-21 — it is a defect fix across closed packets, not release work. |
| 2026-08-06T08:15:00Z | Claude Opus 5 | MG-20 | Packet closed | `90c809d` | Offline WAV render, portable `.spirophonic` bundles, and the engine changes an offline context needs. The repeat-render criterion was blocked by `drumSynth` seeding its noise from `Math.random()`, not by the SoundFont backend; seeded from `core/random` instead. Two independent real-browser renders now measure byte-identical. Marked `done`; MG-21 promoted to `ready`. |
| 2026-08-06T07:50:00Z | Claude Opus 5 | MG-20 | File list amended | `90c809d` | Six files added to the packet contract before code changed: the engine boundary, native engine, both voice modules, `App.tsx`, and `e2e/app.spec.ts`, each with its reason. `App.tsx` is the third packet to change a panel's props without listing the file that mounts it. |
| 2026-08-06T01:50:00Z | Claude Opus 5 | MG-19 | Packet closed | `c2b00e0` | Explicit microtonal policy with per-event capacity diagnostics, bank/CC/pitch-bend in the SMF writer, Strudel frequency patterns, and export from a Recording. Marked `done`; MG-20 promoted to `ready`. |
| 2026-08-06T01:30:00Z | Claude Opus 5 | MG-18 | Packet closed | `592b8d6` | Recording, exact replay, and reinterpretation delivered; the relational composition depth milestone is complete at 6/6. Marked `done`; MG-19 promoted to `ready`. |
| 2026-08-06T01:10:00Z | Claude Opus 5 | MG-17 | Packet closed | `7d30989` | Scope-derived seeded variation across three layers, with bounded deltas and a variation trace. Marked `done`; MG-18 promoted to `ready`. |
| 2026-08-06T01:08:00Z | Claude Opus 5 | Tooling | Test gate corrected | `7d30989` | `npm test` had been exiting 1 since the Playwright harness landed, because Vitest matched `e2e/*.spec.ts`. Unit results were genuine throughout, but the command failed. Validation ledger rows for MG-15 and MG-16 are annotated. |
| 2026-08-06T00:55:00Z | Claude Opus 5 | MG-16 | Packet closed | `32b7b37` | Wheel-derived ratios, shared tuning contexts, stateful melodic contour, and SoundFont pitch bend delivered with unit and browser gates green. Marked `done`; MG-17 promoted to `ready`. |
| 2026-08-06T00:40:00Z | Claude Opus 5 | MG-15 | Packet closed | `9c8096d` | Trace retention, spatial indexing, causality, and tangency/retracing policy delivered with unit and browser gates green. Marked `done` in this tracker and the build plan; nothing depends on MG-15 alone, so MG-16 stays the ready packet. |
| 2026-08-06T00:25:00Z | Claude Opus 5 | MG-14 | Packet closed | `f2adb33`, `11079d6` | Browser evidence now comes from the repository's own Playwright suite rather than a manual check. Marked `done` in this tracker and the build plan; MG-16 promoted to `ready`. |
| 2026-08-06T00:20:00Z | Claude Opus 5 | Tooling | Browser harness added | `11079d6` | Playwright Chromium checks run against the production preview build. Found and fixed a blank-canvas race in CompositionCanvas and an 18px overflow in the MG-12 composition tree. |
| 2026-08-05T22:59:55Z | Claude Opus 5 | MG-13 | Packet closed | `27e0390`, `b37e574` | User confirmed the new Field overlays working in a browser and reported the Fields panel action buttons overflowing the rail, fixed in `b37e574`. Marked `done` in this tracker and the build plan. No packet depends on MG-13 alone, so nothing new unblocked; MG-14 and MG-15 stay `ready`. |
| 2026-08-05T22:22:00Z | Claude Opus 5 | MG-13 | Packet claimed | `agent/music-generator-planning` / `1427aa4` | Dependencies verified `done`; build-plan file list amended explicitly before any packet code changed. |
| 2026-08-05T22:20:50Z | Claude Opus 5 | MG-12 | Packet closed | `b00847a` | User confirmed the reference Composition working in a browser, closing the one gap in the MG-12 handoff. Marked `done` in this tracker and the build plan; MG-13, MG-14, and MG-15 promoted to `ready`. |
| 2026-08-05T22:10:11Z | Claude Opus 5 | MG-12 | Author handoff | `b00847a` | Structural editing with cascade impact, Part solo/mute, the composition tree, selection-driven panels, and the four-Wheel reference Composition all pass 243 tests, lint, build, and Graphify. Browser/audio check on the reference Composition remains before `done`. |

## Handoff records

### 2026-08-14 DOC-01 review-candidate handoff

- Packet: DOC-01 — Generated web documentation
- State: `in_review`
- Agent: Codex/root
- Branch/cwd: `agent/generated-web-documentation` at
  `/home/mrose/spirophonic`
- Commit: uncommitted review candidate based on `55e1c8c`
- Acceptance criteria complete: the three authored Markdown guides generate as
  responsive static HTML with stable anchors, cross-guide navigation, live
  repository links for unpublished Markdown, and an app return route; `predev`
  and `prebuild` keep local and deployed output current; app links open without
  replacing the workspace.
- Validation: 67 files / 662 tests, lint, production build, focused two-engine
  browser workflow, `git diff --check`, and Graphify at 1,979 nodes / 4,370
  edges pass. The stale-output mutation and missing-navigation guard both fail
  as intended. `dist/docs/` contains exactly the three generated pages, and a
  live `npm run dev` smoke served the app and all three docs with HTTP 200.
- Review correction: reader-facing source provenance and regeneration
  instructions were removed from the template. The new unit guard failed
  against the prior template, and the corrected pages pass in both browser
  engines without either sentence.
- Guide audit: the live default exposed the stale 13-event claim by producing
  12. Getting Started now distinguishes first visits from restored sessions,
  explains Performance and compilation state before edits, describes Figure
  sequence mapping, and corrects stale historical links. Chromium and Firefox
  pass the full documented New → Add rings → Add Part workflow and every
  published loop-length count (4/4 checks including generated-page coverage).
- Browser evidence: the docs workflow passes in Chromium and Firefox. The full
  run passes 67/68; only the pre-existing Firefox frame-gap benchmark fails at
  118 ms versus 100 ms. It repeats at 111 ms and, with these links temporarily
  removed, 145 ms, so this packet does not cause that timing failure.
- Edited docs: `README.md`, `docs/GETTING-STARTED.md`, `docs/MANUAL.md`,
  `docs/DEPLOYMENT.md`,
  `docs/MUSIC-GENERATOR-BUILD-PLAN.md`, and
  `docs/MUSIC-GENERATOR-PROGRESS.md`.
- Blockers or risks: no feature blocker. The existing >500 kB Vite advisory and
  Firefox timing-budget failure remain outside this packet.
- Next exact action: commit and push `agent/generated-web-documentation`, open a
  draft PR against `main`, then mark DOC-01 `done` after integration.

### 2026-08-14 MG-27 review-candidate handoff

- Packet: MG-27 — Figure-sequence pitch mapping
- State: `in_review`
- Agent: Codex/root
- Branch/cwd: `agent/figure-sequence-pitch-mapping` at
  `/home/mrose/spirophonic`
- Commit: review-candidate commit based on `89179eb`
- Acceptance criteria complete: FIFO/LIFO/indexed traversal; loop/hold/silence;
  performance/bar/Wheel-cycle reset; note, chord, scale-degree, pitch-class-set,
  and interval figures; prime/retrograde/inversion/retrograde-inversion;
  transpose and interval scale; stable canonical chord IDs; JSON, replay,
  reinterpretation, Strudel polyphony, editor authoring, and documentation.
- Validation: 66 files / 654 tests, lint, production build, and
  `git diff --check` pass with verified zero exit codes. Chromium and Firefox
  pass the focused author/play/persist/reload check. Disabling advancement and
  inversion each makes its focused test fail. Graphify preserved the existing
  graph after its safety check rejected a 1,958-vs-1,972 node shrink.
- Edited docs: `docs/MUSIC-GENERATOR-BUILD-PLAN.md`,
  `docs/MUSIC-GENERATOR-PROGRESS.md`, `docs/MANUAL.md`, and
  `docs/examples/FIGURE-SEQUENCE-PITCH-MAPPINGS.md`.
- Blockers or risks: no feature blocker. The existing >500 kB Vite advisory
  remains non-fatal; Graphify needs its prior missing chunks resolved before a
  non-forced refresh can replace the graph.
- Next exact action: review and integrate the feature branch, then mark MG-27
  `done` in both tracking documents.

### 2026-08-10 MG-24 completed handoff

- Packet: MG-24 — Modulated playback and export agreement
- State: `done`
- Agent: Codex/root
- Branch/cwd: `agent/wedge-gate-modulation` at `/home/mrose/spirophonic`
- Commit: `4a87f1f`
- Acceptance criteria complete: the canonical note-scoped lane drives one held
  native or SoundFont voice, offline WAV, timed MIDI, and bounded Strudel
  controls without interior retriggers. Entry-only values, continuous values,
  capability diagnostics, cancellation, gate-exit resets, cross-bank channel
  isolation, voice stealing, and disabled-modulation identity are covered.
- Validation: the exact commit passes 63 files / 592 tests, lint, production
  build, `git diff --check`, 27 Chromium 151 plus 27 Firefox 153 checks, and
  Graphify at 1,875 nodes / 4,163 edges. The deliberate retrigger mutation made
  every live, offline, MIDI, and agreement guard fail with excess attacks.
- Browser/audio evidence: fixed-frequency near/far wedge performances retain
  equal attack count and base pitch; the far voice lasts longer and carries
  more cycles. Both browsers pass bundled and user-local SoundFont provenance,
  digest, preset, vault, and licence checks.
- Blockers or risks: none. Backend limits remain explicit diagnostics rather
  than silent flattening.
- Next exact action: review or integrate branch `agent/wedge-gate-modulation`;
  no planned music-generator packet remains ready or waiting.

### 2026-08-10 MG-24 review-candidate handoff

- Packet: MG-24 — Modulated playback and export agreement
- State: `in_review`
- Agent: Codex/root
- Branch/cwd: `agent/wedge-gate-modulation` at `/home/mrose/spirophonic`
- Started/last updated UTC: 2026-08-10T17:32:48Z / 2026-08-10T18:14:17Z
- Commits: roadmap `b92badf`; MG-22 `653aee1`; MG-23 `3b8bfd4`;
  MG-24 review candidate not yet committed.
- Edited files: the declared MG-24 audio-engine, scheduler, router, offline,
  MIDI, Strudel, agreement, diagnostic, app, browser, and manual files; build
  plan/tracker state; generated `graphify-out/` refresh.
- Acceptance criteria complete: one absolute-time lane drives one live native
  or SoundFont voice, the same offline render, ordered MIDI controllers/bends,
  and bounded Strudel controls. Entry values apply once; continuous values reset
  at gate exit; unsupported/range/polyphony/resolution limits are visible.
  Pause, seek, loop, safe edit, stop, panic, voice stealing, cross-bank channel
  isolation, and disabled-modulation identity are deterministic guards.
- Validation: 63 files / 592 tests, lint, production build, `git diff --check`,
  27 Chromium 151 plus 27 Firefox 153 checks, and Graphify at 1,875 nodes /
  4,163 edges pass. Deliberate per-sample retriggers fail live, offline, MIDI,
  and cross-consumer agreement guards with the recorded excess attack counts.
- Manual/browser/audio evidence: real Web Audio shows equal near/far attack
  counts and base pitch, with the far wedge holding longer and scheduling more
  same-frequency modulation. Both engines also pass the real bundled-bank
  digest, MIT licence, Grand Piano preset, vault, and local-bank provenance
  checks.
- Blockers or risks: none. Dense lane reduction remains explicit in Strudel;
  unsupported SoundFont attack and channel collisions remain diagnostics.
- Unrelated user/agent changes preserved: no unrelated source changes were
  present; generated Graphify updates are expected repository artifacts.
- Next exact action: commit the review candidate, rerun every gate at that SHA,
  then mark MG-24 and the region-gated expression milestone `done`.

### 2026-08-10 MG-23 completed handoff

- Packet: MG-23 — In-gate modulation lanes and Trace notation
- State: `done`
- Agent: Codex/root
- Branch: `agent/wedge-gate-modulation`
- Commit: `3b8bfd4`
- Acceptance criteria complete: saved mappings compile deterministic bounded
  note-scoped lanes for position, radius, speed, curvature, continuous and
  entry-only targets; lanes preserve exact entry/exit identity through
  Recording, JSON, replay, and worker cloning; Trace styling follows canonical
  samples only inside the gate without deforming the path.
- Validation: 63 files and 576 tests, lint, production build, a clean
  `git diff --check`, 26 Chromium plus 26 Firefox checks, and Graphify at 1,859
  nodes / 4,072 edges pass on the exact commit. The fixed-frequency sine guard
  keeps one note near and far while the farther lane lasts longer and carries
  more cycles. Bypassing lane styling fails the renderer guard.
- Next exact action: MG-24 applies these lanes to live native and SoundFont
  voices, offline rendering, MIDI, and Strudel with explicit capability
  diagnostics and cancellation semantics.

### 2026-08-10 MG-22 completed handoff

- Packet: MG-22 — Wedge-spoke regions and exact gate spans
- State: `done`
- Agent: Codex/root
- Branch: `agent/wedge-gate-modulation`
- Commit: `653aee1`
- Acceptance criteria complete: positive-width Spokes are saved and rendered as
  angular wedges; bands and wedges emit distinct physical direction plus
  `enter`/`exit`; one entry pairs only with the same Head, Field, and Boundary
  exit; incomplete visits are skipped; legacy zero-width rays remain crossings.
- Validation: 62 files and 564 tests, lint, production build, a clean
  `git diff --check`, 25 Chromium plus 25 Firefox checks, and Graphify at 1,812 nodes /
  3,930 edges all pass on the exact commit. A fixed-frequency sine fixture produces
  one longer note farther from the center, and the no-retrigger mutation fails
  by producing 7 notes from 4 entries.
- Next exact action: MG-23 owns the deterministic in-gate lane and Trace styling
  that use these canonical spans without changing note identity or duration.

### 2026-08-09 WIN-01 completed handoff

- Packet: WIN-01 — Native Windows development portability
- State: `done`
- Agent: Codex/root; integrated by Michael Rose
- Branch: `agent/windows-portability`; merged to `main` by PR 8
- Commits: implementation `24f1271`; validation ledger `9702c9c`; merge
  `01ae008`
- Acceptance criteria complete: Vite uses the runner config loader; TypeScript
  metadata stays outside `node_modules`; native Windows clean install, gates,
  dev server, and Chromium smoke pass; the unchanged workflow passes a clean
  isolated WSL2 install and all gates.
- Validation: 62 files and 555 tests, lint, and production build pass with exit
  code 0 on native Windows and WSL2. Graphify refreshed to 1,861 nodes and
  4,264 edges. The merge tree exactly matches reviewed branch HEAD `9702c9c`.
- Known environment limit: Firefox 153 installed but hung before its first test
  in the restricted Windows runner, so only the Chromium smoke is claimed.
- Next exact action: none; the packet is integrated and closed.

### 2026-08-05 MG-01 author handoff

- Packet: MG-01 — Composition schema and validation
- State: `in_progress`; implementation and author validation are complete, but
  no exact commit exists yet for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T16:52:55Z / 2026-08-05T17:06:38Z
- Commits: none
- Edited files: `src/core/composition.ts`,
  `src/core/defaultComposition.ts`, `src/core/compositionValidation.ts`,
  `src/core/composition.test.ts`, `src/core/compositionValidation.test.ts`,
  `src/export/compositionJson.ts`, `src/export/compositionJson.test.ts`, and the
  two roadmap coordination documents. `graphify update .` also refreshed the
  tracked generated files under `graphify-out/`.
- Acceptance criteria complete: the default composition validates and
  round-trips deterministically; duplicate IDs and dangling references report
  precise paths; mismatched motion/Head attachment families are rejected;
  v0.1 and v0.2 JSON are explicitly unsupported; and the new modules contain no
  legacy upgrade logic.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: `npm test` passed 20 test files and 194
  tests; `npm run lint` passed; `npm run build` passed; `graphify update .`
  completed after the final code change.
- Manual/browser/audio evidence: not required for this data-contract packet.
- Blockers or risks: none.
- Unrelated user/agent changes preserved: no unrelated source changes were
  modified; generated Graphify changes are retained as required by repository
  instructions.
- Next exact action: review the diff, commit MG-01 and its tracker update, rerun
  all gates against the exact commit, then set the packet to `in_review` and
  add its SHA to the Validation ledger.

### 2026-08-05 MG-02 author handoff

- Packet: MG-02 — Deterministic Transport and performance window
- State: `in_progress`; implementation and author validation are complete, but
  MG-01 and MG-02 do not yet have exact commits for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T17:12:04Z / 2026-08-05T17:18:28Z
- Commits: none
- Edited files: `src/core/transport.ts`, `src/core/transport.test.ts`, and this
  tracker. `graphify update .` also refreshed the tracked generated files under
  `graphify-out/`.
- Acceptance criteria complete: 120 BPM maps four beats to two seconds without
  geometry; `1/4`, `3/2`, and `5/8` rational rates produce their expected
  phases; mid-bar requests return stable zero-based bar, beat, and phase
  addresses; absolute-time evaluation is deterministic across repeated calls
  and sampling rates; and neither the module nor graph contains a curve-closure
  or display-clock dependency.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 23 targeted Transport tests pass; `npm test`
  passed 21 test files and 217 tests; `npm run lint` passed; `npm run build`
  passed; `graphify update .` completed after the final code change.
- Manual/browser/audio evidence: not required for this pure time-core packet.
- Blockers or risks: none. The explicit dependency exception remains until the
  local MG-01 work is committed.
- Unrelated user/agent changes preserved: MG-02 changed only its two packet
  files, coordination metadata, and generated Graphify output.
- Next exact action: review the dependency-chain diff, commit MG-01 before
  MG-02 where practical, rerun all gates against the exact commits, then move
  eligible packets to `in_review` and populate the Validation ledger.

### 2026-08-05 MG-03 author handoff

- Packet: MG-03 — Wheel and multi-Head state engine
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T17:23:58Z / 2026-08-05T17:30:34Z
- Commits: none
- Edited files: `src/core/motion.ts`, `src/core/motion.test.ts`,
  `src/core/wheels.ts`, `src/core/wheels.test.ts`, `src/core/heads.ts`,
  `src/core/heads.test.ts`, `src/core/curves.ts`, `src/core/trochoid.ts`, and
  this tracker. `graphify update .` also refreshed tracked generated files.
- Acceptance criteria complete: the existing curve-family suite retains its
  sampled and spirogram math; two Heads share Wheel phase while attachment and
  Head phase offsets yield distinct positions; reversing a Wheel preserves IDs
  while reversing traversal and velocity; damped harmonograph state continues
  beyond normalized phase wrap without endpoint closure; and state is derived
  only from Composition plus requested absolute time.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 36 packet-relevant tests pass; `npm test`
  passed 24 test files and 237 tests; `npm run lint` passed; `npm run build`
  passed; `graphify update .` completed after the final code change.
- Manual/browser/audio evidence: not required for this pure state-core packet.
- Blockers or risks: none. The explicit dependency exception remains until
  MG-01 and MG-02 are integrated.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-03 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: review and commit MG-03, rerun all gates against the exact
  commit, then move it to `in_review` and add the SHA to the Validation ledger.

### 2026-08-05 MG-04 author handoff

- Packet: MG-04 — Space projection and composition renderer
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T17:36:24Z / 2026-08-05T17:41:27Z
- Commits: none
- Edited files: `src/render/compositionRenderer.ts`,
  `src/render/compositionRenderer.test.ts`, `src/ui/CompositionCanvas.tsx`,
  `src/ui/CompositionCanvas.test.tsx`, `src/App.css`, and this tracker.
  `graphify update .` also refreshed tracked generated files.
- Acceptance criteria complete: direct seek and stepped playback produce equal
  scene data at the same time; two Heads retain stable independent Trace styles;
  resizing recomputes projection without mutating scene state; renderer tests
  assert scene and draw commands rather than antialiased pixels; and the Canvas
  is only a downstream consumer of pure absolute Head state.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 12 targeted renderer/UI tests pass;
  `npm test` passed 26 test files and 249 tests; `npm run lint` passed;
  `npm run build` passed; `graphify update .` completed after the final code
  change.
- Manual/browser/audio evidence: no browser route is added before MG-09; Canvas
  adapter behavior is covered through deterministic commands and mocked-context
  component tests as required by this packet.
- Blockers or risks: none. The explicit dependency exception remains until
  MG-03 is integrated.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-04 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: review and commit MG-04, rerun all gates against the exact
  commit, then move it to `in_review`, add the SHA to the Validation ledger,
  and push the branch.

### 2026-08-05 MG-05 author handoff

- Packet: MG-05 — Ring and spoke Fields
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T17:53:05Z / 2026-08-05T17:55:03Z
- Commits: none
- Edited files: `src/core/fields.ts`, `src/core/fields.test.ts`,
  `src/render/compositionRenderer.ts`,
  `src/render/compositionRenderer.test.ts`, `src/ui/FieldPanel.tsx`,
  `src/ui/FieldPanel.test.tsx`, and the two roadmap coordination documents.
  The build plan now explicitly includes the renderer test in packet scope.
  `graphify update .` also refreshed tracked generated files.
- Acceptance criteria complete: ring and spoke Boundaries retain explicit IDs
  through sibling edits and reorder operations; spoke crossings reject the
  infinite line behind the oriented ray; drawing and crossing calculations
  consume the same immutable Boundary geometry; five rings remain separately
  addressable; and disabled Fields or Boundaries produce neither geometry,
  drawing commands, nor crossing results.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 27 targeted Field/core/renderer/UI tests
  pass; `npm test` passed 28 test files and 267 tests; `npm run lint` passed;
  `npm run build` passed; `graphify update .` completed after the final code
  change.
- Manual/browser/audio evidence: no browser route is added before MG-09;
  authoring behavior and renderer output are covered by component and command
  tests as required by this packet.
- Blockers or risks: none. The explicit dependency exception remains until
  MG-01, MG-03, and MG-04 are integrated.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-05 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: commit MG-05, rerun all gates against the exact commit,
  then move it to `in_review`, add the SHA to the Validation ledger, and push
  the branch.

### 2026-08-05 MG-06 author handoff

- Packet: MG-06 — Boundary-crossing Encounter engine
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T17:59:01Z / 2026-08-05T18:07:52Z
- Commits: none
- Edited files: `src/core/crossings.ts`, `src/core/crossings.test.ts`,
  `src/core/encounters.ts`, `src/core/encounters.test.ts`, and this tracker.
  `graphify update .` also refreshed tracked generated files.
- Acceptance criteria complete: hand-constructed paths produce byte-stable
  Encounter fixtures; exact-grid crossings are emitted once while tangent
  contacts are ignored; bracket refinement converges within 100 ns at the
  documented range of at least 64 samples per fastest Wheel cycle;
  simultaneous crossings sort by time, subject, Field, and Boundary ID; and
  Encounter output contains physical measurements but no note, scale,
  velocity, or Instrument choice.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 14 targeted crossing/Encounter tests pass;
  `npm test` passed 30 test files and 281 tests; `npm run lint` passed;
  `npm run build` passed; `graphify update .` completed after the final code
  change.
- Manual/browser/audio evidence: not required for this pure core packet. The
  current web app remains unchanged; the first generator UI cutover is MG-09.
- Blockers or risks: none. Low sample rates and maximum Encounter truncation
  produce deterministic diagnostics. The dependency exception remains until
  MG-02, MG-03, and MG-05 are integrated.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-06 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: commit MG-06, rerun all gates against the exact commit,
  then move it to `in_review`, add the SHA to the Validation ledger, and push
  the branch.

### 2026-08-05 MG-07 author handoff

- Packet: MG-07 — Parts and canonical performance compiler
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T18:11:29Z / 2026-08-05T18:20:40Z
- Commits: none
- Edited files: `src/core/parts.ts`, `src/core/parts.test.ts`,
  `src/core/performance.ts`, `src/core/performance.test.ts`,
  `src/core/rhythm.ts`, `src/core/rhythm.test.ts`, `src/core/scales.ts`,
  `src/core/scales.test.ts`, and this tracker. `graphify update .` also
  refreshed tracked generated files.
- Acceptance criteria complete: two Parts can map one Encounter to distinct
  Instruments and pitches; a non-matching Part leaves the shared Encounter and
  existing event identities unchanged; quantization uses absolute Transport
  beats in mid-performance windows; repeated compilation is deep-equal; and
  adding an unrelated Part does not alter existing event IDs or values.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 50 targeted Part/performance/rhythm/scale
  tests pass; `npm test` passed 32 test files and 298 tests; `npm run lint`
  passed; `npm run build` passed; `graphify update .` completed after the final
  code change.
- Manual/browser/audio evidence: not required for this pure core packet. The
  current web app remains unchanged; the first generator UI cutover is MG-09.
- Blockers or risks: none. Control Parts produce an explicit deferred warning
  until MG-14; rest and probability remain deterministic placeholders
  (`false` and `1`) until later performance variation packets.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-07 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: commit MG-07, rerun all gates against the exact commit,
  then move it to `in_review`, add the SHA to the Validation ledger, and push
  the branch.

### 2026-08-05 MG-08 author handoff

- Packet: MG-08 — Native instrument engine and live scheduler
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T18:23:26Z / 2026-08-05T18:36:04Z
- Commits: none
- Edited files: `src/audio/instrumentEngine.ts`,
  `src/audio/nativeSynthEngine.ts`, `src/audio/nativeSynthEngine.test.ts`,
  `src/audio/performanceScheduler.ts`,
  `src/audio/performanceScheduler.test.ts`, `src/audio/drumSynth.ts`,
  `src/audio/toneSynth.ts`, and this tracker. `graphify update .` also
  refreshed tracked generated files.
- Acceptance criteria complete: the scheduler submits the compiler's exact
  performed-event objects and durations in stable order; delayed timer calls
  preserve their requested absolute audio timestamps; pause, seek, stop,
  panic, and disposal cancel scheduled or active voices; looping uses exact
  request-duration recurrence; edits hand over at the next beat or an explicit
  future absolute beat; and concurrent Parts route through their selected
  native synth or drum Instrument without a global waveform.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: 11 targeted scheduler/native-engine tests
  pass; `npm test` passed 34 test files and 309 tests; `npm run lint` passed;
  `npm run build` passed; `graphify update .` completed after the final code
  change; and a source scan confirms `src/core/` contains no Web Audio types.
- Manual/browser/audio evidence: MG-08 adds the tested audio runtime but no
  route or controls; browser-visible and interactive audio integration remains
  MG-09, the roadmap's first user-visible milestone.
- Blockers or risks: none. SoundFont Instruments fail explicitly in this native
  backend until MG-10 selects the browser engine and MG-11 adds routing.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-08 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: commit MG-08, rerun all gates against the exact commit,
  then move it to `in_review`, add the SHA to the Validation ledger, and push
  the branch.

### 2026-08-05 MG-09 author handoff

- Packet: MG-09 — First playable generator and clean model cutover
- State: `in_progress`; implementation and author validation are complete, but
  the packet does not yet have an exact commit for `in_review` evidence.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T18:39:36Z / 2026-08-05T19:02:08Z
- Commits: none
- Edited files: the running `src/App.tsx` and `src/App.css` surface; Wheel,
  Head, Part, Instrument, Transport, import/export, and Composition canvas UI;
  the playable default Composition; canonical JSON, MIDI, Strudel, and SVG
  adapters and their agreement tests; narrowed shared geometry/rhythm/audio
  helpers; retired model, preview, renderer, exporter, audio, and UI files;
  acceptance fixtures; the build plan's explicit transitive cutover scope; and
  this tracker. `graphify update .` refreshed tracked generated files.
- Acceptance criteria complete: Wheel rate changes both rendered Head position
  and encounter/event timing at fixed tempo; tempo rescales seconds without
  changing spatial Encounter order; Ring edits change Ring-observing Parts but
  not Spoke-observing Parts; v1 JSON reload reproduces the same scene and
  compiled performance; and a production-source scan finds no import of the
  retired Voice, CurveEvent, or SpirophonicModel architecture.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: the focused MG-09 suite passed 6 files and
  17 tests; `npm test` passed 25 test files and 179 tests; `npm run lint`
  passed; `npm run build` passed; `git diff --check` passed; and
  `graphify update .` completed after the final code change.
- Manual/browser/audio evidence: Vite served the application at
  `http://127.0.0.1:5174/`; the `~/.hermes` `agent-browser` accessibility
  snapshot exposed all v1 editor controls; a Wheel cycle edit changed the
  compiled performance from 13 to 17 events; Play advanced Transport to
  `1.25s · 17 events`; the corrected 1600x1000 desktop capture is
  `/tmp/spirophonic-mg09-hermes.png`; and the browser reported no page errors.
- Blockers or risks: none. SoundFont Instruments remain explicitly deferred to
  MG-10/MG-11; MG-09 intentionally provides the native synth/drum path first.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-09 claim; only packet files, coordination metadata, and generated Graphify
  output changed.
- Next exact action: commit MG-09, rerun all gates against the exact commit,
  then move it to `in_review`, add the SHA to the Validation ledger, and push
  the branch.

### 2026-08-05 MG-10 author handoff

- Packet: MG-10 — Sound bank vault and SoundFont engine decision
- State: `in_review`; implementation and exact-commit author validation are
  complete; integration review remains.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T19:07:49Z / 2026-08-05T19:34:43Z
- Commits: `992a97e` — feat: deliver MG-10 SoundFont foundation
- Edited files: the digest-keyed IndexedDB vault and tests; SpessaSynth probe,
  worklet adapter, and tests; the Composition SoundBank aliases; pinned npm
  packages and automated worklet copy script; `.gitignore`; ADR 0001; packet
  file-list refinements in the build plan; this tracker; and refreshed tracked
  Graphify output.
- Acceptance criteria complete: duplicate bank imports reuse one SHA-256 vault
  record; reload, relink, retrieval, metadata-only listing, and deletion are
  safe; Composition JSON contains references but no sample bytes; capacity,
  missing-storage, digest, corrupt-record, and quota failures are explicit;
  and a package-matched, CDN-free SpessaSynth worklet loads SF2/SF3, enumerates
  presets, schedules two overlapping pitched presets plus drums, reports
  missing/corrupt banks, and disposes cleanly in Chromium and Firefox.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: the focused vault/probe suite passed 2
  files and 11 tests; `npm test` passed 27 files and 190 tests; `npm run lint`,
  `npm run build`, `npm audit`, and `git diff --check` passed; the build copied
  a 397,904-byte worklet with SHA-256
  `4a6e2bf7ca16a510841f467f4563dcf9155c328ff6eef808a508def280de709e`;
  and `graphify update .` rebuilt 1,067 nodes and 2,067 edges.
- Manual/browser/audio evidence: using only the `~/.hermes` browser stack,
  Chromium 147.0.7727.15 and Firefox 148.0.2 each loaded the temporary local
  32,319,396-byte SF2 bank
  (`9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe`)
  and 8,423,728-byte SF3 bank
  (`e2ed326ff44d15f78f2fdc72403b6fa6b77ee7266d3aad0d2198bc95797bc66c`),
  found 287 presets, scheduled Grand Piano, Piano & Str.-Fade, and Standard 1
  Kit concurrently with a 150 ms lead, rejected missing/corrupt inputs, and
  reported no page errors. ADR 0001 records per-browser timings and the bank's
  separate GeneralUser GS licensing status; neither test bank is committed.
- Blockers or risks: none. Safari, process-level memory measurement, malformed
  inner SoundFont structures, human listening, and device latency remain
  explicitly assigned to later integration/release work.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-10 claim; only packet files, coordination metadata, package resolution,
  and generated Graphify output changed.
- Next exact action: review and integrate `992a97e`, rerun the full gates on
  the integrated commit, then mark MG-10 `done` and re-evaluate MG-11.

### 2026-08-05 MG-11 author handoff

- Packet: MG-11 — SoundFont playback and instrument browser
- State: `in_review`; implementation and exact-commit author validation are
  complete; integration review remains.
- Agent: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC:
  2026-08-05T19:45:18Z / 2026-08-05T20:14:04Z
- Commits: `7685bb6` — feat: deliver MG-11 SoundFont instruments
- Edited files: SoundFont engine/router and tests; SoundBank and Instrument
  panels and tests; Composition SoundFont preset name and validation; App
  runtime, reload persistence, Strict Mode-safe disposal, tests, and styling;
  the vault's real-browser transaction ordering; explicit build-plan scope;
  this tracker; and refreshed tracked Graphify output.
- Acceptance criteria complete: SF2/SF3 banks import locally and expose
  provenance, licensing, search, 287-preset browsing, audition, assignment,
  relink, and byte removal; two Parts using different presets share one bank
  concurrently; bank/program/drum, velocity, duration, gain, pan, reverb, and
  chorus reach the backend; missing/unsupported/failed routes are visible and
  isolated while ready/native routes continue; page reload restores references
  and presets from local storage; and explicit native synth/drum fallbacks
  remain available without any SoundFont.
- Acceptance criteria remaining: none at working-tree level.
- Validation run and exact results: the focused engine/router/panel/App/
  validation lane passed 7 files and 40 tests; `npm test` passed 31 files and
  204 tests; `npm run lint`, `npm run build`, and `git diff --check` passed;
  and `graphify update .` rebuilt 1,199 nodes and 2,353 edges. Build reproduces
  the pinned 397,904-byte AudioWorklet SHA-256 from MG-10.
- Manual/browser/audio evidence: the `~/.hermes` Chromium session imported and
  restored GeneralUserGS.sf3 (8,423,728 bytes,
  `e2ed326ff44d15f78f2fdc72403b6fa6b77ee7266d3aad0d2198bc95797bc66c`)
  and GeneralUser-GS.sf2 (32,319,396 bytes,
  `9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe`),
  enumerating 287 presets for each. It filtered/auditioned C4 on Piano &
  Str.-Fade, assigned it, restored the assignment after reload, then played it
  with Fast Strings as two SoundFont Instruments/Parts: Transport reached
  1.07s with 26 events and no page errors. Removing local bytes showed the
  digest-specific relink alert while Transport reached 1.95s; relinking the
  exact SF3 restored ready state. Captures:
  `/tmp/spirophonic-mg11-hermes.png`,
  `/tmp/spirophonic-mg11-bank-browser-hermes.png`, and
  `/tmp/spirophonic-mg11-banks-hermes.png`. Banks remain local and uncommitted.
- Blockers or risks: none. The 522.69 kB minified app chunk now crosses Vite's
  500 kB advisory threshold; MG-21 should evaluate lazy-loading the SoundFont
  adapter. Headless Web Audio logged device-renderer warnings but the page and
  worklet reported no final errors.
- Unrelated user/agent changes preserved: the worktree was clean before the
  MG-11 claim; only packet files, explicitly documented integration scope, and
  generated Graphify output changed.
- Next exact action: review and integrate `7685bb6`, rerun the full gates on
  the integrated commit, then mark MG-11 `done` and re-evaluate MG-12.

### 2026-08-05 MG-01–MG-11 cumulative review

- Packets: MG-01 through MG-11, reviewed together as the stacked branch series
  rather than packet by packet, at the user's direction.
- State: all eleven are `done`. MG-12 is `ready`.
- Reviewer: Claude Opus 5
- Branch: `agent/music-generator-planning`
- Reviewed range: `main..13ba9f5` — 106 files, about 13,000 lines of new source
  outside tests and generated Graphify output.

**Verified by direct probe, not by reading alone:**

- Repeated `compilePerformance` on the default Composition is deep-equal across
  both `encounters` and `performedEvents`.
- Crossing refinement is sample-rate invariant: 120 Hz and 480 Hz request grids
  agree on every encounter time to within 1e-6 s.
- A 4 s window compiled whole and compiled as two 2 s halves yields the same
  encounter count with no duplicate IDs at the seam, so rolling-window
  compilation does not double-fire boundary crossings.
- `NativeSynthEngine.cancelScheduledFrom(t)` cancels only voices starting at or
  after `t`.
- `SoundBankStore` issues its IndexedDB object-store requests synchronously
  inside the transaction before awaiting, so the MG-11 ordering fix is real.

**Defects found, fixed, and covered by regression tests:**

1. `SoundFontEngine.cancelScheduledFrom` accepted no argument and called
   `stopAll(true)` on every bank, violating the `InstrumentEngine` contract
   declared in MG-08. TypeScript did not catch it because a shorter parameter
   list stays assignable. `PerformanceScheduler.applyPendingIfDue` passes a
   future boundary time, so any live edit during SoundFont playback cut every
   ringing note up to `lookaheadSeconds` (250 ms) early, while the native
   backend behaved correctly. It now releases only voices starting at or after
   the cut, and never places a release before its own note-on, which would
   leave a queued note-on unmatched and the voice stuck open.
2. `SoundFontEngine.prepare` cleared `this.routes` before its first `await`, so
   every SoundFont Instrument reported not-ready for the duration of the
   reload and `InstrumentRouter.schedule` silently dropped those events with no
   diagnostic — contrary to MG-11's criterion that failed routes stay visible
   and isolated. `App.tsx` runs exactly this `prepare` on every Composition edit
   during playback. Routes are now built into a local map and swapped in at the
   end, so an already-playing route survives an added or reloading bank.

Both regression tests were confirmed to fail against `13ba9f5` before the fix:
the cancel test saw no targeted note-off, and the route test saw
`[false, false]` where the fix produces `[true, true]`.

**Accepted as out of scope, recorded rather than fixed:**

- In-flight bank loads that resolve after `dispose()` repopulate `banks` and
  `bankStatuses`, leaking an undestroyed synthesizer. Narrow teardown-only path.
- `buildPerformanceMidiTracks` collides Parts beyond 15 melodic channels onto
  shared channels and omits SoundFont bank MSB/LSB. MG-19 owns the exporter
  rebuild.
- Contour pitch normalizes across the compiled window, so the same Encounter
  can map to a different pitch in a different window. Deterministic per window;
  MG-16 owns tuning.
- The 522.69 kB minified chunk still crosses Vite's 500 kB advisory. MG-21 owns
  lazy-loading the SoundFont adapter.

- Next exact action: claim MG-12 and build concurrent multi-Wheel/multi-Head
  authoring on the now-integrated foundation.

### 2026-08-05 MG-12 author handoff

- Packet: MG-12 — Concurrent multi-Wheel/multi-Head authoring
- State: `in_review`; implementation and automated validation are complete.
- Agent: Claude Opus 5
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Started/last updated UTC: 2026-08-05T20:38:08Z / 2026-08-05T22:10:11Z
- Commits: `b00847a`
- Edited files: `src/core/composition.ts` (Part `mute`/`solo`),
  `src/core/compositionValidation.ts`, `src/core/compositionEdits.ts` (new),
  `src/core/defaultComposition.ts` (reference Composition),
  `src/core/performance.ts` (`audiblePartIds`), `src/ui/CompositionTree.tsx`
  (new), `src/ui/WheelPanel.tsx`, `src/ui/HeadPanel.tsx`,
  `src/ui/ImportExportPanel.tsx`, `src/App.tsx`, `src/App.css`, their tests,
  and refreshed Graphify output.

**Acceptance criteria complete:**

- *All Heads on a Wheel respond to its rate/phase edit; Heads on other Wheels do
  not.* Proven positionally in `compositionEdits.test.ts` by sampling
  `headStateAt` before and after a rate edit across two Wheels.
- *Removing a referenced object is blocked or requires an explicit cascade whose
  full impact is shown before mutation.* `removalImpact` returns cascade
  removals, reference rewrites, and blockers without mutating; `removeWheel`,
  `removeHead`, and `removePart` throw unless `cascade: true`. The tree renders
  the report in an `alertdialog` and only commits on confirm. Last Wheel, last
  Head on a Wheel, and a Part-bound Instrument are all blocked outright.
- *Solo/mute does not rewrite geometry or lose Part configuration.* `mute` and
  `solo` are separate from `enabled`; `compilePerformance` filters through
  `audiblePartIds` and leaves Encounters byte-identical. Tests assert the muted
  Part object is unchanged apart from the one flag.
- *Concurrent event ordering is deterministic when several Encounters share a
  timestamp.* The reference Composition actually produces timestamp collisions,
  and the test asserts every collision group is in stable sorted order and that
  recompilation is deep-equal.
- *The reference Composition plays, seeks, loops, saves, and reloads correctly.*
  Four Wheels x three Heads, four Parts, four Instruments. Seeking mid-window
  reproduces the whole-window Encounter ids exactly; JSON round-trips without
  drift; App-level tests load it, remove a Wheel with cascade, and solo a Part.

**Acceptance criteria remaining:** none at the code level.

- Validation run and exact results: `npm test` 34 files / 243 tests, `npm run
  lint`, `npm run build`, and `git diff --check` all pass. `graphify update .`
  rebuilt 1,244 nodes / 2,512 edges.
- Manual/browser/audio evidence: **not run.** No browser automation is reachable
  from this session — Playwright is not a project dependency and the Hermes
  install carries only its own Firefox build. Adding a browser dependency for a
  validation step was out of scope for the packet. The reference Composition's
  twelve concurrent Traces and four simultaneous Instruments still deserve a
  real-browser look before MG-12 goes `done`.
- Blockers or risks: compiling the reference Composition takes roughly 80 ms at
  120 Hz and 170 ms at 480 Hz for an 8 s window (850 Encounters, 161 events).
  `App.tsx` runs `compilePerformance` synchronously in a `useMemo`, so at this
  scale every edit blocks the render thread for about a tenth of a second. A
  checked-in deterministic benchmark now guards the Encounter and event counts.
  Moving compilation off the render thread belongs to MG-21, which owns
  performance budgets and scalability hardening. The bundle also grew to
  541.69 kB, further past Vite's 500 kB advisory.
- Unrelated user/agent changes preserved: the worktree was clean at claim time;
  only packet files, the explicit build-plan scope amendment, and generated
  Graphify output changed.
- Next exact action: run the reference Composition in a browser to confirm
  concurrent rendering and audio, record the evidence in the Validation ledger,
  then mark MG-12 `done` and promote MG-13, MG-14, and MG-15 to `ready`.

Append detailed handoffs here under a dated packet/agent heading and add a
one-line summary to the Activity log. Do not overwrite an earlier handoff; a
later agent should append a takeover or superseding handoff.

## Handoff template

Copy this block into Handoff records and, when applicable, the packet PR when
an agent stops before integration:

```text
Packet:
State:
Agent:
Branch:
Cwd/worktree:
Started/last updated UTC:
Commits:
Edited files:
Acceptance criteria complete:
Acceptance criteria remaining:
Validation run and exact results:
Manual/browser/audio evidence:
Blockers or risks:
Unrelated user/agent changes preserved:
Next exact action:
```

The next agent must be able to resume from the handoff without inferring the
branch, checkout, edited files, or remaining milestone.

## Packet completion checklist

Before moving a packet to `in_review`:

- [ ] Work stays within the packet's current file list, or the build plan was
      updated explicitly.
- [ ] New core behavior has deterministic tests.
- [ ] Acceptance criteria are checked individually with evidence.
- [ ] `npm test` passes at the recorded commit.
- [ ] `npm run lint` passes at the recorded commit.
- [ ] `npm run build` passes at the recorded commit.
- [ ] `graphify update .` ran after code changes.
- [ ] Required browser/audio/manual checks are recorded.
- [ ] `git diff --check` passes.
- [ ] Unrelated user and agent changes remain untouched.
- [ ] Current packet record and Activity log contain a complete handoff.

Before moving a packet to `done`:

- [ ] Review feedback and integration conflicts are resolved.
- [ ] The integrated commit passes all gates.
- [ ] The Validation ledger names the integrated SHA and reviewer.
- [ ] This ledger marks the packet `done` and clears its owner.
- [ ] The build plan Progress table marks the packet `done` in the same commit.
- [ ] Newly unblocked direct dependents are promoted to `ready`.
- [ ] Active claim is moved to the Activity log.
- [ ] Milestone rollup and Current snapshot are refreshed.
