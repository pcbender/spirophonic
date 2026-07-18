# Spirophonic Python CLI Music-Video Renderer

Status: design approved for implementation  
Decision date: 2026-07-18

## Purpose

Spirophonic will pivot from the current browser instrument prototype to a
headless Python command-line renderer for finished music videos. The renderer
will turn a mastered song, aligned stems, structured lyrics, and opening and
closing cards into a deterministic widescreen MP4 containing co-centered
spirograph animation, line-level lyric text, and the master audio track.

This is a continuation of the Spirophonic idea: cyclic relationships remain the
source of shape, motion, and color. The music-video renderer changes the primary
workflow from interactive browser synthesis to offline, music-driven rendering.

## Decision Summary

- Continue in this repository rather than create a second repository.
- Preserve the existing web prototype in Git history and tag its final state
  before removing or reorganizing it.
- Make a Python CLI the primary product. No React, browser UI, desktop UI, or
  hosted service is required for the first version.
- Develop and render in an Ubuntu-based WSL2 environment.
- Store the active repository in the WSL Linux filesystem, not under `/mnt/c`
  or `/mnt/d`, and keep only one authoritative working copy.
- Use the supplied master audio as the only audio in the final video.
- Use individual stems only for analysis and visual control.
- Display complete lyric lines. Do not implement karaoke-style word placement
  or word highlighting.
- Use OpenAI Whisper timestamps as alignment evidence, then map those timestamps
  onto the canonical structured lyrics and save an editable line-level artifact.
- Render frames deterministically and pipe them directly to native FFmpeg.

## Goals

The first usable renderer must:

1. Validate a project and all referenced files before doing expensive work.
2. Align structured lyric lines to an isolated vocal stem or accept previously
   aligned lyrics.
3. Analyze the master and named stems on a shared time axis.
4. Render multiple co-centered spirograph layers whose motion and appearance
   respond to the song and its sections.
5. Render readable, timed lyric lines without word highlighting.
6. Place opening and closing JPG cards on a defined output timeline.
7. Produce and verify a YouTube-ready 1920x1080 MP4 containing the master audio.
8. Produce the same result from the same inputs, configuration, dependency
   versions, and random seed.

## Non-Goals for the First Version

- Interactive UI or real-time preview
- Live microphone input
- Audio mixing, mastering, or stem modification
- Word-by-word karaoke animation
- Generative-AI video frames
- Cloud rendering, uploads, authentication, or job queues
- A DAW, nonlinear editor, or general-purpose subtitle editor
- Local stem separation when the project already supplies stems
- Medical, therapeutic, or healing claims

## User Workflow

The normal workflow will be:

```text
prepare project.yaml, lyrics.yaml, audio, stems, and cards
    -> spirophonic validate project.yaml
    -> spirophonic align project.yaml
    -> review or edit lyrics.aligned.yaml when needed
    -> spirophonic render project.yaml --output build/music-video.mp4
    -> spirophonic verify build/music-video.mp4
```

`spirophonic render` may run validation, alignment, analysis, encoding, and
verification automatically when their cached artifacts do not exist. Separate
commands remain available for inspection and correction.

Useful development commands should include:

```bash
spirophonic render project.yaml --draft
spirophonic render project.yaml --from 60 --to 90
spirophonic render project.yaml --seed 4821
spirophonic analyze project.yaml --force
```

Draft mode should use a lower resolution and frame rate, initially 960x540 at
15 fps, while retaining the same musical and geometric timeline.

## Project Input Contract

The project manifest will be YAML and validated before rendering. Paths are
relative to the manifest unless absolute paths are explicitly allowed later.

```yaml
version: 1
title: Example Song

audio:
  master: audio/master.wav
  stems:
    vocals: audio/vocals.wav
    drums: audio/drums.wav
    bass: audio/bass.wav
    instruments: audio/instruments.wav

lyrics:
  source: lyrics.yaml
  aligned: build/lyrics.aligned.yaml
  language: en

cards:
  opening:
    file: cards/opening.jpg
    duration: 3.0
    fit: contain
    fade: 0.5
  closing:
    file: cards/closing.jpg
    duration: 4.0
    fit: contain
    fade: 0.75

video:
  width: 1920
  height: 1080
  fps: 30
  background: "#101014"
  seed: 4821

text:
  font: assets/lyrics-font.ttf
  size: 60
  position: bottom
  active_color: "#ffffff"
  show_section_titles: true
```

Initial validation rules:

- The master, every declared stem, lyric source, card, and font must exist.
- The master defines time zero and the authoritative song duration.
- Stems must be aligned to the master and must match its duration within a small
  configurable tolerance. The renderer must reject unexplained offsets rather
  than silently compensate for them.
