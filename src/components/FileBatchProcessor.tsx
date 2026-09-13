import React, { useState, useRef } from 'react';
import { TranslationSchema } from '../lib/i18n';
import { FontMode } from '../lib/kannadaConverter';
import { processDocxFile, processTxtFile, downloadBlob } from '../lib/docxProcessor';
import { processPptxFile, PptxProcessResult } from '../lib/pptxProcessor';
import {
  UploadCloud,
  FileText,
  Presentation,
  FileCode,
  CheckCircle2,
  Download,
  Loader2,
  FileCheck,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface FileBatchProcessorProps {
  t: TranslationSchema;
}

interface ProcessedState {
  type: 'docx' | 'pptx' | 'txt';
  originalFileName: string;
  docxBlob?: Blob;
  pptxBlob?: Blob;
  pdfBlob?: Blob;
  txtBlob?: Blob;
  txtContent?: string;
  slideCount?: number;
  wordCount?: number;
  charCount?: number;
  slides?: { slideNumber: number; rawText: string }[];
}

export function FileBatchProcessor({ t }: FileBatchProcessorProps) {
  const [fontMode, setFontMode] = useState<FontMode>('auto');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectFile = (file: File) => {
    setErrorMsg(null);
    setResult(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'docx' || ext === 'pptx' || ext === 'ppt' || ext === 'txt') {
      setSelectedFile(file);
    } else {
      setErrorMsg('Please select a supported file (.docx, .pptx, .ppt, or .txt)');
    }
  };

  const handleConvertFile = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();

      if (ext === 'docx') {
        const docxResult = await processDocxFile(selectedFile, fontMode);
        setResult({
          type: 'docx',
          originalFileName: selectedFile.name,
          docxBlob: docxResult.blob,
          wordCount: docxResult.wordCount,
          charCount: docxResult.charCount,
        });
      } else if (ext === 'pptx' || ext === 'ppt') {
        const pptxResult = await processPptxFile(selectedFile);
        setResult({
          type: 'pptx',
          originalFileName: selectedFile.name,
          pdfBlob: pptxResult.pdfBlob,
          slideCount: pptxResult.slideCount,
          slides: pptxResult.slides,
        });
      } else if (ext === 'txt') {
        const txtResult = await processTxtFile(selectedFile, fontMode);
        setResult({
          type: 'txt',
          originalFileName: selectedFile.name,
          txtBlob: txtResult.blob,
          txtContent: txtResult.text,
          charCount: txtResult.text.length,
          wordCount: txtResult.text.trim().split(/\s+/).filter(Boolean).length,
        });
      }
    } catch (err: any) {
      console.error('File conversion error', err);
      setErrorMsg(err?.message || 'Failed to process file. Ensure the file is not password-protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pptx' || ext === 'ppt') return <Presentation className="w-8 h-8 text-slate-900 dark:text-white" />;
    if (ext === 'docx') return <FileText className="w-8 h-8 text-slate-900 dark:text-white" />;
    return <FileCode className="w-8 h-8 text-slate-900 dark:text-white" />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Presentation className="w-5 h-5 text-slate-900 dark:text-white" />
            {t.batchTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.batchSubtitle}
          </p>
        </div>

        {/* Font Mode Selection */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-black/10 dark:border-white/10">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t.fontModeLabel}:
          </span>
          <select
            value={fontMode}
            onChange={(e) => setFontMode(e.target.value as FontMode)}
            className="px-3 py-1.5 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
          >
            <option value="auto">{t.modeAuto}</option>
            <option value="nudi-to-unicode">{t.modeNudiToUnicode}</option>
            <option value="shree-to-unicode">{t.modeShreeToUnicode}</option>
            <option value="unicode-to-nudi">{t.modeUnicodeToNudi}</option>
          </select>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-black/15 dark:border-white/15 hover:border-black dark:hover:border-white rounded-3xl p-8 text-center cursor-pointer transition liquid-glass space-y-3"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleSelectFile(e.target.files[0]);
              }
            }}
            accept=".docx,.pptx,.ppt,.txt"
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 text-slate-900 dark:text-white flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {selectedFile ? selectedFile.name : t.dragDropTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click to choose another file`
                : t.dragDropDesc}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl liquid-glass-btn text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition"
          >
            {t.browseFiles}
          </button>
        </div>

        {/* Action Button */}
        {selectedFile && !result && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleConvertFile}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl liquid-glass-accent text-xs font-bold shadow-md disabled:opacity-50 transition active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.convertingStatus}
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  {t.convertFileBtn}
                </>
              )}
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl liquid-glass border border-black/10 dark:border-white/10 text-slate-900 dark:text-white text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Conversion Result Card */}
      {result && (
        <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl liquid-glass-accent flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.conversionSuccess}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {result.originalFileName}
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {result.type === 'pptx' && result.slideCount !== undefined && (
                <span className="font-semibold text-slate-900 dark:text-white">
                  {result.slideCount} {t.slideCountLabel}
                </span>
              )}
              {result.type === 'docx' && result.wordCount !== undefined && (
                <span className="font-semibold text-slate-900 dark:text-white">
                  {result.wordCount.toLocaleString()} {t.statsWords}
                </span>
              )}
            </div>
          </div>

          {/* Download Actions */}
          <div className="p-4 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Download Options:
            </h4>

            <div className="flex items-center gap-3 flex-wrap">
              {result.type === 'pptx' && (
                <>
                  {/* PPT to PDF Button */}
                  {result.pdfBlob && (
                    <button
                      type="button"
                      onClick={() => downloadBlob(result.pdfBlob!, `${result.originalFileName.replace(/\.(pptx|ppt)$/i, '')}_Converted.pdf`)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl liquid-glass-accent text-xs font-bold shadow-md transition active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      {t.downloadConvertedPdf}
                    </button>
                  )}

                  {/* Converted PPTX Button */}
                  {result.pptxBlob && (
                    <button
                      type="button"
                      onClick={() => downloadBlob(result.pptxBlob!, `${result.originalFileName.replace(/\.(pptx|ppt)$/i, '')}_Unicode.pptx`)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl liquid-glass-btn text-slate-900 dark:text-white text-xs font-bold shadow-sm transition active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      {t.downloadConvertedPptx}
                    </button>
                  )}
                </>
              )}

              {result.type === 'docx' && result.docxBlob && (
                <button
                  type="button"
                  onClick={() => downloadBlob(result.docxBlob!, `${result.originalFileName.replace(/\.docx$/i, '')}_Unicode.docx`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl liquid-glass-accent text-xs font-bold shadow-md transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  {t.downloadConvertedDocx}
                </button>
              )}

              {result.type === 'txt' && result.txtBlob && (
                <button
                  type="button"
                  onClick={() => downloadBlob(result.txtBlob!, `${result.originalFileName.replace(/\.txt$/i, '')}_Unicode.txt`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl liquid-glass-accent text-xs font-bold shadow-md transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  {t.downloadConvertedTxt}
                </button>
              )}
            </div>
          </div>

          {/* Slide Text Previews for PPTX */}
          {result.type === 'pptx' && result.slides && result.slides.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Slide Previews ({result.slides.length} slides):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {result.slides.map((s) => (
                  <div
                    key={s.slideNumber}
                    className="p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 text-xs space-y-1"
                  >
                    <span className="font-bold text-[11px] text-slate-900 dark:text-white">
                      Slide {s.slideNumber}
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-3 font-sans">
                      {s.rawText || '(Empty slide / graphics)'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
