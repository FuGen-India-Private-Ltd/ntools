import React, { useState, useRef } from 'react';
import {
  convertExcelToPdf,
  ExcelSheetData,
  parseExcelWorkbook,
  ExcelToPdfResult,
} from '../lib/excelToPdfProcessor';
import { saveAndDownloadFile, saveMultipleFilesToPhone, showToast } from '../lib/fileDownloader';
import { formatFileSize } from '../lib/imageCompressor';
import { PDFDocument } from 'pdf-lib';
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
  FileEdit,
  Plus,
  Trash2,
  Archive,
  X,
} from 'lucide-react';

export interface ExcelToPdfConverterProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

interface QueuedExcelItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  type: 'xlsx' | 'csv';
  status: 'queued' | 'converting' | 'done' | 'error';
  sheets?: ExcelSheetData[];
  selectedSheetIdx?: number;
  resultBlob?: Blob;
  resultFileName?: string;
  sheetCount?: number;
  totalRows?: number;
  error?: string;
}

export function ExcelToPdfConverter({ onEditInEditor }: ExcelToPdfConverterProps = {}) {
  const [queue, setQueue] = useState<QueuedExcelItem[]>([]);
  const [status, setStatus] = useState<'upload' | 'configured' | 'converting' | 'completed'>('upload');
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [currentProcessingName, setCurrentProcessingName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Layout Settings
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | 'auto'>('auto');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [includeGridLines, setIncludeGridLines] = useState(true);
  const [theme, setTheme] = useState<'modern-slate' | 'professional-blue' | 'minimal'>('modern-slate');

  // Bulk actions
  const [isMergingAll, setIsMergingAll] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddFiles = async (files: File[]) => {
    setErrorMsg(null);
    const validItems: QueuedExcelItem[] = [];
    const legacyFiles: string[] = [];
    const unsupportedFiles: string[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xls') {
        legacyFiles.push(file.name);
      } else if (ext === 'xlsx' || ext === 'csv') {
        try {
          const parsedSheets = await parseExcelWorkbook(file);
          const totalRows = parsedSheets.reduce((sum, s) => sum + s.rowCount, 0);
          validItems.push({
            id: `excel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            file,
            name: file.name,
            sizeBytes: file.size,
            type: ext as 'xlsx' | 'csv',
            status: 'queued',
            sheets: parsedSheets,
            selectedSheetIdx: 0,
            sheetCount: parsedSheets.length,
            totalRows,
          });
        } catch {
          validItems.push({
            id: `excel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            file,
            name: file.name,
            sizeBytes: file.size,
            type: ext as 'xlsx' | 'csv',
            status: 'queued',
            sheetCount: 1,
            totalRows: 0,
          });
        }
      } else {
        unsupportedFiles.push(file.name);
      }
    }

    if (legacyFiles.length > 0) {
      setErrorMsg(
        `Legacy Excel (.xls) is not supported. Please save as modern .xlsx or .csv: ${legacyFiles.join(', ')}`
      );
    } else if (unsupportedFiles.length > 0) {
      setErrorMsg(`Skipped non-spreadsheet files: ${unsupportedFiles.join(', ')}`);
    }

    if (validItems.length > 0) {
      setQueue((prev) => [...prev, ...validItems]);
      setStatus('configured');
    }
  };

  const handleRemoveFile = (id: string) => {
    setQueue((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      if (updated.length === 0) {
        setStatus('upload');
      }
      return updated;
    });
  };

  const handleClearQueue = () => {
    setQueue([]);
    setStatus('upload');
    setErrorMsg(null);
    setBatchProgress(0);
    setCurrentProcessingName('');
  };

  const handleConvertAll = async () => {
    if (queue.length === 0) return;
    setStatus('converting');
    setErrorMsg(null);
    setBatchProgress(0);

    const total = queue.length;

    for (let i = 0; i < total; i++) {
      const item = queue[i];
      setCurrentProcessingName(item.name);

      setQueue((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'converting' } : it))
      );

      try {
        const res: ExcelToPdfResult = await convertExcelToPdf(item.file, {
          orientation,
          pageSize,
          includeGridLines,
          theme,
          selectedSheetIndex:
            item.selectedSheetIdx !== undefined && item.selectedSheetIdx >= 0
              ? item.selectedSheetIdx
              : undefined,
        });

        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'done',
                  resultBlob: res.pdfBlob,
                  resultFileName: res.pdfFileName,
                  totalRows: res.totalRows,
                }
              : it
          )
        );
      } catch (err: any) {
        console.error(`Failed to convert spreadsheet ${item.name}:`, err);
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  error: err?.message || 'Conversion failed',
                }
              : it
          )
        );
      }

      setBatchProgress(Math.round(((i + 1) / total) * 100));
    }

    setStatus('completed');
    setCurrentProcessingName('');
    showToast('Batch Complete', `Converted spreadsheets ready for download.`, 'success');
  };

  // Bulk Save All to Phone
  const handleSaveAllToPhone = async () => {
    const readyItems = queue.filter((item) => item.status === 'done' && item.resultBlob);
    if (readyItems.length === 0) return;

    setIsSavingAll(true);
    try {
      const filesToSave = readyItems.map((item) => ({
        blob: item.resultBlob!,
        fileName: item.resultFileName || `${item.name.replace(/\.[^.]+$/, '')}.pdf`,
      }));

      await saveMultipleFilesToPhone(filesToSave, 'Converted_Spreadsheets.zip');
    } catch (err: any) {
      console.error('Failed to save all spreadsheets:', err);
      showToast('Export Error', err?.message || 'Failed to save files', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Merge All Converted PDFs into 1 Master PDF
  const handleMergeAllIntoOne = async () => {
    const readyItems = queue.filter((item) => item.status === 'done' && item.resultBlob);
    if (readyItems.length === 0) return;

    setIsMergingAll(true);
    try {
      const mergedDoc = await PDFDocument.create();

      for (const item of readyItems) {
        const docBytes = await item.resultBlob!.arrayBuffer();
        const subDoc = await PDFDocument.load(docBytes);
        const copiedPages = await mergedDoc.copyPages(subDoc, subDoc.getPageIndices());
        copiedPages.forEach((p) => mergedDoc.addPage(p));
      }

      const mergedBytes = await mergedDoc.save();
      const mergedBlob = new Blob([mergedBytes.buffer as ArrayBuffer], {
        type: 'application/pdf',
      });
      const mergedFileName = 'Merged_Spreadsheets.pdf';

      await saveAndDownloadFile(mergedBlob, mergedFileName, 'application/pdf');
      showToast('Merged Successfully', `Combined ${readyItems.length} spreadsheets into ${mergedFileName}`, 'success');
    } catch (err: any) {
      console.error('Failed to merge spreadsheets:', err);
      showToast('Merge Error', err?.message || 'Failed to merge spreadsheets into one PDF', 'error');
    } finally {
      setIsMergingAll(false);
    }
  };

  const doneCount = queue.filter((i) => i.status === 'done').length;

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="rounded-3xl p-5 liquid-glass-card liquid-specular flex items-center justify-between gap-3 flex-wrap border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm border border-emerald-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Excel &amp; CSV to PDF Studio
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Multi-File Batch
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Batch convert spreadsheets into proportional, printable PDF tables with bulk phone saving.
            </p>
          </div>
        </div>

        {queue.length > 0 && status !== 'converting' && (
          <button
            type="button"
            onClick={handleClearQueue}
            className="px-3 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Queue</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Upload Dropzone */}
      {status === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition liquid-glass-card liquid-specular space-y-4 group"
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".xlsx,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
              Select or Drop Multiple Excel &amp; CSV Spreadsheets
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Convert multiple .xlsx or .csv files simultaneously. 100% offline on your device.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-medium liquid-glass text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-black/10 dark:border-white/10">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Microsoft Excel (.xlsx)
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-medium liquid-glass text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-black/10 dark:border-white/10">
              <Table className="w-3.5 h-3.5 text-teal-500" />
              Comma-Separated (.csv)
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              100% Private Client-Side
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Preserves Gridlines &amp; Alignments
            </span>
          </div>
        </div>
      )}

      {/* Queue & Configuration View */}
      {(status === 'configured' || status === 'converting' || status === 'completed') && (
        <div className="space-y-4">
          {/* Active Progress Banner */}
          {status === 'converting' && (
            <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-3 border border-emerald-500/20">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span>Converting: {currentProcessingName}</span>
                </span>
                <span className="font-mono">{batchProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${batchProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Queued Spreadsheets List */}
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Queued Spreadsheets ({queue.length})
              </h3>
              {status !== 'converting' && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Files</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass border border-black/5 dark:border-white/10 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {formatFileSize(item.sizeBytes)} • {item.sheetCount || 1} sheet(s){' '}
                        {item.totalRows ? `• ~${item.totalRows} rows` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'queued' && (
                      <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded-full bg-slate-500/10">
                        Queued
                      </span>
                    )}
                    {item.status === 'converting' && (
                      <span className="text-[11px] font-semibold text-emerald-500 px-2.5 py-1 rounded-full bg-emerald-500/10 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Converting...
                      </span>
                    )}
                    {item.status === 'done' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                        {item.resultBlob && (
                          <button
                            type="button"
                            onClick={() =>
                              saveAndDownloadFile(
                                item.resultBlob!,
                                item.resultFileName || `${item.name.replace(/\.[^.]+$/, '')}.pdf`,
                                'application/pdf'
                              )
                            }
                            title="Download PDF"
                            className="p-1.5 rounded-lg liquid-glass-btn text-emerald-500 hover:text-emerald-600 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.resultBlob && onEditInEditor && (
                          <button
                            type="button"
                            onClick={() =>
                              onEditInEditor(
                                item.resultBlob!,
                                item.resultFileName || `${item.name.replace(/\.[^.]+$/, '')}.pdf`
                              )
                            }
                            title="Open in PDF Editor"
                            className="p-1.5 rounded-lg liquid-glass-btn text-indigo-500 hover:text-indigo-600 transition"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <span className="text-[11px] font-semibold text-rose-500 px-2.5 py-1 rounded-full bg-rose-500/10 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}

                    {status !== 'converting' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Settings */}
          {status === 'configured' && (
            <div className="rounded-3xl p-5 liquid-glass-card liquid-specular space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                Batch PDF Table Layout
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait' | 'auto')}
                    className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none border border-black/10 dark:border-white/10"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="landscape">Landscape (Wide Tables)</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Paper Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
                    className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none border border-black/10 dark:border-white/10"
                  >
                    <option value="a4">A4 (Standard)</option>
                    <option value="letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Table Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'modern-slate' | 'professional-blue' | 'minimal')}
                    className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none border border-black/10 dark:border-white/10"
                  >
                    <option value="modern-slate">Modern Slate (Bold)</option>
                    <option value="professional-blue">Corporate Blue</option>
                    <option value="minimal">Minimalist Gray</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Gridlines
                  </label>
                  <select
                    value={includeGridLines ? 'yes' : 'no'}
                    onChange={(e) => setIncludeGridLines(e.target.value === 'yes')}
                    className="w-full px-3 py-2 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-medium outline-none border border-black/10 dark:border-white/10"
                  >
                    <option value="yes">Include Table Borders</option>
                    <option value="no">Clean Minimal (No Borders)</option>
                  </select>
                </div>
              </div>

              {/* Convert CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleConvertAll}
                  className="inline-flex items-center gap-2.5 px-8 py-3 rounded-2xl liquid-glass-accent text-xs font-black shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Convert All ({queue.length}) Spreadsheets to PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Completed State: Bulk Actions */}
          {status === 'completed' && (
            <div className="p-6 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-4 border border-emerald-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Batch Conversion Finished!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doneCount} of {queue.length} spreadsheets converted to PDF
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveAllToPhone}
                    disabled={isSavingAll || doneCount === 0}
                    className="liquid-glass-accent flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingAll ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                    <span>Save All to Phone (ZIP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMergeAllIntoOne}
                    disabled={isMergingAll || doneCount === 0}
                    className="liquid-glass-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-400 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isMergingAll ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Layers className="w-3.5 h-3.5" />
                    )}
                    <span>Merge All into 1 PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearQueue}
                    className="p-2.5 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
                    title="Convert New Batch"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
