# Spirophonic Music Generator Progress Tracker

Status: **active**

Initialized: **2026-08-05**

This document coordinates implementation of the
[Music Generator Build Plan](MUSIC-GENERATOR-BUILD-PLAN.md) across coding
sessions and agents. It records live ownership, readiness, blockers, validation,
commits, and handoffs. The build plan remains authoritative for packet scope,
dependencies, file lists, architectural invariants, and acceptance criteria.

## Current snapshot

| Measure | Current value |
| --- | --- |
| Packets complete | 0 / 21 |
| Packets active | 10 |
| Packets blocked | 0 |
| Next ready packet | MG-10 author validation complete; MG-01–MG-10 integration remains pending |
| Active agents | Codex/root on MG-01 through MG-10 |
| Integration branch | `main` |
| Last tracker update | 2026-08-05 |

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

| Agent | Packet | State | Branch | Cwd/worktree | Started UTC | Heartbeat UTC | Overlap or coordination note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Codex/root | MG-01 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T16:52:55Z | 2026-08-05T17:22:14Z | Implementation commit `1aaaa07`; integration review remains. |
| Codex/root | MG-02 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T17:12:04Z | 2026-08-05T17:23:12Z | Implementation commit `0afa4e3`; integration review remains. |
| Codex/root | MG-03 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T17:23:58Z | 2026-08-05T17:31:47Z | Implementation commit `a454b7c`; integration review remains. |
| Codex/root | MG-04 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T17:36:24Z | 2026-08-05T17:42:34Z | Implementation commit `6960442`; integration review remains. |
| Codex/root | MG-05 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T17:53:05Z | 2026-08-05T17:56:09Z | Implementation commit `68631b5`; integration review remains. |
| Codex/root | MG-06 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T17:59:01Z | 2026-08-05T18:09:08Z | Implementation commit `7baa1a7`; integration review remains. |
| Codex/root | MG-07 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T18:11:29Z | 2026-08-05T18:21:38Z | Implementation commit `842acb7`; integration review remains. |
| Codex/root | MG-08 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T18:23:26Z | 2026-08-05T18:37:10Z | Implementation commit `7f2d487`; integration review remains. |
| Codex/root | MG-09 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T18:39:36Z | 2026-08-05T19:03:51Z | Implementation commit `ff6af91`; exact-commit gates and Hermes browser playback pass; integration review remains. |
| Codex/root | MG-10 | `in_review` | `agent/music-generator-planning` | `/home/mrose/spirophonic` | 2026-08-05T19:07:49Z | 2026-08-05T19:34:43Z | Implementation commit `992a97e`; exact-commit gates and Chromium/Firefox SoundFont probes pass; integration review remains. |

Move completed or abandoned claims to the Activity log rather than erasing
their history.

## Packet ledger

