# Graph Report - spirophonic  (2026-08-05)

## Corpus Check
- 93 files · ~64,267 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 953 nodes · 1858 edges · 57 communities (54 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfb95fa7`
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

## God Nodes (most connected - your core abstractions)
1. `Spirophonic Music Generator Build Plan` - 35 edges
2. `Spirophonic Domain Model` - 30 edges
3. `SpirophonicModel` - 24 edges
4. `Composition` - 20 edges
5. `Sound, Rhythm, and MIDI Design` - 20 edges
6. `Spirophonic POC Initial WBS and CP Packets` - 18 edges
7. `compilerOptions` - 17 edges
8. `Spirophonic Music Generator Progress Tracker` - 17 edges
9. `Spirophonic Vision` - 17 edges
10. `SpiroPoint` - 16 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `generateCurvePoints()`  [EXTRACTED]
  src/App.tsx → src/core/curves.ts
- `App()` --calls--> `generateSpiroPoints()`  [EXTRACTED]
  src/App.tsx → src/core/trochoid.ts
- `playTone()` --calls--> `midiToFrequency()`  [EXTRACTED]
  src/audio/toneSynth.ts → src/core/scales.ts
- `issueAt()` --calls--> `validateComposition()`  [EXTRACTED]
  src/core/compositionValidation.test.ts → src/core/compositionValidation.ts
- `parseCompositionJson()` --calls--> `validateComposition()`  [EXTRACTED]
  src/export/compositionJson.ts → src/core/compositionValidation.ts

## Import Cycles
- None detected.

## Communities (57 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (8): Open threads not resolved here, The experiment, The gap, The observation, The reframe, Three more, in order of how much they would change, What is missing: ratio, tuning, and melodic line, Why the ratio is already the interval

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Conceptual Model, Core Thesis (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (24): AudioState, WebAudioEngine, approximateCurvature(), approximateVelocity(), clamp(), getPointBounds(), mapRange(), normalize() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (38): SpaceSpec, SpokeFieldSpec, TracePresentationSpec, BoundaryLabelDrawCommand, buildCompositionDrawCommands(), buildCompositionScene(), CanvasViewport, ClearDrawCommand (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): dependencies, react, react-dom, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (33): CycleRate, LoopSpec, MeterSpec, TransportSpec, barPhaseAtBeat(), barsToBeats(), beatsToBars(), beatsToSeconds() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (36): noteLengths(), VoiceNote, allVoicesOn, midiNoteOnsPerTrack(), midiNoteSpans(), buildMidiBytes(), defaultMidiExportOptions, downloadMidiFile() (+28 more)

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
Nodes (12): ScaleName, Voice, RenderedVoice, drumSounds, exportStrudelSnippet(), instrument(), scaleName(), strudelInstruments (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (40): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria (+32 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (42): NotePartSpec, attachmentKinds, CompositionValidationResult, encounterDirections, isComposition(), JsonObject, motionKinds, relationEventKinds (+34 more)

### Community 35 - "Community 35"
Cohesion: 0.06
Nodes (53): BoundaryBase, FieldSpec, RingBoundarySpec, RingFieldSpec, SpokeBoundarySpec, assertPathPoint(), crossingLiesOnBoundary(), crossingRefinementDefaults (+45 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (29): ControlPartSpec, DurationMapping, EncounterQuery, EnvelopeSpec, HarmonographHeadAttachment, HarmonographMotionSpec, InstrumentBase, InstrumentSpec (+21 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (35): Architectural invariants, Canonical event layers, Decisions already made, Definition of the first meaningful generator, Meaning of Wheel, Head, shape, and Trace, MG-01 — Composition schema and validation, MG-02 — Deterministic Transport and performance window, MG-03 — Wheel and multi-Head state engine (+27 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (26): Boundary, Composition, Conceptual Structure, Core Idea, Crossing, Defining Statement, Determinism, Encounter (+18 more)

### Community 39 - "Community 39"
Cohesion: 0.07
Nodes (28): 2026-08-05 MG-01 author handoff, 2026-08-05 MG-02 author handoff, 2026-08-05 MG-03 author handoff, 2026-08-05 MG-04 author handoff, 2026-08-05 MG-05 author handoff, Active claims, Active packet records, Activity log (+20 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (26): circularCurvatures(), circularSpeeds(), CurveEvent, cycleDistance(), defaultExtractOptions, extractEvents(), findCrossings(), findPeaks() (+18 more)

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (10): clampCyclesPerSecond(), formatCycleSetting(), formatLoopSeconds(), getEffectiveCyclesPerSecond(), App(), CanvasView(), ControlPanel(), Transport() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.19
Nodes (9): Composition, CompositionVersion, CompositionValidationIssue, wheelStatesAt(), CompositionJsonErrorCode, CompositionJsonImportResult, exportCompositionToJson(), isObject() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (22): EncounterDirection, BoundaryCrossingEncounter, BoundaryEncounterDirection, BoundaryEncounterPath, boundaryEncountersForPath(), boundaryNormal(), compareBoundaryEncounters(), compareText() (+14 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (14): CrossingDirection, CurveFamily, ExtractOptions, FrequencyMode, HueSource, ModelVersion, PitchSource, RotationMode (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (11): HeadSpec, Point2, WheelSpec, findHead(), HeadState, headStateAt(), headStatesAt(), LocatedHead (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.06
Nodes (52): HeadAttachmentSpec, MotionSpec, close(), curveFamilies, fit(), generateCurvePoints(), Geometry, harmonographPointAtTheta() (+44 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (9): Closure is not a bar, Encounter is not a note, Field is not musical meaning, Important Distinctions, Part is not Instrument, Recording is not merely export, Variation is not nondeterminism, Wheel is not necessarily closed (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.28
Nodes (8): PreviewHit, allOn, shapeRhythm(), noteFor(), renderVoice(), renderVoices(), renderVoice(), voiceGeometry()

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
Cohesion: 0.36
Nodes (10): frequencyToMidi(), fromScaleDegree(), midiToFrequency(), midiToName(), noteNames, quantizeFrequency(), quantizeToScale(), scaleIntervals (+2 more)

### Community 53 - "Community 53"
Cohesion: 0.36
Nodes (4): playTone(), VoicePreview, Waveform, PreviewPlan

### Community 54 - "Community 54"
Cohesion: 0.39
Nodes (7): DrumShape, envelope(), fallback, noiseBuffer(), playDrum(), shapes, tone()

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (5): CurveEventSource, drumOptions, shapeLabels, triggerLabels, VoicePanelProps

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (3): presets, PresetPicker(), PresetPickerProps

## Knowledge Gaps
- **442 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+437 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Point2` connect `Community 45` to `Community 35`, `Community 36`, `Community 4`, `Community 43`, `Community 46`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Composition` connect `Community 42` to `Community 34`, `Community 35`, `Community 36`, `Community 4`, `Community 43`, `Community 45`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `MotionSpec` connect `Community 46` to `Community 34`, `Community 36`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _442 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._