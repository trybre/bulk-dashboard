'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseExcelFile, clearStoredExcelData, downloadTemplate, type ExcelData } from '@/lib/excel-service';

interface ExcelUploadProps {
  onDataLoaded: () => void;
  currentData: ExcelData | null;
}

export function ExcelUpload({ onDataLoaded, currentData }: ExcelUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Kun .xlsx og .xls filer støttes.');
        return;
      }
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        await parseExcelFile(file);
        setSuccess(true);
        setTimeout(() => {
          onDataLoaded();
        }, 800);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunne ikke lese Excel-filen.');
      } finally {
        setLoading(false);
      }
    },
    [onDataLoaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  function clearData() {
    clearStoredExcelData();
    setSuccess(false);
    setError(null);
    onDataLoaded();
  }

  return (
    <div className="px-3 py-3 border-t border-teal-800/40">
      {/* Current file indicator */}
      {currentData && (
        <div className="mb-2 flex items-center gap-1.5 bg-teal-800/30 rounded-lg px-2.5 py-1.5">
          <FileSpreadsheet className="w-3 h-3 text-teal-400 shrink-0" />
          <p className="text-[10px] text-teal-300 truncate flex-1 leading-tight">
            {currentData.fileName}
          </p>
          <button
            onClick={clearData}
            title="Fjern opplastet data"
            className="text-teal-500 hover:text-red-400 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
          dragging
            ? 'border-teal-400 bg-teal-800/40'
            : 'border-teal-800/60 hover:border-teal-500/60 hover:bg-teal-800/20'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {loading ? (
          <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Upload className="w-4 h-4 text-teal-500" />
        )}

        <p className="text-[10px] text-teal-400 text-center leading-tight">
          {loading
            ? 'Laster inn...'
            : success
            ? 'Data lastet inn!'
            : 'Dra og slipp Excel-fil\neller klikk for å velge'}
        </p>
      </div>

      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-400">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Download template */}
      <button
        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
        className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] text-teal-500 hover:text-teal-300 transition-colors py-1"
      >
        <Download className="w-3 h-3" />
        Last ned Excel-mal
      </button>
    </div>
  );
}
