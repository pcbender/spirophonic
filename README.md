# Spirophonic

Spirophonic is a WSL2-first Python command-line renderer for deterministic lyric
music videos. Master audio, aligned stems, structured lyrics, and cyclic
relationships drive co-centered spirograph animation on an offline render
timeline.

## Product Direction

The supplied master is always the sole output audio program. Individual stems
exist only for analysis and visual control. Complete lyric lines will be aligned
through an editable artifact and rendered over deterministic frames before
native FFmpeg encoding and ffprobe verification.

See [Python CLI Music-Video Renderer Design](docs/PYTHON-CLI-MUSIC-VIDEO-DESIGN.md)
for the approved product contract, architecture, environment, and transition
plan.

## Current State

The Python CLI now implements all six planned MVP phases: project and lyric
validation, deterministic trochoid geometry, master/stem analysis, line-level
lyric alignment, multi-layer frame rendering, semantic audio mappings, section
choreography, complete-line typography, cards, direct FFmpeg encoding,
master-only audio, ffprobe verification, and render manifests. The reliability
pass adds measured mapping and palette presets, early render preflight, dry-run
diagnostics, performance profiling, progress with ETA, cancellation cleanup,
and long-song coverage. The original Vite + React + TypeScript prototype
remains temporarily in the working tree and is archived at tag
`web-prototype-v0.1`.

Set up and check the Python CLI:

```bash
uv sync --locked --dev
uv run spirophonic --help
uv run spirophonic validate path/to/project.yaml
uv run spirophonic analyze path/to/project.yaml
uv run ruff check .
uv run pytest
```

Install the optional alignment dependency, provide the API key through the
environment, and align a project that declares both `audio.stems.vocals` and
`lyrics.aligned`:

```bash
uv sync --locked --dev --extra align
export OPENAI_API_KEY="..."
uv run spirophonic align path/to/project.yaml
```

The command asks `whisper-1` for word and segment timestamps, caches the raw
transcription by vocal-stem hash and settings, then maps those timestamps onto
the canonical lyric lines. It preserves the author's text, sections, and line
breaks in an editable YAML artifact. Uncertain and unmatched lines receive a
status, confidence, usable interpolated timing, and a review warning.

An existing aligned file is never overwritten by default. Use `--force` after
you intentionally choose to replace manual edits; this still reuses the cached
transcription. Add `--retranscribe` only when you also want a new API request.
Once the cache and aligned artifact exist, subsequent alignment and future
rendering paths do not need network access or an API key.

Inspect one deterministic song frame after reviewing the aligned artifact:

```bash
uv run spirophonic frame project.yaml --time 60 --output build/frame-60.png
```

Render a bounded development sequence at the project resolution and frame rate,
or use the 960x540 / 15 fps draft ceiling:

```bash
uv run spirophonic frames project.yaml --from 60 --to 65 \
  --output build/frames-60-65
uv run spirophonic frames project.yaml --from 60 --to 65 --draft \
  --output build/frames-60-65-draft
```

These inspection commands write PNGs and a `frames.json` timing record.
They refuse to overwrite outputs by default, and `frames --force` replaces only
a directory carrying Spirophonic's frame-sequence marker.

Render and independently re-verify the finished video:

```bash
uv run spirophonic presets
uv run spirophonic render project.yaml --dry-run
uv run spirophonic render project.yaml --output build/music-video.mp4
uv run spirophonic render project.yaml --profile \
  --output build/music-video-profiled.mp4
uv run spirophonic verify build/music-video.mp4
```

`presets` lists the available measured artistic controls. Select them in the
project manifest, with an optional custom palette taking precedence:

```yaml
visuals:
  mapping_preset: balanced  # balanced, restrained, kinetic, or vocal-focus
  palette_preset: aurora    # layer, aurora, ember, ocean, or monochrome
  # palette: ["#f7b267", "#f4845f", "#f27059"]
```

`--dry-run` performs the complete project, FFmpeg, font, and card preflight and
prints the calculated timeline, frame count, raw-stream size, presets, and
warnings without creating an output. `--profile` prints preparation, encoding,
and verification timings plus frames per second and realtime throughput.

