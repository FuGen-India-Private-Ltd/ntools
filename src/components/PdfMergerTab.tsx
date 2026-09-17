import React, { useState, useRef } from 'react';
import {
  mergePdfFiles,
  PdfMergeInputItem,
  PdfMergeResult,
  getPdfPageCount,
} from '../lib/pdfMerger';
import { saveAndDownloadFile } from '../lib/fileDownloader';
import {
  FilePlus,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Trash2,
  Download,
  Share2,
  CheckCircle2,
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
  FileEdit,
} from 'lucide-react';

export interface PdfMergerTabProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

export function PdfMergerTab({ onEditInEditor }: PdfMergerTabProps = {}) {
  const [items, setItems] = useState<PdfMergeInputItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedResult, setMergedResult] = useState<PdfMergeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (newFiles.length === 0) {
      setErrorMsg('Please select valid PDF documents.');
      return;
    }

    const loadedItems: PdfMergeInputItem[] = [];
    for (const f of newFiles) {
      try {
        const pages = await getPdfPageCount(f);
        loadedItems.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: f,
          name: f.name,
          size: f.size,
          pageCount: pages,
          pageRange: 'all',
          rotationDegrees: 0,
        });
      } catch {
        loadedItems.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: f,
          name: f.name,
          size: f.size,
          pageCount: 1,
          pageRange: 'all',
          rotationDegrees: 0,
        });
      }
    }

    setItems((prev) => [...prev, ...loadedItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const rotateItem = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index].rotationDegrees || 0;
      next[index].rotationDegrees = ((current + 90) % 360) as 0 | 90 | 180 | 270;
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updatePageRange = (index: number, val: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index].pageRange = val;
      return next;
    });
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setErrorMsg('Add at least 2 PDF files to combine.');
      return;
    }

    setIsMerging(true);
    setErrorMsg(null);

    try {
      const res = await mergePdfFiles(items, 'merged-document.pdf');
      setMergedResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to merge PDF files.');
    } finally {
      setIsMerging(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              PDF Combiner & Merger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Combine multiple PDFs into a single document. Reorder, rotate, or extract specific pages. 100% offline & private.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="liquid-glass-accent inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <FilePlus className="w-4 h-4" />
          <span>Add PDF Files</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl liquid-glass border border-black/15 dark:border-white/20 text-slate-900 dark:text-white text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      {items.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Documents to Combine ({items.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Drag or use arrows to change order
            </span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="liquid-glass-card liquid-specular p-3.5 sm:p-4 rounded-3xl space-y-3"
              >
                {/* Top Row: Index Badge, Document Title & Metrics, and Delete Button */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/15 text-slate-900 dark:text-white flex items-center justify-center text-xs font-bold shrink-0 border border-black/10 dark:border-white/15">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={item.name}>
                        {item.name || `Document ${idx + 1}.pdf`}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} • {formatSize(item.size)}
                        {item.rotationDegrees ? ` • Rotated ${item.rotationDegrees}°` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Quick Delete */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Row: Page Range Input + Actions (Rotate, Move Up/Down) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-1.5 liquid-glass-input px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pages:</span>
                    <input
                      type="text"
                      value={item.pageRange}
                      onChange={(e) => updatePageRange(idx, e.target.value)}
                      placeholder="all or 1-3"
                      className="w-20 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none text-center"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Rotate 90° clockwise"
                      onClick={() => rotateItem(idx)}
                      className="liquid-glass-btn p-2 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      className="liquid-glass-btn p-2 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      className="liquid-glass-btn p-2 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Merge Trigger Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isMerging || items.length < 2}
              onClick={handleMerge}
              className="liquid-glass-accent w-full py-3 px-4 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isMerging ? (
                <>
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  <span>Merging {items.length} PDF Documents...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Merge {items.length} PDF Documents Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="liquid-glass-card liquid-specular border-2 border-dashed border-black/20 dark:border-white/20 rounded-3xl p-8 text-center cursor-pointer hover:border-black/40 dark:hover:border-white/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <FilePlus className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No PDFs selected yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Click here to choose multiple PDF files from your device to merge them into one organized document.
          </p>
        </div>
      )}

      {/* Merged Download Result Card */}
      {mergedResult && (
        <div className="liquid-glass-card liquid-specular p-4 rounded-3xl border border-black/15 dark:border-white/20 space-y-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                PDF Successfully Merged!
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {mergedResult.totalPageCount} total pages • {formatSize(mergedResult.totalSizeBytes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                saveAndDownloadFile(
                  mergedResult.mergedBlob,
                  mergedResult.fileName,
                  'application/pdf'
                )
              }
              className="liquid-glass-accent flex-1 py-2.5 px-4 rounded-2xl text-slate-950 text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Merged PDF</span>
            </button>

            {onEditInEditor && (
              <button
                type="button"
                onClick={() => onEditInEditor(mergedResult.mergedBlob, mergedResult.fileName)}
                className="liquid-glass-btn py-2.5 px-4 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                title="Edit in PDF Editor"
              >
                <FileEdit className="w-4 h-4 text-indigo-500" />
                <span>Edit PDF</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
