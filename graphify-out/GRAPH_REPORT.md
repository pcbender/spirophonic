# Graph Report - spirophonic  (2026-08-06)

## Corpus Check
- 140 files · ~129,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1623 nodes · 3526 edges · 91 communities (84 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d62e004`
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
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `Composition` - 73 edges
2. `compilePerformance()` - 43 edges
3. `Spirophonic Music Generator Build Plan` - 36 edges
4. `PerformanceScheduler` - 32 edges
5. `SoundFontEngine` - 30 edges
6. `Spirophonic Domain Model` - 30 edges
7. `validateComposition()` - 29 edges
8. `SoundBankStore` - 27 edges
9. `InstrumentRouter` - 22 edges
10. `InstrumentSpec` - 22 edges

## Surprising Connections (you probably didn't know these)
- `performanceRequestFor()` --calls--> `beatsToSeconds()`  [EXTRACTED]
  src/App.test.tsx → src/core/transport.ts
- `issueAt()` --calls--> `validateComposition()`  [EXTRACTED]
  src/core/compositionValidation.test.ts → src/core/compositionValidation.ts
- `durationForCandidate()` --calls--> `secondsToBeats()`  [EXTRACTED]
  src/core/performance.ts → src/core/transport.ts
- `importProjectBundle()` --calls--> `record()`  [INFERRED]
  src/export/projectBundle.ts → src/core/replay.test.ts
- `performanceRequestFor()` --calls--> `beatsToSeconds()`  [EXTRACTED]
  src/App.tsx → src/core/transport.ts

## Import Cycles
- None detected.

## Communities (91 total, 7 thin omitted)

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
Cohesion: 0.15
Nodes (20): buildMidiFile(), buildNoteTrack(), buildTempoTrack(), chunk(), clampByte(), clampChannel(), encodeVariableLength(), event() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (30): PartSpec, PerformanceDiagnostic, createRecording(), ProvenanceWarning, provenanceWarnings(), Recording, RecordingLimits, RecordingProvenance (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): Boundaries, Docs, Project shape, Run the app, Sound banks, Spirophonic, The model, What it does

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

### Community 28 - "Community 28"
Cohesion: 0.40
Nodes (4): Current work, Gates, graphify, Verifying a guard

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (22): BoundaryEncounterDirection, BoundaryEncounterPath, boundaryEncountersForPath(), boundaryNormal(), compareBoundaryEncounters(), compareText(), compileBoundaryEncounters(), EncounterDiagnostic (+14 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (40): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria (+32 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (44): attachmentKinds, boundaryKeys, boundaryKindForFieldKind, CompositionValidationResult, encounterDirections, isComposition(), JsonObject, motionKinds (+36 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (22): BoundaryBase, FieldSpec, addBoundary(), addField(), allFieldIds(), BoundarySpec, nextBoundaryId(), nextFieldId() (+14 more)

### Community 36 - "Community 36"
Cohesion: 0.06
Nodes (31): BandBoundarySpec, DurationMapping, EllipseBoundarySpec, FieldBase, GridBoundarySpec, HarmonographHeadAttachment, HarmonographMotionSpec, HeadAttachmentSpec (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.05
Nodes (37): Architectural invariants, Canonical event layers, Decisions already made, Definition of the first meaningful generator, File-list audit, 2026-08-05, Meaning of Wheel, Head, shape, and Trace, MG-01 — Composition schema and validation, MG-02 — Deterministic Transport and performance window (+29 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (26): Boundary, Composition, Conceptual Structure, Core Idea, Crossing, Defining Statement, Determinism, Encounter (+18 more)

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (30): 2026-08-05 MG-01 author handoff, 2026-08-05 MG-01–MG-11 cumulative review, 2026-08-05 MG-02 author handoff, 2026-08-05 MG-03 author handoff, 2026-08-05 MG-04 author handoff, 2026-08-05 MG-05 author handoff, 2026-08-05 MG-06 author handoff, 2026-08-05 MG-07 author handoff (+22 more)

### Community 40 - "Community 40"
Cohesion: 0.26
Nodes (13): harmonographPointAtTheta(), HarmonographPointParameters, lissajousPointAtTheta(), rosePointAtTheta(), superformulaPointAtTheta(), assertMatchingFamily(), MotionEvaluation, motionPointAt() (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (17): eventSounds(), notePart(), ratioTuned(), request, tempered(), bendForSemitoneOffset(), buildPerformanceMidi(), buildPerformanceMidiTracks() (+9 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (24): sha256Hex(), BundleAsset, BundleAssetOutcome, BundleAssetStatus, bundleFileName(), BundleParseResult, CreateBundleOptions, CreateBundleResult (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.08
Nodes (18): compareEvents(), compareText(), EventOccurrence, indexInstruments(), PendingPerformance, PerformanceEditBoundary, PerformanceScheduler, PerformanceSchedulerOptions (+10 more)

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (13): PlaybackStatus, MeterSpec, App(), AudioRuntime, DiagnosticsProps, freshDefaultComposition(), performanceRequestFor(), restoredComposition() (+5 more)

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
Cohesion: 0.16
Nodes (16): BandFieldSpec, EllipseFieldSpec, GridFieldSpec, SpiralFieldSpec, assertFinitePoint(), bandSignedDistance(), boundarySignedDistance(), ellipseSignedDistance() (+8 more)

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
Cohesion: 0.11
Nodes (30): VariationLayerSpec, VariationSpec, createSequence(), hashString(), indexValue(), mulberry32(), scopeKey(), signedUnitValue() (+22 more)

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (8): ADR 0001: Browser SoundFont engine, Decision, Failure behavior and known limits, Fallback plan, Licensing and redistribution checklist, Probe method, Results, Why this engine

### Community 56 - "Community 56"
Cohesion: 0.09
Nodes (7): soundFontBankNumber(), SoundFontSynthesizer, FakeContext, FakeSynth, instrument(), presets, RecordedCall

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (5): SoundFontRouteEngine, FakeEngine, FakeSoundFontEngine, native, SoundFontPreparation

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (5): destination, digest, expectedVersions, repositoryRoot, source

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (19): audibleInstrumentIds(), comparePcm(), estimateRenderBytes(), OfflineContextFactory, OfflineRenderContext, OfflineRenderRequest, OfflineRenderResult, RenderCancelledError (+11 more)

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (9): InstrumentRoute, LoadedBank, SoundFontBankError, SoundFontBankStatus, SoundFontChannel, SoundFontEngineOptions, SoundFontIssue, SoundFontIssueCode (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.14
Nodes (31): CycleRate, TransportSpec, barPhaseAtBeat(), barsToBeats(), beatsToBars(), beatsToSeconds(), beatUnits, clampFinite() (+23 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (14): TraceObservationSpec, crossingComposition(), observation(), request, buildRetainedTrace(), freezePoint(), RetainedTrace, TraceDiagnostic (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (23): asResolver(), assertPathPoint(), BoundaryInput, BoundaryResolver, crossingLiesOnBoundary(), crossingRefinementDefaults, CrossingRefinementOptions, CrossingScanDiagnostic (+15 more)

### Community 64 - "Community 64"
Cohesion: 0.09
Nodes (22): RelationKind, HeadState, compareRelationEncounters(), compareText(), ControlLane, ControlLanePoint, controlSourceValue(), measureRelation() (+14 more)

### Community 65 - "Community 65"
Cohesion: 0.10
Nodes (23): BoundarySpecUnion, FieldMotionSpec, SpokeBoundarySpec, ActiveBoundary, assertMatchingBoundary(), BandBoundaryGeometry, BoundaryGeometry, boundaryGeometryAtPlacement() (+15 more)

### Community 66 - "Community 66"
Cohesion: 0.10
Nodes (14): SoundBankImport, StoredSoundBankMetadata, auditionNotes, BankCardProps, BankView, noteNames, SoundBankPanel(), SoundBankPanelProps (+6 more)

### Community 67 - "Community 67"
Cohesion: 0.20
Nodes (8): RingFieldSpec, issueAt(), motionCases, notePart, ringField, FieldPanel(), withoutFields(), withRings()

### Community 68 - "Community 68"
Cohesion: 0.05
Nodes (69): EncounterQuery, MelodyContourSpec, NotePartSpec, PitchMapping, RatioSourceSpec, ScaleName, SpaceSpec, TuningContextSpec (+61 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (9): CompositionVersion, referenceHead(), referenceWheel(), traceColors, request, CompositionCanvas(), context, observation (+1 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (7): request, InstrumentEngine, emptyPreparation, InstrumentRouter, InstrumentRouterOptions, SoundFontPreset, NoteMusicalEvent

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (18): RingBoundarySpec, window8s, withRingCount(), window8s, firstObservedHead(), window4s, allReferenceCompositions(), clone() (+10 more)

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (10): asError(), isArrayBufferValue(), SoundBankImportResult, SoundBankStoreError, SoundBankStoreErrorCode, soundBankStoreErrorFor(), SoundBankStoreOptions, StoredSoundBank (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.39
Nodes (7): QuantizeSpec, VelocityMapping, quantizedCandidates(), clampUnit(), clampVelocity(), mapStrengthToVelocity(), quantizeAbsoluteBeat()

### Community 75 - "Community 75"
Cohesion: 0.21
Nodes (10): HeadSpec, findHead(), headStateAt(), headStatesAt(), LocatedHead, positionAt(), findWheel(), WheelState (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.24
Nodes (6): cloneBytes(), readBytes(), requestResult(), SoundBankStore, transactionComplete(), validMetadata()

### Community 77 - "Community 77"
Cohesion: 0.15
Nodes (11): subtleCrypto, Composition, CompositionValidationIssue, CompositionJsonErrorCode, CompositionJsonImportResult, downloadCompositionJson(), exportCompositionToJson(), fileStem() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.11
Nodes (18): RenderContext, ScheduledAudioVoice, InstrumentBus, NativeDrumPlayer, NativeSynthEngineOptions, NativeTonePlayer, drum, FakeAudioParam (+10 more)

### Community 79 - "Community 79"
Cohesion: 0.19
Nodes (13): compareText(), compareTraceEncounters(), compileTraceEncounters(), encounterId(), freezePoint(), SegmentIntersection, TraceCrossingDirection, TraceCrossingEncounter (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.23
Nodes (9): ascii(), encodeWav(), INT_FULL_SCALE, readWavHeader(), roundHalfAwayFromZero(), WavBitDepth, WavEncodeOptions, WavEncodeResult (+1 more)

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (12): DrumShape, envelope(), fallback, nativeVoiceNotes, noiseBuffer(), playDrum(), playNativeDrum(), scheduledVoice() (+4 more)

### Community 84 - "Community 84"
Cohesion: 0.18
Nodes (6): NativeDrumInstrumentSpec, drumVoices, InstrumentPanel(), InstrumentPanelProps, NumberFieldProps, waveforms

### Community 85 - "Community 85"
Cohesion: 0.19
Nodes (17): MappedPitch, validatePartMusicalRange(), audiblePartIds(), compareEvents(), compareText(), compilePerformance(), durationForCandidate(), emptyPerformance() (+9 more)

### Community 89 - "Community 89"
Cohesion: 0.22
Nodes (8): Compilation budgets, Encounter detection, Growth in window length, Known costs not yet budgeted, Reference machine, Release benchmarks, Trace retention and indexing, What these assert, and why

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (4): Benchmarks, Reference works, The showcase, The SoundFont Instrument names a bank rather than carrying one

## Knowledge Gaps
- **608 isolated node(s):** `pageErrors`, `name`, `private`, `version`, `type` (+603 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Composition` connect `Community 77` to `Community 2`, `Community 4`, `Community 8`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 41`, `Community 42`, `Community 44`, `Community 48`, `Community 52`, `Community 54`, `Community 59`, `Community 61`, `Community 62`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 75`, `Community 79`, `Community 84`, `Community 85`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `PerformanceScheduler` connect `Community 43` to `Community 59`, `Community 44`, `Community 70`, `Community 71`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `SoundFontEngine` connect `Community 46` to `Community 70`, `Community 76`, `Community 78`, `Community 56`, `Community 59`, `Community 60`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `pageErrors`, `name`, `private` to the rest of the system?**
  _608 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1096938775510204 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._