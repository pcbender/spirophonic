import json
import math
import shutil
import subprocess
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Any, Literal

import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    model_validator,
)

NonBlankText = Annotated[str, Field(min_length=1)]
HexColor = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AudioConfig(ContractModel):
    master: Path
    stems: dict[NonBlankText, Path] = Field(default_factory=dict)
    duration_tolerance: float = Field(default=0.05, ge=0, le=5)

    @model_validator(mode="after")
    def master_is_not_a_stem_name(self) -> "AudioConfig":
        if "master" in self.stems:
            raise ValueError("'master' is reserved and cannot be used as a stem name")
        return self


class LyricsConfig(ContractModel):
    source: Path
    aligned: Path | None = None
    language: NonBlankText


class CardConfig(ContractModel):
    file: Path
    duration: float = Field(gt=0)
    fit: Literal["contain", "cover"] = "contain"
    fade: float = Field(default=0, ge=0)
    background: HexColor = "#101014"

    @model_validator(mode="after")
    def fade_fits_duration(self) -> "CardConfig":
        if self.fade > self.duration:
            raise ValueError("fade must not exceed card duration")
        return self


class CardsConfig(ContractModel):
    opening: CardConfig
    closing: CardConfig


class VideoConfig(ContractModel):
    width: int = Field(default=1920, gt=0)
    height: int = Field(default=1080, gt=0)
    fps: float = Field(default=30, gt=0, le=240)
    background: HexColor = "#101014"
    seed: int = 4821

    @model_validator(mode="after")
    def dimensions_support_yuv420p(self) -> "VideoConfig":
        if self.width % 2 or self.height % 2:
            raise ValueError("video width and height must be even for yuv420p output")
        return self


class EncodingConfig(ContractModel):
    video_codec: Literal["libx264"] = "libx264"
    pixel_format: Literal["yuv420p"] = "yuv420p"
    crf: int = Field(default=18, ge=0, le=51)
    preset: Literal[
        "ultrafast",
        "superfast",
        "veryfast",
        "faster",
        "fast",
        "medium",
        "slow",
        "slower",
        "veryslow",
    ] = "medium"
    threads: int = Field(default=1, ge=1, le=32)
    audio_codec: Literal["aac"] = "aac"
    audio_bitrate_kbps: int = Field(default=192, ge=64, le=512)
    audio_sample_rate: Literal[48000] = 48000
    audio_channels: Literal[2] = 2
    faststart: Literal[True] = True
    duration_tolerance: float = Field(default=0.15, gt=0, le=2)


class TextConfig(ContractModel):
    font: Path
    size: int = Field(default=60, gt=0)
    position: Literal["top", "center", "bottom"] = "bottom"
    active_color: HexColor = "#ffffff"
    show_section_titles: bool = True


class AnalysisConfig(ContractModel):
    sample_rate: int = Field(default=22050, ge=8000, le=192000)
    frame_length: int = Field(default=2048, ge=256, le=16384)
    hop_length: int = Field(default=512, ge=1)
    low_cutoff_hz: float = Field(default=250, gt=0)
    high_cutoff_hz: float = Field(default=2000, gt=0)
    percentile_low: float = Field(default=5, ge=0, le=100)
    percentile_high: float = Field(default=95, ge=0, le=100)
    attack_seconds: float = Field(default=0.05, gt=0, le=10)
    release_seconds: float = Field(default=0.25, gt=0, le=30)
    vocal_activity_threshold: float = Field(default=0.15, ge=0, le=1)
    cache_dir: Path = Path("build/cache/analysis")

    @model_validator(mode="after")
    def settings_are_consistent(self) -> "AnalysisConfig":
        if self.frame_length & (self.frame_length - 1):
            raise ValueError("frame_length must be a power of two")
        if self.hop_length > self.frame_length:
            raise ValueError("hop_length must not exceed frame_length")
        if self.low_cutoff_hz >= self.high_cutoff_hz:
            raise ValueError("low_cutoff_hz must be below high_cutoff_hz")
        if self.high_cutoff_hz >= self.sample_rate / 2:
            raise ValueError("high_cutoff_hz must be below the Nyquist frequency")
        if self.percentile_low >= self.percentile_high:
            raise ValueError("percentile_low must be below percentile_high")
        if self.cache_dir.is_absolute():
            raise ValueError("cache_dir must be relative to the project manifest")
        return self


class AlignmentConfig(ContractModel):
    model: Literal["whisper-1"] = "whisper-1"
    cache_dir: Path = Path("build/cache/alignment")
    min_token_similarity: float = Field(default=0.72, ge=0, le=1)
    matched_confidence: float = Field(default=0.75, ge=0, le=1)
    max_tail_seconds: float = Field(default=0.75, ge=0, le=5)
    activity_threshold: float = Field(default=0.2, ge=0, le=1)
    upload_bitrate_kbps: int = Field(default=128, ge=64, le=320)

    @model_validator(mode="after")
    def settings_are_consistent(self) -> "AlignmentConfig":
        if self.cache_dir.is_absolute():
            raise ValueError("cache_dir must be relative to the project manifest")
        return self


