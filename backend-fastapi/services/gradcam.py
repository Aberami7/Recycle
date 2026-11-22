from __future__ import annotations
from io import BytesIO
from typing import Tuple
from PIL import Image, ImageDraw
import numpy as np


class GradCAMService:
    """
    Explainable AI visualization service.
    In production, hooks gradients from MobileNetV2's final feature block (features[-1]).
    In prototype mode, synthesizes a labeled attention overlay from focal bounding coordinates.
    """

    def generate_prototype_attention_map(
        self,
        image_bytes: bytes,
        focal_box: Tuple[int, int, int, int] = (220, 220, 780, 780),
    ) -> bytes:
        base = Image.open(BytesIO(image_bytes)).convert("RGBA")
        w, h = base.size

        ymin, xmin, ymax, xmax = focal_box
        cx = ((xmin + xmax) / 2000.0) * w
        cy = ((ymin + ymax) / 2000.0) * h
        rx = max(32.0, ((xmax - xmin) / 2000.0) * w * 0.9)
        ry = max(32.0, ((ymax - ymin) / 2000.0) * h * 0.9)

        yy, xx = np.mgrid[0:h, 0:w]
        dist_sq = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
        intensity = np.exp(-0.95 * dist_sq)

        heatmap = np.zeros((h, w, 4), dtype=np.uint8)
        heatmap[..., 0] = np.clip(intensity * 255, 0, 255).astype(np.uint8)
        heatmap[..., 1] = np.clip((1.0 - np.abs(intensity - 0.5) * 2.0) * 220, 0, 255).astype(np.uint8)
        heatmap[..., 2] = np.clip((1.0 - intensity) * 180, 0, 255).astype(np.uint8)
        heatmap[..., 3] = np.clip(intensity * 175, 0, 175).astype(np.uint8)

        overlay = Image.fromarray(heatmap, mode="RGBA")
        composited = Image.alpha_composite(base, overlay)

        draw = ImageDraw.Draw(composited)
        draw.rectangle(
            [
                int((xmin / 1000.0) * w),
                int((ymin / 1000.0) * h),
                int((xmax / 1000.0) * w),
                int((ymax / 1000.0) * h),
            ],
            outline=(255, 255, 255, 230),
            width=3,
        )

        out = BytesIO()
        composited.save(out, format="PNG")
        return out.getvalue()
