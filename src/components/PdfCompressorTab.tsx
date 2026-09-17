import React, { useState, useRef } from 'react';
import {
  PdfCompressionLevel,
  PdfCompressionResult,
  PDF_COMPRESSION_LEVELS,
  COMMON_TARGET_PRESETS,
  compressPdfFile,
} from '../lib/pdfCompressor';
import { formatFileSize } from '../lib/imageCompressor';
import { saveAndDownloadFile, saveMultipleFilesToPhone, showToast } from '../lib/fileDownloader';
import {
  FileText,
  UploadCloud,
  Download,
  Sparkles,
  Sliders,
  CheckCircle2,
  Loader2,
  Target,
  FileEdit,
  Plus,
  Trash2,
  Archive,
  X,
  AlertCircle,
  RotateCcw,
  TrendingDown,
} from 'lucide-react';

export interface PdfCompressorTabProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

interface QueuedPdfCompressItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  status: 'queued' | 'compressing' | 'done' | 'error';
  compressedSize?: number;
  reductionPercentage?: number;
  compressedBlob?: Blob;
  error?: string;
  pageCount?: number;
  imagesOptimized?: number;
}

export function PdfCompressorTab({ onEditInEditor }: PdfCompressorTabProps = {}) {
  const [queue, setQueue] = useState<QueuedPdfCompressItem[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<PdfCompressionLevel>('medium');
  const [selectedTargetPreset, setSelectedTargetPreset] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [currentProcessingName, setCurrentProcessingName] = useState('');
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddFiles = (files: File[]) => {
    setErrorMsg(null);
    const pdfFiles = files.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setErrorMsg('Please select valid PDF documents (.pdf).');
      return;
    }

    const newItems: QueuedPdfCompressItem[] = pdfFiles.map((file) => ({
      id: `pdf_comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      file,
      name: file.name,
      originalSize: file.size,
      status: 'queued',
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearQueue = () => {
    setQueue([]);
    setErrorMsg(null);
    setBatchProgress(0);
    setCurrentProcessingName('');
  };

  const handleCompressAll = async () => {
    if (queue.length === 0) return;
    setIsCompressing(true);
    setErrorMsg(null);
    setBatchProgress(0);

    const total = queue.length;

    for (let i = 0; i < total; i++) {
      const item = queue[i];
      setCurrentProcessingName(item.name);

      setQueue((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'compressing' } : it))
      );

      try {
        const res: PdfCompressionResult = await compressPdfFile(item.file, {
          level: compressionLevel,
          targetSizeKb: selectedTargetPreset || undefined,
        });

        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'done',
                  compressedSize: res.compressedSize,
                  reductionPercentage: res.reductionPercentage,
                  compressedBlob: res.compressedBlob,
                  pageCount: res.pageCount,
                  imagesOptimized: res.imagesOptimized,
                }
              : it
          )
        );
      } catch (err: any) {
        console.error(`Failed to compress ${item.name}:`, err);
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  error: err?.message || 'Compression failed',
                }
              : it
          )
        );
      }

      setBatchProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsCompressing(false);
    setCurrentProcessingName('');
    showToast('Batch Compression Complete', `All PDF files processed!`, 'success');
  };

  // Bulk Save All to Phone
  const handleSaveAllToPhone = async () => {
    const readyItems = queue.filter((item) => item.status === 'done' && item.compressedBlob);
    if (readyItems.length === 0) return;

    setIsSavingAll(true);
    try {
      const filesToSave = readyItems.map((item) => ({
        blob: item.compressedBlob!,
        fileName: `compressed_${item.name}`,
      }));

      await saveMultipleFilesToPhone(filesToSave, 'Compressed_PDFs.zip');
    } catch (err: any) {
      console.error('Failed to save compressed files:', err);
      showToast('Export Error', err?.message || 'Failed to save compressed files', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const doneItems = queue.filter((i) => i.status === 'done');
  const totalOriginalBytes = doneItems.reduce((acc, i) => acc + i.originalSize, 0);
  const totalCompressedBytes = doneItems.reduce((acc, i) => acc + (i.compressedSize || i.originalSize), 0);
  const totalBytesSaved = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const overallReduction =
    totalOriginalBytes > 0 ? Math.round((totalBytesSaved / totalOriginalBytes) * 100) : 0;

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      {/* Title Banner */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-sm border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Batch PDF Compressor &amp; Optimizer
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Multi-File Batch
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compress multiple PDF files in one go for portal uploads, job applications, and emails.
            </p>
          </div>
        </div>

        {queue.length > 0 && !isCompressing && (
          <button
            type="button"
            onClick={handleClearQueue}
            className="px-3 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
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
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className="liquid-glass-card liquid-specular border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition space-y-3 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFileSelected}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-sm">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
            {queue.length > 0 ? 'Add More PDF Documents' : 'Select or Drop Multiple PDF Files'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select 1 or multiple PDF files to compress simultaneously. 100% offline and secure on your device.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-btn text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Batch mode: process 1 to 50+ PDFs at once</span>
        </div>
      </div>

      {/* Queue View & Configuration */}
      {queue.length > 0 && (
        <div className="space-y-4">
          {/* Active Compression Progress Bar */}
          {isCompressing && (
            <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-3 border border-indigo-500/20">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span>Compressing: {currentProcessingName}</span>
                </span>
                <span className="font-mono">{batchProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${batchProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Queue List */}
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Selected PDF Files ({queue.length})
              </h3>
              {!isCompressing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Files</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass border border-black/5 dark:border-white/10 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Original: {formatFileSize(item.originalSize)}
                        {item.compressedSize ? (
                          <span className="text-emerald-500 font-bold ml-1.5">
                            → {formatFileSize(item.compressedSize)} (-{item.reductionPercentage}%)
                          </span>
                        ) : null}
                        {item.imagesOptimized !== undefined && item.imagesOptimized > 0 ? (
                          <span className="text-indigo-400 font-medium ml-1.5">
                            • {item.imagesOptimized} img{item.imagesOptimized > 1 ? 's' : ''} optimized
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'queued' && (
                      <span className="text-[11px] font-semibold text-slate-400 px-2.5 py-1 rounded-full bg-slate-500/10">
                        Queued
                      </span>
                    )}
                    {item.status === 'compressing' && (
                      <span className="text-[11px] font-semibold text-indigo-500 px-2.5 py-1 rounded-full bg-indigo-500/10 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Optimizing...
                      </span>
                    )}
                    {item.status === 'done' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Saved {item.reductionPercentage}%
                        </span>
                        {item.compressedBlob && (
                          <button
                            type="button"
                            onClick={() =>
                              saveAndDownloadFile(
                                item.compressedBlob!,
                                `compressed_${item.name}`,
                                'application/pdf'
                              )
                            }
                            title="Download PDF"
                            className="p-1.5 rounded-lg liquid-glass-btn text-indigo-500 hover:text-indigo-600 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.compressedBlob && onEditInEditor && (
                          <button
                            type="button"
                            onClick={() =>
                              onEditInEditor(
                                item.compressedBlob!,
                                `compressed_${item.name}`
                              )
                            }
                            title="Open in PDF Editor"
                            className="p-1.5 rounded-lg liquid-glass-btn text-blue-500 hover:text-blue-600 transition"
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

                    {!isCompressing && (
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

          {/* Target Presets & Quality Options */}
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                Target Size Limits (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMMON_TARGET_PRESETS.map((preset) => {
                  const isSelected = selectedTargetPreset === preset.targetKb;
                  return (
                    <button
                      key={preset.targetKb}
                      type="button"
                      onClick={() => {
                        setSelectedTargetPreset(isSelected ? null : preset.targetKb);
                        if (!isSelected && preset.targetKb <= 500) {
                          setCompressionLevel('high');
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'liquid-glass-accent shadow-sm'
                          : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'opacity-90 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {preset.note}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Standard Quality Levels */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                Compression Quality
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['low', 'medium', 'high'] as PdfCompressionLevel[]).map((lvl) => {
                  const info = PDF_COMPRESSION_LEVELS[lvl];
                  const isSelected = compressionLevel === lvl;

                  return (
                    <div
                      key={lvl}
                      onClick={() => setCompressionLevel(lvl)}
                      className={`p-3 rounded-2xl border cursor-pointer transition space-y-1 ${
                        isSelected
                          ? 'liquid-glass-card border-indigo-500/50 dark:border-indigo-400/50 shadow-sm ring-1 ring-indigo-500/20'
                          : 'liquid-glass-btn'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                          {lvl}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-black/10 dark:border-white/10 liquid-glass text-indigo-600 dark:text-indigo-400">
                          {info.estimatedSavings}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {info.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCompressAll}
                disabled={isCompressing || queue.length === 0}
                className="liquid-glass-accent inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-xs font-black shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compressing Batch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Compress All ({queue.length}) PDF Files</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary Card */}
          {doneItems.length > 0 && (
            <div className="p-6 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-4 border border-emerald-500/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Batch Compression Finished!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doneItems.length} of {queue.length} files compressed • Total saved:{' '}
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatFileSize(totalBytesSaved)} ({overallReduction}%)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveAllToPhone}
                    disabled={isSavingAll || doneItems.length === 0}
                    className="liquid-glass-accent flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
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
                    onClick={handleClearQueue}
                    className="p-2.5 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
                    title="Start New Batch"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
                <div className="liquid-glass p-3 rounded-2xl border border-black/5 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Before</span>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {formatFileSize(totalOriginalBytes)}
                  </p>
                </div>
                <div className="liquid-glass p-3 rounded-2xl border border-black/5 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total After</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatFileSize(totalCompressedBytes)}
                  </p>
                </div>
                <div className="liquid-glass p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">
                    Space Saved
                  </span>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatFileSize(totalBytesSaved)} (-{overallReduction}%)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
