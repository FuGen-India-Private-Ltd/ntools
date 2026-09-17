import React, { useState, useRef } from 'react';
import {
  ImageToPdfItem,
  ImageToPdfOptions,
  PageFormatOption,
  loadImageDetails,
  convertImagesToPdf,
  downloadImagesPdf,
} from '../lib/imageToPdfProcessor';
import { formatFileSize } from '../lib/imageCompressor';
import {
  Images,
  UploadCloud,
  Download,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Plus,
  FileEdit,
} from 'lucide-react';

export interface ImageToPdfConverterProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

export function ImageToPdfConverter({ onEditInEditor }: ImageToPdfConverterProps = {}) {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings
  const [pageFormat, setPageFormat] = useState<PageFormatOption>('a4_portrait');
  const [marginMm, setMarginMm] = useState<number>(5);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setErrorMsg(null);
    setPdfBlob(null);

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMsg('Please select valid image files (JPEG, PNG, WebP, GIF).');
      return;
    }

    try {
      const loaded: ImageToPdfItem[] = [];
      for (const file of validFiles) {
        const item = await loadImageDetails(file);
        loaded.push(item);
      }
      setItems((prev) => [...prev, ...loaded]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load some images.');
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConvert = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const blob = await convertImagesToPdf(items, {
        pageFormat,
        marginMm,
        quality: 0.95,
      });
      setPdfBlob(blob);
    } catch (err: any) {
      console.error('Image to PDF conversion error', err);
      setErrorMsg(err?.message || 'Failed to generate PDF from images.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setPdfBlob(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Clean Header */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Images className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          Images to PDF Converter
        </h2>
      </div>

      {/* Multi-Image Upload Dropzone */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-6 space-y-5">
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
            accept="image/*"
            multiple
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl liquid-glass-accent flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {items.length > 0
                ? `${items.length} Images Selected (Tap to add more)`
                : 'Drop images here or tap to browse'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports JPEG, PNG, WebP, GIF • Combine multiple photos into 1 PDF
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/20 dark:border-white/20 text-slate-900 dark:text-slate-100 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Selected Images Reorderable List */}
        {items.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
              <span>Page Sequence ({items.length} pages)</span>
              <span>Reorder using arrows</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl liquid-glass border border-white/20 dark:border-white/10 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-white/10">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatFileSize(item.size)} • {item.width}×{item.height}px
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="liquid-glass-btn p-1.5 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === items.length - 1}
                      className="liquid-glass-btn p-1.5 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 hover:text-black dark:hover:text-white transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Page & Layout Options */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Page Sizing / Orientation</label>
              <select
                value={pageFormat}
                onChange={(e) => setPageFormat(e.target.value as PageFormatOption)}
                className="liquid-glass-input w-full p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="a4_portrait">A4 Portrait (Standard Document)</option>
                <option value="a4_landscape">A4 Landscape (Wide Photos)</option>
                <option value="fit">Fit to Image (No Margins / 100% Full Resolution)</option>
                <option value="letter_portrait">US Letter Portrait</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Page Margins</label>
              <select
                value={marginMm}
                onChange={(e) => setMarginMm(parseInt(e.target.value, 10))}
                className="liquid-glass-input w-full p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="0">No Margins (Full Bleed)</option>
                <option value="5">Small Margins (5mm)</option>
                <option value="10">Standard Margins (10mm)</option>
              </select>
            </div>
          </div>
        )}

        {/* Convert Button */}
        {items.length > 0 && !pdfBlob && (
          <button
            type="button"
            onClick={handleConvert}
            disabled={isProcessing}
            className="liquid-glass-accent w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating PDF ({items.length} pages)...</span>
              </>
            ) : (
              <>
                <Images className="w-4 h-4" />
                <span>Generate PDF from {items.length} {items.length === 1 ? 'Image' : 'Images'}</span>
              </>
            )}
          </button>
        )}

        {/* Success Card */}
        {pdfBlob && (
          <div className="p-5 rounded-2xl liquid-glass-card liquid-specular space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>PDF Generated Successfully ({items.length} pages, {formatFileSize(pdfBlob.size)})!</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadImagesPdf(pdfBlob, 'Photos_Combined')}
                className="liquid-glass-accent flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              {onEditInEditor && (
                <button
                  type="button"
                  onClick={() => onEditInEditor(pdfBlob, 'Photos_Combined.pdf')}
                  className="liquid-glass-btn py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  title="Open in PDF Editor"
                >
                  <FileEdit className="w-4 h-4 text-indigo-500" />
                  <span>Edit PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="liquid-glass-btn p-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-slate-900 transition cursor-pointer"
                title="Convert more images"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
