import React, { useState, useRef } from 'react';
import {
  OutputImageFormat,
  CompressedImageItem,
  formatFileSize,
  compressBatchImages,
  downloadBatchAsZip,
} from '../lib/imageCompressor';
import { downloadBlob } from '../lib/docxProcessor';
import {
  Image as ImageIcon,
  UploadCloud,
  Download,
  Sliders,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  CheckCircle2,
  Trash2,
  FileArchive,
  Loader2,
  ArrowRight,
  ZoomIn,
} from 'lucide-react';

export function ImageCompressorTab() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [compressedItems, setCompressedItems] = useState<CompressedImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Compression Parameters
  const [quality, setQuality] = useState<number>(0.8); // 80%
  const [format, setFormat] = useState<OutputImageFormat>('image/jpeg');
  const [targetMaxKb, setTargetMaxKb] = useState<number | undefined>(undefined);
  const [customKbInput, setCustomKbInput] = useState<string>('');
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    setSelectedFiles(validFiles);
    setCompressedItems([]);
  };

  const handleRunCompression = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedFiles.length });

    try {
      const items = await compressBatchImages(
        selectedFiles,
        {
          quality,
          format,
          targetMaxKb: targetMaxKb || undefined,
          maintainAspectRatio,
        },
        (curr, total) => setProgress({ current: curr, total })
      );
      setCompressedItems(items);
    } catch (err) {
      console.error('Compression failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (item: CompressedImageItem) => {
    let ext = 'jpg';
    if (item.format === 'image/png') ext = 'png';
    else if (item.format === 'image/webp') ext = 'webp';

    const baseName = item.originalFile.name.replace(/\.[^/.]+$/, '');
    downloadBlob(item.compressedBlob, `${baseName}_compressed.${ext}`);
  };

  const totalOriginalBytes = compressedItems.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalCompressedBytes = compressedItems.reduce((acc, curr) => acc + curr.compressedSize, 0);
  const overallReduction = totalOriginalBytes > 0
    ? Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Title Header Card */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            Image Compressor & Optimizer
          </h2>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/35 dark:border-white/15 hover:border-black/50 dark:hover:border-white/50 rounded-2xl p-8 text-center cursor-pointer transition bg-white/5 dark:bg-black/20 space-y-3"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesSelected(Array.from(e.target.files));
              }
            }}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl liquid-glass-accent flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} image(s) selected`
                : 'Drop images here or click to browse'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports JPEG, PNG, WebP (Single or multiple files)
            </p>
          </div>

          <button
            type="button"
            className="liquid-glass-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition"
          >
            Browse Images
          </button>
        </div>

        {/* Compression Parameter Studio */}
        {selectedFiles.length > 0 && (
          <div className="p-4 rounded-2xl liquid-glass border border-white/20 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Compression Controls
              </span>

              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quality: {Math.round(quality * 100)}%
              </span>
            </div>

            {/* Sliders & Option Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Quality Slider */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-slate-400 font-medium">
                  Compression Quality
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Smallest Size (10%)</span>
                  <span>Max Quality (100%)</span>
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-slate-400 font-medium">
                  Output Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as OutputImageFormat)}
                  className="liquid-glass-input w-full px-3 py-1.5 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="image/jpeg">JPEG (Universal / Small)</option>
                  <option value="image/webp">WebP (Modern / High Quality)</option>
                  <option value="image/png">PNG (Lossless)</option>
                </select>
              </div>

              {/* Target KB Limiter */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 dark:text-slate-400 font-medium">
                  Target Size Limit (Optional)
                </label>
                <select
                  value={targetMaxKb || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    setTargetMaxKb(val);
                  }}
                  className="liquid-glass-input w-full px-3 py-1.5 rounded-xl text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="">No Strict Target</option>
                  <option value="100">Under 100 KB (Web/Email)</option>
                  <option value="250">Under 250 KB</option>
                  <option value="500">Under 500 KB</option>
                  <option value="1024">Under 1 MB</option>
                </select>
              </div>
            </div>

            {/* Action Compress Button */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 dark:border-white/5">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedFiles.length} file(s) ready to process
              </span>

              <button
                type="button"
                onClick={handleRunCompression}
                disabled={isProcessing}
                className="liquid-glass-accent inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition active:scale-95 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Compressing ({progress.current}/{progress.total})...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Compress Images Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {compressedItems.length > 0 && (
        <div className="liquid-glass-card liquid-specular rounded-3xl p-6 space-y-5">
          {/* Overall Stats Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl liquid-glass border border-white/20 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl liquid-glass-accent flex items-center justify-center font-bold shadow-sm">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Compressed {compressedItems.length} image(s) successfully!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Saved {formatFileSize(totalOriginalBytes - totalCompressedBytes)} ({overallReduction}% reduction)
                </p>
              </div>
            </div>

            {/* Batch Download ZIP button */}
            {compressedItems.length > 1 && (
              <button
                type="button"
                onClick={() => downloadBatchAsZip(compressedItems)}
                className="liquid-glass-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <FileArchive className="w-4 h-4" />
                Download All (.zip)
              </button>
            )}
          </div>

          {/* Compressed Items Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {compressedItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl liquid-glass border border-white/20 dark:border-white/10 flex items-center gap-4 space-y-1"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-white/10 relative group">
                  <img
                    src={item.previewUrl}
                    alt={item.originalFile.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.originalFile.name}
                  </h4>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="line-through">{formatFileSize(item.originalSize)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatFileSize(item.compressedSize)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-black/10 dark:border-white/10">
                      -{item.reductionPercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.compressedWidth} × {item.compressedHeight}px
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSingle(item)}
                  className="liquid-glass-btn p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition shadow-sm cursor-pointer"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
