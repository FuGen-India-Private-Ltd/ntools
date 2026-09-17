import React, { useState, useRef } from 'react';
import { convertDocxToPdf, DocxToPdfResult } from '../lib/docxToPdfProcessor';
import { processPptxFile, PptxProcessResult } from '../lib/pptxProcessor';
import { saveAndDownloadFile, saveMultipleFilesToPhone, showToast } from '../lib/fileDownloader';
import { PDFDocument } from 'pdf-lib';
import {
  FileText,
  Presentation,
  UploadCloud,
  Download,
  Loader2,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Sliders,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileEdit,
  Plus,
  Trash2,
  Archive,
  Layers,
  X,
} from 'lucide-react';

export interface DocxPptToPdfConverterProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

interface QueuedFileItem {
  id: string;
  file: File;
  name: string;
  type: 'docx' | 'pptx';
  sizeBytes: number;
  status: 'queued' | 'converting' | 'done' | 'error';
  progressPercent: number;
  error?: string;
  resultBlob?: Blob;
  resultFileName?: string;
  pageCount?: number;
  tableCount?: number;
  imageCount?: number;
}

export function DocxPptToPdfConverter({ onEditInEditor }: DocxPptToPdfConverterProps = {}) {
  const [queue, setQueue] = useState<QueuedFileItem[]>([]);
  const [status, setStatus] = useState<'upload' | 'configured' | 'converting' | 'completed'>('upload');
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [currentProcessingName, setCurrentProcessingName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PDF Customization Settings
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);

  // Bulk operation status
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

  const handleAddFiles = (files: File[]) => {
    setErrorMsg(null);
    const validItems: QueuedFileItem[] = [];
    const rejectedLegacy: string[] = [];
    const rejectedOther: string[] = [];

    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        validItems.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          file,
          name: file.name,
          type: 'docx',
          sizeBytes: file.size,
          status: 'queued',
          progressPercent: 0,
        });
      } else if (ext === 'pptx') {
        validItems.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          file,
          name: file.name,
          type: 'pptx',
          sizeBytes: file.size,
          status: 'queued',
          progressPercent: 0,
        });
      } else if (ext === 'doc' || ext === 'ppt') {
        rejectedLegacy.push(file.name);
      } else {
        rejectedOther.push(file.name);
      }
    });

    if (rejectedLegacy.length > 0) {
      setErrorMsg(
        `Legacy formats (.doc, .ppt) are not supported. Please save as modern .docx or .pptx: ${rejectedLegacy.join(', ')}`
      );
    } else if (rejectedOther.length > 0) {
      setErrorMsg(`Skipped unsupported files: ${rejectedOther.join(', ')}`);
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
  };

  // Convert All Queued Documents
  const handleConvertAll = async () => {
    if (queue.length === 0) return;
    setStatus('converting');
    setErrorMsg(null);
    setBatchProgress(0);

    const total = queue.length;
    const effectiveOrientation = orientation === 'auto' ? 'portrait' : orientation;

    for (let i = 0; i < total; i++) {
      const currentItem = queue[i];
      setCurrentProcessingName(currentItem.name);

      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'converting', progressPercent: 30 } : item
        )
      );

      try {
        let resultBlob: Blob;
        let resultFileName: string;
        let pageCount = 1;

        if (currentItem.type === 'docx') {
          const res: DocxToPdfResult = await convertDocxToPdf(currentItem.file, {
            pageSize,
            orientation: effectiveOrientation,
            includeHeader,
            includePageNumbers,
            documentTitle: currentItem.name.replace(/\.docx$/i, ''),
          });
          resultBlob = res.pdfBlob;
          resultFileName = res.pdfFileName;
          pageCount = res.paragraphs ? Math.max(1, Math.ceil(res.paragraphs.length / 5)) : 1;
          const tableCount = res.tableCount;
          const imageCount = res.imageCount;

          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: 'done',
                    progressPercent: 100,
                    resultBlob,
                    resultFileName,
                    pageCount,
                    tableCount,
                    imageCount,
                  }
                : item
            )
          );
        } else {
          const res: PptxProcessResult = await processPptxFile(currentItem.file);
          resultBlob = res.pdfBlob;
          resultFileName = res.pdfFileName;
          pageCount = res.slides ? res.slides.length : 1;

          setQueue((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: 'done',
                    progressPercent: 100,
                    resultBlob,
                    resultFileName,
                    pageCount,
                  }
                : item
            )
          );
        }
      } catch (err: any) {
        console.error(`Error converting ${currentItem.name}:`, err);
        setQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error',
                  progressPercent: 0,
                  error: err?.message || 'Conversion failed',
                }
              : item
          )
        );
      }

      setBatchProgress(Math.round(((i + 1) / total) * 100));
    }

    setStatus('completed');
    setCurrentProcessingName('');
    showToast('Batch Complete', `Converted documents ready for download.`, 'success');
  };

  // Bulk Save All to Phone (Documents/nTools/)
  const handleSaveAllToPhone = async () => {
    const readyItems = queue.filter((item) => item.status === 'done' && item.resultBlob);
    if (readyItems.length === 0) return;

    setIsSavingAll(true);
    try {
      const filesToSave = readyItems.map((item) => ({
        blob: item.resultBlob!,
        fileName: item.resultFileName || `${item.name.replace(/\.[^.]+$/, '')}.pdf`,
      }));

      await saveMultipleFilesToPhone(filesToSave, 'Converted_Documents.zip');
    } catch (err: any) {
      console.error('Failed to save all files:', err);
      showToast('Export Error', err?.message || 'Failed to save all files', 'error');
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
      const mergedFileName = 'Merged_Converted_Documents.pdf';

      await saveAndDownloadFile(mergedBlob, mergedFileName, 'application/pdf');
      showToast('Merged Successfully', `Combined ${readyItems.length} files into ${mergedFileName}`, 'success');
    } catch (err: any) {
      console.error('Failed to merge converted PDFs:', err);
      showToast('Merge Error', err?.message || 'Failed to merge documents into one PDF', 'error');
    } finally {
      setIsMergingAll(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const doneCount = queue.filter((i) => i.status === 'done').length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header Banner with Apple Liquid Glass styling */}
      <div className="p-4 sm:p-6 rounded-3xl liquid-glass liquid-specular shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm border border-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Word &amp; PowerPoint to PDF Studio
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Multi-File Batch
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Convert multiple .docx documents &amp; .pptx slides in one go, with bulk phone saving and PDF merging.
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

      {/* Multi-File Upload Dropzone */}
      {status === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-10 sm:p-14 rounded-3xl liquid-glass-card liquid-specular border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 transition cursor-pointer text-center space-y-4 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".docx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              Select or Drop Multiple Word &amp; PowerPoint Files
            </h3>
            <p className="text-xs text-slate-400">
              Convert multiple .docx or .pptx files simultaneously. 100% offline and secure.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-btn text-[11px] font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Select 1, 5, or 20+ files at once</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <span className="liquid-glass px-3 py-1 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-black/10 dark:border-white/10">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Word (.docx)
            </span>
            <span className="liquid-glass px-3 py-1 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-black/10 dark:border-white/10">
              <Presentation className="w-3.5 h-3.5 text-amber-500" />
              PowerPoint (.pptx)
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              100% Private (No file leaves device)
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              No Watermarks
            </span>
          </div>
        </div>
      )}

      {/* Queue & Configuration View */}
      {(status === 'configured' || status === 'converting' || status === 'completed') && (
        <div className="space-y-4">
          {/* Active Conversion Progress Banner */}
          {status === 'converting' && (
            <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  <span>Converting: {currentProcessingName}</span>
                </span>
                <span className="font-mono">{batchProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${batchProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Queued Items List */}
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Documents in Queue ({queue.length})
              </h3>
              {status !== 'converting' && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
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
              accept=".docx,.pptx"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl liquid-glass border border-black/5 dark:border-white/10 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'docx'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.type === 'docx' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <Presentation className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {formatSize(item.sizeBytes)} {item.pageCount ? `• ~${item.pageCount} pgs` : ''}
                        {item.tableCount ? ` • ${item.tableCount} ${item.tableCount === 1 ? 'tbl' : 'tbls'}` : ''}
                        {item.imageCount ? ` • ${item.imageCount} ${item.imageCount === 1 ? 'img' : 'imgs'}` : ''}
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
                      <span className="text-[11px] font-semibold text-blue-500 px-2.5 py-1 rounded-full bg-blue-500/10 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Converting...
                      </span>
                    )}
                    {item.status === 'done' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-emerald-500 px-2.5 py-1 rounded-full bg-emerald-500/10 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                        {item.resultBlob && (
                          <button
                            type="button"
                            onClick={() =>
                              saveAndDownloadFile(
                                item.resultBlob!,
                                item.resultFileName || `${item.name.replace(/\.[^.]+$/, '')}.pdf`
                              )
                            }
                            title="Download PDF"
                            className="p-1.5 rounded-lg liquid-glass-btn text-blue-500 hover:text-blue-600 transition"
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

          {/* Conversion Options (visible when configured) */}
          {status === 'configured' && (
            <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Batch PDF Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Page Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter')}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 font-medium outline-none border border-black/10 dark:border-white/10"
                  >
                    <option value="a4">A4 (Standard)</option>
                    <option value="letter">US Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape' | 'auto')}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 font-medium outline-none border border-black/10 dark:border-white/10"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="includeHeaderOpt"
                    checked={includeHeader}
                    onChange={(e) => setIncludeHeader(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="includeHeaderOpt" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Header Bar
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="includePageNoOpt"
                    checked={includePageNumbers}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="includePageNoOpt" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                    Page Numbers
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleConvertAll}
                  className="liquid-glass-accent inline-flex items-center gap-2.5 px-7 py-3 rounded-2xl text-xs font-black shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Convert All ({queue.length}) Files to PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Completed State: Bulk Actions */}
          {status === 'completed' && (
            <div className="p-6 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-4">
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
                      {doneCount} of {queue.length} files successfully converted to PDF
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
                    {isSavingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                    <span>Save All to Phone (ZIP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMergeAllIntoOne}
                    disabled={isMergingAll || doneCount === 0}
                    className="liquid-glass-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isMergingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
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
