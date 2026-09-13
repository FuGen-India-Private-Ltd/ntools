import React, { useState, useRef } from 'react';
import {
  PdfCompressionLevel,
  PdfCompressionResult,
  PDF_COMPRESSION_LEVELS,
  COMMON_TARGET_PRESETS,
  compressPdfFile,
} from '../lib/pdfCompressor';
import { formatFileSize } from '../lib/imageCompressor';
import { saveAndDownloadFile } from '../lib/fileDownloader';
import {
  FileText,
  UploadCloud,
  Download,
  Sparkles,
  Sliders,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  Share2,
} from 'lucide-react';

export function PdfCompressorTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<PdfCompressionLevel>('medium');
  const [selectedTargetPreset, setSelectedTargetPreset] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<PdfCompressionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setResult(null);
      }
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleCompress = async () => {
    if (!selectedFile) return;
    setIsCompressing(true);
    try {
      const res = await compressPdfFile(selectedFile, {
        level: compressionLevel,
        targetSizeKb: selectedTargetPreset || undefined,
      });
      setResult(res);
    } catch (err: any) {
      console.error('PDF compression failed:', err);
      alert('Failed to compress PDF: ' + (err?.message || 'Invalid or encrypted PDF.'));
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Title Banner */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              PDF Compressor & Optimizer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reduce PDF file size for portal uploads, job applications, and emails without losing readability.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="liquid-glass-accent inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{selectedFile ? 'Change File' : 'Select PDF'}</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept="application/pdf"
          className="hidden"
        />
      </div>

      {/* Upload Dropzone */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 sm:p-6 space-y-4">
        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40 rounded-3xl p-8 text-center cursor-pointer transition bg-black/[0.02] dark:bg-white/[0.02] space-y-3 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Select or Drop a PDF File
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero server upload. Processed 100% locally on your phone.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Original Size: {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-slate-900 dark:text-white hover:underline px-2 shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Quick Upload Target Limits */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Quick Target Size Presets (Optional)
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
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'opacity-90 font-semibold' : 'text-slate-400'}`}>
                        {preset.note}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Standard Compression Levels */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
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
                          ? 'liquid-glass-card border-black/30 dark:border-white/30 shadow-sm ring-1 ring-black/10 dark:ring-white/10'
                          : 'liquid-glass-btn'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase">
                          {lvl}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-black/10 dark:border-white/10 liquid-glass">
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

            {/* Compress Action Button */}
            <button
              type="button"
              onClick={handleCompress}
              disabled={isCompressing}
              className="liquid-glass-accent w-full py-3 px-4 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compressing Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Compress PDF File Now</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className="liquid-glass-card liquid-specular rounded-3xl p-5 border border-black/15 dark:border-white/20 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
            <div className="w-9 h-9 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold shadow-md">
              ✓
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                PDF Compressed Successfully!
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {result.pageCount} page(s) • Reduced by {result.reductionPercentage}% ({formatFileSize(result.originalSize - result.compressedSize)} saved)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl liquid-glass text-center border border-black/10 dark:border-white/10">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Original Size</span>
              <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatFileSize(result.originalSize)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Compressed Size</span>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {formatFileSize(result.compressedSize)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveAndDownloadFile(
                result.compressedBlob,
                `compressed_${result.originalFileName}`,
                'application/pdf'
              )
            }
            className="liquid-glass-accent w-full py-2.5 px-4 rounded-2xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Compressed PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
