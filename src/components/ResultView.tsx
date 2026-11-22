import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  History,
  Info,
  Loader2,
  MessageSquare,
  PlusCircle,
  Recycle,
  Send,
  Trash2,
} from 'lucide-react';
import type { ContaminationLevel, WasteAnalysisRecord } from '../types/recycleiq';
import { safeFetchJson } from '../utils/api';
import { XaiHeatmapCanvas } from './XaiHeatmapCanvas';

interface ResultViewProps {
  record: WasteAnalysisRecord;
  onAnalyzeAnother: () => void;
  onViewHistory: () => void;
}

function getContaminationColor(level: ContaminationLevel): string {
  switch (level) {
    case 'Clean':
      return 'text-emerald-700';
    case 'Slightly Contaminated':
      return 'text-teal-700';
    case 'Moderately Contaminated':
      return 'text-amber-700';
    case 'Highly Contaminated':
      return 'text-rose-700';
  }
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-emerald-600';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-rose-600';
}

const SUGGESTED_QUESTIONS = [
  'How should I prepare this item before recycling?',
  'Why did contamination affect the recyclability score?',
  'What happens if this goes into the wrong bin?',
];

export const ResultView: React.FC<ResultViewProps> = ({
  record,
  onAnalyzeAnother,
  onViewHistory,
}) => {
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const [question, setQuestion] = useState<string>('');
  const [asking, setAsking] = useState<boolean>(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [qaHistory, setQaHistory] = useState<
    Array<{ q: string; a: string; modelUsed: string }>
  >([]);

  const isNonRecyclableStream =
    record.sorting_recommendation === 'Send to Non-Recyclable Waste Stream';

  const submitQuestion = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setAskError(null);

    try {
      const data = await safeFetchJson<{ answer: string; modelUsed: string }>('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, record, question: trimmed }),
      });
      setQaHistory((prev) => [
        ...prev,
        { q: trimmed, a: data.answer, modelUsed: data.modelUsed },
      ]);
      setQuestion('');
    } catch (err) {
      setAskError(
        err instanceof Error ? err.message : 'Unable to reach the AI advisor.'
      );
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header Bar with Metadata */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-900/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-950/65">
            <span className="font-mono font-medium text-emerald-900">{record.id}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {new Date(record.created_at).toLocaleString()}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-emerald-900">
              {record.is_demo_data ? 'Demo Data Record' : 'Live AI Analysis'}
            </span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
            Waste Analysis Result
          </h1>
        </div>

        {/* Persistence Status */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-900/12 bg-white px-4 py-2.5 text-xs font-medium text-emerald-950">
          <Database className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <span>
            {record.is_demo_data
              ? 'Demo Data (Pre-seeded reference record)'
              : 'Analysis saved to Local Database'}
          </span>
        </div>
      </div>

      {/* Primary Asymmetric Split: Uploaded Image + Core AI Decisions */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Large Uploaded Waste Image */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-emerald-900/12 bg-white">
            <div className="flex items-center justify-between border-b border-emerald-900/10 bg-[#F2F8F4] px-4 py-2.5 text-xs font-medium text-emerald-950/80">
              <span>Inspected Waste Item</span>
              <span className="truncate max-w-[200px] text-emerald-900/65">
                {record.detected_item}
              </span>
            </div>
            <div className="aspect-[4/3] w-full bg-[#F8FBF9]">
              {imgFailed ? (
                <div className="flex h-full w-full items-center justify-center p-6 text-sm text-emerald-900/60">
                  Waste image preview unavailable
                </div>
              ) : (
                <img
                  src={record.image_url}
                  alt={record.detected_item}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Classification, Recyclability, Contamination, Final Sorting Decision */}
        <div className="space-y-5 lg:col-span-7">
          {/* Top Metric Row: AI Classification vs Recyclability vs Contamination */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
              <div className="text-xs font-medium text-emerald-950/65">AI Classification</div>
              <div className="mt-2 font-display text-2xl font-bold text-emerald-950">
                {record.waste_type}
              </div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-emerald-700">
                {record.confidence.toFixed(1)}% Confidence
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
              <div className="text-xs font-medium text-emerald-950/65">Recyclability Score</div>
              <div className="mt-2 flex items-baseline gap-1 font-mono text-2xl font-bold tabular-nums text-emerald-950">
                <span>{record.recyclability_score}</span>
                <span className="text-sm font-normal text-emerald-950/55">/ 100</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-emerald-800">
                {record.recyclability_category}
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/10">
                <div
                  className={`h-full rounded-full ${getScoreBarColor(record.recyclability_score)}`}
                  style={{ width: `${record.recyclability_score}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
              <div className="text-xs font-medium text-emerald-950/65">Contamination Status</div>
              <div
                className={`mt-2 font-display text-lg font-bold leading-snug ${getContaminationColor(
                  record.contamination_level
                )}`}
              >
                {record.contamination_level}
              </div>
              <div className="mt-1.5 text-xs text-emerald-950/65">
                Visual surface inspection only
              </div>
            </div>
          </div>

          {/* Contamination Explanation */}
          <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
            <div className="flex items-start gap-3">
              {record.contamination_level === 'Clean' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              )}
              <div>
                <h2 className="text-sm font-semibold text-emerald-950">
                  Visual Contamination Observation
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-950/80">
                  {record.contamination_reason}
                </p>
                <p className="mt-1.5 text-xs text-emerald-950/55">
                  Note: Camera inspection evaluates visually observable residue or mixed attachments only; it does not detect invisible chemical contamination.
                </p>
              </div>
            </div>
          </div>

          {/* Final Decision / Recommended Sorting Action */}
          <div
            className={`rounded-2xl border p-5 ${
              isNonRecyclableStream
                ? 'border-rose-300 bg-rose-50/70'
                : 'border-emerald-700/30 bg-[#E6F4EB]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isNonRecyclableStream
                      ? 'bg-rose-700 text-white'
                      : 'bg-[#14532D] text-white'
                  }`}
                >
                  {isNonRecyclableStream ? (
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Recycle className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-950/70">
                    Final Decision · Recommended Sorting Action
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold text-emerald-950">
                    {record.sorting_recommendation}
                  </div>
                  <div className="mt-1 text-xs text-emerald-950/70">
                    Based on material classification, 0–100 recyclability score, and visual contamination status
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated User-Friendly Explainable AI Section: "Why this result?" */}
      <section className="rounded-2xl border border-emerald-900/12 bg-white p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div>
              <h2 className="font-display text-xl font-bold text-emerald-950">
                Why this result?
              </h2>
              <p className="mt-1 text-xs text-emerald-950/65">
                Plain-language explanation of the AI classification for {record.waste_type} ({record.confidence.toFixed(1)}% confidence)
              </p>
            </div>

            <p className="text-sm leading-relaxed text-emerald-950/85">
              {record.ai_explanation}
            </p>

            <div className="border-t border-emerald-900/10 pt-4">
              <div className="text-xs font-semibold text-emerald-950">
                Key visual cues detected:
              </div>
              <ul className="mt-2.5 space-y-2">
                {record.visual_cues.map((cue, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-emerald-950/80">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Transparent Recyclability Breakdown */}
            <div className="border-t border-emerald-900/10 pt-4">
              <div className="text-xs font-semibold text-emerald-950">
                How Recyclability ({record.recyclability_score}/100) was calculated:
              </div>
              <div className="mt-2 space-y-1.5 text-xs text-emerald-950/75">
                {record.recyclability_breakdown.rule_notes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-emerald-800">•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Visual Explanation (Original Image vs AI Attention Map) */}
          <div className="lg:col-span-7">
            <XaiHeatmapCanvas
              imageUrl={record.image_url}
              detectedItem={record.detected_item}
              attentionRegions={record.attention_regions}
              xaiMethod={record.xai_method}
            />
          </div>
        </div>
      </section>

      {/* Interactive LLM Waste Advisor ("Ask AI about this item") */}
      <section className="rounded-2xl border border-emerald-900/12 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/10 pb-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-emerald-950">
                Ask RecycleIQ AI About This Item
              </h2>
              <p className="text-xs text-emerald-950/65">
                Query the LLM advisor about preparation, separation, or contamination rules for this result
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={asking}
              onClick={() => submitQuestion(q)}
              className="rounded-lg border border-emerald-900/15 bg-[#F8FBF9] px-3 py-1.5 text-xs font-medium text-emerald-950 transition-colors hover:bg-[#EDF6F0] disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {qaHistory.length > 0 && (
          <div className="mt-5 space-y-4 border-t border-emerald-900/10 pt-4">
            {qaHistory.map((entry, idx) => (
              <div key={idx} className="space-y-1.5 text-sm">
                <div className="font-semibold text-emerald-950">Q: {entry.q}</div>
                <p className="leading-relaxed text-emerald-950/85">{entry.a}</p>
                <div className="font-mono text-[11px] text-emerald-900/55">
                  Answered via {entry.modelUsed}
                </div>
              </div>
            ))}
          </div>
        )}

        {askError && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs text-rose-900">
            {askError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion(question);
          }}
          className="mt-4 flex gap-3"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a follow-up question (e.g., Should I remove the cap or rinse first?)"
            className="flex-1 rounded-xl border border-emerald-900/15 bg-[#F8FBF9] px-4 py-2.5 text-sm text-emerald-950 outline-none focus:border-emerald-700 focus:bg-white"
          />
          <button
            type="submit"
            disabled={asking || question.trim().length < 2}
            className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166534] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {asking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Ask AI</span>
          </button>
        </form>
      </section>

      {/* Optional Technical Details Accordion */}
      <section className="rounded-2xl border border-emerald-900/12 bg-white">
        <button
          type="button"
          onClick={() => setShowTechDetails((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold text-emerald-950 hover:bg-[#F8FBF9]"
        >
          <span className="inline-flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>Technical Details (Model, Inference &amp; Storage)</span>
          </span>
          {showTechDetails ? (
            <ChevronUp className="h-4 w-4 text-emerald-900/65" />
          ) : (
            <ChevronDown className="h-4 w-4 text-emerald-900/65" />
          )}
        </button>

        {showTechDetails && (
          <div className="grid grid-cols-1 gap-4 border-t border-emerald-900/10 px-6 py-5 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-emerald-950/60">Prediction Engine</div>
              <div className="mt-1 font-medium text-emerald-950">{record.prediction_source}</div>
            </div>
            <div>
              <div className="text-emerald-950/60">XAI Visualization Method</div>
              <div className="mt-1 font-medium text-emerald-950">{record.xai_method}</div>
            </div>
            <div>
              <div className="text-emerald-950/60">Inference Latency</div>
              <div className="mt-1 font-mono tabular-nums font-medium text-emerald-950">
                {record.inference_time_ms ? `${record.inference_time_ms} ms` : 'N/A (Demo Seed)'}
              </div>
            </div>
            <div>
              <div className="text-emerald-950/60">Storage Provider</div>
              <div className="mt-1 font-medium text-emerald-950">
                Persistent Local Database
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-emerald-900/10 pt-6">
        <div className="flex items-center gap-2 text-xs text-emerald-950/65">
          <Info className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <span>
            Waste classification and recyclability are evaluated independently to prevent contaminated items from spoiling recycling streams.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/20 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 whitespace-nowrap"
          >
            <History className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>View History</span>
          </button>
          <button
            type="button"
            onClick={onAnalyzeAnother}
            className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166534] whitespace-nowrap"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Analyse Another Waste</span>
          </button>
        </div>
      </div>
    </div>
  );
};