class LayerGeometryConfig(ContractModel):
    fixed_radius: float = Field(gt=0)
    moving_radius: float = Field(gt=0)
    pen_offset: float = Field(ge=0)
    rotation: Literal["inside", "outside"] = "inside"
    samples: int = Field(default=900, ge=64, le=8192)


class VisualLayerConfig(ContractModel):
    id: NonBlankText
    role: Literal["master", "drums", "bass", "vocals", "instruments"]
    geometry: LayerGeometryConfig
    color: HexColor
    base_scale: float = Field(default=1, gt=0, le=2)
    opacity: float = Field(default=0.8, ge=0, le=1)
    line_width: float = Field(default=2, gt=0, le=20)
    rotation_degrees_per_second: float = Field(default=0, ge=-180, le=180)
    hue_shift_degrees: float = Field(default=0, ge=-360, le=360)
    blend_mode: Literal["normal", "screen"] = "screen"


def _default_visual_layers() -> list[VisualLayerConfig]:
    return [
        VisualLayerConfig(
            id="bass-orbit",
            role="bass",
            geometry=LayerGeometryConfig(
                fixed_radius=233,
                moving_radius=89,
                pen_offset=144,
                rotation="outside",
                samples=1400,
            ),
            color="#4c78ff",
            base_scale=0.86,
            opacity=0.72,
            line_width=2.2,
            rotation_degrees_per_second=5,
        ),
        VisualLayerConfig(
            id="instrument-wheel",
            role="instruments",
            geometry=LayerGeometryConfig(
                fixed_radius=192,
                moving_radius=48,
                pen_offset=112,
                samples=960,
            ),
            color="#8c5cff",
            base_scale=0.7,
            opacity=0.7,
            line_width=1.8,
            rotation_degrees_per_second=-9,
            hue_shift_degrees=18,
        ),
        VisualLayerConfig(
            id="vocal-flower",
            role="vocals",
            geometry=LayerGeometryConfig(
                fixed_radius=180,
                moving_radius=65,
                pen_offset=95,
                samples=900,
            ),
            color="#ff5fd2",
            base_scale=0.57,
            opacity=0.82,
            line_width=2.4,
            rotation_degrees_per_second=12,
            hue_shift_degrees=-12,
        ),
        VisualLayerConfig(
            id="drum-spark",
            role="drums",
            geometry=LayerGeometryConfig(
                fixed_radius=96,
                moving_radius=32,
                pen_offset=50,
                rotation="outside",
                samples=720,
            ),
            color="#ffd166",
            base_scale=0.43,
            opacity=0.68,
            line_width=1.6,
            rotation_degrees_per_second=-18,
            hue_shift_degrees=10,
        ),
    ]


class VisualConfig(ContractModel):
    mapping_preset: Literal[
        "balanced",
        "restrained",
        "kinetic",
        "vocal-focus",
    ] = "balanced"
    palette_preset: Literal[
        "layer",
        "aurora",
        "ember",
        "ocean",
        "monochrome",
    ] = "layer"
    palette: list[HexColor] = Field(default_factory=list, max_length=16)
    layers: list[VisualLayerConfig] = Field(default_factory=_default_visual_layers)
    canvas_margin: float = Field(default=0.08, ge=0, le=0.4)
    transition_seconds: float = Field(default=0.65, ge=0, le=10)
    background_response: float = Field(default=0.16, ge=0, le=1)
    lyric_fade_seconds: float = Field(default=0.25, ge=0, le=5)
    lyric_background_opacity: float = Field(default=0.48, ge=0, le=1)

    @model_validator(mode="after")
    def layer_ids_are_unique(self) -> "VisualConfig":
        ids = [layer.id for layer in self.layers]
        duplicates = sorted({layer_id for layer_id in ids if ids.count(layer_id) > 1})
        if duplicates:
            joined = ", ".join(duplicates)
            raise ValueError(f"visual layer ids must be unique: {joined}")
        if not self.layers:
            raise ValueError("at least one visual layer is required")
        return self


