from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


def apply_y2k_crt_effect(
    image_path: Path, output_path: Path | None = None, intensity: float = 1.0
) -> Path:
    """Applies a Y2K/CRT aesthetic post-processing to an image."""
    img = Image.open(image_path).convert("RGB")
    width, height = img.size

    # 1. Slight Blur & Glow (Scales with intensity)
    blur_radius = 1.0 + (intensity * 1.5)
    glow = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    img = Image.blend(img, glow, alpha=0.2 + (intensity * 0.2))

    # 2. Color Shift (Chromatic Aberration simulation) (Scales with intensity)
    shift = int(1 + intensity * 4)
    r, g, b = img.split()
    r = ImageChops.offset(r, shift, 0)
    b = ImageChops.offset(b, -shift, 0)
    img = Image.merge("RGB", (r, g, b))

    # 3. Scanlines (Frequency scales with intensity)
    draw = ImageDraw.Draw(img)
    step = max(2, int(6 - intensity * 2))
    for y in range(0, height, step):
        draw.line([(0, y), (width, y)], fill=(0, 0, 0), width=1)

    # 4. Brightness/Contrast Boost
    contrast_enhancer = ImageEnhance.Contrast(img)
    img = contrast_enhancer.enhance(1.1 + intensity * 0.2)
    brightness_enhancer = ImageEnhance.Brightness(img)
    img = brightness_enhancer.enhance(1.05 + intensity * 0.1)

    # 5. Vignette (Optional, but adds CRT feel)
    # Simple darken at corners

    out = output_path or image_path
    img.save(out)
    return out


def apply_diegetic_overlay(
    image_path: Path,
    text: str,
    status_lines: list[str] | None = None,
    output_path: Path | None = None,
) -> Path:
    """Adds a diegetic HUD overlay to the image."""
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img, "RGBA")
    width, height = img.size

    # HUD Color (Cyan)
    hud_color = (0, 255, 255, 180)

    # Draw simple brackets or corners
    margin = 40
    line_len = 60
    # Top-Left
    draw.line([(margin, margin), (margin + line_len, margin)], fill=hud_color, width=2)
    draw.line([(margin, margin), (margin, margin + line_len)], fill=hud_color, width=2)
    # Top-Right
    draw.line(
        [(width - margin, margin), (width - margin - line_len, margin)], fill=hud_color, width=2
    )
    draw.line(
        [(width - margin, margin), (width - margin, margin + line_len)], fill=hud_color, width=2
    )

    # Draw Label (Top Left)
    draw.text((margin + 10, margin + 5), "MYTHOS_RUNTIME v0.1", fill=hud_color)

    # Draw Status (Bottom Left)
    y_cursor = height - margin - 20
    if status_lines:
        for line in reversed(status_lines):
            draw.text((margin + 10, y_cursor), f"> {line}", fill=hud_color)
            y_cursor -= 20

    # Draw Title (Bottom Center)
    # Simplified without font loading for robustness in headless
    draw.text((width // 2 - 50, height - margin - 20), text.upper(), fill=hud_color)

    out = output_path or image_path
    img.save(out)
    return out
