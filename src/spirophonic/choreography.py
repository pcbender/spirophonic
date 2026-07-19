from dataclasses import dataclass

from spirophonic.project import AlignedLyrics


@dataclass(frozen=True, slots=True)
class SectionStyle:
    layer_fraction: float
    scale: float
    motion: float
    color_intensity: float
    onset_response: float
    rotation_direction: float = 1
    palette_shift: float = 0
    lyrics_opacity: float = 1
    spatial_spread: float = 1
    anchor_drift: float = 0.008


@dataclass(frozen=True, slots=True)
class ChoreographyState:
    section_id: str
    section_type: str
    section_label: str | None
    section_progress: float
    transition_progress: float
    layer_fraction: float
    scale: float
    motion: float
    color_intensity: float
    onset_response: float
    rotation_direction: float
    palette_shift: float
    lyrics_opacity: float
    spatial_spread: float = 1
    anchor_drift: float = 0.008


_DEFAULT_STYLE = SectionStyle(0.74, 0.96, 0.9, 0.9, 0.9)
_SECTION_STYLES = {
    "verse": SectionStyle(
        0.58, 0.9, 0.72, 0.78, 0.72, spatial_spread=0.92, anchor_drift=0.006
    ),
    "chorus": SectionStyle(
        1, 1.08, 1.18, 1.16, 1.35, spatial_spread=1.08, anchor_drift=0.014
    ),
    "bridge": SectionStyle(
        0.82,
        0.98,
        0.92,
        1.12,
        1,
        -1,
        0.16,
        spatial_spread=0.8,
        anchor_drift=0.022,
    ),
    "instrumental": SectionStyle(
        1,
        1.04,
        1.12,
        1.05,
        1.18,
        1,
        0.06,
        0,
        spatial_spread=1.12,
        anchor_drift=0.018,
    ),
    "intro": SectionStyle(
        0.48, 0.86, 0.62, 0.72, 0.62, spatial_spread=0.76, anchor_drift=0.004
    ),
    "outro": SectionStyle(
        0.68, 0.92, 0.7, 0.82, 0.7, spatial_spread=0.88, anchor_drift=0.005
    ),
}


def _clamp01(value: float) -> float:
    return min(1, max(0, value))


def _smoothstep(value: float) -> float:
    value = _clamp01(value)
    return value * value * (3 - 2 * value)


def _style_for(section_type: str) -> SectionStyle:
    return _SECTION_STYLES.get(section_type.casefold(), _DEFAULT_STYLE)


def _interpolate_style(
    previous: SectionStyle,
    current: SectionStyle,
    amount: float,
) -> SectionStyle:
    def blend(start: float, end: float) -> float:
        return start + (end - start) * amount

    return SectionStyle(
        layer_fraction=blend(previous.layer_fraction, current.layer_fraction),
        scale=blend(previous.scale, current.scale),
        motion=blend(previous.motion, current.motion),
        color_intensity=blend(
            previous.color_intensity,
            current.color_intensity,
        ),
        onset_response=blend(previous.onset_response, current.onset_response),
        rotation_direction=blend(
            previous.rotation_direction,
            current.rotation_direction,
        ),
        palette_shift=blend(previous.palette_shift, current.palette_shift),
        lyrics_opacity=blend(previous.lyrics_opacity, current.lyrics_opacity),
        spatial_spread=blend(previous.spatial_spread, current.spatial_spread),
        anchor_drift=blend(previous.anchor_drift, current.anchor_drift),
    )


def choreography_at(
    lyrics: AlignedLyrics,
    time_seconds: float,
    *,
    transition_seconds: float,
) -> ChoreographyState:
    """Return an interpolated, section-aware visual preset at song time."""
    sections = lyrics.sections
    index = 0
    for candidate, section in enumerate(sections):
        if time_seconds >= section.start:
            index = candidate
        if section.start <= time_seconds < section.end:
            index = candidate
            break
        if time_seconds < section.start:
            break

    section = sections[index]
    duration = section.end - section.start
    section_progress = _clamp01((time_seconds - section.start) / duration)
    current_style = _style_for(section.type)
    transition_progress = 1.0
    if index > 0 and transition_seconds > 0:
        raw_transition = (time_seconds - section.start) / transition_seconds
        transition_progress = _smoothstep(raw_transition)
        current_style = _interpolate_style(
            _style_for(sections[index - 1].type),
            current_style,
            transition_progress,
        )

    return ChoreographyState(
        section_id=section.id,
        section_type=section.type,
        section_label=section.label,
        section_progress=section_progress,
        transition_progress=transition_progress,
        layer_fraction=current_style.layer_fraction,
        scale=current_style.scale,
        motion=current_style.motion,
        color_intensity=current_style.color_intensity,
        onset_response=current_style.onset_response,
        rotation_direction=current_style.rotation_direction,
        palette_shift=current_style.palette_shift,
        lyrics_opacity=current_style.lyrics_opacity,
        spatial_spread=current_style.spatial_spread,
        anchor_drift=current_style.anchor_drift,
    )
