'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, FolderKanban, ChevronDown, ChevronRight, History, FileSpreadsheet, Trash2, Target, Upload, Loader2, CheckCircle2, AlertCircle, Download, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Project } from '@/lib/schemas/project-schema';
import { type BaselineData } from '@/lib/schemas/baseline-schema';
import { ExcelUpload } from '@/components/dashboard/ExcelUpload';
import { getStoredExcelData, getExcelHistory, deleteHistoryEntry, loadHistorySnapshot, seedDemoHistory, seedDemoBaseline, parseBaselineFile, downloadBaselineTemplate, type HistoryEntry } from '@/lib/excel-service';

interface SidebarProps {
  allProjects: Project[];
  selectedId: string; // '__portfolio__' or a project_id
  onSelect: (id: string) => void;
  onReload: () => void;
  onLoadHistory: (id: string) => void;
  onBaselineLoaded: () => void;
  baselineData: BaselineData | null;
}

const statusDot: Record<'RED' | 'YELLOW' | 'GREEN', string> = {
  GREEN: 'bg-emerald-400',
  YELLOW: 'bg-amber-400',
  RED: 'bg-red-400',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('no-NO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function Sidebar({ allProjects, selectedId, onSelect, onReload, onLoadHistory, onBaselineLoaded, baselineData }: SidebarProps) {
  const [currentData, setCurrentData] = useState<ReturnType<typeof getStoredExcelData>>(null);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [baselineSuccess, setBaselineSuccess] = useState(false);
  const baselineInputRef = useRef<HTMLInputElement>(null);

  const handleBaselineFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setBaselineError('Kun .xlsx og .xls filer støttes.');
      return;
    }
    setBaselineLoading(true);
    setBaselineError(null);
    setBaselineSuccess(false);
    try {
      await parseBaselineFile(file);
      setBaselineSuccess(true);
      setTimeout(() => {
        onBaselineLoaded();
        setBaselineSuccess(false);
      }, 800);
    } catch (e) {
      setBaselineError(e instanceof Error ? e.message : 'Kunne ikke lese baseline-filen.');
    } finally {
      setBaselineLoading(false);
    }
  }, [onBaselineLoaded]);

  // Read localStorage only on client after mount to avoid SSR hydration mismatch
  useEffect(() => {
    seedDemoHistory();
    const didSeed = !localStorage.getItem('bulk_dashboard_baseline');
    seedDemoBaseline();
    setCurrentData(getStoredExcelData());
    setHistory(getExcelHistory());
    if (didSeed && localStorage.getItem('bulk_dashboard_baseline')) {
      onBaselineLoaded();
    }
  }, [onBaselineLoaded]);

  const isPortfolio = selectedId === '__portfolio__';

  function handleDeleteHistory(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    deleteHistoryEntry(id);
    setHistory(getExcelHistory());
    onReload();
  }

  function handleLoadHistory(id: string) {
    loadHistorySnapshot(id);
    onLoadHistory(id);
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-teal-950 border-r border-teal-800/40">
      {/* Brand */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-900/50">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-black tracking-tight leading-none">bulk</p>
            <p className="text-teal-400/70 text-[10px] tracking-widest uppercase mt-0.5 leading-none">
              Project Monitor
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-teal-800/40" />

      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {/* Portfolio */}
          <button
            onClick={() => onSelect('__portfolio__')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group ${
              isPortfolio
                ? 'bg-teal-600/20 border border-teal-500/30 text-white'
                : 'text-teal-300/70 hover:bg-teal-800/50 hover:text-teal-100 border border-transparent'
            }`}
          >
            <FolderKanban className={`w-4 h-4 shrink-0 ${isPortfolio ? 'text-teal-400' : 'text-teal-500/60 group-hover:text-teal-400'}`} />
            <span className="text-xs font-bold flex-1">Portefølje</span>
            {isPortfolio && <ChevronRight className="w-3 h-3 text-teal-400 translate-x-0.5" />}
          </button>

          {/* Gantt nav */}
          <a
            href="/gantt"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group text-teal-300/70 hover:bg-teal-800/50 hover:text-teal-100 border border-transparent"
          >
            <BarChart2 className="w-4 h-4 shrink-0 text-teal-500/60 group-hover:text-teal-400" />
            <span className="text-xs font-bold flex-1">Gantt</span>
            {baselineData && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" title="Baseline lastet" />}
          </a>

          <Separator className="bg-teal-800/40 my-1" />

          {/* Projects section */}
          <div>
            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left group"
            >
              {projectsOpen
                ? <ChevronDown className="w-3 h-3 text-teal-500/70" />
                : <ChevronRight className="w-3 h-3 text-teal-500/70" />}
              <span className="text-[10px] font-semibold text-teal-500/70 uppercase tracking-widest flex-1">
                Prosjekter
              </span>
              <Badge className="bg-teal-800/50 text-teal-400 border-teal-700/50 text-[9px] px-1.5 h-4">
                {allProjects.length}
              </Badge>
            </button>

            {projectsOpen && (
              <div className="space-y-0.5 mt-0.5 ml-2">
                {allProjects.map((p) => {
                  const isActive = !isPortfolio && p.project_id === selectedId;
                  const dot = statusDot[p.overall_status];
                  return (
                    <button
                      key={p.project_id}
                      onClick={() => onSelect(p.project_id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group ${
                        isActive
                          ? 'bg-teal-600/20 border border-teal-500/30 text-white'
                          : 'text-teal-300/70 hover:bg-teal-800/50 hover:text-teal-100 border border-transparent'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-2 h-2 rounded-full ${dot}`} />
                        {isActive && (
                          <div className={`absolute inset-0 w-2 h-2 rounded-full ${dot} animate-ping opacity-60`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                          {p.project_id}
                        </p>
                        {p.company && (
                          <p className="text-[10px] text-teal-500/60 truncate mt-0.5 leading-none">
                            {p.company}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className={`w-3 h-3 shrink-0 transition-transform ${
                          isActive ? 'text-teal-400 translate-x-0.5' : 'text-teal-600/50 group-hover:text-teal-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="bg-teal-800/40 my-1" />

          {/* History section */}
          <div>
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left group"
            >
              {historyOpen
                ? <ChevronDown className="w-3 h-3 text-teal-500/70" />
                : <ChevronRight className="w-3 h-3 text-teal-500/70" />}
              <History className="w-3 h-3 text-teal-500/70" />
              <span className="text-[10px] font-semibold text-teal-500/70 uppercase tracking-widest flex-1">
                Historikk
              </span>
              {history.length > 0 && (
                <Badge className="bg-teal-800/50 text-teal-400 border-teal-700/50 text-[9px] px-1.5 h-4">
                  {history.length}
                </Badge>
              )}
            </button>

            {historyOpen && (
              <div className="space-y-0.5 mt-0.5 ml-2">
                {history.length === 0 ? (
                  <p className="text-[10px] text-teal-600/60 px-3 py-2">
                    Ingen tidligere opplastninger
                  </p>
                ) : (
                  history.map((entry: HistoryEntry) => (
                    <div
                      key={entry.id}
                      onClick={() => handleLoadHistory(entry.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group cursor-pointer text-teal-300/70 hover:bg-teal-800/50 hover:text-teal-100 border border-transparent"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-teal-500/60 shrink-0 group-hover:text-teal-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate leading-tight">
                          {entry.fileName}
                        </p>
                        <p className="text-[9px] text-teal-600/60 mt-0.5 leading-none">
                          {formatDate(entry.uploadedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistory(e, entry.id)}
                        title="Slett"
                        className="opacity-0 group-hover:opacity-100 text-teal-600 hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-teal-800/40" />
      <ExcelUpload onDataLoaded={onReload} currentData={currentData} />

      {/* Baseline upload section */}
      <div className="px-3 py-3 border-t border-teal-800/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="w-3 h-3 text-teal-500/70" />
          <span className="text-[10px] font-semibold text-teal-500/70 uppercase tracking-widest">Baseline</span>
        </div>

        {baselineData && (
          <div className="mb-2 flex items-center gap-1.5 bg-teal-800/30 rounded-lg px-2.5 py-1.5">
            <FileSpreadsheet className="w-3 h-3 text-teal-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-teal-300 truncate leading-tight">{baselineData.fileName}</p>
              <p className="text-[9px] text-teal-500/60 leading-none mt-0.5">
                Satt: {new Date(baselineData.uploadedAt).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        {!baselineData && (
          <p className="text-[10px] text-teal-600/60 mb-2">Ingen baseline lastet opp</p>
        )}

        <button
          onClick={() => baselineInputRef.current?.click()}
          disabled={baselineLoading}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-teal-700/60 hover:border-teal-500/60 hover:bg-teal-800/20 transition-all text-teal-400 hover:text-teal-200 text-[10px] font-medium"
        >
          <input
            ref={baselineInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleBaselineFile(file);
              e.target.value = '';
            }}
          />
          {baselineLoading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Laster inn...</>
          ) : baselineSuccess ? (
            <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Baseline lastet!</>
          ) : (
            <><Upload className="w-3 h-3" /> Last opp baseline</>
          )}
        </button>

        {baselineError && (
          <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-400">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <p>{baselineError}</p>
          </div>
        )}

        <button
          onClick={() => downloadBaselineTemplate()}
          className="mt-1.5 w-full flex items-center justify-center gap-1.5 text-[10px] text-teal-500 hover:text-teal-300 transition-colors py-1"
        >
          <Download className="w-3 h-3" />
          Last ned baseline-mal
        </button>
      </div>

      <div className="px-4 py-2 border-t border-teal-800/40">
        <p className="text-[9px] text-teal-600/60 uppercase tracking-widest text-center font-semibold">
          Classification: Private &amp; Confidential
        </p>
      </div>
    </aside>
  );
}
