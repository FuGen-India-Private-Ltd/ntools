import React, { useState, useRef } from 'react';
import {
  convertExcelToPdf,
  ExcelSheetData,
  parseExcelWorkbook,
  ExcelToPdfResult,
} from '../lib/excelToPdfProcessor';
import { saveAndDownloadFile } from '../lib/fileDownloader';
import { formatFileSize } from '../lib/imageCompressor';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  Loader2,
  Table,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Layers,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  FileCheck,
  Eye,
  FileEdit,
} from 'lucide-react';

export interface ExcelToPdfConverterProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

export function ExcelToPdfConverter({ onEditInEditor }: ExcelToPdfConverterProps = {}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<ExcelSheetData[]>([]);
  const [selectedSheetIdx, setSelectedSheetIdx] = useState<number>(0);
  const [status, setStatus] = useState<'upload' | 'configured' | 'converting' | 'completed'>('upload');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [result, setResult] = useState<ExcelToPdfResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [includeGridLines, setIncludeGridLines] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectFile = async (file: File) => {
    setErrorMsg(null);
    setResult(null);
    setSheets([]);
    setProgressPercent(0);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xls') {
      setErrorMsg(
        'Legacy binary Excel .xls (Office 97-2003) is not directly supported. Please save as modern .xlsx or export to .csv, then try again.'
      );
      setSelectedFile(null);
      setStatus('upload');
      return;
    }

    if (ext !== 'xlsx' && ext !== 'csv') {
      setErrorMsg('Please select an Excel spreadsheet (.xlsx) or CSV file (.csv).');
      setSelectedFile(null);
      setStatus('upload');
      return;
    }

    setSelectedFile(file);
    try {
      const parsed = await parseExcelWorkbook(file);
      if (parsed.length === 0) {
        throw new Error('No readable data rows found in this spreadsheet.');
      }
      setSheets(parsed);
      setSelectedSheetIdx(0);
      setStatus('configured');
    } catch (err: any) {
      console.error('Failed to parse Excel file', err);
      setErrorMsg(err?.message || 'Unable to parse spreadsheet sheets. Ensure file is not password-protected.');
      setSelectedFile(null);
      setStatus('upload');
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    setStatus('converting');
    setErrorMsg(null);
    setProgressPercent(20);
    setProgressStage('Reading sheets, columns, and data rows...');

    try {
      await new Promise((r) => setTimeout(r, 120));
      setProgressPercent(50);
      setProgressStage('Formatting table grid and calculating cell widths...');

      const res = await convertExcelToPdf(selectedFile, {
        orientation,
        pageSize,
        includeGridLines,
        selectedSheetIndex: selectedSheetIdx >= 0 ? selectedSheetIdx : undefined,
      });

      setProgressPercent(85);
      setProgressStage('Rendering table borders and text...');
      await new Promise((r) => setTimeout(r, 100));

      setResult(res);
      setProgressPercent(100);
      setProgressStage('Spreadsheet PDF ready!');
      await new Promise((r) => setTimeout(r, 150));
      setStatus('completed');
    } catch (err: any) {
      console.error('Excel conversion failed', err);
      setErrorMsg(err?.message || 'Failed to convert spreadsheet to PDF.');
      setStatus('configured');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSheets([]);
    setResult(null);
    setErrorMsg(null);
    setStatus('upload');
    setProgressPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentSheet = sheets[selectedSheetIdx] || sheets[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Clean Header Card */}
      <div className="rounded-3xl p-5 liquid-glass-card liquid-specular flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl liquid-glass-accent flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Excel & CSV to PDF
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-black/10 dark:border-white/10">
                100% Offline
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Convert spreadsheet tables into clean, proportional, printable PDF documents.
            </p>
          </div>
        </div>

        {status !== 'upload' && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-xl liquid-glass-btn text-xs font-semibold text-slate-700 dark:text-slate-300 transition active:scale-95 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New File</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl liquid-glass border border-black/10 dark:border-white/15 text-slate-900 dark:text-white text-xs flex items-start gap-3 shadow-sm backdrop-blur-xl animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-slate-900 dark:text-white mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Spreadsheet Notice</span>
            <p className="text-slate-600 dark:text-slate-300">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* STAGE 1: Upload Dropzone */}
      {status === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/40 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 liquid-glass-card space-y-4 shadow-sm group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleSelectFile(e.target.files[0]);
                }
              }}
              accept=".xlsx,.csv"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-3xl liquid-glass-accent flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Select EXCEL or CSV spreadsheet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag and drop your spreadsheet here, or click to browse.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-medium liquid-glass-btn text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Microsoft Excel (.xlsx)
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium liquid-glass-btn text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Comma-Separated (.csv)
              </span>
            </div>

            <div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl liquid-glass-accent text-xs font-bold shadow-md transition active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                Select Spreadsheet
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              100% Client-Side Privacy
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Preserves Table Gridlines
            </span>
          </div>
        </div>
      )}

      {/* STAGE 2: Configured Options & Preview */}
      {status === 'configured' && selectedFile && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* File Information Card */}
          <div className="rounded-3xl p-5 liquid-glass-card liquid-specular flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl liquid-glass-accent flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {selectedFile.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span>{sheets.length} {sheets.length === 1 ? 'Sheet' : 'Sheets'} detected</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline shrink-0"
            >
              Choose different file
            </button>
          </div>

          {/* Sheet Selector (if multiple sheets exist) */}
          {sheets.length > 1 && (
            <div className="rounded-3xl p-4 liquid-glass-card liquid-specular space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Select Sheet to Convert:
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {sheets.map((sheet, idx) => (
                  <button
                    key={sheet.sheetName}
                    type="button"
                    onClick={() => setSelectedSheetIdx(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedSheetIdx === idx
                        ? 'liquid-glass-accent shadow-sm'
                        : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sheet.sheetName} ({sheet.rowCount} rows)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Sheet Data Preview */}
          {currentSheet && currentSheet.rows.length > 0 && (
            <div className="rounded-3xl p-5 liquid-glass-card liquid-specular space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  Table Preview: {currentSheet.sheetName}
                </span>
                <span>First {Math.min(currentSheet.rows.length, 5)} rows</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/20 dark:border-white/10 max-h-48 liquid-glass-input">
                <table className="w-full text-[11px] text-left border-collapse font-mono">
                  <tbody>
                    {currentSheet.rows.slice(0, 5).map((row, rIdx) => (
                      <tr
                        key={`r-${rIdx}`}
                        className={
                          rIdx === 0
                            ? 'bg-black/10 dark:bg-white/10 font-bold text-slate-900 dark:text-slate-100'
                            : 'border-t border-white/10 text-slate-700 dark:text-slate-300'
                        }
                      >
                        {row.cells.slice(0, 6).map((c, cIdx) => (
                          <td
                            key={`c-${cIdx}`}
                            className="p-2 border-r border-white/10 truncate max-w-[130px]"
                          >
                            {c.value || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conversion Settings */}
          <div className="rounded-3xl p-5 liquid-glass-card liquid-specular space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Table PDF Layout</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none"
                >
                  <option value="landscape" className="bg-slate-900 text-white">Landscape (Best for Wide Tables)</option>
                  <option value="portrait" className="bg-slate-900 text-white">Portrait</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Paper Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none"
                >
                  <option value="a4" className="bg-slate-900 text-white">A4 (Standard)</option>
                  <option value="letter" className="bg-slate-900 text-white">US Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Gridlines</label>
                <select
                  value={includeGridLines ? 'yes' : 'no'}
                  onChange={(e) => setIncludeGridLines(e.target.value === 'yes')}
                  className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none"
                >
                  <option value="yes" className="bg-slate-900 text-white">Include Table Borders</option>
                  <option value="no" className="bg-slate-900 text-white">Clean Minimal (No Borders)</option>
                </select>
              </div>
            </div>

            {/* Convert CTA */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleConvert}
                className="inline-flex items-center gap-2.5 px-8 py-3 rounded-2xl liquid-glass-accent text-sm font-bold shadow-lg transition active:scale-95"
              >
                <FileCheck className="w-5 h-5" />
                <span>Convert to PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Converting with Real-Time Progress Bar */}
      {status === 'converting' && (
        <div className="rounded-3xl p-8 sm:p-12 liquid-glass-card liquid-specular text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl liquid-glass-accent flex items-center justify-center mx-auto shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Converting Spreadsheet to PDF...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {progressStage}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="w-full h-2.5 rounded-full liquid-glass-dock overflow-hidden">
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
              <span>Client-Side Engine</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4: Completed Result & Download */}
      {status === 'completed' && result && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-3xl p-6 liquid-glass-card liquid-specular space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl liquid-glass-accent flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Spreadsheet Converted to PDF!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {result.pdfFileName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => saveAndDownloadFile(result.pdfBlob, result.pdfFileName, 'application/pdf')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl liquid-glass-accent text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                {onEditInEditor && (
                  <button
                    type="button"
                    onClick={() => onEditInEditor(result.pdfBlob, result.pdfFileName)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl liquid-glass-btn text-indigo-600 dark:text-indigo-400 text-xs font-bold transition active:scale-95 cursor-pointer"
                    title="Open in PDF Editor"
                  >
                    <FileEdit className="w-4 h-4 text-indigo-500" />
                    <span>Edit PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                  title="Convert Another Spreadsheet"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Convert Another</span>
                </button>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/20 dark:border-white/10 text-xs">
              <div className="p-3 rounded-2xl liquid-glass-dock border border-white/10">
                <div className="text-slate-400 text-[11px]">Source File</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{selectedFile?.name}</div>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-dock border border-white/10">
                <div className="text-slate-400 text-[11px]">PDF Size</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {(result.pdfBlob.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-dock border border-white/10">
                <div className="text-slate-400 text-[11px]">Total Rows</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {result.totalRows.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl liquid-glass-dock border border-white/10">
                <div className="text-slate-400 text-[11px]">Orientation</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 capitalize">{orientation}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
