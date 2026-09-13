import React, { useState, useRef } from 'react';
import { convertDocxToPdf, DocxToPdfResult } from '../lib/docxToPdfProcessor';
import { processPptxFile, PptxProcessResult } from '../lib/pptxProcessor';
import { saveAndDownloadFile } from '../lib/fileDownloader';
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
  Eye,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export function DocxPptToPdfConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'docx' | 'pptx' | null>(null);
  const [status, setStatus] = useState<'upload' | 'configured' | 'converting' | 'completed'>('upload');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PDF Customization Settings
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [customTitle, setCustomTitle] = useState('');

  // Results
  const [docxResult, setDocxResult] = useState<DocxToPdfResult | null>(null);
  const [pptxResult, setPptxResult] = useState<PptxProcessResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectFile = (file: File) => {
    setErrorMsg(null);
    setDocxResult(null);
    setPptxResult(null);
    setProgressPercent(0);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'docx') {
      setSelectedFile(file);
      setFileType('docx');
      setCustomTitle(file.name.replace(/\.docx$/i, ''));
      setStatus('configured');
    } else if (ext === 'pptx') {
      setSelectedFile(file);
      setFileType('pptx');
      setCustomTitle(file.name.replace(/\.pptx$/i, ''));
      setStatus('configured');
    } else if (ext === 'doc' || ext === 'ppt') {
      setErrorMsg(
        `".${ext}" is a legacy binary Office 97-2003 format. Please open it and save as modern .${ext}x or export to PDF, then try again.`
      );
      setSelectedFile(null);
      setFileType(null);
      setStatus('upload');
    } else {
      setErrorMsg('Please select a valid Word (.docx) or PowerPoint (.pptx) document.');
      setSelectedFile(null);
      setFileType(null);
      setStatus('upload');
    }
  };

  const handleConvert = async () => {
    if (!selectedFile || !fileType) return;
    setStatus('converting');
    setErrorMsg(null);
    setProgressPercent(15);
    setProgressStage('Parsing document structure & formatting...');

    try {
      await new Promise((r) => setTimeout(r, 120)); // UI smoothness
      setProgressPercent(45);
      setProgressStage('Processing typography & character encoding...');

      if (fileType === 'docx') {
        const effectiveOrientation = orientation === 'auto' ? 'portrait' : orientation;
        const res = await convertDocxToPdf(selectedFile, {
          pageSize,
          orientation: effectiveOrientation,
          includeHeader,
          includePageNumbers,
          documentTitle: customTitle || undefined,
        });
        setProgressPercent(85);
        setProgressStage('Compiling PDF pages...');
        await new Promise((r) => setTimeout(r, 100));
        setDocxResult(res);
      } else if (fileType === 'pptx') {
        const res = await processPptxFile(selectedFile);
        setProgressPercent(85);
        setProgressStage('Generating slide presentation PDF...');
        await new Promise((r) => setTimeout(r, 100));
        setPptxResult(res);
      }

      setProgressPercent(100);
      setProgressStage('Conversion complete!');
      await new Promise((r) => setTimeout(r, 150));
      setStatus('completed');
    } catch (err: any) {
      console.error('PDF conversion error', err);
      setErrorMsg(err?.message || 'Failed to convert document to PDF.');
      setStatus('configured');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileType(null);
    setDocxResult(null);
    setPptxResult(null);
    setErrorMsg(null);
    setStatus('upload');
    setProgressPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeResult = docxResult || pptxResult;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="liquid-glass-card liquid-specular rounded-3xl p-5 border border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md font-bold">
            {fileType === 'pptx' ? <Presentation className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Word & PowerPoint to PDF
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full liquid-glass-btn text-slate-700 dark:text-slate-300">
                100% Offline
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transform .docx documents & .pptx slides into crisp, printable PDF documents.
            </p>
          </div>
        </div>

        {status !== 'upload' && (
          <button
            type="button"
            onClick={handleReset}
            className="liquid-glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl liquid-glass border border-black/15 dark:border-white/20 text-slate-900 dark:text-white text-xs flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-slate-700 dark:text-slate-300 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Conversion Notice</span>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* STAGE 1: Upload / Drop Zone */}
      {status === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="liquid-glass-card liquid-specular border-2 border-dashed border-black/20 dark:border-white/20 hover:border-black/40 dark:hover:border-white/40 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 bg-black/[0.02] dark:bg-white/[0.02] space-y-4 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleSelectFile(e.target.files[0]);
                }
              }}
              accept=".docx,.pptx"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-3xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Select WORD or POWERPOINT files
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag and drop your document here, or click to browse from device.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="liquid-glass px-3 py-1 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-black/10 dark:border-white/10">
                <FileText className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Microsoft Word (.docx)
              </span>
              <span className="liquid-glass px-3 py-1 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-black/10 dark:border-white/10">
                <Presentation className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                PowerPoint (.pptx)
              </span>
            </div>

            <div>
              <button
                type="button"
                className="liquid-glass-accent inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-md transition active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                Select Document
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              100% Private (No file leaves device)
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              No Watermarks
            </span>
          </div>
        </div>
      )}

      {/* STAGE 2: Configured / Options Panel */}
      {status === 'configured' && selectedFile && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Selected File Card */}
          <div className="liquid-glass-card liquid-specular rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-black/10 dark:border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center shrink-0 border border-black/10 dark:border-white/10">
                {fileType === 'docx' ? <FileText className="w-6 h-6" /> : <Presentation className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {selectedFile.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="uppercase font-semibold text-[10px] px-1.5 py-0.5 rounded liquid-glass border border-black/10 dark:border-white/10">
                    {fileType}
                  </span>
                  <span>•</span>
                  <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-slate-900 dark:text-white hover:underline shrink-0"
            >
              Choose different file
            </button>
          </div>

          {/* Options Details */}
          <div className="liquid-glass-card liquid-specular rounded-3xl p-5 space-y-4 border border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Conversion Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Page Size</label>
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
                <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Orientation</label>
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
                  className="w-4 h-4 accent-black dark:accent-white rounded cursor-pointer"
                />
                <label htmlFor="includeHeaderOpt" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Include Top Header
                </label>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="includePageNoOpt"
                  checked={includePageNumbers}
                  onChange={(e) => setIncludePageNumbers(e.target.checked)}
                  className="w-4 h-4 accent-black dark:accent-white rounded cursor-pointer"
                />
                <label htmlFor="includePageNoOpt" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Page Numbers
                </label>
              </div>
            </div>

            {/* Custom Title Input */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-medium text-xs">
                Document Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter document title..."
                className="liquid-glass-input w-full px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-200 text-xs outline-none transition border border-black/10 dark:border-white/10"
              />
            </div>

            {/* Big Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleConvert}
                className="liquid-glass-accent inline-flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-bold shadow-lg transition active:scale-95"
              >
                <FileCheck className="w-5 h-5" />
                <span>Convert to PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Converting with Real-Time Progress Bar */}
      {status === 'converting' && (
        <div className="liquid-glass-card liquid-specular rounded-3xl p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-200 border border-black/10 dark:border-white/10">
          <div className="w-16 h-16 rounded-3xl bg-black/10 dark:bg-white/10 text-slate-900 dark:text-white flex items-center justify-center mx-auto shadow-inner border border-black/10 dark:border-white/10">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Converting Document to PDF...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {progressStage}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-black dark:bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
              <span>Client-Side Engine</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4: Completed Result & Download */}
      {status === 'completed' && activeResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Success Card */}
          <div className="liquid-glass-card liquid-specular rounded-3xl p-6 border border-black/15 dark:border-white/20 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Document Converted Successfully!
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {activeResult.pdfFileName}
                  </p>
                </div>
              </div>

              {/* Download CTA Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => saveAndDownloadFile(activeResult.pdfBlob, activeResult.pdfFileName)}
                  className="liquid-glass-accent flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold shadow-lg transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="liquid-glass-btn inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-300 text-xs font-bold transition active:scale-95"
                  title="Convert Another File"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Convert Another</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs">
              <div className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10">
                <div className="text-slate-400 text-[11px]">Source File</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{selectedFile?.name}</div>
              </div>
              <div className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10">
                <div className="text-slate-400 text-[11px]">PDF Size</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {(activeResult.pdfBlob.size / 1024).toFixed(1)} KB
                </div>
              </div>
              {docxResult && (
                <>
                  <div className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10">
                    <div className="text-slate-400 text-[11px]">Total Words</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {docxResult.wordCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10">
                    <div className="text-slate-400 text-[11px]">Paragraphs</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {docxResult.paragraphCount}
                    </div>
                  </div>
                </>
              )}
              {pptxResult && (
                <>
                  <div className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10">
                    <div className="text-slate-400 text-[11px]">Total Slides</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {pptxResult.slideCount}
                    </div>
                  </div>
                  <div className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10">
                    <div className="text-slate-400 text-[11px]">Slide Layout</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">Landscape Presentation</div>
                  </div>
                </>
              )}
            </div>

            {/* Extracted Preview Accordion */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                Document Structure Preview:
              </span>

              {docxResult && (
                <div className="liquid-glass space-y-1.5 max-h-52 overflow-y-auto p-4 rounded-2xl border border-black/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-sans">
                  {docxResult.paragraphs.slice(0, 12).map((p, idx) => (
                    <p
                      key={idx}
                      className={`${
                        p.isHeading
                          ? 'font-bold text-slate-900 dark:text-slate-100 text-sm pt-1'
                          : p.isBullet
                          ? 'pl-3'
                          : ''
                      }`}
                    >
                      {p.isBullet ? '• ' : ''}{p.text}
                    </p>
                  ))}
                  {docxResult.paragraphs.length > 12 && (
                    <p className="text-[11px] text-slate-400 italic pt-1">
                      + {docxResult.paragraphs.length - 12} more paragraphs included in PDF
                    </p>
                  )}
                </div>
              )}

              {pptxResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {pptxResult.slides.map((s) => (
                    <div
                      key={s.slideNumber}
                      className="liquid-glass p-3 rounded-2xl border border-black/10 dark:border-white/10 text-xs space-y-1"
                    >
                      <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                        Slide {s.slideNumber}
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 line-clamp-2 font-sans text-[11px]">
                        {s.rawText || '(Graphic Slide)'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
