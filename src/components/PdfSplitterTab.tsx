import React, { useState, useRef } from 'react';
import { splitPdfFile, PdfSplitResult } from '../lib/pdfSplitter';
import { getPdfPageCount } from '../lib/pdfMerger';
import { saveAndDownloadFile } from '../lib/fileDownloader';
import {
  Scissors,
  FileText,
  Download,
  FolderArchive,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileCode,
} from 'lucide-react';

export function PdfSplitterTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'range' | 'extract-all'>('range');
  const [pageRange, setPageRange] = useState('1');
  const [customFileName, setCustomFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PdfSplitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setResult(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const f = e.target.files[0];
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please select a valid PDF document.');
      return;
    }

    try {
      const pages = await getPdfPageCount(f);
      setSelectedFile(f);
      setPageCount(pages);
      setPageRange(`1-${Math.min(pages, 3)}`);
      setCustomFileName(`${f.name.replace(/\.pdf$/i, '')}-extracted`);
    } catch {
      setErrorMsg('Failed to read PDF document structure.');
    }
  };

  const handleSplit = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await splitPdfFile(selectedFile, {
        mode: splitMode,
        pageRange: splitMode === 'range' ? pageRange : undefined,
        customFileName,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error splitting PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Banner */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center font-bold">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              PDF Splitter & Extractor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Extract specific page ranges into a new PDF or split all pages into separate files bundled in a ZIP archive.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="liquid-glass-accent inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>{selectedFile ? 'Change File' : 'Select PDF'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl liquid-glass border border-black/15 dark:border-white/20 text-slate-900 dark:text-white text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {selectedFile ? (
        <div className="space-y-4 p-5 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10">
          {/* File Info */}
          <div className="flex items-center justify-between p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileCode className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {pageCount} total pages • {formatSize(selectedFile.size)}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="liquid-glass-dock liquid-specular grid grid-cols-2 gap-2 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setSplitMode('range')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                splitMode === 'range'
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Extract Page Range
            </button>
            <button
              type="button"
              onClick={() => setSplitMode('extract-all')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                splitMode === 'extract-all'
                  ? 'liquid-glass-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Split All Pages (ZIP)
            </button>
          </div>

          {/* Range Configuration */}
          {splitMode === 'range' ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pages to Extract (1 to {pageCount})
              </label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 8-10"
                className="liquid-glass-input w-full px-3.5 py-2.5 rounded-2xl text-xs text-slate-800 dark:text-slate-200 font-mono outline-none border border-black/10 dark:border-white/10"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Example: Use <code className="text-slate-900 dark:text-white font-bold">1-3, 5</code> to extract pages 1, 2, 3, and 5.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
              Each of the {pageCount} pages will be extracted as an individual single-page PDF document and bundled in a single download ZIP.
            </div>
          )}

          {/* Output Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Output File Name
            </label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder="e.g. extracted-document"
              className="liquid-glass-input w-full px-3.5 py-2.5 rounded-2xl text-xs text-slate-800 dark:text-slate-200 outline-none border border-black/10 dark:border-white/10"
            />
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSplit}
            className="liquid-glass-accent w-full py-3 px-4 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                <span>Processing Document...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {splitMode === 'range' ? 'Extract Selected Pages' : 'Split All Pages to ZIP'}
                </span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Empty Picker */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="liquid-glass-card liquid-specular border-2 border-dashed border-black/20 dark:border-white/20 rounded-3xl p-8 text-center cursor-pointer hover:border-black/40 dark:hover:border-white/40 transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Scissors className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Select a PDF to Split
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Choose any multi-page PDF document to extract desired pages or split into individual page files.
          </p>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="liquid-glass-card liquid-specular p-4 rounded-3xl border border-black/15 dark:border-white/20 space-y-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {result.isZip ? 'ZIP Archive Generated!' : 'Pages Extracted Successfully!'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {result.pageCount} pages • {formatSize(result.blob.size)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveAndDownloadFile(
                result.blob,
                result.fileName,
                result.isZip ? 'application/zip' : 'application/pdf'
              )
            }
            className="liquid-glass-accent w-full py-2.5 px-4 rounded-2xl text-slate-950 text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download {result.isZip ? 'ZIP Archive' : 'Extracted PDF'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