| Packet | Title | Depends on | State | Owner | Last update | Evidence or next action |
| --- | --- | --- | --- | --- | --- | --- |
| MG-01 | Composition schema and validation | — | `in_review` | Codex/root | 2026-08-05 | Implementation commit `1aaaa07` is validated; integration review remains. |
| MG-02 | Deterministic Transport and performance window | MG-01 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `0afa4e3` is validated; integration review remains. |
| MG-03 | Wheel and multi-Head state engine | MG-01, MG-02 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `a454b7c` is validated; integration review remains. |
| MG-04 | Space projection and composition renderer | MG-03 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `6960442` is validated; integration review remains. |
| MG-05 | Ring and spoke Fields | MG-01, MG-03, MG-04 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `68631b5` is validated; integration review remains. |
| MG-06 | Boundary-crossing Encounter engine | MG-02, MG-03, MG-05 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `7baa1a7` is validated; integration review remains. |
| MG-07 | Parts and canonical performance compiler | MG-01, MG-02, MG-06 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `842acb7` is validated; integration review remains. |
| MG-08 | Native instrument engine and live scheduler | MG-02, MG-07 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `7f2d487` is validated; integration review remains. |
| MG-09 | First playable generator and clean model cutover | MG-01–MG-08 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `ff6af91` is validated; integration review remains. |
| MG-10 | Sound bank vault and SoundFont engine decision | MG-01, MG-08 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `992a97e` is validated; integration review remains. |
| MG-11 | SoundFont playback and instrument browser | MG-07, MG-08, MG-10 | `waiting` | — | 2026-08-05 | Complete MG-07, MG-08, and MG-10. |
| MG-12 | Concurrent multi-Wheel/multi-Head authoring | MG-09, MG-11 | `waiting` | — | 2026-08-05 | Complete MG-09 and MG-11. |
| MG-13 | Ellipse, band, grid, spiral, and moving Fields | MG-05, MG-06, MG-12 | `waiting` | — | 2026-08-05 | Complete MG-05, MG-06, and MG-12. |
| MG-14 | Head-to-Head relations and continuous controls | MG-06, MG-07, MG-12 | `waiting` | — | 2026-08-05 | Complete MG-06, MG-07, and MG-12. |
| MG-15 | Trace encounters and retained trace state | MG-04, MG-06, MG-12 | `waiting` | — | 2026-08-05 | Complete MG-04, MG-06, and MG-12. |
| MG-16 | Relationship tuning, melody, and harmony | MG-07, MG-11, MG-14 | `waiting` | — | 2026-08-05 | Complete MG-07, MG-11, and MG-14. |
| MG-17 | Seeded variation | MG-03, MG-06, MG-07, MG-16 | `waiting` | — | 2026-08-05 | Complete MG-03, MG-06, MG-07, and MG-16. |
| MG-18 | Recorder, replay, and reinterpretation | MG-07, MG-17 | `waiting` | — | 2026-08-05 | Complete MG-07 and MG-17. |
| MG-19 | MIDI and Strudel exporter rebuild | MG-16, MG-18 | `waiting` | — | 2026-08-05 | Complete MG-16 and MG-18. |
| MG-20 | Offline audio and portable project bundles | MG-10, MG-11, MG-18, MG-19 | `waiting` | — | 2026-08-05 | Complete MG-10, MG-11, MG-18, and MG-19. |
| MG-21 | Scalability hardening, example works, and release | MG-12–MG-20 | `waiting` | — | 2026-08-05 | Complete every implementation packet. |

When a packet becomes `done`, evaluate every direct dependent immediately and
promote it from `waiting` to `ready` if all dependencies are complete.

## Milestone rollup

| Milestone | Packets | Exit condition | Progress |
| --- | --- | --- | --- |
| Foundation engine | MG-01–MG-08 | Canonical performance can be compiled and scheduled through the native engine. | 0 / 8 |
| First playable generator | MG-09 | New editor replaces the old model without losing basic JSON/MIDI/Strudel/SVG capabilities. | Awaiting integration |
| SoundFont instruments | MG-10–MG-11 | Local banks, presets, concurrent playback, and explicit missing-bank handling work. | 0 / 2 |
| Concurrent composition | MG-12 | Several Wheels with several Heads play, render, seek, loop, save, and reload together. | Waiting |
| Relational composition depth | MG-13–MG-18 | Advanced Fields, relations, Trace encounters, tuning, variation, and Recording work. | 0 / 6 |
| Portable outputs | MG-19–MG-20 | MIDI, Strudel, audio render, and bundles consume canonical events/Recordings. | 0 / 2 |
| Release | MG-21 | Reference works, performance budgets, browser checks, and full workflow pass. | Waiting |

## Validation ledger

Add one row when a packet enters `in_review`. Link or name manual evidence in
the final column rather than relying on a statement that it was checked.

