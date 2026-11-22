import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { WasteAnalysisRecord } from '../types/recycleiq';
import { compressImageDataUrl, safeFetchJson } from '../utils/api';

interface AnalyzeViewProps {
  onAnalysisComplete: (record: WasteAnalysisRecord) => void;
}

const SAMPLE_PRESETS = [
  {
    label: 'PET Plastic Bottle',
    hint: 'Slightly crushed clear bottle',
    src: '/src/assets/images/sample_plastic_bottle_1795353214639.jpg',
  },
  {
    label: 'Stained Cardboard Box',
    hint: 'Corrugated box with visible oil patch',
    src: '/src/assets/images/sample_cardboard_box_1795353214693.jpg',
  },
  {
    label: 'Crushed Aluminum Can',
    hint: 'Clean metallic beverage can',
    src: '/src/assets/images/sample_aluminum_can_1795353214437.jpg',
  },
  {
    label: 'Glass Jar & Lid',
    hint: 'Clear jar with detached metal lid',
    src: '/src/assets/images/sample_glass_jar_1795353214465.jpg',
  },
];

const PIPELINE_STAGES = [
  'Image received',
  'AI classification',
  'Recyclability assessment',
  'Contamination assessment',
  'Explainable AI analysis',
  'Saving result to cloud',
];

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ onAnalysisComplete }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [cameraOpen, setCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleFileSelected = (file: File) => {
    setErrorMsg(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Unsupported file format. Please choose a JPEG, PNG, or WebP waste image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image exceeds 10 MB size limit. Please select a smaller photograph.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        setPreviewDataUrl(reader.result);
        setSelectedName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser camera access is not available in this context. Please upload an image file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setCameraError('Camera permission was denied or no camera device was detected. You can upload an image or pick a sample below.');
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewDataUrl(dataUrl);
    setSelectedName(`camera-capture-${new Date().toLocaleTimeString()}.jpg`);
    stopCamera();
  };

  const handleLoadSample = async (sample: (typeof SAMPLE_PRESETS)[number]) => {
    setErrorMsg(null);
    stopCamera();
    try {
      const resp = await fetch(sample.src);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPreviewDataUrl(reader.result);
          setSelectedName(`${sample.label} (Sample Input)`);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setErrorMsg('Unable to load sample image.');
    }
  };

  const handleAnalyze = async () => {
    if (!previewDataUrl || isAnalyzing) return;
    setErrorMsg(null);
    setIsAnalyzing(true);
    setActiveStageIdx(0);

    const stageTimer = window.setInterval(() => {
      setActiveStageIdx((prev) => (prev < PIPELINE_STAGES.length - 2 ? prev + 1 : prev));
    }, 650);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: previewDataUrl }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Analysis failed.');
      }

      window.clearInterval(stageTimer);
      setActiveStageIdx(PIPELINE_STAGES.length - 1);

      window.setTimeout(() => {
        setIsAnalyzing(false);
        onAnalysisComplete(payload.record as WasteAnalysisRecord);
      }, 350);
    } catch (err) {
      window.clearInterval(stageTimer);
      setIsAnalyzing(false);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete waste analysis.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page Title */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-emerald-900/10 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
            Waste Image Inspection
          </h1>
          <p className="mt-1 text-sm text-emerald-950/70">
            Upload a waste photograph or capture a frame via your browser camera to run AI classification, XAI attention mapping, and recyclability scoring.
          </p>
        </div>
        <div className="text-xs font-medium text-emerald-900/70">
          Supported inputs: JPEG, PNG, WebP · Max 10 MB
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" aria-hidden="true" />
          <div className="flex-1">{errorMsg}</div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {cameraError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="flex-1">{cameraError}</div>
          <button
            type="button"
            onClick={() => setCameraError(null)}
            className="text-amber-800 hover:text-amber-950"
            aria-label="Dismiss camera warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Split: Upload/Camera Stage + Pipeline & Samples */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
              e.target.value = '';
            }}
          />

          {/* Camera Active View */}
          {cameraOpen ? (
            <div className="overflow-hidden rounded-2xl border border-emerald-900/15 bg-white">
              <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#EDF6F0] px-5 py-3">
                <span className="text-sm font-semibold text-emerald-950">Browser Camera Feed</span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-950/75 hover:text-emerald-950"
                >
                  <X className="h-4 w-4" />
                  <span>Close Camera</span>
                </button>
              </div>
              <div className="relative aspect-[4/3] w-full bg-emerald-950">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-emerald-900/10 bg-white px-5 py-4">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-xl border border-emerald-900/15 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-5 py-2 text-sm font-semibold text-white hover:bg-[#166534]"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  <span>Capture Waste Frame</span>
                </button>
              </div>
            </div>
          ) : previewDataUrl ? (
            /* Preview Selected Image */
            <div className="overflow-hidden rounded-2xl border border-emerald-900/15 bg-white">
              <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#F2F8F4] px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-emerald-950">
                    {selectedName || 'Selected Waste Image'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => {
                    setPreviewDataUrl(null);
                    setSelectedName('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-900/80 hover:text-emerald-950 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Change Image</span>
                </button>
              </div>

              <div className="relative aspect-[4/3] w-full bg-emerald-950/5">
                <img
                  src={previewDataUrl}
                  alt="Waste item ready for AI analysis"
                  className="h-full w-full object-contain bg-[#F8FBF9]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-emerald-900/10 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/15 px-3.5 py-2 text-xs font-medium text-emerald-950 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Upload Another</span>
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={handleStartCamera}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/15 px-3.5 py-2 text-xs font-medium text-emerald-950 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Use Camera</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Analysing Waste...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      <span>Analyse Waste</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Empty Upload / Camera Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className={`flex min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50/70'
                  : 'border-emerald-900/20 bg-white hover:border-emerald-700/50'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EDF6F0] text-emerald-800">
                <ImagePlus className="h-7 w-7" aria-hidden="true" />
              </div>

              <h2 className="mt-5 font-display text-xl font-bold text-emerald-950">
                Upload Waste Image
              </h2>
              <p className="mt-2 max-w-md text-sm text-emerald-950/70">
                Drag and drop a photograph of a single waste item here, browse from your device, or capture a live frame using your camera.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166534] whitespace-nowrap"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Upload Waste Image</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/20 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 whitespace-nowrap"
                >
                  <Camera className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>Use Camera</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Stage Monitor OR Quick Test Samples */}
        <div className="space-y-6 lg:col-span-5">
          {isAnalyzing ? (
            <div className="rounded-2xl border border-emerald-900/15 bg-white p-6">
              <div className="flex items-center gap-3 border-b border-emerald-900/10 pb-4">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-lg font-bold text-emerald-950">
                    Analysing waste...
                  </h2>
                  <p className="text-xs text-emerald-950/65">
                    Running Groq multi-stage intelligence pipeline
                  </p>
                </div>
              </div>

              <ol className="mt-5 space-y-3.5">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const done = idx < activeStageIdx;
                  const active = idx === activeStageIdx;
                  return (
                    <li key={stage} className="flex items-center gap-3 text-sm">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          done
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : active
                              ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                              : 'border-emerald-900/15 bg-white text-emerald-900/40'
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span
                        className={
                          done
                            ? 'font-medium text-emerald-950'
                            : active
                              ? 'font-semibold text-emerald-800'
                              : 'text-emerald-950/45'
                        }
                      >
                        {stage}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
              <h2 className="font-display text-base font-bold text-emerald-950">
                Sample Waste Inspection Inputs
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-emerald-950/70">
                Select a pre-captured reference sample to load it into the inspection frame and run the live AI analysis pipeline.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {SAMPLE_PRESETS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => handleLoadSample(sample)}
                    className="flex items-center gap-3.5 rounded-xl border border-emerald-900/10 bg-[#F8FBF9] p-2.5 text-left transition-colors hover:border-emerald-700/40 hover:bg-[#EDF6F0]"
                  >
                    <img
                      src={sample.src}
                      alt={sample.label}
                      referrerPolicy="no-referrer"
                      className="h-14 w-18 shrink-0 rounded-lg object-cover border border-emerald-900/10"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-emerald-950">
                        {sample.label}
                      </div>
                      <div className="truncate text-xs text-emerald-950/65">{sample.hint}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 1 Assessment Scope Note */}
          <div className="rounded-2xl border border-emerald-900/10 bg-[#EDF6F0] p-5 text-xs leading-relaxed text-emerald-950/80">
            <div className="font-semibold text-emerald-950">
              How RecycleIQ Evaluates Each Frame
            </div>
            <p className="mt-1.5">
              1. Identifies the material category (6 classes) with a calibrated confidence score.
              <br />
              2. Extracts visual reasoning cues and highlights key focal regions.
              <br />
              3. Screens strictly for visually observable surface contamination (never invisible chemical residue).
              <br />
              4. Computes a 0–100 Recyclability Score and outputs a recommended sorting stream.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
