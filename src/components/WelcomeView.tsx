import React, { useState } from 'react';
import { ArrowRight, Camera, Database, Eye, Leaf, MessageSquare, ShieldCheck } from 'lucide-react';
import { RecycleLogo } from './RecycleLogo';

interface WelcomeViewProps {
  onContinue: (operatorName: string) => void;
  storageProvider: 'local_database';
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onContinue, storageProvider }) => {
  const [operatorName, setOperatorName] = useState<string>('Project Demo Operator');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue(operatorName.trim() || 'Project Demo Operator');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDF7F0] via-[#F6FAF7] to-[#FFFFFF] text-[#102A1C]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-10 lg:px-10">
        {/* Top Wordmark */}
        <div className="flex items-center justify-between border-b border-emerald-900/10 pb-6">
          <div className="flex items-center gap-3">
            <RecycleLogo size={36} />
            <span className="font-display text-xl font-bold tracking-tight text-emerald-950">
              RecycleIQ
            </span>
          </div>
          <span className="text-xs font-medium text-emerald-900/70">
            Groq Vision Intelligence · {storageProvider === 'local_database' ? 'Database Ready' : 'Active'}
          </span>
        </div>

        {/* Main 2-Column Hero & Operator Access */}
        <div className="my-12 grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <p className="text-sm font-semibold tracking-wide text-emerald-700">
              AI-Powered Waste Intelligence Platform
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.12] tracking-tight text-emerald-950 sm:text-5xl [text-wrap:balance]">
              AI-Driven Intelligent Recyclability Assessment and Waste Sorting System
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-emerald-950/75">
              RecycleIQ evaluates waste imagery through Groq multimodal vision, plain-language
              explainable AI, visual contamination screening, and transparent recyclability rules—generating
              clear sorting recommendations and actionable disposal guidance.
            </p>

            {/* 4 Key Pillars */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 border-t border-emerald-900/10 pt-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-emerald-950">6-Category Waste Classification</h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-950/65">
                    Plastic, Paper, Metal, Glass, Organic, and Non-Recyclable with calibrated confidence scores.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-emerald-950">Explainable AI Attention Maps</h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-950/65">
                    Human-friendly visual explanations paired with focal region attention heatmaps.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-emerald-950">Recyclability &amp; Contamination Rules</h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-950/65">
                    Separates material identity from actual 0–100 recoverability based on observable residue.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-emerald-950">Interactive Groq AI Advisor</h2>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-950/65">
                    Ask follow-up questions about rinsing, material separation, and recycling preparation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Operator Session Entry */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-emerald-900/12 bg-white p-7 sm:p-8"
            >
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-emerald-950">
                  Access RecycleIQ Workspace
                </h2>
                <p className="mt-1.5 text-sm text-emerald-950/70">
                  Enter an operator or reviewer name to start analysing waste samples, inspect XAI heatmaps, and query the Groq AI advisor.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="operator-name"
                    className="block text-xs font-semibold text-emerald-950/80"
                  >
                    Operator / Reviewer Name
                  </label>
                  <input
                    id="operator-name"
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="e.g., Lab Evaluator"
                    className="mt-1.5 w-full rounded-xl border border-emerald-900/15 bg-[#F8FBF9] px-4 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-700 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#166534] whitespace-nowrap"
                >
                  <span>Continue to RecycleIQ</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-6 space-y-2.5 border-t border-emerald-900/10 pt-5 text-xs text-emerald-950/70">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>Powered by Groq Multimodal Vision &amp; Explainable AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>
                    Database: Persistent local waste analysis database &amp; image store active
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Clean Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-emerald-900/10 pt-5 text-xs text-emerald-950/60">
          <span>RecycleIQ · Intelligent Recyclability Assessment &amp; Waste Sorting</span>
          <span>Powered by Groq Vision &amp; Recyclability Rules Engine</span>
        </footer>
      </div>
    </div>
  );
};