A complete render places the opening card and silence before the master, then
the animated song, then the closing card and silence. `--from` and `--to` are
song-time excerpt controls and intentionally omit both cards. `--draft` applies
the same musical timeline at the draft resolution and frame-rate ceiling.

Normal rendering streams RGB frames directly to FFmpeg without intermediate
PNGs. Progress reports completion percentage, render throughput, and ETA. The
MP4 is published only after ffprobe verifies its container, streams, codecs,
pixel format, dimensions, frame rate, audio profile, duration, square pixels,
and faststart layout. A neighboring `.render.json` records input hashes, the
seed, artistic presets, dependency versions, encoding settings, output metadata,
stage timings, throughput, and warnings. Existing MP4s and manifests require an
explicit `--force`. Cancelling with Ctrl+C terminates FFmpeg and removes the
unpublished temporary output.

The first Python tranche includes strict project and lyric contracts, local
input and audio-duration validation, and a trochoid port checked against golden
fixtures exported from the TypeScript engine. Audio analysis extracts and caches
normalized energy, frequency-band, centroid, onset, beat, tempo, and vocal
activity features on one shared master timeline. Missing semantic stems fall
back to master-derived frequency bands.

### Browser prototype

Current prototype features:

- Typed Spirophonic relationship model
- Inside/outside trochoid trace generation
- Canvas trace rendering with relationship-derived color
- Interactive geometry, time, sound, and color controls
- Animation transport
- WebAudio oscillator preview
- JSON model export/import
- Core math and export tests

Install dependencies:

```bash
npm install
```

Run the app and checks:

```bash
npm run dev
npm test
npm run build
npm run lint
```

## Docs

- [Python CLI Music-Video Renderer Design](docs/PYTHON-CLI-MUSIC-VIDEO-DESIGN.md)
- [Vision](docs/VISION.md)
- [Initial WBS and CP Packets](docs/INITIAL-WBS-AND-CP-PACKETS.md)

## Project Shape

The Python package is now the product source of truth. The browser files remain
only as a transition reference until the repository pivot is complete.

The main areas are:

- `src/spirophonic/cli.py` - command-line entry points
- `src/spirophonic/project.py` - project and lyric contracts and validation
- `src/spirophonic/geometry.py` - deterministic trochoid geometry
- `src/spirophonic/analysis.py` - cached shared-timeline audio features
- `src/spirophonic/alignment.py` - cached transcription and canonical line cues
- `src/spirophonic/presets.py` - measured mapping and palette presets
- `src/spirophonic/mappings.py` - semantic audio-to-visual controls
- `src/spirophonic/choreography.py` - interpolated section presets
- `src/spirophonic/text.py` - complete-line lyric cue and typography rendering
- `src/spirophonic/renderer.py` - deterministic RGB frames and inspection output
- `src/spirophonic/cards.py` - aspect-safe card fitting and crossfades
- `src/spirophonic/encoder.py` - output timeline and direct FFmpeg streaming
- `src/spirophonic/verification.py` - ffprobe output-contract enforcement
- `src/spirophonic/render_manifest.py` - reproducibility and output metadata
- `src/spirophonic/pipeline.py` - encode, verify, and atomic publication workflow
- `tests/fixtures/` - TypeScript-exported geometry fixtures
- `src/core/` and the other TypeScript directories - browser prototype reference

## Boundaries

Spirophonic v1 stays headless and offline-first. It is not a DAW, audio mixer,
subtitle editor, hosted service, or real-time preview application. Do not add a
browser, desktop, or cloud UI to the first renderer version.

Use artistic language such as "generative audio-visual instrument" or
"relationship-based sound and color system." Do not claim that frequencies or
patterns heal, treat, reset, or diagnose anything.

## Roadmap

All six planned MVP implementation phases are present. The next milestone is a
real-song acceptance render to tune the defaults and confirm the full artistic
workflow with production inputs. Local forced alignment, GPU acceleration, and
any UI remain post-MVP decisions.