- Stems may be mono or stereo and may use different sample rates; analysis must
  resample them onto a consistent analysis timeline.
- The master must never be reconstructed from the stems.
- Card dimensions may differ from 16:9; `contain` must preserve the complete
  image and `cover` may crop it.

## Structured Lyrics Contract

The supplied lyric document preserves the author's sections, ordering, line
breaks, punctuation, and capitalization.

```yaml
version: 1
sections:
  - id: verse_1
    type: verse
    label: Verse 1
    lines:
      - text: "First line of the song"
      - text: "Second line of the song"

  - id: chorus_1
    type: chorus
    label: Chorus
    lines:
      - text: "This is the chorus"
      - text: "And this is where it rises"
```

Repeated choruses are separate occurrences on the timeline even when their text
is identical. A future shorthand may reference a previous section, but it must
expand into distinct timed line instances before rendering.

The renderer consumes an aligned artifact containing line cues:

```yaml
version: 1
source: lyrics.yaml
sections:
  - id: verse_1
    type: verse
    start: 12.40
    end: 20.80
    lines:
      - text: "First line of the song"
        start: 12.40
        end: 16.15
        confidence: 0.96
      - text: "Second line of the song"
        start: 16.30
        end: 20.80
        confidence: 0.91
```

All timestamps are seconds relative to the start of the master audio. The video
renderer adds any opening-card pre-roll when it places cues on the final video
timeline.

## Lyric Alignment

Line timing is easier and more appropriate for this music-video workflow than
word highlighting. OpenAI Whisper can return segment and word timestamps. The
alignment stage may use word timestamps internally to locate lyric-line
boundaries, but word timing is not part of the renderer contract and is not
displayed.

The default alignment process is:

1. Send the isolated vocal stem to the OpenAI transcription API using
   `whisper-1`, `verbose_json`, and segment plus word timestamp granularities.
2. Normalize the recognized transcript and canonical lyrics for matching while
   retaining the canonical spelling, punctuation, capitalization, sections, and
   line breaks for output.
3. Use sequence alignment to match recognized words to canonical lyric lines in
   performance order.
4. Set a line start from its first reliable matched word.
5. Set a line end from its last reliable matched word, the vocal energy tail,
   and the following line boundary.
6. Aggregate confidence and flag uncertain or unmatched lines.
7. Write `lyrics.aligned.yaml`. Never silently overwrite a reviewed aligned
   file unless the user passes an explicit force option.

Whisper is transcription rather than strict singing-specific forced alignment.
Held syllables, harmonies, repeated phrases, effects, and ad-libs can reduce
accuracy. The isolated vocal stem and canonical lyric sequence should improve
matching, but the aligned artifact remains editable and authoritative.

Rendering does not require network access when an aligned file already exists.
The OpenAI API key must be supplied through `OPENAI_API_KEY`, must never appear
in project files, and must never be logged.

Official references:

- <https://platform.openai.com/docs/api-reference/audio>
- <https://developers.openai.com/api/docs/models/whisper-1>

## Audio and Stem Analysis

Analysis will be computed once, cached, and sampled or interpolated at render
time. Initial features include:

- RMS and peak energy
- Low-, mid-, and high-frequency band energy
- Spectral centroid
- Spectral flux or onset strength
- Beat and tempo estimates
- Vocal activity and short-term vocal energy

Each feature must be normalized per track with robust percentiles and smoothed
with explicit attack and release behavior. Raw FFT values must not directly
control visual parameters.

Initial semantic mapping:

| Input | Visual role |
| --- | --- |
| Drums | onset pulses, accents, flashes, line-width impulses |
| Bass | large outer-layer scale and breathing |
| Vocals | central flowing layer, luminosity, color motion |
| Instruments | intermediate layers and rotational movement |
| Master | global energy, palette intensity, background response |

Missing optional stems should not prevent rendering. The mapping layer must
fall back to master-derived frequency bands when a semantic stem is absent.

## Section-Aware Choreography

Structured lyrics provide high-level musical sections as well as text. Section
timing is derived from the aligned lines and may be overridden explicitly.

Default choreography should be restrained and configurable:

- Verse: fewer visible layers, slower motion, narrower scale range
- Chorus: full layer stack, wider scale, stronger color and onset response
- Bridge: palette or rotation-direction change
- Instrumental: lyric text hidden; stem-driven animation continues
- Section transitions: short interpolated transitions rather than abrupt state
  changes

These are presets, not hard-coded artistic rules. A project-level mapping model
must eventually allow songs to override them.

## Geometry and Rendering

