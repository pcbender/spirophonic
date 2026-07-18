from dataclasses import dataclass
from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageDraw, ImageFont

from spirophonic.project import AlignedLyrics, TextConfig


@dataclass(frozen=True, slots=True)
class LyricCue:
    text: str
    alpha: float
    section_label: str | None
    section_title_alpha: float


class SpirophonicTextError(Exception):
    pass


def validate_lyric_font(font_path: Path, size: int) -> None:
    try:
        ImageFont.truetype(str(font_path), size=size)
    except OSError as exc:
        raise SpirophonicTextError(
            f"cannot load lyric font {font_path}: {exc}"
        ) from exc


def _clamp01(value: float) -> float:
    return min(1, max(0, value))


def _smoothstep(value: float) -> float:
    value = _clamp01(value)
    return value * value * (3 - 2 * value)


def lyric_cue_at(
    lyrics: AlignedLyrics,
    time_seconds: float,
    *,
    fade_seconds: float,
    choreography_opacity: float,
) -> LyricCue | None:
    for section in lyrics.sections:
        if not section.start <= time_seconds < section.end:
            continue
        for line in section.lines:
            if not line.start <= time_seconds < line.end:
                continue
            alpha = choreography_opacity
            if fade_seconds > 0:
                alpha *= _smoothstep((time_seconds - line.start) / fade_seconds)
                alpha *= _smoothstep((line.end - time_seconds) / fade_seconds)
            title_alpha = 0.0
            if section.label:
                title_duration = min(2.0, section.end - section.start)
                title_alpha = choreography_opacity * _clamp01(
                    (section.start + title_duration - time_seconds) / 0.35
                )
            return LyricCue(
                text=line.text,
                alpha=_clamp01(alpha),
                section_label=section.label,
                section_title_alpha=_clamp01(title_alpha),
            )
    return None


def _parse_hex_color(value: str) -> tuple[int, int, int]:
    return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))


def _load_fitted_font(
    draw: ImageDraw.ImageDraw,
    font_path: Path,
    text: str,
    requested_size: int,
    maximum_width: int,
) -> ImageFont.FreeTypeFont:
    size = requested_size
    while size >= 12:
        try:
            font = ImageFont.truetype(str(font_path), size=size)
        except OSError as exc:
            raise SpirophonicTextError(
                f"cannot load lyric font {font_path}: {exc}"
            ) from exc
        bounds = draw.textbbox((0, 0), text, font=font, stroke_width=max(1, size // 30))
        if bounds[2] - bounds[0] <= maximum_width or size == 12:
            return font
        size -= 2
    raise SpirophonicTextError(f"cannot fit lyric text with font {font_path}")


def draw_lyric_overlay(
    frame: NDArray[np.uint8],
    cue: LyricCue | None,
    *,
    config: TextConfig,
    font_path: Path,
    background_opacity: float,
) -> NDArray[np.uint8]:
    """Draw one complete canonical lyric line with deterministic Pillow layout."""
    if cue is None or cue.alpha <= 0:
        return frame
    image = Image.fromarray(frame, mode="RGB")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = image.size
    horizontal_margin = max(16, round(width * 0.06))
    font = _load_fitted_font(
        draw,
        font_path,
        cue.text,
        config.size,
        width - horizontal_margin * 2,
    )
    stroke_width = max(1, font.size // 30)
    bounds = draw.textbbox(
        (0, 0),
        cue.text,
        font=font,
        stroke_width=stroke_width,
    )
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    x = (width - text_width) // 2 - bounds[0]
    if config.position == "top":
        y = round(height * 0.11) - bounds[1]
    elif config.position == "center":
        y = (height - text_height) // 2 - bounds[1]
    else:
        y = round(height * 0.82) - bounds[1]

    padding_x = max(12, font.size // 3)
    padding_y = max(8, font.size // 5)
    edge_margin = max(4, round(height * 0.04))
    minimum_y = edge_margin + padding_y - bounds[1]
    maximum_y = height - edge_margin - padding_y - bounds[3]
    y = min(maximum_y, max(minimum_y, y))
    box = (
        x + bounds[0] - padding_x,
        y + bounds[1] - padding_y,
        x + bounds[2] + padding_x,
        y + bounds[3] + padding_y,
    )
    box_alpha = round(255 * background_opacity * cue.alpha)
    draw.rounded_rectangle(box, radius=padding_y, fill=(0, 0, 0, box_alpha))
    color = (*_parse_hex_color(config.active_color), round(255 * cue.alpha))
    draw.text(
        (x, y),
        cue.text,
        font=font,
        fill=color,
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0, round(210 * cue.alpha)),
    )

    if config.show_section_titles and cue.section_label and cue.section_title_alpha > 0:
        title_size = max(12, round(font.size * 0.5))
        try:
            title_font = ImageFont.truetype(str(font_path), size=title_size)
        except OSError as exc:
            raise SpirophonicTextError(
                f"cannot load lyric font {font_path}: {exc}"
            ) from exc
        title_bounds = draw.textbbox((0, 0), cue.section_label, font=title_font)
        title_width = title_bounds[2] - title_bounds[0]
        title_x = (width - title_width) // 2 - title_bounds[0]
        title_y = max(edge_margin, box[1] - title_size * 2)
        title_alpha = round(210 * cue.section_title_alpha)
        draw.text(
            (title_x, title_y),
            cue.section_label,
            font=title_font,
            fill=(255, 255, 255, title_alpha),
            stroke_width=1,
            stroke_fill=(0, 0, 0, title_alpha),
        )

    composited = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    return np.asarray(composited, dtype=np.uint8)
