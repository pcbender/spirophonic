import math
from dataclasses import dataclass

from spirophonic.analysis import AnalysisBundle
from spirophonic.choreography import ChoreographyState
from spirophonic.presets import MappingPreset, get_mapping_preset
from spirophonic.project import VisualLayerConfig


@dataclass(frozen=True, slots=True)
class SemanticSample:
    energy: float
    accent: float


@dataclass(frozen=True, slots=True)
class AudioVisualState:
    master: SemanticSample
    drums: SemanticSample
    bass: SemanticSample
    vocals: SemanticSample
    instruments: SemanticSample
    spectral_centroid: float

    def for_role(self, role: str) -> SemanticSample:
        return getattr(self, role)


@dataclass(frozen=True, slots=True)
class LayerFrameState:
    scale: float
    rotation_radians: float
    trail_fraction: float
    opacity: float
    line_width: float
    hue_shift_degrees: float
    color_intensity: float
    beat_pulse: float


_ROLE_SCALE_RESPONSE = {
    "master": 0.1,
    "drums": 0.06,
    "bass": 0.2,
    "vocals": 0.1,
    "instruments": 0.13,
}
_ROLE_VISIBILITY_THRESHOLD = {
    "vocals": 0.2,
    "instruments": 0.38,
    "master": 0.48,
    "bass": 0.62,
    "drums": 0.82,
}


def _clamp(value: float, lower: float = 0, upper: float = 1) -> float:
    return min(upper, max(lower, value))


def _sample_semantic(
    analysis: AnalysisBundle,
    role: str,
    time_seconds: float,
) -> SemanticSample:
    control = analysis.semantic_controls[role]
    features = analysis.tracks[control.track].sample(time_seconds)
    return SemanticSample(
        energy=_clamp(features[control.energy_feature]),
        accent=_clamp(features[control.accent_feature]),
    )


def sample_audio_visual_state(
    analysis: AnalysisBundle,
    time_seconds: float,
) -> AudioVisualState:
    master_features = analysis.tracks["master"].sample(time_seconds)
    return AudioVisualState(
        master=_sample_semantic(analysis, "master", time_seconds),
        drums=_sample_semantic(analysis, "drums", time_seconds),
        bass=_sample_semantic(analysis, "bass", time_seconds),
        vocals=_sample_semantic(analysis, "vocals", time_seconds),
        instruments=_sample_semantic(analysis, "instruments", time_seconds),
        spectral_centroid=_clamp(master_features["spectral_centroid"]),
    )


def map_layer_state(
    layer: VisualLayerConfig,
    audio: AudioVisualState,
    choreography: ChoreographyState,
    time_seconds: float,
    preset: MappingPreset | None = None,
) -> LayerFrameState:
    """Map smoothed semantic audio controls to stable curve transforms/styles."""
    preset = preset or get_mapping_preset("balanced")
    role = audio.for_role(layer.role)
    role_gain = preset.role_gains[layer.role]
    scale_response = _ROLE_SCALE_RESPONSE[layer.role] * preset.scale_response
    scale = layer.base_scale * choreography.scale * (
        1 + scale_response * role.energy * role_gain
    )

    visibility_threshold = _ROLE_VISIBILITY_THRESHOLD[layer.role]
    visibility_threshold -= preset.visibility_bias
    visibility = _clamp(
        (choreography.layer_fraction - visibility_threshold) / 0.18
    )
    energy_opacity = 0.58 + 0.42 * max(role.energy, role.accent * 0.75)
    opacity = layer.opacity * visibility * energy_opacity * preset.opacity_response
    intensity_energy = role.energy
    if layer.depth == "background":
        intensity_energy = audio.master.energy
        opacity *= 0.35 + 1.1 * intensity_energy

    accent = max(role.accent, audio.drums.accent * 0.35)
    line_width = layer.line_width * (
        1
        + choreography.onset_response
        * preset.onset_response
        * accent
        * role_gain
        * 1.4
    )
    rotation = math.radians(layer.rotation_degrees_per_second) * time_seconds
    rotation *= (
        choreography.motion
        * choreography.rotation_direction
        * preset.motion_response
        * role_gain
    )
    rotation += math.sin(time_seconds * 0.37 + role.energy * math.pi) * 0.08

    trail_fraction = layer.trace.trail_fraction * (
        0.82 + 0.18 * choreography.motion
    ) * (0.9 + 0.1 * role.energy * role_gain)

    hue_shift = (
        layer.hue_shift_degrees
        + choreography.palette_shift * 360
        + audio.vocals.energy * 18 * preset.hue_response
        + audio.spectral_centroid * 12 * preset.hue_response
    )
    beat_pulse = 0.0
    if layer.role == "drums":
        beat_pulse = _clamp(
            audio.drums.accent**1.35
            * choreography.onset_response
            * preset.onset_response
        )
        opacity *= 1 + beat_pulse * 0.35
    energy_color_response = 0.55 + 0.75 * intensity_energy * role_gain
    return LayerFrameState(
        scale=scale,
        rotation_radians=rotation,
        trail_fraction=_clamp(trail_fraction, 0.02, 1),
        opacity=_clamp(opacity),
        line_width=max(0.25, line_width),
        hue_shift_degrees=hue_shift,
        color_intensity=_clamp(
            choreography.color_intensity * energy_color_response,
            0.2,
            1.4,
        ),
        beat_pulse=beat_pulse,
    )
