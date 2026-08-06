# Graph Report - spirophonic  (2026-08-05)

## Corpus Check
- 124 files · ~108,111 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1492 nodes · 3159 edges · 77 communities (72 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3dfa540c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `Composition` - 65 edges
2. `Spirophonic Music Generator Build Plan` - 36 edges
3. `compilePerformance()` - 34 edges
4. `Spirophonic Domain Model` - 30 edges
5. `PerformanceScheduler` - 29 edges
6. `SoundFontEngine` - 27 edges
7. `validateComposition()` - 26 edges
8. `SoundBankStore` - 22 edges
9. `InstrumentSpec` - 21 edges
10. `InstrumentRouter` - 20 edges

## Surprising Connections (you probably didn't know these)
- `performanceRequestFor()` --calls--> `beatsToSeconds()`  [EXTRACTED]
  src/App.test.tsx → src/core/transport.ts
- `durationForCandidate()` --calls--> `secondsToBeats()`  [EXTRACTED]
  src/core/performance.ts → src/core/transport.ts
- `midiNoteFor()` --calls--> `frequencyToMidi()`  [EXTRACTED]
  src/export/midiExport.ts → src/core/scales.ts
- `performanceRequestFor()` --calls--> `beatsToSeconds()`  [EXTRACTED]
  src/App.tsx → src/core/transport.ts
- `App()` --calls--> `compilePerformance()`  [EXTRACTED]
  src/App.tsx → src/core/performance.ts

## Import Cycles
- None detected.

## Communities (77 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (8): Open threads not resolved here, The experiment, The gap, The observation, The reframe, Three more, in order of how much they would change, What is missing: ratio, tuning, and melodic line, Why the ratio is already the interval

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Conceptual Model, Core Thesis (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (42): addHead(), addWheel(), allCompositionIds(), clampIndex(), CompositionObjectKind, CompositionReference, duplicateHead(), duplicateWheel() (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (41): SpokeFieldSpec, TracePresentationSpec, downloadCompositionSvg(), escapeXml(), exportCompositionToSvg(), fileStem(), svgForCommand(), BoundaryLabelDrawCommand (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (42): dependencies, react, react-dom, spessasynth_lib, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (30): buildPerformanceMidi(), buildPerformanceMidiTracks(), downloadPerformanceMidi(), fileStem(), melodicChannel(), midiNoteFor(), nativeDrumMidiNotes, PerformanceMidiOptions (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (30): PartSpec, PerformanceDiagnostic, createRecording(), ProvenanceWarning, provenanceWarnings(), Recording, RecordingLimits, RecordingProvenance (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): Boundaries, Composing with curves, Current state, Docs, Project shape, Roadmap, Run the app, Spirophonic

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, Constraints, CP-001 - Scaffold Vite React TypeScript App, Goal, Required Files, Scope, Suggested Commands

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (4): Acceptance Criteria, CP-012 - README and Demo Polish for v0.1, Goal, Scope

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, CP-002 - Define Core Model Types, Goal, Scope, Suggested Files, Suggested Types

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, CP-003 - Implement Trochoid Trace Math Engine, Goal, Scope, Suggested Files, Suggested Output Type

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, Constraints, CP-008 - Add WebAudio Sound Preview, Goal, Scope, Suggested Files

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, CP-015 - Strudel Snippet Export, Example Output, Goal, Scope, Suggested Files

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-004 - Add Mapping Utilities, Goal, Scope, Suggested Files

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-005 - Implement Canvas Trace Renderer, Goal, Scope, Suggested Files

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-006 - Build Basic Control Panel, Goal, Scope, Suggested Files

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-007 - Add Animation Transport, Goal, Scope, Suggested Files

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-009 - Add Color Mapping, Goal, Scope, Suggested Files

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-010 - JSON Export and Import, Goal, Scope, Suggested Files

### Community 23 - "Community 23"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-013 - Add Presets, Goal, Scope, Suggested Files

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-014 - SVG Export, Goal, Scope, Suggested Files

### Community 25 - "Community 25"
Cohesion: 0.50
Nodes (3): Definition of Done for v0.1, First Implementation Slice, Important Design Warning

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, CP-011 - Testing Pass for v0.1, Execution Guidance for CP, Goal, Scope, Spirophonic POC Initial WBS and CP Packets, WBS Overview

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (5): VariationSpec, layers, request, VariationPanel(), VariationPanelProps

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (40): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria (+32 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (48): attachmentKinds, boundaryKeys, boundaryKindForFieldKind, CompositionValidationResult, encounterDirections, isComposition(), JsonObject, motionKinds (+40 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (21): FieldSpec, addBoundary(), addField(), allFieldIds(), BoundarySpec, nextBoundaryId(), nextFieldId(), nextStableId() (+13 more)

### Community 36 - "Community 36"
Cohesion: 0.06
Nodes (30): BandBoundarySpec, BoundaryBase, BoundarySpecUnion, DurationMapping, EllipseBoundarySpec, FieldBase, FieldMotionSpec, GridBoundarySpec (+22 more)

### Community 37 - "Community 37"
Cohesion: 0.05
Nodes (36): Architectural invariants, Canonical event layers, Decisions already made, Definition of the first meaningful generator, File-list audit, 2026-08-05, Meaning of Wheel, Head, shape, and Trace, MG-01 — Composition schema and validation, MG-02 — Deterministic Transport and performance window (+28 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (26): Boundary, Composition, Conceptual Structure, Core Idea, Crossing, Defining Statement, Determinism, Encounter (+18 more)

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (30): 2026-08-05 MG-01 author handoff, 2026-08-05 MG-01–MG-11 cumulative review, 2026-08-05 MG-02 author handoff, 2026-08-05 MG-03 author handoff, 2026-08-05 MG-04 author handoff, 2026-08-05 MG-05 author handoff, 2026-08-05 MG-06 author handoff, 2026-08-05 MG-07 author handoff (+22 more)

### Community 40 - "Community 40"
Cohesion: 0.20
Nodes (16): HeadAttachmentSpec, MotionSpec, harmonographPointAtTheta(), HarmonographPointParameters, lissajousPointAtTheta(), rosePointAtTheta(), superformulaPointAtTheta(), assertMatchingFamily() (+8 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (24): findHead(), headStateAt(), MappedPitch, selectPartEncounters(), validatePartMusicalRange(), audiblePartIds(), compareEvents(), compareText() (+16 more)

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (4): BoundaryCrossingEncounter, CompositionCanvas(), context, observation

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (13): compareEvents(), compareText(), EventOccurrence, indexInstruments(), PendingPerformance, PerformanceEditBoundary, PerformanceScheduler, PerformanceSchedulerOptions (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (24): PlaybackStatus, MeterSpec, CompositionValidationIssue, CompositionJsonErrorCode, CompositionJsonImportResult, downloadCompositionJson(), exportCompositionToJson(), fileStem() (+16 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (19): asciiAt(), browserHeapBytes(), MemoryPerformance, notesFor(), overlaps(), runSoundFontProbe(), selectProbePresets(), soundBankContainerKind() (+11 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (6): clamp(), SoundFontEngine, splitSoundFontBankNumber(), withTimeout(), SoundBankReference, SoundFontInstrumentSpec

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (9): Closure is not a bar, Encounter is not a note, Field is not musical meaning, Important Distinctions, Part is not Instrument, Recording is not merely export, Variation is not nondeterminism, Wheel is not necessarily closed (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (14): BandFieldSpec, EllipseFieldSpec, GridFieldSpec, SpiralFieldSpec, assertFinitePoint(), bandSignedDistance(), boundarySignedDistance(), ellipseSignedDistance() (+6 more)

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (7): Closure is optional, Determinism includes variation, Encounters produce events, Foundational Principles, Motion before trace, Relationship first, Time is independent of geometry

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (5): Continuous variation, Initial-condition variation, Interpretation variation, Performance variation, Variation

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (3): Recording, Reinterpretation, Replay

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (9): ControlPartSpec, EncounterDirection, RelationSpec, controlSources, directions, NumberFieldProps, PartPanel(), PartPanelProps (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (26): VariationLayerSpec, createSequence(), hashString(), indexValue(), mulberry32(), scopeKey(), signedUnitValue(), unitValue() (+18 more)

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (8): ADR 0001: Browser SoundFont engine, Decision, Failure behavior and known limits, Fallback plan, Licensing and redistribution checklist, Probe method, Results, Why this engine

### Community 56 - "Community 56"
Cohesion: 0.09
Nodes (7): soundFontBankNumber(), SoundFontSynthesizer, FakeContext, FakeSynth, instrument(), presets, RecordedCall

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (5): SoundFontRouteEngine, FakeEngine, FakeSoundFontEngine, native, SoundFontPreparation

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (5): destination, digest, expectedVersions, repositoryRoot, source

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (3): InstrumentEngine, InstrumentRouter, SoundFontPreset

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (9): InstrumentRoute, LoadedBank, SoundFontBankError, SoundFontBankStatus, SoundFontChannel, SoundFontEngineOptions, SoundFontIssue, SoundFontIssueCode (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.06
Nodes (57): CycleRate, TransportSpec, WheelSpec, BoundaryEncounterDirection, BoundaryEncounterPath, boundaryEncountersForPath(), boundaryNormal(), compareBoundaryEncounters() (+49 more)

### Community 62 - "Community 62"
Cohesion: 0.08
Nodes (28): Point2, TraceObservationSpec, compareText(), compareTraceEncounters(), encounterId(), freezePoint(), SegmentIntersection, crossingComposition() (+20 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (24): asResolver(), assertPathPoint(), BoundaryInput, BoundaryResolver, crossingLiesOnBoundary(), crossingRefinementDefaults, CrossingRefinementOptions, CrossingScanDiagnostic (+16 more)

### Community 64 - "Community 64"
Cohesion: 0.09
Nodes (22): RelationKind, HeadState, compareRelationEncounters(), compareText(), ControlLane, ControlLanePoint, controlSourceValue(), measureRelation() (+14 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (22): activeBoundaries(), ActiveBoundary, activeBoundaryGeometries(), activeBoundaryGeometriesAt(), assertMatchingBoundary(), BandBoundaryGeometry, BoundaryGeometry, boundaryGeometryAtPlacement() (+14 more)

### Community 66 - "Community 66"
Cohesion: 0.06
Nodes (32): asError(), cloneBytes(), isArrayBufferValue(), readBytes(), requestResult(), sha256Hex(), SoundBankImport, SoundBankImportResult (+24 more)

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (4): RingFieldSpec, FieldPanel(), withoutFields(), withRings()

### Community 68 - "Community 68"
Cohesion: 0.06
Nodes (61): EncounterQuery, NotePartSpec, RatioSourceSpec, ScaleName, SpaceSpec, TuningContextSpec, buildMelodicContour(), clamp() (+53 more)

### Community 69 - "Community 69"
Cohesion: 0.14
Nodes (8): Composition, CompositionVersion, HeadSpec, referenceHead(), referenceWheel(), traceColors, request, InstrumentPanel()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (4): motionKinds, NumberFieldProps, WheelPanel(), WheelPanelProps

### Community 74 - "Community 74"
Cohesion: 0.12
Nodes (7): emptyPreparation, InstrumentRouterOptions, SchedulerClock, FakeClock, FakeEngine, InstrumentSpec, NoteMusicalEvent

### Community 78 - "Community 78"
Cohesion: 0.06
Nodes (33): DrumShape, envelope(), fallback, nativeVoiceNotes, noiseBuffer(), playDrum(), playNativeDrum(), scheduledVoice() (+25 more)

### Community 85 - "Community 85"
Cohesion: 0.39
Nodes (7): QuantizeSpec, VelocityMapping, quantizedCandidates(), clampUnit(), clampVelocity(), mapStrengthToVelocity(), quantizeAbsoluteBeat()

## Knowledge Gaps
- **571 isolated node(s):** `pageErrors`, `name`, `private`, `version`, `type` (+566 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Composition` connect `Community 69` to `Community 2`, `Community 4`, `Community 7`, `Community 8`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 41`, `Community 42`, `Community 44`, `Community 48`, `Community 52`, `Community 54`, `Community 61`, `Community 62`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 71`, `Community 78`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `PerformanceScheduler` connect `Community 43` to `Community 74`, `Community 59`, `Community 44`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `InstrumentSpec` connect `Community 74` to `Community 36`, `Community 68`, `Community 7`, `Community 72`, `Community 43`, `Community 78`, `Community 57`, `Community 59`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `pageErrors`, `name`, `private` to the rest of the system?**
  _571 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1096938775510204 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._