| Packet | Commit | `npm test` | `npm run lint` | `npm run build` | Graphify | Manual/browser evidence | Reviewer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MG-01 | `1aaaa07` | 20 files, 194 tests pass | pass | pass | refreshed after code | Not required for schema packet | Pending |
| MG-02 | `0afa4e3` | 21 files, 217 tests pass | pass | pass | refreshed after code | Not required for pure time-core packet | Pending |
| MG-03 | `a454b7c` | 24 files, 237 tests pass | pass | pass | refreshed after code | Not required for pure state-core packet | Pending |
| MG-04 | `6960442` | 26 files, 249 tests pass | pass | pass | refreshed after code | Command/component tests; no route before MG-09 | Pending |
| MG-05 | `68631b5` | 28 files, 267 tests pass | pass | pass | refreshed after code | Geometry, command, and component tests; no route before MG-09 | Pending |
| MG-06 | `7baa1a7` | 30 files, 281 tests pass | pass | pass | refreshed after code | Deterministic core fixtures; no browser/audio surface | Pending |
| MG-07 | `842acb7` | 32 files, 298 tests pass | pass | pass | refreshed after code | Deterministic compiler fixtures; no browser/audio surface | Pending |
| MG-08 | `7f2d487` | 34 files, 309 tests pass | pass | pass | refreshed after code | Fake clock/engine and native routing tests; app integration is MG-09 | Pending |
| MG-09 | `ff6af91` | 25 files, 179 tests pass | pass | pass | refreshed after code | Hermes: Wheel cycles 1→2 changed 13→17 events; Play advanced to 1.25s; no page errors; 1600x1000 capture at `/tmp/spirophonic-mg09-hermes.png` | Pending |
| MG-10 | `992a97e` | 27 files, 190 tests pass | pass | pass; matched worklet SHA-256 | refreshed after code | Hermes Chromium 147 + Firefox 148: SF2/SF3, 287 presets, two pitched presets + drums overlap, missing/corrupt rejection, clean disposal; bank/worklet digests in ADR 0001 | Pending |

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

### MG-01 — Composition schema and validation

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-01 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-01--composition-schema-and-validation)
- Started UTC: 2026-08-05T16:52:55Z
- Last updated UTC: 2026-08-05T17:22:14Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-01 `done` before releasing dependent packets.
- Commits/PRs: `1aaaa07` — Implement MG-01 composition contract
- Blockers: none
- Validation evidence: working-tree validation passes: `npm test` (20 files,
  194 tests), `npm run lint`, and `npm run build`. `graphify update .` rebuilt
  the graph after the final code change.
- Handoff: [2026-08-05 MG-01 author handoff](#2026-08-05-mg-01-author-handoff)

### MG-02 — Deterministic Transport and performance window

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-02 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-02--deterministic-transport-and-performance-window)
- Started UTC: 2026-08-05T17:12:04Z
- Last updated UTC: 2026-08-05T17:23:12Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-02 `done` before releasing dependent packets.
- Commits/PRs: `0afa4e3` — Implement MG-02 deterministic transport
- Blockers: none
- Validation evidence: 23 targeted Transport tests pass. Working-tree
  validation passes: `npm test` (21 files, 217 tests), `npm run lint`, and
  `npm run build`. `graphify update .` rebuilt the graph after the final code
  change.
- Handoff: [2026-08-05 MG-02 author handoff](#2026-08-05-mg-02-author-handoff)
- Dependency exception: the user explicitly directed MG-02 to begin while the
  locally complete and validated MG-01 work remains uncommitted in this same
  worktree. MG-02 uses that exact local Composition contract and does not edit
  MG-01 implementation files.

### MG-03 — Wheel and multi-Head state engine

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-03 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-03--wheel-and-multi-head-state-engine)
- Started UTC: 2026-08-05T17:23:58Z
- Last updated UTC: 2026-08-05T17:31:47Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-03 `done` before releasing dependent packets.
- Commits/PRs: `a454b7c` — Implement MG-03 Wheel and Head state
- Blockers: none
- Validation evidence: 36 packet-relevant tests pass. Working-tree validation
  passes: `npm test` (24 files, 237 tests), `npm run lint`, and `npm run build`.
  `graphify update .` rebuilt the graph after the final code change and confirms
  the Head-to-Transport call path through pure Wheel state.
- Handoff: [2026-08-05 MG-03 author handoff](#2026-08-05-mg-03-author-handoff)
- Dependency exception: the user explicitly directed MG-03 to begin after the
  committed MG-01 and MG-02 packets, while those packets remain `in_review`
  rather than integrated. MG-03 uses their exact committed contracts.

### MG-04 — Space projection and composition renderer

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-04 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-04--space-projection-and-composition-renderer)
- Started UTC: 2026-08-05T17:36:24Z
- Last updated UTC: 2026-08-05T17:42:34Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-04 `done` before releasing dependent packets.
- Commits/PRs: `6960442` — Implement MG-04 composition renderer
- Blockers: none
- Validation evidence: 12 targeted renderer/UI tests pass. Working-tree
  validation passes: `npm test` (26 files, 249 tests), `npm run lint`, and
  `npm run build`. `graphify update .` rebuilt the graph after the final code
  change and confirms Canvas remains downstream of immutable scene creation.
