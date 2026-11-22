import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  PlusCircle,
  Recycle,
  ShieldAlert,
} from 'lucide-react';
import type { WasteAnalysisRecord, WasteCategory } from '../types/recycleiq';

interface DashboardViewProps {
  records: WasteAnalysisRecord[];
  loading: boolean;
  storageProvider: 'local_database';
  onSelectRecord: (record: WasteAnalysisRecord) => void;
  onStartAnalyze: () => void;
  onOpenHistory: () => void;
}

const CATEGORIES: WasteCategory[] = [
  'Plastic',
  'Paper',
  'Metal',
  'Glass',
  'Organic',
  'Non-Recyclable',
];

const CATEGORY_BAR_COLORS: Record<WasteCategory, string> = {
  Plastic: '#15803D',
  Paper: '#0D9488',
  Metal: '#0284C7',
  Glass: '#16A34A',
  Organic: '#65A30D',
  'Non-Recyclable': '#B91C1C',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  loading,
  storageProvider,
  onSelectRecord,
  onStartAnalyze,
  onOpenHistory,
}) => {
  const [scope, setScope] = useState<'all' | 'live' | 'demo'>('all');

  const scopedRecords = useMemo(() => {
    if (scope === 'live') return records.filter((r) => !r.is_demo_data);
    if (scope === 'demo') return records.filter((r) => r.is_demo_data);
    return records;
  }, [records, scope]);

  const stats = useMemo(() => {
    const counts: Record<WasteCategory, number> = {
      Plastic: 0,
      Paper: 0,
      Metal: 0,
      Glass: 0,
      Organic: 0,
      'Non-Recyclable': 0,
    };

    let totalScore = 0;
    let clean = 0;
    let contaminated = 0;
    let highlyRecyclable = 0;
    let nonRecyclable = 0;

    for (const r of scopedRecords) {
      counts[r.waste_type] = (counts[r.waste_type] ?? 0) + 1;
      totalScore += r.recyclability_score;
      if (r.contamination_level === 'Clean') {
        clean += 1;
      } else {
        contaminated += 1;
      }
      if (r.recyclability_category === 'Highly Recyclable') {
        highlyRecyclable += 1;
      }
      if (
        r.recyclability_category === 'Non-Recyclable' ||
        r.sorting_recommendation === 'Send to Non-Recyclable Waste Stream'
      ) {
        nonRecyclable += 1;
      }
    }

    const total = scopedRecords.length;
    const pct = (n: number) => (total === 0 ? 0 : Number(((n / total) * 100).toFixed(1)));

    return {
      total,
      counts,
      avgScore: total === 0 ? 0 : Number((totalScore / total).toFixed(1)),
      cleanPct: pct(clean),
      contaminatedPct: pct(contaminated),
      highlyRecyclablePct: pct(highlyRecyclable),
      nonRecyclablePct: pct(nonRecyclable),
    };
  }, [scopedRecords]);

  const maxCategoryCount = Math.max(1, ...Object.values(stats.counts));
  const recentFive = scopedRecords.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Top Header & Scope Filter */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-emerald-900/10 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-emerald-950/70">
            Real-time overview of waste classification counts, recyclability scores, and visual contamination rates · Storage:{' '}
            <span className="font-medium text-emerald-900">
              {storageProvider === 'local_database' ? 'Persistent Local Database' : 'Database'}
            </span>
          </p>
        </div>

        {/* Interactive Scope Tabs */}
        <div
          role="group"
          aria-label="Filter dashboard dataset scope"
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-900/12 bg-[#EDF6F0] p-1"
        >
          {(
            [
              { id: 'all', label: `All Records (${records.length})` },
              {
                id: 'live',
                label: `Live Analyses (${records.filter((r) => !r.is_demo_data).length})`,
              },
              {
                id: 'demo',
                label: `Demo Data (${records.filter((r) => r.is_demo_data).length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                scope === tab.id
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-950/65 hover:text-emerald-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Statistics: Total + 6 Category Counters */}
      <section aria-label="Overall waste category counts" className="space-y-3">
        <h2 className="text-sm font-semibold text-emerald-950">Overall Statistics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-2xl border border-emerald-900/15 bg-[#14532D] p-4 text-white">
            <div className="text-xs font-medium text-emerald-100/85">Total Analysed</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums">
              {loading ? '—' : stats.total}
            </div>
            <div className="mt-1 text-[11px] text-emerald-100/75">Waste items</div>
          </div>

          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="rounded-2xl border border-emerald-900/12 bg-white p-4"
            >
              <div className="text-xs font-medium text-emerald-950/65">{cat}</div>
              <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-950">
                {loading ? '—' : stats.counts[cat]}
              </div>
              <div className="mt-1 text-[11px] font-mono tabular-nums text-emerald-950/55">
                {stats.total > 0
                  ? `${((stats.counts[cat] / stats.total) * 100).toFixed(0)}% of batch`
                  : '0% of batch'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Statistics KPI Strip */}
      <section aria-label="Recyclability and contamination percentages" className="space-y-3">
        <h2 className="text-sm font-semibold text-emerald-950">
          Recyclability &amp; Contamination Performance
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
            <div className="text-xs font-medium text-emerald-950/65">Avg. Recyclability Score</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-950">
              {stats.avgScore}
              <span className="ml-1 text-sm font-normal text-emerald-950/55">/ 100</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-950/65">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>Clean Waste</span>
            </div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-700">
              {stats.cleanPct}%
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-950/65">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span>Contaminated Waste</span>
            </div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-700">
              {stats.contaminatedPct}%
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-950/65">
              <Recycle className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>Highly Recyclable</span>
            </div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-emerald-800">
              {stats.highlyRecyclablePct}%
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-900/12 bg-white p-5">
            <div className="text-xs font-medium text-emerald-950/65">Non-Recyclable Stream</div>
            <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-rose-700">
              {stats.nonRecyclablePct}%
            </div>
          </div>
        </div>
      </section>

      {/* Clean Visual Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Category Distribution Horizontal Bar Chart */}
        <div className="rounded-2xl border border-emerald-900/12 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-emerald-900/10 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-emerald-950">
                Waste Category Distribution
              </h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-emerald-950/60">
              n = {stats.total}
            </span>
          </div>

          <div className="mt-5 space-y-3.5">
            {CATEGORIES.map((cat) => {
              const count = stats.counts[cat];
              const widthPct = stats.total === 0 ? 0 : Math.round((count / maxCategoryCount) * 100);
              const sharePct =
                stats.total === 0 ? '0.0' : ((count / stats.total) * 100).toFixed(1);

              return (
                <div key={cat} className="grid grid-cols-12 items-center gap-3 text-sm">
                  <div className="col-span-3 truncate font-medium text-emerald-950">{cat}</div>
                  <div className="col-span-7">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[#EDF6F0]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: CATEGORY_BAR_COLORS[cat],
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-right font-mono text-xs tabular-nums text-emerald-950/80">
                    {count} ({sharePct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stream Split & Score Gauge */}
        <div className="flex flex-col justify-between rounded-2xl border border-emerald-900/12 bg-white p-6 lg:col-span-5">
          <div>
            <h2 className="font-display text-base font-bold text-emerald-950">
              Contamination &amp; Recovery Balance
            </h2>
            <p className="mt-1 text-xs text-emerald-950/65">
              Proportion of clean vs visually contaminated waste and recovery eligibility
            </p>
          </div>

          <div className="my-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-emerald-950">
                <span>Clean vs Contaminated Items</span>
                <span className="font-mono tabular-nums">
                  {stats.cleanPct}% Clean · {stats.contaminatedPct}% Contaminated
                </span>
              </div>
              <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-[#EDF6F0]">
                <div
                  className="h-full bg-emerald-600"
                  style={{ width: `${stats.cleanPct}%` }}
                  title={`Clean: ${stats.cleanPct}%`}
                />
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${stats.contaminatedPct}%` }}
                  title={`Contaminated: ${stats.contaminatedPct}%`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-emerald-950">
                <span>Recyclable vs Residual Stream</span>
                <span className="font-mono tabular-nums">
                  {(100 - stats.nonRecyclablePct).toFixed(1)}% Recoverable · {stats.nonRecyclablePct}% Residual
                </span>
              </div>
              <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-[#EDF6F0]">
                <div
                  className="h-full bg-[#14532D]"
                  style={{ width: `${Math.max(0, 100 - stats.nonRecyclablePct)}%` }}
                />
                <div
                  className="h-full bg-rose-600"
                  style={{ width: `${stats.nonRecyclablePct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-emerald-900/10 pt-4 text-xs text-emerald-950/70">
            Evaluated using Groq multimodal vision combined with transparent material recyclability rules.
          </div>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <section className="overflow-hidden rounded-2xl border border-emerald-900/12 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 px-6 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-emerald-950">
              Recent Analyses
            </h2>
            <p className="text-xs text-emerald-950/65">
              Click any record to inspect its full Explainable AI heatmap and sorting recommendation
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 whitespace-nowrap"
          >
            <span>Open Full History</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {recentFive.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm font-medium text-emerald-950/75">
              No {scope === 'live' ? 'live ' : ''}waste analyses recorded yet.
            </p>
            <button
              type="button"
              onClick={onStartAnalyze}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#166534]"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>Analyse First Waste Image</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-900/10 bg-[#F8FBF9] text-xs font-semibold text-emerald-950/70">
                <tr>
                  <th className="px-6 py-3">Waste Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Confidence</th>
                  <th className="px-4 py-3 text-right">Recyclability</th>
                  <th className="px-4 py-3">Contamination</th>
                  <th className="px-6 py-3 text-right">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10">
                {recentFive.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectRecord(item)}
                    className="cursor-pointer transition-colors hover:bg-[#F2F8F4]"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image_url}
                          alt={item.detected_item}
                          referrerPolicy="no-referrer"
                          className="h-10 w-12 shrink-0 rounded-lg border border-emerald-900/10 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate max-w-[240px] font-medium text-emerald-950">
                            {item.detected_item}
                          </div>
                          <div className="text-xs text-emerald-950/55">
                            {item.id} · {item.is_demo_data ? 'Demo Data' : 'Live Analysis'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-950">{item.waste_type}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-950">
                      {item.confidence.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-emerald-800">
                      {item.recyclability_score} / 100
                    </td>
                    <td className="px-4 py-3 text-emerald-950/85">
                      {item.contamination_level}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs tabular-nums text-emerald-950/65 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
