import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Info, Layers } from 'lucide-react';
import type { AttentionRegion } from '../types/recycleiq';

interface XaiHeatmapCanvasProps {
  imageUrl: string;
  detectedItem: string;
  attentionRegions: AttentionRegion[];
  xaiMethod: string;
}

/**
 * Maps a normalized intensity [0..1] to an RGB thermal Grad-CAM-style color ramp:
 * Low (0.0) -> transparent, Mid (0.45) -> cyan/green, High (0.75) -> amber, Peak (1.0) -> crimson.
 */
function thermalColor(t: number): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.08) return [0, 0, 0, 0];

  let r = 0;
  let g = 0;
  let b = 0;

  if (clamped < 0.35) {
    const k = (clamped - 0.08) / 0.27;
    r = 16;
    g = Math.round(160 + k * 75);
    b = Math.round(230 - k * 40);
  } else if (clamped < 0.65) {
    const k = (clamped - 0.35) / 0.3;
    r = Math.round(16 + k * 234);
    g = Math.round(235 - k * 35);
    b = Math.round(190 - k * 170);
  } else {
    const k = (clamped - 0.65) / 0.35;
    r = 250;
    g = Math.round(200 - k * 155);
    b = Math.round(20 + k * 15);
  }

  const alpha = Math.round(Math.min(220, clamped * 235));
  return [r, g, b, alpha];
}

export const XaiHeatmapCanvas: React.FC<XaiHeatmapCanvasProps> = ({
  imageUrl,
  detectedItem,
  attentionRegions,
  xaiMethod,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [opacity, setOpacity] = useState<number>(0.72);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number }>({ w: 640, h: 480 });

  useEffect(() => {
    setImageError(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = imageUrl;

    img.onload = () => {
      const targetW = 640;
      const aspect = img.naturalHeight > 0 && img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0.75;
      const targetH = Math.round(targetW * aspect);
      setDimensions({ w: targetW, h: targetH });

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original image as base
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Build offscreen heatmap buffer for smooth Gaussian attention map
      const heatCanvas = document.createElement('canvas');
      heatCanvas.width = targetW;
      heatCanvas.height = targetH;
      const heatCtx = heatCanvas.getContext('2d');
      if (!heatCtx) return;

      const imgData = heatCtx.createImageData(targetW, targetH);
      const data = imgData.data;

      // Precompute Gaussian centers from normalized [ymin, xmin, ymax, xmax]
      const gaussians = attentionRegions.map((reg) => {
        const [ymin, xmin, ymax, xmax] = reg.box_2d;
        const cx = ((xmin + xmax) / 2000) * targetW;
        const cy = ((ymin + ymax) / 2000) * targetH;
        const rx = Math.max(36, ((xmax - xmin) / 2000) * targetW * 0.95);
        const ry = Math.max(36, ((ymax - ymin) / 2000) * targetH * 0.95);
        return { cx, cy, rx, ry, weight: reg.weight };
      });

      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          let energy = 0;
          for (let i = 0; i < gaussians.length; i++) {
            const g = gaussians[i];
            const dx = (x - g.cx) / g.rx;
            const dy = (y - g.cy) / g.ry;
            const distSq = dx * dx + dy * dy;
            if (distSq < 4.5) {
              energy = Math.max(energy, g.weight * Math.exp(-0.95 * distSq));
            }
          }
          const [r, gCol, b, a] = thermalColor(energy);
          const idx = (y * targetW + x) * 4;
          data[idx] = r;
          data[idx + 1] = gCol;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(a * opacity);
        }
      }

      heatCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(heatCanvas, 0, 0);

      // Draw Highlighted Region outlines if enabled
      if (showBoxes) {
        attentionRegions.forEach((reg, idx) => {
          const [ymin, xmin, ymax, xmax] = reg.box_2d;
          const x = (xmin / 1000) * targetW;
          const y = (ymin / 1000) * targetH;
          const w = ((xmax - xmin) / 1000) * targetW;
          const h = ((ymax - ymin) / 1000) * targetH;

          ctx.strokeStyle = idx === 0 ? '#FFFFFF' : '#FEF08A';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);

          const labelText = `${reg.label} (${Math.round(reg.weight * 100)}%)`;
          ctx.font = '600 12px "DM Sans", sans-serif';
          const textW = ctx.measureText(labelText).width;
          const pillY = Math.max(4, y - 24);
          ctx.fillStyle = 'rgba(16, 42, 28, 0.86)';
          ctx.fillRect(x, pillY, textW + 14, 20);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(labelText, x + 7, pillY + 14);
        });
      }
    };

    img.onerror = () => {
      setImageError(true);
    };
  }, [imageUrl, attentionRegions, opacity, showBoxes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-emerald-950/75">
          <span className="font-semibold text-emerald-950">Visual Explanation</span>
          <span className="mx-2 text-emerald-900/30" aria-hidden="true">·</span>
          <span>{xaiMethod}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-emerald-950/80">
            <Layers className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            <span>Overlay Intensity</span>
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-1.5 w-24 cursor-pointer accent-emerald-700"
            />
            <span className="w-8 text-right font-mono tabular-nums text-emerald-900">
              {Math.round(opacity * 100)}%
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowBoxes((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-900/15 bg-white px-3 py-1.5 text-xs font-medium text-emerald-950 transition-colors hover:bg-emerald-50 whitespace-nowrap shrink-0"
          >
            {showBoxes ? (
              <Eye className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-emerald-900/50" aria-hidden="true" />
            )}
            <span>{showBoxes ? 'Hide Region Boxes' : 'Show Region Boxes'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Original Image and AI Attention Map */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-emerald-900/12 bg-white">
          <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#F2F8F4] px-4 py-2.5 text-xs font-semibold text-emerald-950">
            <span>Original Image</span>
            <span className="font-normal text-emerald-900/65">Captured Input Frame</span>
          </div>
          <div className="relative aspect-[4/3] w-full bg-emerald-950/5">
            {imageError ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-sm text-emerald-900/60">
                <span>Original preview unavailable</span>
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={`Original waste sample: ${detectedItem}`}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-emerald-900/12 bg-white">
          <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#F2F8F4] px-4 py-2.5 text-xs font-semibold text-emerald-950">
            <span>AI Attention Map</span>
            <span className="font-normal text-emerald-900/65">Highlighted Region</span>
          </div>
          <div className="relative aspect-[4/3] w-full bg-emerald-950/5">
            {imageError ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-sm text-emerald-900/60">
                <span>Attention map unavailable</span>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={dimensions.w}
                height={dimensions.h}
                aria-label="Prototype Grad-CAM style visual attention heatmap highlighting key waste regions"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      {/* Clear thermal legend + honest prototype disclaimer */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-900/10 bg-[#EDF6F0] px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 text-xs text-emerald-950/85">
          <span className="font-semibold">Highlighted areas = regions that influenced the AI prediction</span>
          <div className="flex items-center gap-1.5" aria-label="Heatmap intensity scale from low to high">
            <span className="text-[11px] text-emerald-900/65">Low</span>
            <span
              className="inline-block h-2.5 w-24 rounded-sm border border-emerald-900/15"
              style={{
                background: 'linear-gradient(90deg, rgba(16,185,220,0.4) 0%, #22D3EE 35%, #FACC15 68%, #EF4444 100%)',
              }}
            />
            <span className="text-[11px] text-emerald-900/65">High</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-xs text-emerald-900/75">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
          <span>
            Prototype explanation: focal regions are derived from vision bounding cues and simulate Grad-CAM until a trained MobileNetV2 tensor layer is attached.
          </span>
        </div>
      </div>
    </div>
  );
};
