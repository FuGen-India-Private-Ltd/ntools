import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Download,
  RotateCw,
  RotateCcw,
  Trash2,
  Type,
  ShieldAlert,
  Hash,
  Sparkles,
  CheckCircle2,
  Share2,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Layers,
  Eye,
  Sliders,
  X,
} from 'lucide-react';
import { PDFDocument, rgb, degrees, StandardFonts, RGB } from 'pdf-lib';
import { saveAndDownloadFile, showToast } from '../lib/fileDownloader';

interface TextAnnotation {
  id: string;
  text: string;
  pageIndex: number | 'all';
  position: 'top-center' | 'bottom-center' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number;
  colorName: 'slate' | 'rose' | 'blue' | 'emerald' | 'amber';
}

interface WatermarkConfig {
  enabled: boolean;
  text: string;
  opacity: number;
  fontSize: number;
  allPages: boolean;
}

const COLOR_MAP: Record<TextAnnotation['colorName'], { rgb: RGB; hex: string; label: string }> = {
  slate: { rgb: rgb(0.12, 0.16, 0.23), hex: '#1e293b', label: 'Obsidian' },
  rose: { rgb: rgb(0.88, 0.15, 0.25), hex: '#e11d48', label: 'Crimson' },
  blue: { rgb: rgb(0.14, 0.44, 0.95), hex: '#2563eb', label: 'Sapphire' },
  emerald: { rgb: rgb(0.05, 0.65, 0.38), hex: '#059669', label: 'Emerald' },
  amber: { rgb: rgb(0.85, 0.47, 0.05), hex: '#d97706', label: 'Amber' },
};

interface PdfEditorTabProps {
  initialBlob?: Blob | null;
  initialFileName?: string | null;
  onClearInitial?: () => void;
}

