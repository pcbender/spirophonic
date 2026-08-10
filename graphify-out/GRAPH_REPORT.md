# Graph Report - spirophonic  (2026-08-09)

## Corpus Check
- 161 files · ~167,594 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1861 nodes · 4264 edges · 119 communities (101 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f498165`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Spirophonic Vision
- fields.ts
- compilerOptions
- compositionEdits.ts
- compilerOptions
- scripts
- compositionRenderer.ts
- compositionValidation.ts
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
- compositions.ts
- recording.ts
- Sound, Rhythm, and MIDI Design
- relations.ts
- traceEncounters.ts
- PerformanceScheduler
- Spirophonic Music Generator Build Plan
- Spirophonic Domain Model
- Spirophonic Music Generator Progress Tracker
- encounters.ts
- nativeSynthEngine.ts
- composition.ts
- PartPanel.tsx
- App.tsx
- SoundFontEngine
- soundfontProbe.ts
- Important Distinctions
- parts.ts
- Foundational Principles
- Variation
- Recording
- audioRender.ts
- vite-env.d.ts
- smf.ts
- SoundBankPanel.tsx
- InstrumentEngine
- Composition
- sync-spessasynth-worklet.mjs
- midiExport.ts
- InstrumentSpec
- tuning.ts
- motion.ts
- heads.ts
- variation.test.ts
- devDependencies
- SoundBankReference
- performance.ts
- Release benchmarks
- SoundBankSettings.tsx
- soundfontEngine.test.ts
- help.ts
- variation.ts
- usePerformanceCompiler.ts
- transport.ts
- drumSynth.ts
- scales.ts
- audio.integration.test.ts
- strudelExport.ts
- performanceScheduler.ts
- app.spec.ts
- RailPanel.tsx
- NativeSynthEngine
- FakeProbeBackend
- Getting started
- soundbankStore.ts
- FakeSynth
- wav.ts
- soundfontEngine.ts
- package.json
- traceEncounters.test.ts
- compositionValidation.test.ts
- ADR 0001: Browser SoundFont engine
- mg13Fields.test.ts
- windows-portability.test.mjs
- rhythm.ts
- HeadPanel.tsx
- Design Principles
- What is missing: ratio, tuning, and melodic line
- dependencies
- RecordingNativeEngine
- bundledSoundBank.ts
- FakeAudioContext
- melody.ts
- ResizeObserverMock
- MVP Scope
- RecorderPanel.test.tsx
- fake-indexeddb
- globals
- jsdom
- @playwright/test
- @testing-library/jest-dom
- @testing-library/react
- @types/node
- @types/react-dom
- typescript-eslint
- MuseScore_General_License.md

## God Nodes (most connected - your core abstractions)
1. `Composition` - 80 edges
2. `compilePerformance()` - 49 edges
3. `defaultComposition` - 40 edges
4. `validateComposition()` - 37 edges
5. `Spirophonic Music Generator Build Plan` - 37 edges
6. `PerformanceScheduler` - 32 edges
7. `SoundBankStore` - 31 edges
8. `SoundFontEngine` - 30 edges
9. `Spirophonic Domain Model` - 30 edges
10. `InstrumentEngine` - 24 edges

## Surprising Connections (you probably didn't know these)
- `compileBoundaryEncounters()` --indirect_call--> `encounter()`  [INFERRED]
  src/core/encounters.ts → src/core/parts.test.ts
- `App()` --indirect_call--> `error()`  [INFERRED]
  src/App.tsx → src/ui/diagnosticText.test.ts
- `indexInstruments()` --indirect_call--> `instrument()`  [INFERRED]
  src/audio/performanceScheduler.ts → src/audio/soundfontEngine.test.ts
- `issueAt()` --calls--> `validateComposition()`  [EXTRACTED]
  src/core/compositionValidation.test.ts → src/core/compositionValidation.ts
- `interpretEncounters()` --indirect_call--> `part()`  [INFERRED]
  src/core/performance.ts → src/core/parts.test.ts

## Import Cycles
- None detected.

## Communities (119 total, 18 thin omitted)

### Community 1 - "Spirophonic Vision"
Cohesion: 0.12
Nodes (17): Conceptual Model, Core Thesis, Direction A: Spirophonic -> Strudel/Tidal, Direction B: Strudel/Tidal -> Spirophonic, First Platform Decision, Future Directions, Long-term Dream, MVP Definition (+9 more)

### Community 2 - "fields.ts"
Cohesion: 0.05
Nodes (82): FieldSpec, asResolver(), assertPathPoint(), BoundaryInput, BoundaryResolver, crossingLiesOnBoundary(), crossingRefinementDefaults, CrossingRefinementOptions (+74 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, vitest/globals, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 4 - "compositionEdits.ts"
Cohesion: 0.10
Nodes (53): addHead(), addInstrument(), addWheel(), allCompositionIds(), clampIndex(), compareText(), CompositionObjectKind, CompositionReference (+45 more)

### Community 5 - "compilerOptions"
Cohesion: 0.10
Nodes (20): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+12 more)

### Community 6 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, fetch:soundbank, lint, prebuild, predev, preview (+5 more)

### Community 7 - "compositionRenderer.ts"
Cohesion: 0.07
Nodes (45): SpokeFieldSpec, TracePresentationSpec, BoundaryCrossingEncounter, downloadCompositionSvg(), escapeXml(), exportCompositionToSvg(), fileStem(), svgForCommand() (+37 more)

### Community 8 - "compositionValidation.ts"
Cohesion: 0.17
Nodes (44): attachmentKinds, boundaryKeys, boundaryKindForFieldKind, CompositionValidationResult, encounterDirections, isComposition(), JsonObject, motionKinds (+36 more)

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
Nodes (34): Add Control — a continuous lane, Add Part — a note Part, Add Relation — a detector between Heads, Add Tuning — a shared pitch reference, Attachment, Boundary kinds, Composition, Composition tree (+26 more)

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

### Community 30 - "compositions.ts"
Cohesion: 0.14
Nodes (23): stubBankBytes(), RingBoundarySpec, bundledSoundBank, window8s, withRingCount(), window8s, estimateRenderBytes(), allReferenceCompositions() (+15 more)

### Community 32 - "recording.ts"
Cohesion: 0.12
Nodes (28): PartSpec, createRecording(), engineVersion, ProvenanceWarning, provenanceWarnings(), Recording, RecordingLimits, RecordingProvenance (+20 more)

### Community 33 - "Sound, Rhythm, and MIDI Design"
Cohesion: 0.05
Nodes (40): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria (+32 more)

### Community 34 - "relations.ts"
Cohesion: 0.11
Nodes (30): RelationKind, RelationSpec, HeadState, compareRelationEncounters(), compareText(), compileControlLane(), compileRelationEncounters(), ControlLane (+22 more)

### Community 35 - "traceEncounters.ts"
Cohesion: 0.11
Nodes (22): Point2, firstObservedHead(), window4s, compareText(), compareTraceEncounters(), compileTraceEncounters(), encounterId(), freezePoint() (+14 more)

### Community 36 - "PerformanceScheduler"
Cohesion: 0.20
Nodes (3): indexInstruments(), PerformanceScheduler, CanonicalPerformance

### Community 37 - "Spirophonic Music Generator Build Plan"
Cohesion: 0.05
Nodes (38): Architectural invariants, Canonical event layers, Decisions already made, Definition of the first meaningful generator, File-list audit, 2026-08-05, Meaning of Wheel, Head, shape, and Trace, MG-01 — Composition schema and validation, MG-02 — Deterministic Transport and performance window (+30 more)

### Community 38 - "Spirophonic Domain Model"
Cohesion: 0.08
Nodes (26): Boundary, Composition, Conceptual Structure, Core Idea, Crossing, Defining Statement, Determinism, Encounter (+18 more)

### Community 39 - "Spirophonic Music Generator Progress Tracker"
Cohesion: 0.07
Nodes (30): 2026-08-05 MG-01 author handoff, 2026-08-05 MG-01–MG-11 cumulative review, 2026-08-05 MG-02 author handoff, 2026-08-05 MG-03 author handoff, 2026-08-05 MG-04 author handoff, 2026-08-05 MG-05 author handoff, 2026-08-05 MG-06 author handoff, 2026-08-05 MG-07 author handoff (+22 more)

### Community 40 - "encounters.ts"
Cohesion: 0.12
Nodes (26): EncounterDirection, assertEncounterState(), BoundaryEncounterDirection, BoundaryEncounterPath, boundaryEncountersForPath(), boundaryNormal(), compareBoundaryEncounters(), compareText() (+18 more)

### Community 41 - "nativeSynthEngine.ts"
Cohesion: 0.11
Nodes (18): RenderContext, ScheduledAudioVoice, InstrumentBus, NativeDrumPlayer, NativeSynthEngineOptions, NativeTonePlayer, drum, FakeAudioParam (+10 more)

### Community 42 - "composition.ts"
Cohesion: 0.07
Nodes (26): BandBoundarySpec, BoundaryBase, BoundarySpecUnion, DurationMapping, EllipseBoundarySpec, FieldBase, FieldMotionSpec, GridBoundarySpec (+18 more)

### Community 43 - "PartPanel.tsx"
Cohesion: 0.11
Nodes (22): ControlPartSpec, midiToName(), controlSources, defaultPitchFor(), directions, durationFor(), encounterKinds, headsInScope() (+14 more)

### Community 44 - "App.tsx"
Cohesion: 0.19
Nodes (15): App(), AudioRuntime, Diagnostics(), DiagnosticsProps, freshDefaultComposition(), openingComposition(), performanceRequestFor(), silenceReason() (+7 more)

### Community 45 - "SoundFontEngine"
Cohesion: 0.14
Nodes (6): asPreset(), clamp(), retireSynthesizer(), SoundFontEngine, splitSoundFontBankNumber(), withTimeout()

### Community 46 - "soundfontProbe.ts"
Cohesion: 0.14
Nodes (17): asciiAt(), asPreset(), browserHeapBytes(), MemoryPerformance, notesFor(), overlaps(), runSoundFontProbe(), selectProbePresets() (+9 more)

### Community 47 - "Important Distinctions"
Cohesion: 0.22
Nodes (9): Closure is not a bar, Encounter is not a note, Field is not musical meaning, Important Distinctions, Part is not Instrument, Recording is not merely export, Variation is not nondeterminism, Wheel is not necessarily closed (+1 more)

### Community 48 - "parts.ts"
Cohesion: 0.13
Nodes (24): EncounterQuery, PitchMapping, RelationEventKind, SpaceSpec, normalizeSeries(), buildPartMelody(), DEFAULT_MELODY_ROOT, encounterMatchesQuery() (+16 more)

### Community 49 - "Foundational Principles"
Cohesion: 0.29
Nodes (7): Closure is optional, Determinism includes variation, Encounters produce events, Foundational Principles, Motion before trace, Relationship first, Time is independent of geometry

### Community 50 - "Variation"
Cohesion: 0.40
Nodes (5): Continuous variation, Initial-condition variation, Interpretation variation, Performance variation, Variation

### Community 51 - "Recording"
Cohesion: 0.67
Nodes (3): Recording, Reinterpretation, Replay

### Community 52 - "audioRender.ts"
Cohesion: 0.12
Nodes (20): audibleInstrumentIds(), comparePcm(), defaultRenderSampleRateHz, defaultRenderTailSeconds, OfflineContextFactory, OfflineRenderContext, OfflineRenderRequest, OfflineRenderResult (+12 more)

### Community 54 - "smf.ts"
Cohesion: 0.15
Nodes (22): buildMidiFile(), buildNoteTrack(), buildTempoTrack(), chunk(), clampByte(), clampChannel(), clampVelocity(), decodeVariableLength() (+14 more)

### Community 55 - "SoundBankPanel.tsx"
Cohesion: 0.13
Nodes (20): SoundFontPreset, auditionNotes, BankCard(), BankCardProps, noteName(), noteNames, SoundBankPanel(), SoundBankPanelProps (+12 more)

### Community 56 - "InstrumentEngine"
Cohesion: 0.11
Nodes (8): InstrumentEngine, emptyPreparation, InstrumentRouterOptions, SoundFontRouteEngine, FakeEngine, FakeSoundFontEngine, native, SoundFontPreparation

### Community 57 - "Composition"
Cohesion: 0.15
Nodes (9): subtleCrypto, Composition, CompositionVersion, defaultComposition, referenceComposition, referenceHead(), referenceWheel(), traceColors (+1 more)

### Community 58 - "sync-spessasynth-worklet.mjs"
Cohesion: 0.33
Nodes (5): destination, digest, expectedVersions, repositoryRoot, source

### Community 59 - "midiExport.ts"
Cohesion: 0.16
Nodes (20): eventSounds(), notePart(), ratioTuned(), request, tempered(), bendForSemitoneOffset(), buildPerformanceMidi(), buildPerformanceMidiTracks() (+12 more)

### Community 60 - "InstrumentSpec"
Cohesion: 0.13
Nodes (5): SchedulerClock, FakeClock, FakeEngine, InstrumentSpec, NoteMusicalEvent

### Community 61 - "tuning.ts"
Cohesion: 0.18
Nodes (17): RatioSourceSpec, TuningContextSpec, defaultTuningContext, describeRatio(), findTuningContext(), frequencyForRatio(), greatestCommonDivisor(), octaveFoldRatio() (+9 more)

### Community 62 - "motion.ts"
Cohesion: 0.19
Nodes (15): HeadAttachmentSpec, MotionSpec, harmonographPointAtTheta(), HarmonographPointParameters, lissajousPointAtTheta(), rosePointAtTheta(), superformulaPointAtTheta(), assertMatchingFamily() (+7 more)

### Community 63 - "heads.ts"
Cohesion: 0.20
Nodes (13): HeadSpec, findHead(), headStateAt(), headStatesAt(), LocatedHead, positionAt(), normalizeCycleRate(), wheelPhaseAtBeat() (+5 more)

### Community 64 - "variation.test.ts"
Cohesion: 0.18
Nodes (17): VariationSpec, createSequence(), hashString(), indexValue(), mulberry32(), randomVersion, scopeKey(), signedUnitValue() (+9 more)

### Community 65 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+11 more)

### Community 67 - "performance.ts"
Cohesion: 0.21
Nodes (18): validatePartMusicalRange(), audiblePartIds(), compareEvents(), compareText(), compilePerformance(), durationForCandidate(), emptyPerformance(), eventId() (+10 more)

### Community 68 - "Release benchmarks"
Cohesion: 0.11
Nodes (16): Bundle size, Compilation budgets, Compilation is off the render thread, Encounter detection, Growth in window length, Known costs not yet budgeted, Reference machine, Release benchmarks (+8 more)

### Community 69 - "SoundBankSettings.tsx"
Cohesion: 0.14
Nodes (13): SoundBankImport, SoundBankFormat, BankCardProps, bankIdFor(), formatFor(), SoundBankSettings(), SoundBankSettingsProps, SoundBankVault (+5 more)

### Community 70 - "soundfontEngine.test.ts"
Cohesion: 0.15
Nodes (9): soundFontBankNumber(), SoundFontSynthesizer, bankBytes(), FakeContext, harness(), instrument(), presets, RecordedCall (+1 more)

### Community 71 - "help.ts"
Cohesion: 0.15
Nodes (10): MeterSpec, ControlPanel(), ControlPanelProps, NumberFieldProps, help, HelpKey, ModalDialog(), ModalDialogProps (+2 more)

### Community 72 - "variation.ts"
Cohesion: 0.21
Nodes (16): VariationLayerSpec, applyInitialConditionVariation(), boundedDelta(), clampAmount(), disabledLayer, InterpretationVariation, interpretationVariationFor(), layerOf() (+8 more)

### Community 73 - "usePerformanceCompiler.ts"
Cohesion: 0.21
Nodes (9): PerformanceRequest, CompileReplyMessage, CompileRequestMessage, compileOrFail(), CompilerState, request, StubWorker, usePerformanceCompiler() (+1 more)

### Community 74 - "transport.ts"
Cohesion: 0.15
Nodes (29): performanceRequestFor(), CycleRate, TransportSpec, barPhaseAtBeat(), barsToBeats(), beatsToBars(), beatsToSeconds(), beatUnits (+21 more)

### Community 75 - "drumSynth.ts"
Cohesion: 0.21
Nodes (14): DrumShape, envelope(), fallback, nativeVoiceNotes, noiseBuffer(), noiseSeed, playDrum(), playNativeDrum() (+6 more)

### Community 76 - "scales.ts"
Cohesion: 0.32
Nodes (13): mapEncounterPitch(), scalePitch(), frequencyToMidi(), fromScaleDegree(), midiToFrequency(), noteNames, quantizeFrequency(), quantizeToScale() (+5 more)

### Community 77 - "audio.integration.test.ts"
Cohesion: 0.17
Nodes (9): request, CompositionValidationIssue, CompositionJsonErrorCode, CompositionJsonImportResult, downloadCompositionJson(), exportCompositionToJson(), fileStem(), isObject() (+1 more)

### Community 78 - "strudelExport.ts"
Cohesion: 0.23
Nodes (13): ExportablePerformance, buildPerformancePatternParts(), drumSounds, equalTemperedToleranceCents, exportPerformanceStrudel(), isEqualTempered(), noteName(), patternForPart() (+5 more)

### Community 79 - "performanceScheduler.ts"
Cohesion: 0.16
Nodes (12): compareEvents(), compareText(), EventOccurrence, PendingPerformance, PerformanceEditBoundary, PerformanceSchedulerOptions, PerformanceStartOptions, PlaybackStatus (+4 more)

### Community 80 - "app.spec.ts"
Cohesion: 0.28
Nodes (5): bundleDialog(), confirmBundleExport(), importSampleBank(), pageErrors, sampleBankFile()

### Community 82 - "RailPanel.tsx"
Cohesion: 0.20
Nodes (11): WheelSpec, OpenMap, RailPanel(), RailPanelProps, readOpenMap(), writeOpen(), motionDefaults(), motionKinds (+3 more)

### Community 84 - "FakeProbeBackend"
Cohesion: 0.21
Nodes (5): SoundFontProbeBackend, SoundFontProbeNote, SoundFontProbePreset, FakeProbeBackend, presets

### Community 85 - "Getting started"
Cohesion: 0.17
Nodes (12): Getting started, "I changed something and nothing happened", Making it a melody, Run it, Saving and exporting, Three ways to start, What actually happened, What you see on first load (+4 more)

### Community 86 - "soundbankStore.ts"
Cohesion: 0.05
Nodes (53): bank, destination, repositoryRoot, ensureBundledSoundBank(), asError(), cloneBytes(), isArrayBufferValue(), readBytes() (+45 more)

### Community 88 - "wav.ts"
Cohesion: 0.23
Nodes (9): ascii(), encodeWav(), INT_FULL_SCALE, readWavHeader(), roundHalfAwayFromZero(), WavBitDepth, WavEncodeOptions, WavEncodeResult (+1 more)

### Community 89 - "soundfontEngine.ts"
Cohesion: 0.18
Nodes (9): InstrumentRoute, LoadedBank, SoundFontBankError, SoundFontBankStatus, SoundFontChannel, SoundFontEngineOptions, SoundFontIssue, SoundFontIssueCode (+1 more)

### Community 90 - "package.json"
Cohesion: 0.20
Nodes (9): lightningcss-win32-x64-msvc, name, optionalDependencies, lightningcss-win32-x64-msvc, @rolldown/binding-win32-x64-msvc, private, type, version (+1 more)

### Community 91 - "traceEncounters.test.ts"
Cohesion: 0.22
Nodes (6): NotePartSpec, TraceObservationSpec, request, crossingComposition(), observation(), request

### Community 92 - "compositionValidation.test.ts"
Cohesion: 0.22
Nodes (7): RingFieldSpec, issueAt(), motionCases, notePart, ringField, withoutFields(), withRings()

### Community 93 - "ADR 0001: Browser SoundFont engine"
Cohesion: 0.22
Nodes (8): ADR 0001: Browser SoundFont engine, Decision, Failure behavior and known limits, Fallback plan, Licensing and redistribution checklist, Probe method, Results, Why this engine

### Community 94 - "mg13Fields.test.ts"
Cohesion: 0.22
Nodes (5): BandFieldSpec, EllipseFieldSpec, GridFieldSpec, SpiralFieldSpec, request

### Community 95 - "windows-portability.test.mjs"
Cohesion: 0.32
Nodes (6): portabilityProblems(), repositoryRoot, usesRunnerConfigLoader(), viteScripts, windowsBindings, writesBelowNodeModules()

### Community 96 - "rhythm.ts"
Cohesion: 0.43
Nodes (6): QuantizeSpec, VelocityMapping, clampUnit(), clampVelocity(), mapStrengthToVelocity(), quantizeAbsoluteBeat()

### Community 97 - "HeadPanel.tsx"
Cohesion: 0.36
Nodes (4): traceObservationOf(), HeadPanel(), HeadPanelProps, NumberFieldProps

### Community 98 - "Design Principles"
Cohesion: 0.29
Nodes (7): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Design Principles

### Community 99 - "What is missing: ratio, tuning, and melodic line"
Cohesion: 0.29
Nodes (7): Open threads, revisited, Still missing, Suggested next experiment, The experiment, and its result, What got built, What is missing: ratio, tuning, and melodic line, Where things stand

### Community 100 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react, react-dom, spessasynth_lib, react, react-dom, spessasynth_lib

### Community 102 - "bundledSoundBank.ts"
Cohesion: 0.33
Nodes (5): BundledBankState, bundledSoundBankBytes, bundledSoundBankLicensePath, bundledSoundBankPath, EnsureBundledBankOptions

### Community 104 - "melody.ts"
Cohesion: 0.40
Nodes (5): MelodyContourSpec, ScaleName, buildMelodicContour(), clamp(), ContourStep

### Community 106 - "MVP Scope"
Cohesion: 0.40
Nodes (5): Must Have, MVP Scope, Never, Post-v0.1, Stretch for v0.1

### Community 107 - "RecorderPanel.test.tsx"
Cohesion: 0.67
Nodes (3): base(), request, setup()

## Knowledge Gaps
- **693 isolated node(s):** `pageErrors`, `name`, `private`, `version`, `type` (+688 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Composition` connect `Composition` to `fields.ts`, `compositionEdits.ts`, `compositionRenderer.ts`, `compositionValidation.ts`, `compositions.ts`, `recording.ts`, `relations.ts`, `traceEncounters.ts`, `encounters.ts`, `composition.ts`, `PartPanel.tsx`, `App.tsx`, `parts.ts`, `audioRender.ts`, `SoundBankPanel.tsx`, `midiExport.ts`, `tuning.ts`, `heads.ts`, `variation.test.ts`, `performance.ts`, `SoundBankSettings.tsx`, `help.ts`, `variation.ts`, `usePerformanceCompiler.ts`, `audio.integration.test.ts`, `strudelExport.ts`, `RailPanel.tsx`, `soundbankStore.ts`, `traceEncounters.test.ts`, `compositionValidation.test.ts`, `mg13Fields.test.ts`, `HeadPanel.tsx`, `RecorderPanel.test.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `SoundBankStore` connect `soundbankStore.ts` to `soundfontEngine.ts`, `SoundBankReference`, `SoundBankSettings.tsx`, `bundledSoundBank.ts`, `soundfontEngine.test.ts`, `App.tsx`, `audio.integration.test.ts`, `SoundFontEngine`, `audioRender.ts`, `InstrumentEngine`, `Composition`, `compositions.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `InstrumentRouter` connect `SoundBankReference` to `InstrumentEngine`, `App.tsx`, `audio.integration.test.ts`, `audioRender.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `pageErrors`, `name`, `private` to the rest of the system?**
  _693 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Spirophonic Vision` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `fields.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05040611562350693 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._