'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { fetchProjects, fetchDashboardData, type DashboardData } from '@/lib/data-service';
import { type Project } from '@/lib/schemas/project-schema';
import { getPreviousSnapshot, getProjectsFromExcel, getExcelHistory, getStoredExcelData, type HistoryEntry, type ExcelData } from '@/lib/excel-service';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ProjectHeader } from '@/components/dashboard/ProjectHeader';
import { SuccessCriteriaPanel } from '@/components/dashboard/SuccessCriteriaPanel';
import { MilestoneTimeline } from '@/components/dashboard/MilestoneTimeline';
import { BudgetOverviewChart } from '@/components/dashboard/BudgetOverviewChart';
import { IssuesRiskTable } from '@/components/dashboard/IssuesRiskTable';
import { PortfolioView } from '@/components/dashboard/PortfolioView';
import { AIChatPanel } from '@/components/dashboard/AIChatPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function ContentSkeleton() {
  return (
    <div className="space-y-0">
      {/* Top bar skeleton */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-7 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Content skeleton */}
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="flex-1 h-40 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousProjects, setPreviousProjects] = useState<Project[]>([]);
  const [previousEntry, setPreviousEntry] = useState<HistoryEntry | undefined>();
  const [currentEntry, setCurrentEntry] = useState<HistoryEntry | undefined>();
  const [historicalSnapshots, setHistoricalSnapshots] = useState<{ entry: HistoryEntry; data: ExcelData }[]>([]);

  const view = searchParams.get('view');
  const projectId = searchParams.get('project');
  const isPortfolio = view === 'portfolio';

  // selectedId for the sidebar: '__portfolio__' or a project_id
  const selectedId = isPortfolio ? '__portfolio__' : (projectId ?? '');

  const loadData = useCallback(async (_projects: Project[], targetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(targetId);
      if (!result) {
        setError(`Project "${targetId}" not found in projects.csv`);
      } else {
        setData(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projects = await fetchProjects();
      if (projects.length === 0) {
        setError('No projects found. Place CSV files in /public/data/ (see README.md).');
        setLoading(false);
        return;
      }
      setAllProjects(projects);

      // Load all history snapshots for AI context
      const history = getExcelHistory();
      const snapshots = history.flatMap((entry) => {
        try {
          const raw = localStorage.getItem(`bulk_dashboard_snapshot_${entry.id}`);
          if (!raw) return [];
          return [{ entry, data: JSON.parse(raw) as ExcelData }];
        } catch { return []; }
      });
      setHistoricalSnapshots(snapshots);

      if (isPortfolio) {
        // Portfolio view — also load previous snapshot for delta comparison
        const prevSnap = getPreviousSnapshot();
        if (prevSnap) {
          setPreviousProjects(getProjectsFromExcel(prevSnap));
          const history = getExcelHistory();
          setPreviousEntry(history[1]);
          setCurrentEntry(history[0]);
        }
        const currentSnap = getStoredExcelData();
        if (currentSnap && !prevSnap) {
          const history = getExcelHistory();
          setCurrentEntry(history[0]);
        }
        setData(null);
        setLoading(false);
      } else {
        const targetId = projectId ?? projects[0].project_id;
        await loadData(projects, targetId);
        if (!projectId) {
          router.replace(`?project=${encodeURIComponent(projects[0].project_id)}`, { scroll: false });
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load CSV data. Ensure files exist in /public/data/'
      );
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPortfolio, projectId]);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPortfolio && projectId && allProjects.length > 0) {
      loadData(allProjects, projectId);
    }
  }, [projectId, isPortfolio, allProjects, loadData]);

  function handleNavigate(id: string) {
    if (id === '__portfolio__') {
      router.push('?view=portfolio', { scroll: false });
    } else {
      router.push(`?project=${encodeURIComponent(id)}`, { scroll: false });
    }
  }

  async function handleReload() {
    const projects = await fetchProjects();
    setAllProjects(projects);
    if (isPortfolio) {
      // Re-derive previous snapshot for delta comparison
      const prevSnap = getPreviousSnapshot();
      if (prevSnap) {
        setPreviousProjects(getProjectsFromExcel(prevSnap));
        const history = getExcelHistory();
        setPreviousEntry(history[1]);
        setCurrentEntry(history[0]);
      } else {
        setPreviousProjects([]);
        setPreviousEntry(undefined);
        const history = getExcelHistory();
        setCurrentEntry(history[0]);
      }
      setLoading(false);
    } else if (projectId) {
      await loadData(projects, projectId);
    } else if (projects.length > 0) {
      router.replace(`?project=${encodeURIComponent(projects[0].project_id)}`, { scroll: false });
    }
  }

  function handleLoadHistory(id: string) {
    // After loading the snapshot into localStorage, reload the data
    void handleReload();
    // Navigate to portfolio to show updated state
    router.push('?view=portfolio', { scroll: false });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        allProjects={allProjects}
        selectedId={selectedId}
        onSelect={handleNavigate}
        onReload={() => void handleReload()}
        onLoadHistory={handleLoadHistory}
      />

      <AIChatPanel
        dashboardData={data}
        allProjects={allProjects}
        isPortfolio={isPortfolio}
        historicalSnapshots={historicalSnapshots}
      />

      <div className="flex-1 overflow-y-auto min-w-0">
        {loading ? (
          <ContentSkeleton />
        ) : error ? (
          <div className="flex items-start justify-center min-h-screen p-10">
            <Alert variant="destructive" className="max-w-xl shadow-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Failed to load project data</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <p className="text-xs opacity-80">
                  Place CSV files in{' '}
                  <code className="bg-red-100 px-1 py-0.5 rounded font-mono">public/data/</code> and refresh.
                  See{' '}
                  <code className="bg-red-100 px-1 py-0.5 rounded font-mono">public/data/README.md</code>{' '}
                  for the expected format.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : isPortfolio ? (
          <PortfolioView
            projects={allProjects}
            onSelectProject={handleNavigate}
            previousProjects={previousProjects}
            previousEntry={previousEntry}
            currentEntry={currentEntry}
          />
        ) : data ? (
          <>
            <ProjectHeader
              project={data.project}
              allProjects={allProjects}
              onNavigate={handleNavigate}
            />
            <main className="px-6 py-6 space-y-5 max-w-7xl pb-12">
              <div className="grid grid-cols-2 gap-4">
                <SuccessCriteriaPanel project={data.project} />
                <BudgetOverviewChart budget={data.budget} project={data.project} />
              </div>
              <IssuesRiskTable issues={data.issues} project={data.project} />
              <MilestoneTimeline milestones={data.milestones} />
            </main>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <div className="w-64 shrink-0 bg-slate-950" />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