- Handoff: [2026-08-05 MG-04 author handoff](#2026-08-05-mg-04-author-handoff)
- Dependency exception: the user explicitly directed MG-04 to begin after the
  committed MG-03 packet while its integration review remains pending. MG-04
  consumes the exact `a454b7c` state contract.

### MG-05 — Ring and spoke Fields

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-05 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-05--ring-and-spoke-fields)
- Started UTC: 2026-08-05T17:53:05Z
- Last updated UTC: 2026-08-05T17:56:09Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-05 `done` before releasing dependent packets.
- Commits/PRs: `68631b5` — Implement MG-05 ring and spoke fields
- Blockers: none
- Validation evidence: 27 targeted Field/core/renderer/UI tests pass. Exact
  implementation commit `68631b5` passes `npm test` (28 files, 267 tests),
  `npm run lint`, and `npm run build`. `graphify update .` rebuilt the graph
  after the final code change and confirms the FieldPanel-to-fields-to-renderer
  relationship.
- Handoff: [2026-08-05 MG-05 author handoff](#2026-08-05-mg-05-author-handoff)
- Dependency exception: the user explicitly directed MG-05 to begin after the
  committed MG-01, MG-03, and MG-04 packets while their integration review
  remains pending. MG-05 consumes those exact committed contracts.

### MG-06 — Boundary-crossing Encounter engine

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-06 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-06--boundary-crossing-encounter-engine)
- Started UTC: 2026-08-05T17:59:01Z
- Last updated UTC: 2026-08-05T18:09:08Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-06 `done` before releasing dependent packets.
- Commits/PRs: `7baa1a7` — Implement MG-06 boundary encounters
- Blockers: none
- Validation evidence: 14 targeted crossing/Encounter tests pass. Exact
  implementation commit `7baa1a7` passes `npm test` (30 files, 281 tests),
  `npm run lint`, and `npm run build`. `graphify update .` rebuilt the graph
  after the final code change and confirms Encounter compilation consumes Head
  state, shared signed-distance geometry, and Transport addressing.
- Handoff: [2026-08-05 MG-06 author handoff](#2026-08-05-mg-06-author-handoff)
- Dependency exception: the user explicitly directed MG-06 to begin after the
  committed MG-02, MG-03, and MG-05 packets while their integration review
  remains pending. MG-06 consumes those exact committed contracts.

### MG-07 — Parts and canonical performance compiler

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-07 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-07--parts-and-canonical-performance-compiler)
- Started UTC: 2026-08-05T18:11:29Z
- Last updated UTC: 2026-08-05T18:21:38Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-07 `done` before releasing dependent packets.
- Commits/PRs: `842acb7` — Implement MG-07 performance compiler
- Blockers: none
- Validation evidence: 50 targeted Part/performance/rhythm/scale tests pass.
  Exact implementation commit `842acb7` passes `npm test` (32 files, 298
  tests), `npm run lint`, and `npm run build`. `graphify update .` rebuilt the
  graph after the final code change and confirms the compiler consumes shared
  Encounters, Composition validation, beat quantization, and pitch mappings.
- Handoff: [2026-08-05 MG-07 author handoff](#2026-08-05-mg-07-author-handoff)
- Dependency exception: the user explicitly directed MG-07 to begin after the
  committed MG-01, MG-02, and MG-06 packets while their integration review
  remains pending. MG-07 consumes those exact committed contracts.

### MG-08 — Native instrument engine and live scheduler

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-08 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-08--native-instrument-engine-and-live-scheduler)
- Started UTC: 2026-08-05T18:23:26Z
- Last updated UTC: 2026-08-05T18:37:10Z
- Next action: integrate the reviewed packet, rerun gates on the integrated
  commit, and mark MG-08 `done` before releasing dependent packets.
- Commits/PRs: `7f2d487` — Implement MG-08 native audio scheduler
- Blockers: none
- Validation evidence: 11 targeted scheduler/native-engine tests pass. Exact
  implementation commit `7f2d487` passes `npm test` (34 files, 309 tests),
  `npm run lint`, and `npm run build`. `graphify update .` rebuilt the graph
  after the final code change and confirms the canonical performance-to-audio
  adapter boundary.