class ProjectManifest(ContractModel):
    version: Literal[1]
    title: NonBlankText
    audio: AudioConfig
    lyrics: LyricsConfig
    cards: CardsConfig
    video: VideoConfig = Field(default_factory=VideoConfig)
    encoding: EncodingConfig = Field(default_factory=EncodingConfig)
    text: TextConfig
    analysis: AnalysisConfig = Field(default_factory=AnalysisConfig)
    alignment: AlignmentConfig = Field(default_factory=AlignmentConfig)
    visuals: VisualConfig = Field(default_factory=VisualConfig)

    @model_validator(mode="after")
    def paths_are_relative(self) -> "ProjectManifest":
        absolute = [
            label for label, path in _declared_paths(self) if path.is_absolute()
        ]
        if absolute:
            joined = ", ".join(absolute)
            message = f"project paths must be relative to the manifest: {joined}"
            raise ValueError(message)
        return self


class LyricLine(ContractModel):
    text: NonBlankText


class LyricSection(ContractModel):
    id: NonBlankText
    type: NonBlankText
    label: NonBlankText | None = None
    lines: list[LyricLine] = Field(default_factory=list)

    @model_validator(mode="after")
    def vocal_sections_have_lines(self) -> "LyricSection":
        if self.type != "instrumental" and not self.lines:
            raise ValueError("non-instrumental sections must contain at least one line")
        return self


class StructuredLyrics(ContractModel):
    version: Literal[1]
    sections: list[LyricSection] = Field(min_length=1)

    @model_validator(mode="after")
    def section_ids_are_unique(self) -> "StructuredLyrics":
        _require_unique_section_ids(self.sections)
        return self


class AlignedLyricLine(LyricLine):
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    confidence: float | None = Field(default=None, ge=0, le=1)
    status: Literal["matched", "uncertain", "unmatched"] | None = None

    @model_validator(mode="after")
    def end_follows_start(self) -> "AlignedLyricLine":
        if self.end <= self.start:
            raise ValueError("line end must be greater than line start")
        return self


class AlignedLyricSection(ContractModel):
    id: NonBlankText
    type: NonBlankText
    label: NonBlankText | None = None
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    lines: list[AlignedLyricLine] = Field(default_factory=list)

    @model_validator(mode="after")
    def timing_is_consistent(self) -> "AlignedLyricSection":
        if self.end <= self.start:
            raise ValueError("section end must be greater than section start")
        previous_end = self.start
        for line in self.lines:
            if line.start < self.start or line.end > self.end:
                raise ValueError("line timing must fall within its section")
            if line.start < previous_end:
                raise ValueError("line timing must be ordered and non-overlapping")
            previous_end = line.end
        return self


class AlignmentMetadata(ContractModel):
    algorithm_version: Literal[1] = 1
    model: Literal["whisper-1"] = "whisper-1"
    transcription_cache_key: NonBlankText
    source_hash: NonBlankText
    vocals_hash: NonBlankText
    warnings: list[str] = Field(default_factory=list)


class AlignedLyrics(ContractModel):
    version: Literal[1]
    source: Path
    alignment: AlignmentMetadata | None = None
    sections: list[AlignedLyricSection] = Field(min_length=1)

    @model_validator(mode="after")
    def timeline_is_consistent(self) -> "AlignedLyrics":
        _require_unique_section_ids(self.sections)
        previous_end = 0.0
        for section in self.sections:
            if section.start < previous_end:
                raise ValueError("section timing must be ordered and non-overlapping")
            previous_end = section.end
        return self


@dataclass(frozen=True, slots=True)
class ValidationReport:
    manifest_path: Path
    project: ProjectManifest
    lyrics: StructuredLyrics
    master_duration: float
    stem_durations: dict[str, float]


class SpirophonicValidationError(Exception):
    def __init__(self, *problems: str):
        self.problems = tuple(problems)
        super().__init__("; ".join(problems))


def _require_unique_section_ids(sections: list[Any]) -> None:
    ids = [section.id for section in sections]
    duplicates = sorted({section_id for section_id in ids if ids.count(section_id) > 1})
    if duplicates:
        joined = ", ".join(duplicates)
        raise ValueError(f"section ids must be unique; duplicates: {joined}")


def _declared_paths(project: ProjectManifest) -> Iterator[tuple[str, Path]]:
    yield "audio.master", project.audio.master
    for name, path in project.audio.stems.items():
        yield f"audio.stems.{name}", path
    yield "lyrics.source", project.lyrics.source
    if project.lyrics.aligned is not None:
        yield "lyrics.aligned", project.lyrics.aligned
    yield "cards.opening.file", project.cards.opening.file
    yield "cards.closing.file", project.cards.closing.file
    yield "text.font", project.text.font


def _required_paths(project: ProjectManifest) -> Iterator[tuple[str, Path]]:
    for label, path in _declared_paths(project):
        if label != "lyrics.aligned":
            yield label, path


