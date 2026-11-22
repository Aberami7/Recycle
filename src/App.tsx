import { useCallback, useEffect, useState } from 'react';
import type { SystemHealth, WasteAnalysisRecord } from './types/recycleiq';
import { safeFetchJson } from './utils/api';
import { RecycleLogo } from './components/RecycleLogo';
import { WelcomeView } from './components/WelcomeView';
import { DashboardView } from './components/DashboardView';
import { AnalyzeView } from './components/AnalyzeView';
import { ResultView } from './components/ResultView';
import { HistoryView } from './components/HistoryView';
import { AboutView } from './components/AboutView';

type AppPage = 'welcome' | 'dashboard' | 'analyze' | 'result' | 'history' | 'about';

const LIVE_STORAGE_KEY = 'recycleiq_live_records_v1';

function readCachedLiveRecords(): WasteAnalysisRecord[] {
  try {
    const raw = window.localStorage.getItem(LIVE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WasteAnalysisRecord[]) : [];
  } catch {
    return [];
  }
}

function writeCachedLiveRecords(records: WasteAnalysisRecord[]): void {
  try {
    const liveOnly = records.filter((r) => !r.is_demo_data).slice(0, 30);
    window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(liveOnly));
  } catch {
    // ignore storage quota limits
  }
}

export default function App() {
  const [page, setPage] = useState<AppPage>('welcome');
  const [operatorName, setOperatorName] = useState<string>('');
  const [records, setRecords] = useState<WasteAnalysisRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<WasteAnalysisRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [health, setHealth] = useState<SystemHealth>({
    status: 'ok',
    phase: 'Phase 1 Software Prototype',
    storage_provider: 'local_database',
    ai_provider: 'groq',
    groq_configured: true,
    active_models: ['meta-llama/llama-4-scout-17b-16e-instruct'],
    phase2_endpoints_ready: true,
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [h, analysesData] = await Promise.all([
        safeFetchJson<SystemHealth>('/api/health').catch(() => null),
        safeFetchJson<{ records: WasteAnalysisRecord[] }>('/api/analyses').catch(() => ({
          records: [] as WasteAnalysisRecord[],
        })),
      ]);

      if (h) {
        setHealth(h);
      }

      const serverRecords = analysesData.records || [];
      const cachedLive = readCachedLiveRecords();
      const seenIds = new Set(serverRecords.map((r) => r.id));
      const merged = [
        ...cachedLive.filter((r) => !seenIds.has(r.id)),
        ...serverRecords,
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecords(merged);
      setSelectedRecord((prev) => prev ?? merged[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleEnterWorkspace = (name: string) => {
    setOperatorName(name);
    setPage('dashboard');
  };

  const handleAnalysisComplete = (record: WasteAnalysisRecord) => {
    setRecords((prev) => {
      const next = [record, ...prev.filter((r) => r.id !== record.id)];
      writeCachedLiveRecords(next);
      return next;
    });
    setSelectedRecord(record);
    setPage('result');
  };

  const handleSelectRecord = (record: WasteAnalysisRecord) => {
    setSelectedRecord(record);
    setPage('result');
  };

  const handleDeleteRecord = async (id: string) => {
    await safeFetchJson(`/api/analyses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => null);

    setRecords((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      writeCachedLiveRecords(remaining);
      if (selectedRecord?.id === id) {
        setSelectedRecord(remaining[0] ?? null);
      }
      return remaining;
    });
  };

  if (page === 'welcome') {
    return (
      <WelcomeView
        onContinue={handleEnterWorkspace}
        storageProvider={health.storage_provider}
      />
    );
  }

  const navItems: Array<{ id: AppPage; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analyze', label: 'Analyse' },
    { id: 'result', label: 'Result' },
    { id: 'history', label: 'History' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-[#F6FAF7] text-[#102A1C] flex flex-col">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setPage('dashboard')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <RecycleLogo size={30} />
            <span className="font-display text-lg font-bold tracking-tight text-emerald-950">
              RecycleIQ
            </span>
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-emerald-950/70"
          >
            {navItems.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-emerald-700 font-semibold text-emerald-950'
                      : 'border-transparent hover:border-emerald-900/20 hover:text-emerald-950'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setPage('analyze')}
              className="rounded-xl bg-[#14532D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#166534] whitespace-nowrap shrink-0"
            >
              Analyse Waste
            </button>
          </div>
        </div>

        {/* Compact Mobile Nav Strip */}
        <nav
          aria-label="Mobile navigation"
          className="flex md:hidden items-center justify-around border-t border-emerald-900/10 bg-[#F8FBF9] px-2 py-1.5 text-xs font-medium"
        >
          {navItems.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={`rounded-lg px-2.5 py-1.5 whitespace-nowrap shrink-0 ${
                  active ? 'bg-white font-semibold text-emerald-950 shadow-xs' : 'text-emerald-950/70'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {page === 'dashboard' && (
          <DashboardView
            records={records}
            loading={loading}
            storageProvider={health.storage_provider}
            onSelectRecord={handleSelectRecord}
            onStartAnalyze={() => setPage('analyze')}
            onOpenHistory={() => setPage('history')}
          />
        )}

        {page === 'analyze' && (
          <AnalyzeView onAnalysisComplete={handleAnalysisComplete} />
        )}

        {page === 'result' && (
          selectedRecord ? (
            <ResultView
              record={selectedRecord}
              onAnalyzeAnother={() => setPage('analyze')}
              onViewHistory={() => setPage('history')}
            />
          ) : (
            <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-900/12 bg-white p-10 text-center">
              <h2 className="font-display text-xl font-bold text-emerald-950">
                No Analysis Selected
              </h2>
              <p className="mt-2 text-sm text-emerald-950/70">
                Upload a waste image or select a record from History to inspect its Explainable AI result.
              </p>
              <button
                type="button"
                onClick={() => setPage('analyze')}
                className="mt-5 rounded-xl bg-[#14532D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166534]"
              >
                Analyse Waste Image
              </button>
            </div>
          )
        )}

        {page === 'history' && (
          <HistoryView
            records={records}
            onSelectRecord={handleSelectRecord}
            onDeleteRecord={handleDeleteRecord}
            onStartAnalyze={() => setPage('analyze')}
          />
        )}

        {page === 'about' && <AboutView />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-emerald-900/10 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-emerald-950/60">
          <span>
            RecycleIQ · AI-Driven Intelligent Recyclability Assessment and Waste Sorting System
          </span>
          <div className="flex items-center gap-4">
            {operatorName && <span>Operator: {operatorName}</span>}
            <button
              type="button"
              onClick={() => setPage('welcome')}
              className="font-medium text-emerald-800 hover:underline"
            >
              Switch Operator
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
