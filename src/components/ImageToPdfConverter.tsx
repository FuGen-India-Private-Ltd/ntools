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
import { saveAndDownloadFile, saveMultipleFilesToPhone, showToast } from '../lib/fileDownloader';
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
  Archive,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export interface ImageToPdfConverterProps {
  onEditInEditor?: (blob: Blob, fileName: string) => void;
}

interface BatchConvertedItem {
  id: string;
  name: string;
  pdfBlob: Blob;
  pdfFileName: string;
}

export function ImageToPdfConverter({ onEditInEditor }: ImageToPdfConverterProps = {}) {
  const [items, setItems] = useState<ImageToPdfItem[]>([]);
  const [mode, setMode] = useState<'combine' | 'individual'>('combine');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [currentProcessingName, setCurrentProcessingName] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [batchResults, setBatchResults] = useState<BatchConvertedItem[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
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
    setBatchResults([]);

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

  // Convert Handler (Handles both Combine and Batch Individual)
  const handleConvert = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setBatchProgress(0);

    try {
      if (mode === 'combine') {
        const blob = await convertImagesToPdf(items, {
          pageFormat,
          marginMm,
          quality: 0.95,
        });
        setPdfBlob(blob);
      } else {
        // Batch convert each image into individual PDF
        const results: BatchConvertedItem[] = [];
        const total = items.length;

        for (let i = 0; i < total; i++) {
          const item = items[i];
          setCurrentProcessingName(item.name);

          const singlePdfBlob = await convertImagesToPdf([item], {
            pageFormat,
            marginMm,
            quality: 0.95,
          });

          const baseName = item.name.replace(/\.[^.]+$/, '');
          results.push({
            id: item.id,
            name: item.name,
            pdfBlob: singlePdfBlob,
            pdfFileName: `${baseName}.pdf`,
          });

          setBatchProgress(Math.round(((i + 1) / total) * 100));
        }

        setBatchResults(results);
        showToast('Batch Complete', `Converted ${results.length} images to individual PDFs.`, 'success');
      }
    } catch (err: any) {
      console.error('Image to PDF conversion error', err);
      setErrorMsg(err?.message || 'Failed to generate PDF from images.');
    } finally {
      setIsProcessing(false);
      setCurrentProcessingName('');
    }
  };

  // Save All Individual PDFs as ZIP to Phone
  const handleSaveAllToPhone = async () => {
    if (batchResults.length === 0) return;
    setIsSavingAll(true);
    try {
      const filesToSave = batchResults.map((res) => ({
        blob: res.pdfBlob,
        fileName: res.pdfFileName,
      }));

      await saveMultipleFilesToPhone(filesToSave, 'Converted_Images.zip');
    } catch (err: any) {
      console.error('Failed to save batch PDFs:', err);
      showToast('Export Error', err?.message || 'Failed to save files', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleReset = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setPdfBlob(null);
    setBatchResults([]);
    setErrorMsg(null);
    setBatchProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Clean Header */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 border border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-sm border border-amber-500/20">
            <Images className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Images to PDF Converter
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Multi-File Batch
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Combine photos into 1 PDF document or batch convert into separate individual PDFs in one go.
            </p>
          </div>
        </div>

        {items.length > 0 && !isProcessing && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Mode Selector Segmented Control */}
      <div className="liquid-glass-card liquid-specular rounded-2xl p-1.5 flex gap-1 border border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            setMode('combine');
            setPdfBlob(null);
            setBatchResults([]);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === 'combine'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Combine into Single PDF ({items.length} pgs)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('individual');
            setPdfBlob(null);
            setBatchResults([]);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === 'individual'
              ? 'liquid-glass-accent shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Batch Convert to Individual PDFs ({items.length} files)</span>
        </button>
      </div>

      {/* Multi-Image Upload Dropzone */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-6 space-y-5 border border-black/10 dark:border-white/10">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-3xl p-8 text-center cursor-pointer transition space-y-3 group"
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

          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {items.length > 0
                ? `${items.length} Images Selected (Tap to add more)`
                : 'Select or Drop Multiple Images'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports JPEG, PNG, WebP, GIF • 100% offline conversion
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selected Images Reorderable List */}
        {items.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold px-1">
              <span>Selected Images ({items.length})</span>
              {mode === 'combine' && <span>Reorder sequence using arrows</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl liquid-glass border border-black/5 dark:border-white/10 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-black/5 dark:border-white/10">
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
                    {mode === 'combine' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="liquid-glass-btn p-1.5 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === items.length - 1}
                          className="liquid-glass-btn p-1.5 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
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
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Page Sizing / Orientation
              </label>
              <select
                value={pageFormat}
                onChange={(e) => setPageFormat(e.target.value as PageFormatOption)}
                className="liquid-glass-input w-full p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none border border-black/10 dark:border-white/10"
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
                className="liquid-glass-input w-full p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none border border-black/10 dark:border-white/10"
              >
                <option value="0">No Margins (Full Bleed)</option>
                <option value="5">Small Margins (5mm)</option>
                <option value="10">Standard Margins (10mm)</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Batch Progress Bar */}
        {isProcessing && mode === 'individual' && (
          <div className="p-4 rounded-2xl liquid-glass space-y-2 border border-amber-500/20">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                Converting: {currentProcessingName}
              </span>
              <span>{batchProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                style={{ width: `${batchProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Convert Button */}
        {items.length > 0 && !pdfBlob && batchResults.length === 0 && (
          <button
            type="button"
            onClick={handleConvert}
            disabled={isProcessing}
            className="liquid-glass-accent w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {mode === 'combine'
                    ? `Generating Combined PDF (${items.length} pages)...`
                    : `Batch Converting ${items.length} Images...`}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {mode === 'combine'
                    ? `Generate Single PDF from ${items.length} ${items.length === 1 ? 'Image' : 'Images'}`
                    : `Batch Convert All (${items.length}) Images to Separate PDFs`}
                </span>
              </>
            )}
          </button>
        )}

        {/* Success Card: Combined Mode */}
        {pdfBlob && mode === 'combine' && (
          <div className="p-5 rounded-2xl liquid-glass-card liquid-specular space-y-4 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
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

        {/* Success Card: Batch Individual Mode */}
        {batchResults.length > 0 && mode === 'individual' && (
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular space-y-4 border border-emerald-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>
                  Batch Conversion Complete! ({batchResults.length} individual PDFs created)
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveAllToPhone}
                  disabled={isSavingAll}
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
                  onClick={handleReset}
                  className="p-2.5 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
                  title="Convert New Batch"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of converted files with download/edit */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {batchResults.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between p-2.5 rounded-xl liquid-glass border border-black/5 dark:border-white/10 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {res.pdfFileName}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono shrink-0">
                      ({formatFileSize(res.pdfBlob.size)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        saveAndDownloadFile(res.pdfBlob, res.pdfFileName, 'application/pdf')
                      }
                      title="Download PDF"
                      className="p-1.5 rounded-lg liquid-glass-btn text-amber-600 dark:text-amber-400 hover:text-amber-500 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {onEditInEditor && (
                      <button
                        type="button"
                        onClick={() => onEditInEditor(res.pdfBlob, res.pdfFileName)}
                        title="Edit in PDF Editor"
                        className="p-1.5 rounded-lg liquid-glass-btn text-indigo-500 hover:text-indigo-600 transition"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
