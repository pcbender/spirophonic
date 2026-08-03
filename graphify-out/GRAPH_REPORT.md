# Graph Report - spirophonic  (2026-08-03)

## Corpus Check
- 56 files · ~22,845 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 487 nodes · 847 edges · 34 communities (31 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10129d09`
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

## God Nodes (most connected - your core abstractions)
1. `SpirophonicModel` - 23 edges
2. `Spirophonic POC Initial WBS and CP Packets` - 18 edges
3. `compilerOptions` - 17 edges
4. `Spirophonic Vision` - 17 edges
5. `SpiroPoint` - 16 edges
6. `generateSpiroPoints()` - 16 edges
7. `compilerOptions` - 16 edges
8. `Sound, Rhythm, and MIDI Design` - 16 edges
9. `generateCurvePoints()` - 13 edges
10. `defaultModel` - 12 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `getEffectiveCyclesPerSecond()`  [EXTRACTED]
  src/App.tsx → src/core/time.ts
- `renderVoice()` --calls--> `generateCurvePoints()`  [EXTRACTED]
  src/core/voices.ts → src/core/curves.ts
- `circlePoints()` --calls--> `generateSpiroPoints()`  [EXTRACTED]
  src/core/events.test.ts → src/core/trochoid.ts
- `pitchField()` --calls--> `normalize()`  [EXTRACTED]
  src/core/voices.ts → src/core/events.ts
- `noteFor()` --calls--> `quantizeToScale()`  [EXTRACTED]
  src/core/voices.ts → src/core/scales.ts

## Import Cycles
- None detected.

## Communities (34 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (15): CrossingDirection, ExtractOptions, FrequencyMode, HueSource, ModelVersion, RotationMode, VoiceKind, Waveform (+7 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Conceptual Model, Core Thesis (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (25): AudioState, WebAudioEngine, approximateCurvature(), approximateVelocity(), clamp(), getPointBounds(), mapRange(), normalize() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (18): frequencyToMidi(), fromScaleDegree(), midiToFrequency(), midiToName(), noteNames, quantizeFrequency(), quantizeToScale(), scaleIntervals (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (34): dependencies, react, react-dom, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (48): close(), curveFamilies, fit(), generateCurvePoints(), Geometry, harmonographPoints(), lissajous(), ParametricCurve (+40 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (40): CurveEventSource, ScaleName, clampCyclesPerSecond(), formatCycleSetting(), formatLoopSeconds(), getEffectiveCyclesPerSecond(), VoiceNote, buildMidiBytes() (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): Boundaries, Composing with curves, Current state, Docs, Project shape, Roadmap, Run the app, Spirophonic

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, Constraints, CP-001 - Scaffold Vite React TypeScript App, Goal, Required Files, Scope, Suggested Commands

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (7): Acceptance Criteria, CP-012 - README and Demo Polish for v0.1, Execution Guidance for CP, Goal, Scope, Spirophonic POC Initial WBS and CP Packets, WBS Overview

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
Cohesion: 0.50
Nodes (4): Acceptance Criteria, CP-011 - Testing Pass for v0.1, Goal, Scope

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (31): circularCurvatures(), circularSpeeds(), CurveEvent, cycleDistance(), defaultExtractOptions, extractEvents(), findCrossings(), findPeaks() (+23 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (35): Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Acceptance criteria, Algorithms (+27 more)

## Knowledge Gaps
- **226 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Spirophonic POC Initial WBS and CP Packets` connect `Community 11` to `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `SpirophonicModel` connect `Community 2` to `Community 0`, `Community 32`, `Community 4`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `SpiroPoint` connect `Community 2` to `Community 32`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._