- Handoff: [2026-08-05 MG-08 author handoff](#2026-08-05-mg-08-author-handoff)
- Dependency exception: the user explicitly directed MG-08 to begin after the
  committed MG-02 and MG-07 packets while their integration review remains
  pending. MG-08 consumes those exact committed contracts.

### MG-09 — First playable generator and clean model cutover

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-09 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-09--first-playable-generator-and-clean-model-cutover)
- Started UTC: 2026-08-05T18:39:36Z
- Last updated UTC: 2026-08-05T19:03:51Z
- Next action: review and integrate commit `ff6af91`, rerun the gates on the
  integrated commit, then mark MG-09 `done` with its dependencies.
- Commits/PRs: `ff6af91`
- Blockers: none
- Validation evidence: exact commit `ff6af91` passes 25 test files and 179
  tests, lint, and build; Graphify is refreshed; Hermes browser playback
  advances the Transport from a compiled 17-event performance after a
  Wheel-rate edit with no page errors.
- Handoff: [2026-08-05 MG-09 author handoff](#2026-08-05-mg-09-author-handoff)
- Dependency exception: the user explicitly directed MG-09 to begin after the
  committed MG-01–MG-08 packets while their integration review remains
  pending. MG-09 consumes those exact committed contracts and owns the
  roadmap's declared legacy-removal files.

### MG-10 — Sound bank vault and SoundFont engine decision

- State: `in_review`
- Owner: Codex/root
- Branch: `agent/music-generator-planning`
- Cwd/worktree: `/home/mrose/spirophonic`
- Contract: [MG-10 acceptance criteria](MUSIC-GENERATOR-BUILD-PLAN.md#mg-10--sound-bank-vault-and-soundfont-engine-decision)
- Started UTC: 2026-08-05T19:07:49Z
- Last updated UTC: 2026-08-05T19:34:43Z
- Next action: review and integrate commit `992a97e`, rerun the gates on the
  integrated commit, then mark MG-10 `done` with its dependencies.
- Commits/PRs: `992a97e`
- Blockers: none
- Validation evidence: exact commit `992a97e` passes the full 27-file/190-test
  suite, lint, and build; audit, diff check, and Graphify refresh also pass. The
  build
  reproduced the pinned 397,904-byte AudioWorklet with SHA-256
  `4a6e2bf7ca16a510841f467f4563dcf9155c328ff6eef808a508def280de709e`.
  Hermes Chromium 147 and Firefox 148 probes loaded both SF2 and SF3 banks,
  enumerated 287 presets, routed overlapping pitched presets plus drums, failed
  missing/corrupt banks visibly, and disposed cleanly.
- Handoff: [2026-08-05 MG-10 author handoff](#2026-08-05-mg-10-author-handoff)
- Dependency exception: the user explicitly directed MG-10 to begin after the
  committed MG-01 and MG-08 packets while their integration review remains
  pending. MG-10 consumes those exact committed contracts.

This is the initial ready-packet record. Once work begins, keep one subsection
for every `claimed`, `in_progress`, `blocked`, or `in_review` packet. Move each
finished record into the Activity log, Validation ledger, and Handoff records.

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
| SoundFont browser API churn and worklet packaging | MG-10 | SpessaSynth 4.3.12/core 4.3.16 are pinned, their matched worklet is copied and hash-checked automatically, and the adapter remains replaceable. | Mitigated |
| Sound bank redistribution and attribution | MG-10, MG-20 | Start with user-local banks; record digest, provenance, and license before any bundled bank. | Open |
| Event growth with many Heads, Fields, and long windows | MG-12, MG-15, MG-21 | Reference compositions, spatial indexing, request limits, and checked-in benchmarks. | Open |
| Exact microtonal pitch in MIDI 1.0 | MG-16, MG-19 | Preserve exact internal frequency; use explicit pitch-bend allocation and fail visibly when capacity is exceeded. | Open |
| Multi-agent edits to shared files or tracker rows | All | Single packet owner, overlap check, frequent heartbeat, and explicit handoff. | Open |

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

New decisions receive the next ID, name the deciding user/reviewer, and link the
build-plan change or decision record that made them authoritative.

## Activity log

Append one concise row for claims, handoffs, blockers, reviews, integrations,
and releases. Do not log every edit.

| UTC time | Agent | Packet | Event | Branch/commit | Summary and next step |
| --- | --- | --- | --- | --- | --- |
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

## Handoff records

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
