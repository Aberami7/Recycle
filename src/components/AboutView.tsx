import React from 'react';
import {
  BrainCircuit,
  Cloud,
  Eye,
  MessageSquare,
  Recycle,
  ShieldCheck,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const workflowSteps = [
    'Waste Image Input (Upload / Browser Camera)',
    'Groq Vision Waste Classification (6 Categories)',
    'Calibrated Confidence Score',
    'Explainable AI (Plain-English Cues + Visual Attention Map)',
    'Recyclability Assessment (0–100 Score)',
    'Visual Contamination Detection',
    'Final Sorting Recommendation',
    'Interactive Groq AI Sorting Advisor',
    'Dashboard Analytics & Audit History',
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="border-b border-emerald-900/10 pb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
          About RecycleIQ &amp; System Architecture
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-emerald-950/75">
          RecycleIQ is an AI-driven intelligent recyclability assessment and waste sorting web
          platform powered by Groq multimodal vision, explainable visual attention mapping,
          transparent recyclability rules, and persistent local database storage.
        </p>
      </div>

      {/* Problem & Proposed Solution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-emerald-950">
            01. Problem Statement
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-emerald-950/80">
            Conventional waste sorting often treats every item of a material as equally recyclable.
            In practice, oil-soaked cardboard, food-contaminated plastics, or mixed-material
            assemblies spoil entire recycling batches—and opaque black-box predictions give users no
            explanation for why an item was routed to residual waste.
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-emerald-950">
            02. Proposed AI Solution
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-emerald-950/80">
            RecycleIQ decouples material classification from recyclability evaluation. Every waste
            image passes through Groq multimodal classification, plain-language XAI reasoning with
            attention maps, visual contamination screening, and a transparent 0–100 recyclability
            scoring engine before producing a sorting recommendation.
          </p>
        </section>
      </div>

      {/* End-to-End Workflow */}
      <section className="rounded-2xl border border-emerald-900/12 bg-white p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-emerald-950">
          03. End-to-End Intelligence Workflow
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {workflowSteps.map((step, i) => (
            <div
              key={step}
              className="flex items-start gap-3 rounded-xl border border-emerald-900/10 bg-[#F8FBF9] p-3.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#14532D] font-mono text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-xs font-medium leading-snug text-emerald-950">{step}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Core Intelligence Modules */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <BrainCircuit className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-emerald-950">
            Groq Vision Classification (6 Classes)
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-950/75">
            Categorizes waste into Plastic, Paper, Metal, Glass, Organic, and Non-Recyclable using
            Groq multimodal vision (`meta-llama/llama-4-scout-17b-16e-instruct`) with calibrated
            confidence estimates.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <Eye className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-emerald-950">
            Explainable AI Attention Maps
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-950/75">
            Combines plain-language visual cues with side-by-side attention heatmaps highlighting the
            exact regions of the waste item that drove the classification and contamination score.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <Recycle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-emerald-950">
            Recyclability vs Classification
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-950/75">
            Classifying an item as Plastic or Paper does not guarantee 100% recyclability. The
            rules engine computes a 0–100 score by subtracting contamination and material-condition
            penalties from base material recoverability.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-emerald-950">
            Visual Contamination Detection
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-950/75">
            Grades items as Clean, Slightly, Moderately, or Highly Contaminated strictly from
            visually observable residue, grease, or mixed attachments—never claiming invisible
            chemical detection.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <MessageSquare className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-emerald-950">
            Interactive Groq AI Advisor
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-950/75">
            Allows users to ask follow-up questions directly on any analysis result to learn how to
            rinse, separate lids, or dispose of contaminated items responsibly.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6">
          <Cloud className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-bold text-emerald-950">
            Persistent Database &amp; Image Store
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-950/75">
            Stores structured waste analysis records and uploaded images locally on the server with
            live dashboard metrics and searchable history.
          </p>
        </div>
      </div>
    </div>
  );
};
