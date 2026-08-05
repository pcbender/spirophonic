# Graph Report - spirophonic  (2026-08-05)

## Corpus Check
- 102 files · ~72,426 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1100 nodes · 2243 edges · 61 communities (58 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f48a682`
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
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]

## God Nodes (most connected - your core abstractions)
1. `Spirophonic Music Generator Build Plan` - 35 edges
2. `Spirophonic Domain Model` - 30 edges
3. `PerformanceScheduler` - 28 edges
4. `SpirophonicModel` - 24 edges
5. `Composition` - 22 edges
6. `Sound, Rhythm, and MIDI Design` - 20 edges
7. `Spirophonic POC Initial WBS and CP Packets` - 18 edges
8. `compilerOptions` - 17 edges
9. `Spirophonic Music Generator Progress Tracker` - 17 edges
10. `Spirophonic Vision` - 17 edges

## Surprising Connections (you probably didn't know these)
- `issueAt()` --calls--> `validateComposition()`  [EXTRACTED]
  src/core/compositionValidation.test.ts → src/core/compositionValidation.ts
- `pitchField()` --calls--> `normalize()`  [EXTRACTED]
  src/core/voices.ts → src/core/events.ts
- `App()` --calls--> `generateCurvePoints()`  [EXTRACTED]
  src/App.tsx → src/core/curves.ts
- `App()` --calls--> `getEffectiveCyclesPerSecond()`  [EXTRACTED]
  src/App.tsx → src/core/time.ts
- `App()` --calls--> `generateSpiroPoints()`  [EXTRACTED]
  src/App.tsx → src/core/trochoid.ts

## Import Cycles
- None detected.

## Communities (61 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (8): Open threads not resolved here, The experiment, The gap, The observation, The reframe, Three more, in order of how much they would change, What is missing: ratio, tuning, and melodic line, Why the ratio is already the interval

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Conceptual Model, Core Thesis (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.28
Nodes (13): AudioState, WebAudioEngine, approximateCurvature(), approximateVelocity(), clamp(), getPointBounds(), mapRange(), normalize() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (29): TracePresentationSpec, findHead(), HeadState, headStateAt(), BoundaryLabelDrawCommand, buildCompositionDrawCommands(), buildCompositionScene(), CanvasViewport (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): dependencies, react, react-dom, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (74): CycleRate, EncounterDirection, Point2, TransportSpec, WheelSpec, BoundaryCrossingEncounter, BoundaryEncounterDirection, BoundaryEncounterPath (+66 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (40): noteLengths(), clampCyclesPerSecond(), formatCycleSetting(), formatLoopSeconds(), getEffectiveCyclesPerSecond(), VoiceNote, allVoicesOn, midiNoteOnsPerTrack() (+32 more)

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
Cohesion: 0.15
Nodes (25): EncounterQuery, SpaceSpec, encounterMatchesQuery(), encounterSpatialSource(), encounterSpatialUnit(), includesOrAny(), mapEncounterPitch(), PartMappingIssue (+17 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (40): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria (+32 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (37): attachmentKinds, CompositionValidationResult, encounterDirections, isComposition(), JsonObject, motionKinds, relationEventKinds, scaleNames (+29 more)

### Community 35 - "Community 35"
Cohesion: 0.07
Nodes (51): BoundaryBase, FieldSpec, RingBoundarySpec, SpokeBoundarySpec, assertPathPoint(), crossingLiesOnBoundary(), crossingRefinementDefaults, CrossingRefinementOptions (+43 more)

### Community 36 - "Community 36"
Cohesion: 0.08
Nodes (23): ControlPartSpec, DurationMapping, HarmonographHeadAttachment, HarmonographMotionSpec, InstrumentBase, LissajousHeadAttachment, LissajousMotionSpec, LoopSpec (+15 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (35): Architectural invariants, Canonical event layers, Decisions already made, Definition of the first meaningful generator, Meaning of Wheel, Head, shape, and Trace, MG-01 — Composition schema and validation, MG-02 — Deterministic Transport and performance window, MG-03 — Wheel and multi-Head state engine (+27 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (26): Boundary, Composition, Conceptual Structure, Core Idea, Crossing, Defining Statement, Determinism, Encounter (+18 more)

### Community 39 - "Community 39"
Cohesion: 0.06
Nodes (32): 2026-08-05 MG-01 author handoff, 2026-08-05 MG-02 author handoff, 2026-08-05 MG-03 author handoff, 2026-08-05 MG-04 author handoff, 2026-08-05 MG-05 author handoff, 2026-08-05 MG-06 author handoff, 2026-08-05 MG-07 author handoff, Active claims (+24 more)

### Community 40 - "Community 40"
Cohesion: 0.26
Nodes (14): circularCurvatures(), circularSpeeds(), cycleDistance(), defaultExtractOptions, extractEvents(), findCrossings(), findPeaks(), normalize() (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (10): SpirophonicModel, presets, App(), CanvasView(), ControlPanel(), ImportExportPanel(), PresetPicker(), PresetPickerProps (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (6): CompositionValidationIssue, CompositionJsonErrorCode, CompositionJsonImportResult, exportCompositionToJson(), isObject(), parseCompositionJson()

### Community 43 - "Community 43"
Cohesion: 0.07
Nodes (20): InstrumentEngine, NativeSynthEngine, compareEvents(), compareText(), EventOccurrence, indexInstruments(), PendingPerformance, PerformanceEditBoundary (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (22): curveFamilies, CrossingDirection, CurveEventSource, CurveFamily, ExtractOptions, FrequencyMode, HueSource, ModelVersion (+14 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (4): HeadSpec, SpokeFieldSpec, ObservationInterval, observation

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (16): defaultModel, defaultPitch, defaultVoices, familyDefaults, PitchOptions, downloadModelJson(), exportModelToJson(), hasNumbers() (+8 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (9): Closure is not a bar, Encounter is not a note, Field is not musical meaning, Important Distinctions, Part is not Instrument, Recording is not merely export, Variation is not nondeterminism, Wheel is not necessarily closed (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (8): PreviewHit, allOn, noteFor(), pitchField(), renderVoice(), renderVoices(), renderVoice(), voiceGeometry()

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
Cohesion: 0.12
Nodes (11): Composition, CompositionVersion, NotePartSpec, RingFieldSpec, issueAt(), motionCases, notePart, ringField (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.05
Nodes (35): DrumShape, envelope(), fallback, nativeVoiceNotes, noiseBuffer(), playDrum(), playNativeDrum(), scheduledVoice() (+27 more)

### Community 54 - "Community 54"
Cohesion: 0.19
Nodes (16): QuantizeSpec, VelocityMapping, CurveEvent, QuantizeOptions, VelocityOptions, applyVelocity(), clampUnit(), clampVelocity() (+8 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (13): ScaleName, ScaleName, midiToName(), RenderedVoice, drumSounds, exportStrudelSnippet(), instrument(), scaleName() (+5 more)

### Community 56 - "Community 56"
Cohesion: 0.22
Nodes (8): drawCompositionCommands(), sceneSpacePoints(), TraceMode, CanvasSize, CompositionCanvas(), CompositionCanvasProps, context, observation

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (12): close(), fit(), generateCurvePoints(), Geometry, HarmonographPointParameters, harmonographPoints(), lissajous(), ParametricCurve (+4 more)

### Community 60 - "Community 60"
Cohesion: 0.27
Nodes (11): HeadAttachmentSpec, MotionSpec, harmonographPointAtTheta(), lissajousPointAtTheta(), rosePointAtTheta(), superformulaPointAtTheta(), assertMatchingFamily(), MotionEvaluation (+3 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (11): circlePoints(), epitrochoidPointAtTheta(), generateSpiroPoints(), getCycleEnd(), hypotrochoidPointAtTheta(), safeDivisor(), downloadTraceSvg(), escapeXml() (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.28
Nodes (10): SpiroPoint, clampProgress(), drawSpiroTrace(), DrawTraceOptions, drawVoices(), getCanvasTransform(), transformPoint(), VoiceTrace (+2 more)

## Knowledge Gaps
- **457 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+452 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScaleName` connect `Community 55` to `Community 32`, `Community 34`, `Community 36`, `Community 44`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `InstrumentSpec` connect `Community 43` to `Community 36`, `Community 53`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _457 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09195402298850575 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._