export function PdfEditorTab({ initialBlob, initialFileName, onClearInitial }: PdfEditorTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('document.pdf');
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [pageRotations, setPageRotations] = useState<number[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Tools state
  const [activeTool, setActiveTool] = useState<'annotate' | 'watermark' | 'pages'>('annotate');

  // Text Annotations
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [newText, setNewText] = useState<string>('APPROVED');
  const [newPosition, setNewPosition] = useState<TextAnnotation['position']>('top-center');
  const [newFontSize, setNewFontSize] = useState<number>(14);
  const [newColor, setNewColor] = useState<TextAnnotation['colorName']>('rose');
  const [applyToAll, setApplyToAll] = useState<boolean>(false);

  // Watermark
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    text: 'CONFIDENTIAL',
    opacity: 0.22,
    fontSize: 48,
    allPages: true,
  });

  // Page Numbers
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalBytesRef = useRef<ArrayBuffer | null>(null);

  // Load initialBlob if provided from another tool
  useEffect(() => {
    if (initialBlob) {
      loadBlob(initialBlob, initialFileName || 'document.pdf');
    }
  }, [initialBlob, initialFileName]);

  const loadBlob = async (blob: Blob, name: string) => {
    setIsProcessing(true);
    setStatusMessage('Loading PDF document...');
    try {
      const buffer = await blob.arrayBuffer();
      originalBytesRef.current = buffer.slice(0);
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();

      const initialRotations = Array.from({ length: count }, (_, i) => {
        return doc.getPage(i).getRotation().angle || 0;
      });

      setPdfDoc(doc);
      setPageCount(count);
      setActivePageIndex(0);
      setPageRotations(initialRotations);
      setPdfFileName(name);
      setAnnotations([]);
      setWatermark((prev) => ({ ...prev, enabled: false }));
      setIncludePageNumbers(false);

      // Create preview URL
      const previewBlob = new Blob([buffer], { type: 'application/pdf' });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(previewBlob));
      setStatusMessage(null);
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      showToast('Load Error', err?.message || 'Failed to open PDF document', 'error');
      setStatusMessage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      loadBlob(file, file.name);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        loadBlob(file, file.name);
      }
    }
  };

  // Rotate Page (90 deg increments)
  const rotateActivePage = (direction: 'cw' | 'ccw') => {
    if (!pdfDoc || pageCount === 0) return;
    const delta = direction === 'cw' ? 90 : -90;
    const newRotations = [...pageRotations];
    const current = newRotations[activePageIndex] || 0;
    const updated = (current + delta + 360) % 360;
    newRotations[activePageIndex] = updated;

    const page = pdfDoc.getPage(activePageIndex);
    page.setRotation(degrees(updated));

    setPageRotations(newRotations);
    showToast('Page Rotated', `Page ${activePageIndex + 1} rotated to ${updated}°`, 'info');
  };

  // Delete Active Page
  const deleteActivePage = () => {
    if (!pdfDoc || pageCount <= 1) {
      showToast('Cannot Delete', 'A PDF document must have at least one page', 'error');
      return;
    }

    pdfDoc.removePage(activePageIndex);
    const newCount = pdfDoc.getPageCount();
    const newRotations = pageRotations.filter((_, idx) => idx !== activePageIndex);

    setPageCount(newCount);
    setPageRotations(newRotations);
    setActivePageIndex((prev) => Math.min(prev, newCount - 1));
    showToast('Page Deleted', `Removed page ${activePageIndex + 1}. Remaining: ${newCount}`, 'success');
  };

  // Add Text Annotation
  const addAnnotation = () => {
    if (!newText.trim()) return;
    const item: TextAnnotation = {
      id: `ann_${Date.now()}`,
      text: newText.trim(),
      pageIndex: applyToAll ? 'all' : activePageIndex,
      position: newPosition,
      fontSize: newFontSize,
      colorName: newColor,
    };
    setAnnotations((prev) => [...prev, item]);
    showToast('Annotation Added', `"${item.text}" added to ${applyToAll ? 'all pages' : `page ${activePageIndex + 1}`}`, 'success');
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  // Compile & Export Edited PDF
  const handleExportEditedPdf = async () => {
    if (!pdfDoc || !originalBytesRef.current) return;
    setIsProcessing(true);
    setStatusMessage('Compiling edited PDF...');

    try {
      // Reload fresh document to apply all modifications cleanly
      const workingDoc = await PDFDocument.load(originalBytesRef.current);
      const helveticaFont = await workingDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await workingDoc.embedFont(StandardFonts.Helvetica);

      const totalPages = workingDoc.getPageCount();

      // Apply Rotations
      for (let i = 0; i < totalPages; i++) {
        if (i < pageRotations.length) {
          workingDoc.getPage(i).setRotation(degrees(pageRotations[i]));
        }
      }

      // Apply Watermark if enabled
      if (watermark.enabled && watermark.text.trim()) {
        const targetIndices = watermark.allPages
          ? Array.from({ length: totalPages }, (_, i) => i)
          : [activePageIndex];

        for (const pIdx of targetIndices) {
          if (pIdx < totalPages) {
            const page = workingDoc.getPage(pIdx);
            const { width, height } = page.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(watermark.text, watermark.fontSize);

            page.drawText(watermark.text, {
              x: width / 2 - textWidth / 2.8,
              y: height / 2 - 20,
              size: watermark.fontSize,
              font: helveticaFont,
              color: rgb(0.6, 0.6, 0.6),
              opacity: watermark.opacity,
              rotate: degrees(45),
            });
          }
        }
      }

      // Apply Text Annotations
      for (const ann of annotations) {
        const targetPages =
          ann.pageIndex === 'all'
            ? Array.from({ length: totalPages }, (_, i) => i)
            : [ann.pageIndex];

        for (const pIdx of targetPages) {
          if (pIdx < totalPages) {
            const page = workingDoc.getPage(pIdx);
            const { width, height } = page.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(ann.text, ann.fontSize);
            const colorRgb = COLOR_MAP[ann.colorName].rgb;

            let x = 30;
            let y = height - 40;

            if (ann.position === 'top-center') {
              x = (width - textWidth) / 2;
              y = height - 35;
            } else if (ann.position === 'top-right') {
              x = width - textWidth - 30;
              y = height - 35;
            } else if (ann.position === 'center') {
              x = (width - textWidth) / 2;
              y = height / 2;
            } else if (ann.position === 'bottom-center') {
              x = (width - textWidth) / 2;
              y = 30;
            } else if (ann.position === 'bottom-left') {
              x = 30;
              y = 30;
            } else if (ann.position === 'bottom-right') {
              x = width - textWidth - 30;
              y = 30;
            }

            page.drawText(ann.text, {
              x,
              y,
              size: ann.fontSize,
              font: helveticaFont,
              color: colorRgb,
            });
          }
        }
      }

      // Apply Page Numbers if enabled
      if (includePageNumbers) {
        for (let i = 0; i < totalPages; i++) {
          const page = workingDoc.getPage(i);
          const { width } = page.getSize();
          const pageStr = `Page ${i + 1} of ${totalPages}`;
          const numWidth = regularFont.widthOfTextAtSize(pageStr, 9);

          page.drawText(pageStr, {
            x: (width - numWidth) / 2,
            y: 18,
            size: 9,
            font: regularFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }

      const editedBytes = await workingDoc.save();
      const editedBlob = new Blob([editedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

      const baseName = pdfFileName.replace(/\.pdf$/i, '');
      const outFileName = `${baseName}_edited.pdf`;

      // Save directly to public phone storage in Documents/nTools/
      await saveAndDownloadFile(editedBlob, outFileName, 'application/pdf');

      // Update preview with newly saved document
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(editedBlob));
      originalBytesRef.current = (editedBytes.buffer as ArrayBuffer).slice(0);
      setPdfDoc(workingDoc);

      setStatusMessage(null);
    } catch (err: any) {
      console.error('Failed to compile edited PDF:', err);
      showToast('Export Error', err?.message || 'Failed to save edited PDF', 'error');
      setStatusMessage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearDoc = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPdfDoc(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPageCount(0);
    setAnnotations([]);
    originalBytesRef.current = null;
    if (onClearInitial) onClearInitial();
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner with Apple Liquid Glass styling */}
      <div className="p-4 sm:p-6 rounded-3xl liquid-glass liquid-specular shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                PDF Editor &amp; Annotator
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                100% Offline
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add stamps, text annotations, watermarks, rotate and organize pages, saved to Documents/nTools.
            </p>
          </div>
        </div>

        {pdfDoc && (
          <button
            type="button"
            onClick={handleClearDoc}
            className="px-3 py-1.5 rounded-xl liquid-glass-btn text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close File</span>
          </button>
        )}
      </div>

      {/* Upload Zone (If no document loaded) */}
      {!pdfDoc ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-10 sm:p-14 rounded-3xl liquid-glass-card liquid-specular border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 transition cursor-pointer text-center space-y-4 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center mx-auto shadow-sm group-hover:scale-105 transition">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              Drop a PDF here or tap to browse
            </h3>
            <p className="text-xs text-slate-400">
              Open any document or use the "Edit PDF" shortcut from any generator in Files Hub.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-btn text-[11px] font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Saves directly to Documents/nTools/</span>
          </div>
        </div>
      ) : (
        /* PDF Editor Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Tool Deck (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tool Category Selector */}
            <div className="p-1.5 rounded-2xl liquid-glass-dock liquid-specular shadow-sm flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setActiveTool('annotate')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 ${
                  activeTool === 'annotate'
                    ? 'liquid-glass-accent shadow-sm'
                    : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Stamp</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('watermark')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 ${
                  activeTool === 'watermark'
                    ? 'liquid-glass-accent shadow-sm'
                    : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Watermark</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('pages')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 ${
                  activeTool === 'pages'
                    ? 'liquid-glass-accent shadow-sm'
                    : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pages</span>
              </button>
            </div>

            {/* Active Tool Config Panel */}
            <div className="p-5 rounded-3xl liquid-glass-card liquid-specular shadow-sm space-y-4">
              {activeTool === 'annotate' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Add Text / Stamp
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      Page {activePageIndex + 1} of {pageCount}
                    </span>
                  </div>

                  {/* Text Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Text Content:</label>
                    <input
                      type="text"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="e.g. APPROVED, CONFIDENTIAL, SIGNED"
                      className="w-full px-3 py-2 rounded-xl liquid-glass-input text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Placement Preset */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Placement:</label>
                    <select
                      value={newPosition}
                      onChange={(e: any) => setNewPosition(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl liquid-glass-input text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="top-center">Top Header (Centered)</option>
                      <option value="top-left">Top Left Corner</option>
                      <option value="top-right">Top Right Corner</option>
                      <option value="center">Center of Page</option>
                      <option value="bottom-center">Bottom Footer (Centered)</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>

                  {/* Font Size & Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">Size ({newFontSize}pt):</label>
                      <input
                        type="range"
                        min="10"
                        max="36"
                        step="2"
                        value={newFontSize}
                        onChange={(e) => setNewFontSize(Number(e.target.value))}
                        className="w-full liquid-slider my-1.5"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">Color:</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        {(Object.keys(COLOR_MAP) as TextAnnotation['colorName'][]).map((cName) => {
                          const c = COLOR_MAP[cName];
                          const isSelected = newColor === cName;
                          return (
                            <button
                              key={cName}
                              type="button"
                              onClick={() => setNewColor(cName)}
                              className={`w-6 h-6 rounded-full transition active:scale-95 cursor-pointer border ${
                                isSelected ? 'ring-2 ring-indigo-500 scale-110 border-white' : 'border-black/20'
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.label}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Apply to all switch */}
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 accent-indigo-500"
                    />
                    <span>Apply to all {pageCount} pages</span>
                  </label>

                  {/* Add Annotation Button */}
                  <button
                    type="button"
                    onClick={addAnnotation}
                    className="w-full py-2.5 rounded-xl liquid-glass-btn text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <Type className="w-4 h-4" />
                    <span>Insert Text Stamp</span>
                  </button>

                  {/* Active Annotations List */}
                  {annotations.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="text-[11px] font-extrabold text-slate-400">
                        Queued Annotations ({annotations.length}):
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                        {annotations.map((ann) => (
                          <div
                            key={ann.id}
                            className="p-2 rounded-xl liquid-glass-btn text-xs flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: COLOR_MAP[ann.colorName].hex }}
                              />
                              <span className="font-bold truncate text-slate-800 dark:text-slate-200">
                                "{ann.text}"
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({ann.pageIndex === 'all' ? 'All' : `P.${(ann.pageIndex as number) + 1}`})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAnnotation(ann.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'watermark' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Diagonal Watermark
                    </h3>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watermark.enabled}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-500 accent-indigo-500"
                      />
                      <span>Enable</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">Watermark Text:</label>
                    <input
                      type="text"
                      value={watermark.text}
                      onChange={(e) => setWatermark((prev) => ({ ...prev, text: e.target.value }))}
                      placeholder="e.g. CONFIDENTIAL, DRAFT, COPY"
                      className="w-full px-3 py-2 rounded-xl liquid-glass-input text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        Opacity ({Math.round(watermark.opacity * 100)}%):
                      </label>
                      <input
                        type="range"
                        min="0.08"
                        max="0.50"
                        step="0.02"
                        value={watermark.opacity}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, opacity: Number(e.target.value) }))}
                        className="w-full liquid-slider my-1.5"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        Size ({watermark.fontSize}pt):
                      </label>
                      <input
                        type="range"
                        min="28"
                        max="72"
                        step="4"
                        value={watermark.fontSize}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                        className="w-full liquid-slider my-1.5"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watermark.allPages}
                      onChange={(e) => setWatermark((prev) => ({ ...prev, allPages: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-500 accent-indigo-500"
                    />
                    <span>Apply watermark to all {pageCount} pages</span>
                  </label>
                </div>
              )}

              {activeTool === 'pages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Page Operations
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">
                      Current: Page {activePageIndex + 1}
                    </span>
                  </div>

                  {/* Rotation Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => rotateActivePage('ccw')}
                      className="py-2.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Rotate -90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateActivePage('cw')}
                      className="py-2.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Rotate +90°</span>
                    </button>
                  </div>

                  {/* Delete Page */}
                  <button
                    type="button"
                    onClick={deleteActivePage}
                    disabled={pageCount <= 1}
                    className="w-full py-2.5 px-3 rounded-xl liquid-glass-btn text-xs font-bold text-rose-500 hover:text-rose-600 disabled:opacity-40 flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Page {activePageIndex + 1}</span>
                  </button>

                  {/* Page Numbers Toggle */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePageNumbers}
                        onChange={(e) => setIncludePageNumbers(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-500 accent-indigo-500"
                      />
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>Add Bottom Page Numbers ("Page X of Y")</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Compile & Save Action Deck */}
            <div className="p-4 rounded-3xl liquid-glass liquid-specular shadow-sm space-y-2.5">
              <button
                type="button"
                onClick={handleExportEditedPdf}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-2xl liquid-glass-accent text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-95 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save Edited PDF to Phone</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Saves to Documents/nTools/{pdfFileName.replace(/\.pdf$/i, '')}_edited.pdf</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Page Viewer & Thumbnails (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Page Navigation Header */}
            <div className="p-3.5 rounded-2xl liquid-glass liquid-specular shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                  disabled={activePageIndex <= 0}
                  className="p-1.5 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-400 disabled:opacity-30 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Page {activePageIndex + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={activePageIndex >= pageCount - 1}
                  className="p-1.5 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-400 disabled:opacity-30 active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Rotation indicator */}
              <span className="text-[11px] font-bold text-slate-400">
                Orientation: {pageRotations[activePageIndex] || 0}°
              </span>
            </div>

            {/* Embedded Live PDF Document Viewer */}
            <div className="h-[460px] sm:h-[540px] rounded-3xl liquid-glass-card liquid-specular shadow-inner overflow-hidden relative flex items-center justify-center p-2">
              {previewUrl ? (
                <iframe
                  src={`${previewUrl}#page=${activePageIndex + 1}&view=FitH`}
                  title="PDF Preview"
                  className="w-full h-full rounded-2xl border-none"
                />
              ) : (
                <div className="text-center space-y-2 text-slate-400">
                  <Eye className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs font-bold">Rendering preview...</p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-2 text-white text-xs font-bold z-10">
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{statusMessage || 'Processing document...'}</span>
                </div>
              )}
            </div>

            {/* Page Jump Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {Array.from({ length: pageCount }, (_, idx) => {
                const isActive = activePageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePageIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shrink-0 ${
                      isActive
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'liquid-glass-btn text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    P. {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