def _read_yaml(path: Path) -> dict[str, Any]:
    try:
        value = yaml.safe_load(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise SpirophonicValidationError(f"cannot read {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise SpirophonicValidationError(f"malformed YAML in {path}: {exc}") from exc

    if not isinstance(value, dict):
        raise SpirophonicValidationError(f"{path} must contain a YAML mapping")
    return value


def _format_model_errors(path: Path, exc: ValidationError) -> tuple[str, ...]:
    problems: list[str] = []
    for error in exc.errors(include_url=False):
        location = ".".join(str(part) for part in error["loc"]) or "document"
        problems.append(f"{path}: {location}: {error['msg']}")
    return tuple(problems)


def _load_model[T: BaseModel](path: Path, model_type: type[T]) -> T:
    value = _read_yaml(path)
    try:
        return model_type.model_validate(value)
    except ValidationError as exc:
        raise SpirophonicValidationError(*_format_model_errors(path, exc)) from exc


def load_project_manifest(path: Path) -> ProjectManifest:
    resolved = path.expanduser().resolve()
    if not resolved.is_file():
        raise SpirophonicValidationError(f"project manifest does not exist: {resolved}")
    return _load_model(resolved, ProjectManifest)


def load_structured_lyrics(path: Path) -> StructuredLyrics:
    return _load_model(path, StructuredLyrics)


def load_aligned_lyrics(path: Path) -> AlignedLyrics:
    return _load_model(path, AlignedLyrics)


def _probe_audio_duration(path: Path, ffprobe: str) -> float:
    command = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=duration:format=duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
        payload = json.loads(result.stdout)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        message = f"ffprobe could not inspect {path}: {exc}"
        raise SpirophonicValidationError(message) from exc

    streams = payload.get("streams", [])
    if not streams:
        raise SpirophonicValidationError(f"no audio stream found in {path}")

    candidates = [streams[0].get("duration"), payload.get("format", {}).get("duration")]
    for candidate in candidates:
        try:
            duration = float(candidate)
        except (TypeError, ValueError):
            continue
        if math.isfinite(duration) and duration > 0:
            return duration

    raise SpirophonicValidationError(f"no positive audio duration found in {path}")


def validate_project(
    manifest_path: Path,
    *,
    require_tools: bool = True,
    probe_media: bool = True,
    validate_aligned: bool = True,
    duration_probe: Callable[[Path, str], float] | None = None,
) -> ValidationReport:
    resolved_manifest = manifest_path.expanduser().resolve()
    project = load_project_manifest(resolved_manifest)
    root = resolved_manifest.parent
    problems: list[str] = []

    resolved_inputs = {
        label: (root / relative_path).resolve()
        for label, relative_path in _required_paths(project)
    }
    for label, path in resolved_inputs.items():
        if not path.is_file():
            problems.append(f"{label} does not exist or is not a file: {path}")

    ffprobe = shutil.which("ffprobe")
    if require_tools:
        if shutil.which("ffmpeg") is None:
            problems.append("required executable is not on PATH: ffmpeg")
        if ffprobe is None:
            problems.append("required executable is not on PATH: ffprobe")

    lyrics: StructuredLyrics | None = None
    lyrics_path = resolved_inputs["lyrics.source"]
    if lyrics_path.is_file():
        try:
            lyrics = load_structured_lyrics(lyrics_path)
        except SpirophonicValidationError as exc:
            problems.extend(exc.problems)

    if validate_aligned and project.lyrics.aligned is not None:
        aligned_path = (root / project.lyrics.aligned).resolve()
        if aligned_path.exists():
            try:
                load_aligned_lyrics(aligned_path)
            except SpirophonicValidationError as exc:
                problems.extend(exc.problems)

    if problems:
        raise SpirophonicValidationError(*problems)
    if lyrics is None:
        raise SpirophonicValidationError("structured lyrics could not be loaded")

    master_duration = 0.0
    stem_durations: dict[str, float] = {}
    if probe_media:
        if duration_probe is None and ffprobe is None:
            raise SpirophonicValidationError("cannot inspect audio without ffprobe")
        probe = duration_probe or _probe_audio_duration
        probe_executable = ffprobe or "ffprobe"
        master_path = resolved_inputs["audio.master"]
        master_duration = probe(master_path, probe_executable)
        for name in project.audio.stems:
            stem_path = resolved_inputs[f"audio.stems.{name}"]
            duration = probe(stem_path, probe_executable)
            stem_durations[name] = duration
            difference = abs(duration - master_duration)
            if difference > project.audio.duration_tolerance:
                tolerance = project.audio.duration_tolerance
                problems.append(
                    f"audio.stems.{name} duration differs from the master by "
                    f"{difference:.3f}s (tolerance {tolerance:.3f}s)"
                )

    if problems:
        raise SpirophonicValidationError(*problems)

    return ValidationReport(
        manifest_path=resolved_manifest,
        project=project,
        lyrics=lyrics,
        master_duration=master_duration,
        stem_durations=stem_durations,
    )