The Python implementation will port the existing inside/outside trochoid math
from `src/core/trochoid.ts`. Golden fixtures must prove that TypeScript and
Python generate equivalent points before the old prototype is removed from the
working tree.

All layers share a canvas center and scene coordinate system. Each layer has a
base curve plus time-varying transform and style state. Keep fixed and moving
radius relationships stable during normal animation because changing their
rounded ratio changes curve closure and topology. Prefer modulation of:

- scale
- rotation and phase
- pen offset within bounded ranges
- reveal and trail behavior
- hue and palette position
- opacity
- line width
- blend mode

Base curves and stable derived data should be cached. Geometry must be
regenerated only when a parameter that changes the curve itself changes.

The initial renderer will use NumPy frame buffers, OpenCV antialiased polylines,
and Pillow for cards and typography. It will pipe RGB frames directly to FFmpeg;
it must not write one PNG per frame during normal rendering.

The deterministic render entry point should conceptually be:

```python
render_frame(project, analysis, time_seconds, frame_index) -> numpy.ndarray
```

Time comes from `frame_index / fps`, never from wall-clock time.

## Card and Audio Timeline

Default output ordering:

```text
opening card with silence
    -> master audio plus spirographs and lyric lines
    -> closing card with silence
```

The output duration is therefore:

```text
opening duration + master duration + closing duration
```

The default is explicit pre-roll and post-roll, not overlay. A later manifest
option may place cards over the beginning or end of the master without changing
lyric timestamps.

Cards should support a background color, `contain` or `cover`, and crossfades.
Motion effects are outside the first version.

## Output Contract

The default output is suitable for a normal widescreen YouTube music-video
upload:

- MP4 container
- 1920x1080 square-pixel 16:9 video
- Progressive 30 fps
- H.264 video
- `yuv420p` pixel format
- AAC-LC stereo audio, normally 48 kHz
- The supplied master as the sole audio program
- Web-optimized MP4 metadata placement (`faststart`)

FFmpeg and ffprobe are required external executables. The encoder must map the
rendered video stream and master audio explicitly, add silence for pre-roll and
post-roll, stop at the calculated output duration, and fail on encoding errors.

Official references:

- <https://support.google.com/youtube/answer/1722171>
- <https://support.google.com/youtube/answer/6039860>
- <https://ffmpeg.org/ffmpeg.html>

## Verification

After encoding, ffprobe-based verification must confirm at least:

- MP4 container can be opened
- Resolution is exactly the configured resolution
- Display aspect ratio is 16:9 for the default preset
- Frame rate matches the configured frame rate
- Video codec and pixel format match the output profile
- An audio stream exists and uses the expected channel count and sample rate
- Duration is within a small tolerance of the calculated timeline duration
- No unexpected additional streams exist

The renderer should emit a machine-readable render manifest containing input
hashes, project hash, dependency versions, seed, output metadata, render time,
and warnings.

## Proposed Python Package

```text
pyproject.toml
src/
  spirophonic/
    __init__.py
    cli.py
    project.py
    geometry.py
    alignment.py
    analysis.py
    mappings.py
    choreography.py
    cards.py
    text.py
    renderer.py
    encoder.py
    verification.py
tests/
examples/
docs/
```

Initial dependency direction:

- `typer` for the CLI
- `pydantic` and `pyyaml` for manifests and validation
- `numpy` for geometry and frame buffers
- `librosa` and `soundfile` for analysis
- `opencv-python-headless` for trace rendering
- `Pillow` for cards and typography
- `openai` for optional automatic lyric alignment
- `rich` for progress and diagnostics
- native `ffmpeg` and `ffprobe` executables for media output

Dependencies and versions must be locked. OpenAI alignment should remain an
optional dependency group so validation and rendering from aligned lyrics can
run without API packages or credentials.

## WSL2 Development Environment

The target development environment is an Ubuntu-based WSL2 distribution:

- Repository under `/home/<user>/dev/Spirophonic`
- Python 3.12 managed by `uv`
- Virtual environment local to the WSL working copy
- Native Linux FFmpeg and ffprobe
- Render cache and scratch data in the Linux filesystem
- Final MP4 optionally copied to a Windows directory after verification
- Ubuntu-based continuous integration using the same Python version

Do not actively edit both `D:\Dev\Spirophonic` and a WSL clone. Commit the
transition material, clone or move to WSL, verify the new clone, and choose the
WSL checkout as the single authoritative working copy.

## Repository Transition

Before removing or reorganizing the browser prototype:

