'use client';

import { useEffect, useState } from 'react';
import { Target, BarChart2, ArrowLeft } from 'lucide-react';
import { getBaselineData, getStoredExcelData, getMilestonesFromExcel, getProjectsFromExcel } from '@/lib/excel-service';
import { type BaselineData } from '@/lib/schemas/baseline-schema';
import { type Project } from '@/lib/schemas/project-schema';
import { type Milestone } from '@/lib/schemas/milestone-schema';
import { GanttChart } from '@/components/dashboard/GanttChart';

export default function GanttPage() {
  const [baselineData, setBaselineData] = useState<BaselineData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    const bl = getBaselineData();
    setBaselineData(bl);

    const excel = getStoredExcelData();
    if (excel) {
      const projs = getProjectsFromExcel(excel).sort((a, b) =>
        a.project_id.localeCompare(b.project_id)
      );
      setProjects(projs);
      if (projs.length > 0) {
        const firstId = projs[0].project_id;
        setSelectedProjectId(firstId);
        setMilestones(getMilestonesFromExcel(excel, firstId));
      }
    }
  }, []);

  function handleProjectChange(id: string) {
    setSelectedProjectId(id);
    const excel = getStoredExcelData();
    if (excel) {
      setMilestones(getMilestonesFromExcel(excel, id));
    }
  }

  const baselineMilestones = baselineData
    ? baselineData.milestones.filter(
        (bm) => bm.project_id.toLowerCase().trim() === selectedProjectId.toLowerCase().trim()
      )
    : [];

  const freezeDate = baselineData
    ? new Date(baselineData.uploadedAt).toLocaleDateString('nb-NO', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <a
            href="/?view=portfolio"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Tilbake
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest">Gantt</p>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Baseline vs. Faktisk</h1>
          </div>
          {freezeDate && (
            <div className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-amber-800 font-medium">
                Baseline satt: <span className="font-bold">{freezeDate}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <main className="px-6 py-6 max-w-7xl">
        {/* No baseline state */}
        {!baselineData && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <Target className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold mb-1">Ingen baseline lastet opp</p>
            <p className="text-sm text-gray-400">
              Last opp en baseline-fil fra sidepanelet for å bruke Gantt-visningen.
            </p>
          </div>
        )}

        {/* No projects state */}
        {baselineData && projects.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold mb-1">Ingen prosjektdata</p>
            <p className="text-sm text-gray-400">Last opp en rapport-fil fra sidepanelet.</p>
          </div>
        )}

        {baselineData && projects.length > 0 && (
          <>
            {/* Project selector */}
            <div className="mb-5 flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 shrink-0">Prosjekt:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-800 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_id} — {p.project_name || p.company}
                  </option>
                ))}
              </select>
            </div>

            {/* No milestones in baseline for this project */}
            {baselineMilestones.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 mb-4">
                Ingen milepæler funnet i baseline for prosjekt <span className="font-mono font-bold">{selectedProjectId}</span>.
                Sjekk at prosjekt-ID stemmer i baseline-filen.
              </div>
            )}

            {/* Gantt chart */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex-1">
                  Milepælsplan: {selectedProjectId}
                </h2>
                <span className="text-[10px] text-gray-400">{milestones.length} milepæler</span>
              </div>
              <div className="px-4 py-4 pb-8">
                <GanttChart milestones={milestones} baselineMilestones={baselineMilestones} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
