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
| Packets active | 3 |
| Packets blocked | 0 |
| Next ready packet | MG-03 active by user direction; MG-01/MG-02 integration remains pending |
| Active agents | Codex/root on MG-01, MG-02, and MG-03 |
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

Move completed or abandoned claims to the Activity log rather than erasing
their history.

## Packet ledger

| Packet | Title | Depends on | State | Owner | Last update | Evidence or next action |
| --- | --- | --- | --- | --- | --- | --- |
| MG-01 | Composition schema and validation | — | `in_review` | Codex/root | 2026-08-05 | Implementation commit `1aaaa07` is validated; integration review remains. |
| MG-02 | Deterministic Transport and performance window | MG-01 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `0afa4e3` is validated; integration review remains. |
| MG-03 | Wheel and multi-Head state engine | MG-01, MG-02 | `in_review` | Codex/root | 2026-08-05 | Implementation commit `a454b7c` is validated; integration review remains. |
| MG-04 | Space projection and composition renderer | MG-03 | `waiting` | — | 2026-08-05 | Complete MG-03. |
| MG-05 | Ring and spoke Fields | MG-01, MG-03, MG-04 | `waiting` | — | 2026-08-05 | Complete MG-01, MG-03, and MG-04. |
| MG-06 | Boundary-crossing Encounter engine | MG-02, MG-03, MG-05 | `waiting` | — | 2026-08-05 | Complete MG-02, MG-03, and MG-05. |
| MG-07 | Parts and canonical performance compiler | MG-01, MG-02, MG-06 | `waiting` | — | 2026-08-05 | Complete MG-01, MG-02, and MG-06. |
| MG-08 | Native instrument engine and live scheduler | MG-02, MG-07 | `waiting` | — | 2026-08-05 | Complete MG-02 and MG-07. |
| MG-09 | First playable generator and clean model cutover | MG-01–MG-08 | `waiting` | — | 2026-08-05 | Complete the foundation packets. |
| MG-10 | Sound bank vault and SoundFont engine decision | MG-01, MG-08 | `waiting` | — | 2026-08-05 | Complete MG-01 and MG-08. |
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
| First playable generator | MG-09 | New editor replaces the old model without losing basic JSON/MIDI/Strudel/SVG capabilities. | Waiting |
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
| SoundFont browser API churn and worklet packaging | MG-10 | Pin and probe the selected backend before product integration; keep `InstrumentEngine` replaceable. | Open |
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