1. Commit this design and any transition notes.
2. Tag the existing prototype, proposed tag `web-prototype-v0.1`.
3. Create the Python package skeleton and CI checks.
4. Port the geometry and create cross-language golden fixtures.
5. Confirm the Python tests reproduce existing curve behavior.
6. Remove the obsolete frontend build from the active tree or keep it only if a
   concrete near-term requirement justifies maintaining both toolchains.
7. Rewrite `README.md` and `docs/VISION.md` around the implemented CLI rather
   than leaving the browser description as current documentation.

Git history and the tag are the archive. A permanent `legacy/` directory is not
the default plan.

## Testing Strategy

### Unit tests

- Hypotrochoid and epitrochoid generation
- Cycle closure and greatest-common-divisor behavior
- Project and lyric schema validation
- Feature normalization and smoothing
- Canonical-to-transcript sequence alignment
- Line cue construction and transition timing
- Stem-to-visual mappings
- Card timeline calculations
- FFmpeg command construction

### Golden and deterministic tests

- Python geometry matches fixtures exported from the TypeScript prototype
- Fixed seed and fixed analysis data produce stable frame hashes
- Representative section boundaries produce expected scene-state snapshots

### Integration tests

- A short generated audio fixture plus aligned lyrics renders successfully
- ffprobe verifies the resulting MP4
- Opening and closing card durations are included correctly
- Only the master appears in the output audio
- Draft and final renders share the same musical timeline

Test fixtures must be short and generated or clearly licensed. Full songs,
production stems, cards, rendered frames, caches, and output videos must not be
committed to Git.

## Caching and Failure Behavior

Expensive intermediate artifacts should live under a configurable cache or
build directory and be keyed by relevant input hashes and settings:

- decoded or resampled analysis audio when needed
- per-stem feature timelines
- lyric transcription response
- aligned lyric document
- cached base curves
- render and verification manifests

The CLI must fail early for missing files, malformed manifests, invalid card
durations, unavailable FFmpeg, severe stem misalignment, missing lyric timing,
and unsupported output settings. Warnings are appropriate for low alignment
confidence or optional missing stems; they are not appropriate for corrupted or
ambiguous output timing.

Long operations must show progress and support interruption without presenting
partial output as successful. Temporary outputs should be renamed to their final
path only after encoding and verification succeed.

## Implementation Phases

### Phase 0: Repository pivot

- Commit this design
- Tag the browser prototype
- Establish WSL2 working copy
- Add Python package, lockfile, CLI shell, linting, tests, and Ubuntu CI

### Phase 1: Deterministic geometry and project validation

- Port the trochoid engine
- Create cross-language golden fixtures
- Define and validate project and lyrics schemas
- Add timeline calculations and input inspection

### Phase 2: Audio analysis

- Decode the master and stems
- Extract, normalize, smooth, and cache features
- Implement semantic stem fallbacks
- Add analysis inspection output

### Phase 3: Line-level lyric alignment

- Add OpenAI Whisper transcription adapter
- Implement canonical sequence matching
- Produce editable `lyrics.aligned.yaml`
- Add confidence and manual override behavior

### Phase 4: Visual renderer

- Implement shared-center multi-layer scene rendering
- Add deterministic mapping and section choreography
- Add lyric typography and fades
- Add draft and time-range rendering

### Phase 5: Cards, encoding, and verification

- Add card rendering and pre/post-roll
- Pipe frames to FFmpeg
- Mux the master audio with explicit silence and timing
- Verify output with ffprobe
- Write the render manifest

### Phase 6: Reliability and artistic presets

- Performance profiling
- Cancellation and cleanup
- Better diagnostics and progress
- Mapping and palette presets
- Long-song and unusual-input tests

## MVP Acceptance Criteria

The first version is complete when a user can provide:

- one project manifest
- one structured lyric document
- one master audio file
- a vocal stem and at least one additional stem
- opening and closing JPG cards
- a lyric font

and run one command that produces a verified 1920x1080 MP4 with:

- the complete master audio exactly once
- silence-backed opening and closing cards
- deterministic co-centered spirograph animation responsive to the stems
- correctly ordered and acceptably timed complete lyric lines
- section-aware visual changes
- no temporary frame sequence left behind
- a render manifest sufficient to reproduce and audit the result

## Deferred Decisions

The architecture does not require these choices before implementation starts:

- Final default palettes and artistic presets
- Exact number of spirograph layers
- Default lyric font, size, and safe-area placement
- Whether card overlay mode belongs in v1 or the next release
- Whether local forced alignment is needed as a fallback to OpenAI Whisper
- GPU acceleration for rendering or local audio models
- A future UI or hosted rendering service

These should be decided from rendered examples and measured constraints rather
than from additional architecture work.
