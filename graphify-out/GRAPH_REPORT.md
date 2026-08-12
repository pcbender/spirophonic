# Graph Report - spirophonic  (2026-08-11)

## Corpus Check
- 167 files · ~188,050 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1971 nodes · 4590 edges · 116 communities (100 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9c801b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Spirophonic Vision
- compositionRenderer.ts
- compilerOptions
- compositionEdits.ts
- compilerOptions
- scripts
- compositionValidation.ts
- soundfontEngine.ts
- Spirophonic
- CP-001 - Scaffold Vite React TypeScript App
- CP-012 - README and Demo Polish for v0.1
- CP-002 - Define Core Model Types
- CP-003 - Implement Trochoid Trace Math Engine
- CP-008 - Add WebAudio Sound Preview
- CP-015 - Strudel Snippet Export
- Manual
- CP-004 - Add Mapping Utilities
- CP-005 - Implement Canvas Trace Renderer
- CP-006 - Build Basic Control Panel
- CP-007 - Add Animation Transport
- CP-009 - Add Color Mapping
- CP-010 - JSON Export and Import
- CP-013 - Add Presets
- CP-014 - SVG Export
- INITIAL-WBS-AND-CP-PACKETS.md
- Spirophonic POC Initial WBS and CP Packets
- tsconfig.json
- AGENTS.md
- instrumentRouter.ts
- soundfontProbe.ts
- Sound, Rhythm, and MIDI Design
- midiExport.ts
- audioRender.ts
- composition.ts
- Spirophonic Music Generator Build Plan
- Spirophonic Domain Model
- Spirophonic Music Generator Progress Tracker
- recording.ts
- encounters.ts
- SoundBankPanel.tsx
- relations.ts
- App.tsx
- instrumentEngine.ts
- FieldPanel.tsx
- Important Distinctions
- transport.ts
- Foundational Principles
- Variation
- Recording
- PartPanel.tsx
- vite-env.d.ts
- InstrumentSpec
- PerformanceScheduler
- traceEncounters.ts
- soundbankStore.ts
- sync-spessasynth-worklet.mjs
- compositions.ts
- performanceScheduler.ts
- parts.ts
- motion.ts
- projectBundle.ts
- performance.ts
- strudelExport.ts
- soundfontEngine.test.ts
- HeadPanel.tsx
- crossings.ts
- fields.ts
- Composition
- tuning.ts
- audio.integration.test.ts
- SoundBankStore
- transport.ts
- motion.ts
- devDependencies
- nativeSynthEngine.test.ts
- ImportExportPanel.tsx
- Release benchmarks
- usePerformanceCompiler.test.ts
- variation.ts
- heads.ts
- fields.test.ts
- Getting started
- error
- scales.ts
- variation.test.ts
- compilePerformance
- agreement.test.ts
- compositionValidation.test.ts
- package.json
- ADR 0001: Browser SoundFont engine
- Point2
- windows-portability.test.mjs
- dependencies
- RecordingNativeEngine
- Design Principles
- What is missing: ratio, tuning, and melodic line
- VariationPanel.tsx
- melody.ts
- ResizeObserverMock
- fake-indexeddb
- globals
- jsdom
- MVP Scope
- @playwright/test
- @testing-library/jest-dom
- @testing-library/react
- Deployment
- typescript
- typescript-eslint
- vitest
- MuseScore_General_License.md

## God Nodes (most connected - your core abstractions)
1. `Composition` - 82 edges
2. `compilePerformance()` - 50 edges
3. `defaultComposition` - 41 edges
4. `Spirophonic Music Generator Build Plan` - 40 edges
5. `validateComposition()` - 37 edges
6. `PerformanceScheduler` - 35 edges
7. `SoundFontEngine` - 32 edges
8. `SoundBankStore` - 31 edges
9. `Spirophonic Domain Model` - 30 edges
10. `InstrumentSpec` - 25 edges

## Surprising Connections (you probably didn't know these)
- `compileBoundaryEncounters()` --indirect_call--> `encounter()`  [INFERRED]
  src/core/encounters.ts → src/core/parts.test.ts
- `App()` --indirect_call--> `error()`  [INFERRED]
  src/App.tsx → src/ui/diagnosticText.test.ts
- `playSynthTone()` --indirect_call--> `lane()`  [INFERRED]
  src/audio/toneSynth.ts → src/audio/performanceScheduler.test.ts
- `modulatedIntervalsFor()` --indirect_call--> `lane()`  [INFERRED]
  src/render/compositionRenderer.ts → src/audio/performanceScheduler.test.ts
- `modulatedTraceStyle()` --indirect_call--> `lane()`  [INFERRED]
  src/render/compositionRenderer.ts → src/audio/performanceScheduler.test.ts

## Import Cycles
- None detected.

## Communities (116 total, 16 thin omitted)

### Community 1 - "Spirophonic Vision"
Cohesion: 0.12
Nodes (17): Conceptual Model, Core Thesis, Direction A: Spirophonic -> Strudel/Tidal, Direction B: Strudel/Tidal -> Spirophonic, First Platform Decision, Future Directions, Long-term Dream, MVP Definition (+9 more)

### Community 2 - "compositionRenderer.ts"
Cohesion: 0.05
Nodes (68): SpokeFieldSpec, TracePresentationSpec, BoundaryCrossingEncounter, assertState(), clamp01(), compileGateModulationLane(), compileGateModulationLanes(), freezePoint() (+60 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, vitest/globals, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 4 - "compositionEdits.ts"
Cohesion: 0.09
Nodes (56): addHead(), addInstrument(), addWheel(), allCompositionIds(), clampIndex(), compareText(), CompositionObjectKind, CompositionReference (+48 more)

### Community 5 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+12 more)

### Community 6 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, deploy, dev, fetch:soundbank, lint, prebuild, predev (+6 more)

### Community 7 - "compositionValidation.ts"
Cohesion: 0.16
Nodes (47): attachmentKinds, boundaryKeys, boundaryKindForFieldKind, CompositionValidationIssue, CompositionValidationResult, encounterDirections, gateTargetBounds, isComposition() (+39 more)

### Community 8 - "soundfontEngine.ts"
Cohesion: 0.08
Nodes (20): voice(), indexInstruments(), asPreset(), clamp(), InstrumentRoute, LoadedBank, retireSynthesizer(), SoundFontBankError (+12 more)

### Community 9 - "Spirophonic"
Cohesion: 0.25
Nodes (8): Boundaries, Docs, Project shape, Run the app, Sound banks, Spirophonic, The model, What it does

### Community 10 - "CP-001 - Scaffold Vite React TypeScript App"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, Constraints, CP-001 - Scaffold Vite React TypeScript App, Goal, Required Files, Scope, Suggested Commands

### Community 11 - "CP-012 - README and Demo Polish for v0.1"
Cohesion: 0.50
Nodes (4): Acceptance Criteria, CP-012 - README and Demo Polish for v0.1, Goal, Scope

### Community 12 - "CP-002 - Define Core Model Types"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, CP-002 - Define Core Model Types, Goal, Scope, Suggested Files, Suggested Types

### Community 13 - "CP-003 - Implement Trochoid Trace Math Engine"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, CP-003 - Implement Trochoid Trace Math Engine, Goal, Scope, Suggested Files, Suggested Output Type

### Community 14 - "CP-008 - Add WebAudio Sound Preview"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, Constraints, CP-008 - Add WebAudio Sound Preview, Goal, Scope, Suggested Files

### Community 15 - "CP-015 - Strudel Snippet Export"
Cohesion: 0.33
Nodes (6): Acceptance Criteria, CP-015 - Strudel Snippet Export, Example Output, Goal, Scope, Suggested Files

### Community 16 - "Manual"
Cohesion: 0.06
Nodes (35): Add Control — a continuous lane, Add Part — a note Part, Add Relation — a detector between Heads, Add Tuning — a shared pitch reference, Attachment, Boundary kinds, Composition, Composition tree (+27 more)

### Community 17 - "CP-004 - Add Mapping Utilities"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-004 - Add Mapping Utilities, Goal, Scope, Suggested Files

### Community 18 - "CP-005 - Implement Canvas Trace Renderer"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-005 - Implement Canvas Trace Renderer, Goal, Scope, Suggested Files

### Community 19 - "CP-006 - Build Basic Control Panel"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-006 - Build Basic Control Panel, Goal, Scope, Suggested Files

### Community 20 - "CP-007 - Add Animation Transport"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-007 - Add Animation Transport, Goal, Scope, Suggested Files

### Community 21 - "CP-009 - Add Color Mapping"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-009 - Add Color Mapping, Goal, Scope, Suggested Files

### Community 22 - "CP-010 - JSON Export and Import"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-010 - JSON Export and Import, Goal, Scope, Suggested Files

### Community 23 - "CP-013 - Add Presets"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-013 - Add Presets, Goal, Scope, Suggested Files

### Community 24 - "CP-014 - SVG Export"
Cohesion: 0.40
Nodes (5): Acceptance Criteria, CP-014 - SVG Export, Goal, Scope, Suggested Files

### Community 25 - "INITIAL-WBS-AND-CP-PACKETS.md"
Cohesion: 0.50
Nodes (3): Definition of Done for v0.1, First Implementation Slice, Important Design Warning

### Community 26 - "Spirophonic POC Initial WBS and CP Packets"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, CP-011 - Testing Pass for v0.1, Execution Guidance for CP, Goal, Scope, Spirophonic POC Initial WBS and CP Packets, WBS Overview

### Community 28 - "AGENTS.md"
Cohesion: 0.40
Nodes (4): Current work, Gates, graphify, Verifying a guard

### Community 30 - "instrumentRouter.ts"
Cohesion: 0.08
Nodes (10): InstrumentEngine, emptyPreparation, InstrumentRouter, InstrumentRouterOptions, SoundFontRouteEngine, FakeEngine, FakeSoundFontEngine, native (+2 more)

### Community 32 - "soundfontProbe.ts"
Cohesion: 0.09
Nodes (22): asciiAt(), asPreset(), browserHeapBytes(), MemoryPerformance, notesFor(), overlaps(), runSoundFontProbe(), selectProbePresets() (+14 more)

### Community 33 - "Sound, Rhythm, and MIDI Design"
Cohesion: 0.05
Nodes (40): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria (+32 more)

### Community 34 - "midiExport.ts"
Cohesion: 0.09
Nodes (35): buildMidiFile(), buildNoteTrack(), buildTempoTrack(), chunk(), clampByte(), clampChannel(), clampVelocity(), decodeVariableLength() (+27 more)

### Community 35 - "audioRender.ts"
Cohesion: 0.08
Nodes (31): scheduledModulationForOccurrence(), audibleInstrumentIds(), comparePcm(), defaultRenderSampleRateHz, defaultRenderTailSeconds, OfflineContextFactory, OfflineRenderContext, OfflineRenderRequest (+23 more)

### Community 36 - "composition.ts"
Cohesion: 0.06
Nodes (30): BandBoundarySpec, BandFieldSpec, BoundarySpecUnion, DurationMapping, EllipseBoundarySpec, EllipseFieldSpec, FieldBase, FieldMotionSpec (+22 more)

### Community 37 - "Spirophonic Music Generator Build Plan"
Cohesion: 0.05
Nodes (41): Architectural invariants, Canonical event layers, Decisions already made, Definition of the first meaningful generator, File-list audit, 2026-08-05, Meaning of Wheel, Head, shape, and Trace, MG-01 — Composition schema and validation, MG-02 — Deterministic Transport and performance window (+33 more)

### Community 38 - "Spirophonic Domain Model"
Cohesion: 0.08
Nodes (26): Boundary, Composition, Conceptual Structure, Core Idea, Crossing, Defining Statement, Determinism, Encounter (+18 more)

### Community 39 - "Spirophonic Music Generator Progress Tracker"
Cohesion: 0.06
Nodes (35): 2026-08-05 MG-01 author handoff, 2026-08-05 MG-01–MG-11 cumulative review, 2026-08-05 MG-02 author handoff, 2026-08-05 MG-03 author handoff, 2026-08-05 MG-04 author handoff, 2026-08-05 MG-05 author handoff, 2026-08-05 MG-06 author handoff, 2026-08-05 MG-07 author handoff (+27 more)

### Community 40 - "recording.ts"
Cohesion: 0.12
Nodes (30): PartSpec, createRecording(), engineVersion, ProvenanceWarning, provenanceWarnings(), Recording, RecordingLimits, RecordingProvenance (+22 more)

### Community 41 - "encounters.ts"
Cohesion: 0.10
Nodes (32): BoundaryInput, CrossingRefinementOptions, CrossingScanDiagnostic, assertEncounterState(), BoundaryEncounterDirection, BoundaryEncounterPath, boundaryEncountersForPath(), boundaryNormal() (+24 more)

### Community 42 - "SoundBankPanel.tsx"
Cohesion: 0.09
Nodes (26): SoundFontPreset, auditionNotes, BankCard(), BankCardProps, noteName(), noteNames, SoundBankPanel(), SoundBankPanelProps (+18 more)

### Community 43 - "relations.ts"
Cohesion: 0.11
Nodes (31): EncounterDirection, RelationKind, RelationSpec, HeadState, compareRelationEncounters(), compareText(), compileControlLane(), compileRelationEncounters() (+23 more)

### Community 44 - "App.tsx"
Cohesion: 0.16
Nodes (19): App(), AudioRuntime, Diagnostics(), DiagnosticsProps, freshDefaultComposition(), openingComposition(), performanceRequestFor(), silenceReason() (+11 more)

### Community 45 - "instrumentEngine.ts"
Cohesion: 0.11
Nodes (27): DrumShape, envelope(), fallback, nativeVoiceNotes, noiseBuffer(), noiseSeed, playDrum(), playNativeDrum() (+19 more)

### Community 46 - "FieldPanel.tsx"
Cohesion: 0.11
Nodes (29): BoundaryBase, FieldSpec, addBoundary(), assertMatchingBoundary(), BoundarySpec, fieldAt(), reindexBoundaries(), removeBoundary() (+21 more)

### Community 47 - "Important Distinctions"
Cohesion: 0.22
Nodes (9): Closure is not a bar, Encounter is not a note, Field is not musical meaning, Important Distinctions, Part is not Instrument, Recording is not merely export, Variation is not nondeterminism, Wheel is not necessarily closed (+1 more)

### Community 48 - "transport.ts"
Cohesion: 0.16
Nodes (30): CycleRate, TransportSpec, barPhaseAtBeat(), barsToBeats(), beatsToBars(), beatUnits, clampFinite(), closestBeatUnit() (+22 more)

### Community 49 - "Foundational Principles"
Cohesion: 0.29
Nodes (7): Closure is optional, Determinism includes variation, Encounters produce events, Foundational Principles, Motion before trace, Relationship first, Time is independent of geometry

### Community 50 - "Variation"
Cohesion: 0.40
Nodes (5): Continuous variation, Initial-condition variation, Interpretation variation, Performance variation, Variation

### Community 51 - "Recording"
Cohesion: 0.67
Nodes (3): Recording, Reinterpretation, Replay

### Community 52 - "PartPanel.tsx"
Cohesion: 0.09
Nodes (28): ControlPartSpec, GateModulationSource, GateModulationTarget, midiToName(), controlSources, defaultPitchFor(), directions, durationFor() (+20 more)

### Community 54 - "InstrumentSpec"
Cohesion: 0.12
Nodes (6): InstrumentAutomationDiagnostic, ScheduledModulationLane, NativeSynthEngine, FakeEngine, InstrumentSpec, NoteMusicalEvent

### Community 56 - "traceEncounters.ts"
Cohesion: 0.12
Nodes (24): TraceObservationSpec, compareText(), compareTraceEncounters(), compileTraceEncounters(), encounterId(), freezePoint(), SegmentIntersection, crossingComposition() (+16 more)

### Community 57 - "soundbankStore.ts"
Cohesion: 0.09
Nodes (18): asError(), isArrayBufferValue(), SoundBankImport, SoundBankImportResult, SoundBankStoreError, SoundBankStoreErrorCode, SoundBankStoreOptions, StoredSoundBank (+10 more)

### Community 58 - "sync-spessasynth-worklet.mjs"
Cohesion: 0.33
Nodes (5): destination, digest, expectedVersions, repositoryRoot, source

### Community 59 - "compositions.ts"
Cohesion: 0.18
Nodes (20): RingBoundarySpec, window8s, withRingCount(), window8s, firstObservedHead(), window4s, allReferenceCompositions(), clone() (+12 more)

### Community 60 - "performanceScheduler.ts"
Cohesion: 0.09
Nodes (16): compareEvents(), compareText(), EventOccurrence, PendingPerformance, PerformanceEditBoundary, PerformanceSchedulerOptions, PerformanceStartOptions, requireNonNegative() (+8 more)

### Community 61 - "parts.ts"
Cohesion: 0.13
Nodes (24): EncounterQuery, PitchMapping, RelationEventKind, SpaceSpec, normalizeSeries(), buildPartMelody(), DEFAULT_MELODY_ROOT, encounterMatchesQuery() (+16 more)

### Community 62 - "motion.ts"
Cohesion: 0.19
Nodes (19): configurationFor(), loadEnvironment(), localPath(), main(), markerFor(), normalizeDeployPath(), parseArguments(), remoteGuardCommand() (+11 more)

### Community 63 - "projectBundle.ts"
Cohesion: 0.13
Nodes (23): BundleAsset, BundleAssetStatus, bundleFileName(), BundleParseResult, CreateBundleOptions, CreateBundleResult, createProjectBundle(), decodeBase64() (+15 more)

### Community 64 - "performance.ts"
Cohesion: 0.15
Nodes (22): QuantizeSpec, VelocityMapping, validatePartMusicalRange(), audiblePartIds(), compareEvents(), compareText(), durationForCandidate(), emptyPerformance() (+14 more)

### Community 65 - "strudelExport.ts"
Cohesion: 0.15
Nodes (22): eventSounds(), notePart(), ratioTuned(), request, tempered(), buildPerformanceMidi(), buildPerformanceMidiTracks(), buildPerformanceMidiWithDiagnostics() (+14 more)

### Community 66 - "soundfontEngine.test.ts"
Cohesion: 0.09
Nodes (7): SoundFontSynthesizer, bankBytes(), FakeContext, FakeSynth, harness(), presets, RecordedCall

### Community 67 - "HeadPanel.tsx"
Cohesion: 0.11
Nodes (17): MeterSpec, WheelSpec, ControlPanel(), ControlPanelProps, NumberFieldProps, HeadPanelProps, NumberFieldProps, OpenMap (+9 more)

### Community 68 - "crossings.ts"
Cohesion: 0.15
Nodes (21): asResolver(), assertPathPoint(), BoundaryResolver, crossingLiesOnBoundary(), crossingRefinementDefaults, CrossingScanResult, freezePoint(), normalizeOptions() (+13 more)

### Community 69 - "fields.ts"
Cohesion: 0.13
Nodes (23): activeBoundaries(), ActiveBoundary, activeBoundaryGeometries(), activeBoundaryGeometriesAt(), addField(), allFieldIds(), BandBoundaryGeometry, BoundaryGeometry (+15 more)

### Community 70 - "Composition"
Cohesion: 0.15
Nodes (9): Composition, CompositionVersion, defaultComposition, referenceComposition, referenceHead(), referenceWheel(), traceColors, request (+1 more)

### Community 71 - "tuning.ts"
Cohesion: 0.18
Nodes (17): RatioSourceSpec, TuningContextSpec, defaultTuningContext, describeRatio(), findTuningContext(), frequencyForRatio(), greatestCommonDivisor(), octaveFoldRatio() (+9 more)

### Community 72 - "audio.integration.test.ts"
Cohesion: 0.13
Nodes (9): request, subtleCrypto, CompositionJsonErrorCode, CompositionJsonImportResult, downloadCompositionJson(), exportCompositionToJson(), fileStem(), isObject() (+1 more)

### Community 73 - "SoundBankStore"
Cohesion: 0.27
Nodes (7): cloneBytes(), readBytes(), requestResult(), SoundBankStore, soundBankStoreErrorFor(), transactionComplete(), validMetadata()

### Community 74 - "transport.ts"
Cohesion: 0.24
Nodes (5): bundleDialog(), confirmBundleExport(), importSampleBank(), pageErrors, sampleBankFile()

### Community 75 - "motion.ts"
Cohesion: 0.19
Nodes (15): HeadAttachmentSpec, MotionSpec, harmonographPointAtTheta(), HarmonographPointParameters, lissajousPointAtTheta(), rosePointAtTheta(), superformulaPointAtTheta(), assertMatchingFamily() (+7 more)

### Community 76 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+11 more)

### Community 77 - "nativeSynthEngine.test.ts"
Cohesion: 0.12
Nodes (8): NativeTonePlayer, drum, FakeAudioContext, FakeAudioParam, FakeGain, FakeNode, FakePanner, VoiceRecord

### Community 78 - "ImportExportPanel.tsx"
Cohesion: 0.15
Nodes (12): estimateRenderBytes(), BundleAssetOutcome, sampleSoundBankPreset, help, HelpKey, approximateSize(), BundleSize(), BundleSizeProps (+4 more)

### Community 79 - "Release benchmarks"
Cohesion: 0.11
Nodes (16): Bundle size, Compilation budgets, Compilation is off the render thread, Encounter detection, Growth in window length, Known costs not yet budgeted, Reference machine, Release benchmarks (+8 more)

### Community 80 - "usePerformanceCompiler.test.ts"
Cohesion: 0.21
Nodes (9): PerformanceRequest, CompileReplyMessage, CompileRequestMessage, compileOrFail(), CompilerState, request, StubWorker, usePerformanceCompiler() (+1 more)

### Community 82 - "variation.ts"
Cohesion: 0.23
Nodes (15): VariationLayerSpec, applyInitialConditionVariation(), boundedDelta(), clampAmount(), disabledLayer, InterpretationVariation, interpretationVariationFor(), layerOf() (+7 more)

### Community 83 - "heads.ts"
Cohesion: 0.25
Nodes (10): HeadSpec, findHead(), headStateAt(), headStatesAt(), LocatedHead, positionAt(), findWheel(), WheelState (+2 more)

### Community 84 - "fields.test.ts"
Cohesion: 0.28
Nodes (12): assertFinitePoint(), bandSignedDistance(), boundarySignedDistance(), ellipseSignedDistance(), gridSignedDistance(), ringSignedDistance(), segmentBoundaryCrossing(), spiralSignedDistance() (+4 more)

### Community 85 - "Getting started"
Cohesion: 0.17
Nodes (12): Getting started, "I changed something and nothing happened", Making it a melody, Run it, Saving and exporting, Three ways to start, What actually happened, What you see on first load (+4 more)

### Community 86 - "error"
Cohesion: 0.13
Nodes (14): bank, destination, repositoryRoot, BundledBankState, bundledSoundBankBytes, bundledSoundBankLicensePath, bundledSoundBankPath, EnsureBundledBankOptions (+6 more)

### Community 87 - "scales.ts"
Cohesion: 0.32
Nodes (13): mapEncounterPitch(), scalePitch(), frequencyToMidi(), fromScaleDegree(), midiToFrequency(), noteNames, quantizeFrequency(), quantizeToScale() (+5 more)

### Community 88 - "variation.test.ts"
Cohesion: 0.32
Nodes (11): createSequence(), hashString(), indexValue(), mulberry32(), randomVersion, scopeKey(), signedUnitValue(), unitValue() (+3 more)

### Community 89 - "compilePerformance"
Cohesion: 0.29
Nodes (8): performanceRequestFor(), compilePerformance(), beatsToSeconds(), compileDefault(), fixture(), base(), request, setup()

### Community 90 - "agreement.test.ts"
Cohesion: 0.31
Nodes (6): GateModulationMapping, compileFixture(), fixedFrequencySineGateFixture(), gatedModulationComposition(), sineWedgeBoundary, speedMapping

### Community 91 - "compositionValidation.test.ts"
Cohesion: 0.20
Nodes (8): NotePartSpec, RingFieldSpec, issueAt(), motionCases, notePart, ringField, withoutFields(), withRings()

### Community 92 - "package.json"
Cohesion: 0.20
Nodes (9): lightningcss-win32-x64-msvc, name, optionalDependencies, lightningcss-win32-x64-msvc, @rolldown/binding-win32-x64-msvc, private, type, version (+1 more)

### Community 93 - "ADR 0001: Browser SoundFont engine"
Cohesion: 0.22
Nodes (8): ADR 0001: Browser SoundFont engine, Decision, Failure behavior and known limits, Fallback plan, Licensing and redistribution checklist, Probe method, Results, Why this engine

### Community 95 - "windows-portability.test.mjs"
Cohesion: 0.32
Nodes (6): portabilityProblems(), repositoryRoot, usesRunnerConfigLoader(), viteScripts, windowsBindings, writesBelowNodeModules()

### Community 96 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react, react-dom, spessasynth_lib, react, react-dom, spessasynth_lib

### Community 98 - "Design Principles"
Cohesion: 0.29
Nodes (7): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Design Principles

### Community 99 - "What is missing: ratio, tuning, and melodic line"
Cohesion: 0.29
Nodes (7): Open threads, revisited, Still missing, Suggested next experiment, The experiment, and its result, What got built, What is missing: ratio, tuning, and melodic line, Where things stand

### Community 100 - "VariationPanel.tsx"
Cohesion: 0.33
Nodes (6): VariationSpec, variationBounds, defaultVariation(), layers, VariationPanel(), VariationPanelProps

### Community 101 - "melody.ts"
Cohesion: 0.40
Nodes (5): MelodyContourSpec, ScaleName, buildMelodicContour(), clamp(), ContourStep

### Community 106 - "MVP Scope"
Cohesion: 0.40
Nodes (5): Must Have, MVP Scope, Never, Post-v0.1, Stretch for v0.1

### Community 110 - "Deployment"
Cohesion: 0.33
Nodes (5): Authorize each remote directory, Deploy, Deployment, Local configuration, Prerequisites

## Knowledge Gaps
- **730 isolated node(s):** `pageErrors`, `name`, `private`, `version`, `type` (+725 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Composition` connect `Composition` to `compositionRenderer.ts`, `compositionEdits.ts`, `compositionValidation.ts`, `midiExport.ts`, `audioRender.ts`, `composition.ts`, `recording.ts`, `encounters.ts`, `SoundBankPanel.tsx`, `relations.ts`, `App.tsx`, `FieldPanel.tsx`, `PartPanel.tsx`, `traceEncounters.ts`, `soundbankStore.ts`, `compositions.ts`, `parts.ts`, `projectBundle.ts`, `performance.ts`, `strudelExport.ts`, `HeadPanel.tsx`, `fields.ts`, `tuning.ts`, `audio.integration.test.ts`, `ImportExportPanel.tsx`, `usePerformanceCompiler.test.ts`, `variation.ts`, `heads.ts`, `fields.test.ts`, `variation.test.ts`, `compilePerformance`, `agreement.test.ts`, `compositionValidation.test.ts`, `VariationPanel.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `FakeEngine` connect `instrumentRouter.ts` to `InstrumentSpec`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `InstrumentEngine` connect `instrumentRouter.ts` to `RecordingNativeEngine`, `audio.integration.test.ts`, `soundfontEngine.ts`, `instrumentEngine.ts`, `InstrumentSpec`, `PerformanceScheduler`, `agreement.test.ts`, `performanceScheduler.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `pageErrors`, `name`, `private` to the rest of the system?**
  _730 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Spirophonic Vision` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `compositionRenderer.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050239234449760764 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._