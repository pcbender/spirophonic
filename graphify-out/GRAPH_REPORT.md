# Graph Report - spirophonic  (2026-07-19)

## Corpus Check
- 77 files · ~38,337 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 910 nodes · 2644 edges · 45 communities (40 shown, 5 thin omitted)
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 753 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `80e1b5da`
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

## God Nodes (most connected - your core abstractions)
1. `AlignedLyrics` - 57 edges
2. `RenderContext` - 57 edges
3. `ProjectManifest` - 46 edges
4. `SpirophonicTextError` - 46 edges
5. `OutputTimeline` - 43 edges
6. `StructuredLyrics` - 38 edges
7. `VisualLayerConfig` - 37 edges
8. `SpirophonicAlignmentError` - 35 edges
9. `AnalysisBundle` - 35 edges
10. `ChoreographyState` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Path` --uses--> `SpirophonicCancelledError`  [INFERRED]
  tests/test_reliability.py → src/spirophonic/encoder.py
- `AnalysisBundle` --uses--> `FeatureTimeline`  [INFERRED]
  tests/test_choreography.py → src/spirophonic/analysis.py
- `AlignedLyrics` --uses--> `SemanticControl`  [INFERRED]
  tests/test_choreography.py → src/spirophonic/analysis.py
- `AnalysisBundle` --uses--> `SemanticControl`  [INFERRED]
  tests/test_choreography.py → src/spirophonic/analysis.py
- `AlignedLyrics` --uses--> `AnalysisBundle`  [INFERRED]
  tests/test_choreography.py → src/spirophonic/analysis.py

## Import Cycles
- None detected.

## Communities (45 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (104): AlignedLyricSection, AlignmentConfig, FeatureTimeline, FreeTypeFont, ImageDraw, align_lyrics_document(), align_project(), align_token_sequences() (+96 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (29): 1. Relationship first, 2. Pure core, 3. Renderers are replaceable, 4. No premature dependency on Strudel, 5. Immediate feedback, 6. Small first success, Conceptual Model, Core Thesis (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (68): AudioState, WebAudioEngine, defaultModel, approximateCurvature(), approximateVelocity(), clamp(), getPointBounds(), mapRange() (+60 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (69): BaseModel, Random, SectionCompositionConfig, _auto_traces(), _drivers(), generate_auto_composition(), _jitter(), resolve_section_composition() (+61 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (35): dependencies, react, react-dom, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (36): Audio and Stem Analysis, Caching and Failure Behavior, Card and Audio Timeline, Decision Summary, Deferred Decisions, Geometry and Rendering, Goals, Golden and deterministic tests (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (40): float64, floating, _analysis_key(), AnalysisRun, analyze_project(), analyze_signal(), _band_energy(), _decode_audio() (+32 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): Boundaries, Browser prototype, Current State, Docs, Product Direction, Project Shape, Roadmap, Spirophonic

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
Cohesion: 0.27
Nodes (12): _cycle_end(), _epitrochoid_point(), generate_spiro_points(), greatest_common_divisor(), _hypotrochoid_point(), _javascript_round(), Match JavaScript Math.round for finite values used by the prototype., Generate the same trochoid points as the archived TypeScript prototype. (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (27): Argument, dir_okay, Exception, help, Option, resolve_path, SpirophonicAnalysisError, align() (+19 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (73): AudioSignal, int32, MappingPreset, AnalysisBundle, ChoreographyState, SpiroGeometry, AudioVisualState, _clamp() (+65 more)

### Community 36 - "Community 36"
Cohesion: 0.19
Nodes (20): OutputTimeline, build_render_manifest(), _ffmpeg_version(), _hash_file(), _input_hashes(), SpirophonicManifestError, write_render_manifest(), RenderContext (+12 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (13): cyclic_trace_window(), Return a stable cyclic pen position derived only from song time., Select a tail-to-head window from a closed curve, including wraparound., trace_progress(), TraceWindow, float32, NDArray, _closed_square() (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.21
Nodes (22): PreparedCards, PreparedCards, build_ffmpeg_command(), _closing_card_frame(), encode_output(), EncodingResult, _frames_for_duration(), iter_output_frames() (+14 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (16): diagnose_render(), plan_project_video(), Render, encode, verify, and atomically publish one MP4 plus manifest., render_project_video(), RenderDiagnostics, RenderPlan, RenderProfile, RenderRun (+8 more)

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (15): _aspect_ratio_matches(), default_render_manifest_path(), expectation_from_render_manifest(), _fraction(), _has_faststart(), _hash_file(), MediaMetadata, _metadata() (+7 more)

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (51): SectionVisualStyleConfig, choreography_at(), _clamp01(), _configured_style(), _integrated_style_value(), _interpolate_style(), Return an interpolated, manifest-configurable visual preset., _role_visibility() (+43 more)

### Community 43 - "Community 43"
Cohesion: 0.30
Nodes (12): CardConfig, blend_frames(), _parse_hex_color(), prepare_cards(), Fit a still card to one RGB frame without changing its aspect ratio., render_card(), SpirophonicCardError, validate_card_image() (+4 more)

## Knowledge Gaps
- **213 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+208 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RenderContext` connect `Community 36` to `Community 0`, `Community 35`, `Community 39`, `Community 40`, `Community 41`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `AlignedLyrics` connect `Community 0` to `Community 42`, `Community 35`, `Community 4`, `Community 36`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `ProjectManifest` connect `Community 35` to `Community 0`, `Community 33`, `Community 4`, `Community 36`, `Community 8`, `Community 42`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 53 inferred relationships involving `AlignedLyrics` (e.g. with `AlignedLyricSection` and `AlignmentConfig`) actually correct?**
  _`AlignedLyrics` has 53 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `RenderContext` (e.g. with `PreparedCards` and `EncodingResult`) actually correct?**
  _`RenderContext` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `ProjectManifest` (e.g. with `float64` and `floating`) actually correct?**
  _`ProjectManifest` has 40 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `SpirophonicTextError` (e.g. with `AlignedLyricSection` and `AlignmentConfig`) actually correct?**
  _`SpirophonicTextError` has 40 INFERRED edges - model-reasoned connections that need verification._