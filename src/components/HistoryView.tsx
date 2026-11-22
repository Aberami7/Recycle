import React, { useMemo, useState } from 'react';
import { ExternalLink, PlusCircle, Search, Trash2 } from 'lucide-react';
import type {
  ContaminationLevel,
  WasteAnalysisRecord,
  WasteCategory,
} from '../types/recycleiq';

interface HistoryViewProps {
  records: WasteAnalysisRecord[];
  onSelectRecord: (record: WasteAnalysisRecord) => void;
  onDeleteRecord: (id: string) => Promise<void>;
  onStartAnalyze: () => void;
}

const CATEGORY_OPTIONS: Array<'All' | WasteCategory> = [
  'All',
  'Plastic',
  'Paper',
  'Metal',
  'Glass',
  'Organic',
  'Non-Recyclable',
];

const CONTAMINATION_OPTIONS: Array<'All' | ContaminationLevel> = [
  'All',
  'Clean',
  'Slightly Contaminated',
  'Moderately Contaminated',
  'Highly Contaminated',
];

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  onSelectRecord,
  onDeleteRecord,
  onStartAnalyze,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | WasteCategory>('All');
  const [contaminationFilter, setContaminationFilter] =
    useState<'All' | ContaminationLevel>('All');
  const [originFilter, setOriginFilter] = useState<'all' | 'live' | 'demo'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (categoryFilter !== 'All' && r.waste_type !== categoryFilter) return false;
      if (contaminationFilter !== 'All' && r.contamination_level !== contaminationFilter)
        return false;
      if (originFilter === 'live' && r.is_demo_data) return false;
      if (originFilter === 'demo' && !r.is_demo_data) return false;
      if (q) {
        const haystack =
          `${r.id} ${r.detected_item} ${r.waste_type} ${r.sorting_recommendation} ${r.ai_explanation}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, searchQuery, categoryFilter, contaminationFilter, originFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-emerald-900/10 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
            Analysis History
          </h1>
          <p className="mt-1 text-sm text-emerald-950/70">
            Search and inspect past waste analyses. Select any row to reopen its full Explainable AI visual heatmap and sorting decision.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartAnalyze}
          className="inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166534] whitespace-nowrap"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-900/12 bg-white p-4 sm:grid-cols-2 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-emerald-900/45"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, item, category, decision..."
            className="w-full rounded-xl border border-emerald-900/15 bg-[#F8FBF9] py-2 pr-3 pl-9 text-sm text-emerald-950 outline-none focus:border-emerald-700 focus:bg-white"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            aria-label="Filter by waste category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | WasteCategory)}
            className="w-full rounded-xl border border-emerald-900/15 bg-[#F8FBF9] px-3 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-700"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <select
            aria-label="Filter by contamination level"
            value={contaminationFilter}
            onChange={(e) =>
              setContaminationFilter(e.target.value as 'All' | ContaminationLevel)
            }
            className="w-full rounded-xl border border-emerald-900/15 bg-[#F8FBF9] px-3 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-700"
          >
            {CONTAMINATION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                Contamination: {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end lg:col-span-2">
          <select
            aria-label="Filter by record source"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as 'all' | 'live' | 'demo')}
            className="w-full rounded-xl border border-emerald-900/15 bg-[#F8FBF9] px-3 py-2 text-sm text-emerald-950 outline-none focus:border-emerald-700"
          >
            <option value="all">Source: All</option>
            <option value="live">Live Only</option>
            <option value="demo">Demo Data</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-2xl border border-emerald-900/12 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-emerald-950/75">
              No analysis records match your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setContaminationFilter('All');
                setOriginFilter('all');
              }}
              className="mt-3 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-900/10 bg-[#F8FBF9] text-xs font-semibold text-emerald-950/70">
                <tr>
                  <th className="px-5 py-3">Waste Image &amp; ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Confidence</th>
                  <th className="px-4 py-3 text-right">Recyclability</th>
                  <th className="px-4 py-3">Contamination</th>
                  <th className="px-4 py-3">Final Recommendation</th>
                  <th className="px-4 py-3 text-right">Date / Time</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectRecord(item)}
                    className="cursor-pointer transition-colors hover:bg-[#F2F8F4]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image_url}
                          alt={item.detected_item}
                          referrerPolicy="no-referrer"
                          className="h-11 w-14 shrink-0 rounded-lg border border-emerald-900/10 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate max-w-[200px] font-medium text-emerald-950">
                            {item.detected_item}
                          </div>
                          <div className="font-mono text-xs text-emerald-950/55">
                            {item.id} · {item.is_demo_data ? 'Demo Data' : 'Live'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-emerald-950">
                      {item.waste_type}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums text-emerald-950">
                      {item.confidence.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular-nums font-semibold text-emerald-800">
                      {item.recyclability_score}/100
                    </td>
                    <td className="px-4 py-3.5 text-emerald-950/85">
                      {item.contamination_level}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-emerald-900">
                      {item.sorting_recommendation}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs tabular-nums text-emerald-950/65 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRecord(item);
                          }}
                          className="rounded-lg border border-emerald-900/15 bg-white p-1.5 text-emerald-800 hover:bg-emerald-50"
                          title="Open full analysis"
                          aria-label={`Open full analysis for ${item.id}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        {!item.is_demo_data && (
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={(e) => handleDelete(e, item.id)}
                            className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                            title="Delete analysis"
                            aria-label={`Delete analysis ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
