import React, { useState, useMemo } from 'react';
import {
  convertKannadaText,
  DetectedFontType,
} from '../lib/kannadaConverter';
import { TranslationSchema } from '../lib/i18n';
import {
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  Clipboard,
  Check,
  Download,
  FileCode,
  ArrowRightLeft,
} from 'lucide-react';
import { downloadBlob } from '../lib/docxProcessor';

interface DualPaneConverterProps {
  t: TranslationSchema;
}

export const DualPaneConverter = React.memo(function DualPaneConverter({ t }: DualPaneConverterProps) {
  const [inputText, setInputText] = useState('');
  const [removeSpaces, setRemoveSpaces] = useState(false);
  const [copied, setCopied] = useState(false);

  // Conversion result with latency timing
  const { outputText, effectiveMode, detectedType, latencyMs } = useMemo(() => {
    const startTime = performance.now();
    const result = convertKannadaText(inputText, 'auto', {
      removeExtraSpaces: removeSpaces,
    });
    const endTime = performance.now();
    return {
      ...result,
      latencyMs: Math.max(1, Math.round(endTime - startTime)),
    };
  }, [inputText, removeSpaces]);

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) setInputText(clipText);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const handleReset = () => {
    setInputText('');
  };

  const handleDownloadTxt = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, 'Kannada_Converted.txt');
  };

  const getDirectionBadge = () => {
    if (!inputText.trim()) {
      return 'Auto-Detect Ready (ASCII ↔ Unicode)';
    }
    if (detectedType === 'unicode') {
      return 'Unicode (ಕನ್ನಡ) → Nudi / Baraha ASCII';
    }
    if (detectedType === 'shree-lipi') {
      return 'Shree-Lipi (ASCII) → Unicode Kannada';
    }
    return 'Nudi / Baraha (ASCII) → Unicode Kannada';
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-2.5 pb-2 select-none">
      {/* Top Status & Options Bar */}
      <div className="rounded-2xl liquid-glass liquid-specular px-4 py-2 shadow-sm flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg liquid-glass-accent flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                Sanka
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold truncate">
                • {getDirectionBadge()}
              </span>
            </div>
          </div>
          {inputText.trim() && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-black/10 dark:border-white/10">
              {latencyMs}ms
            </span>
          )}
        </div>

        {/* Clean Spaces Option Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRemoveSpaces(!removeSpaces)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl liquid-glass-btn text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition"
          >
            {removeSpaces ? (
              <CheckSquare className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Clean Spaces</span>
          </button>
        </div>
      </div>

      {/* Dual Pane Layout with Clearly Defined Bordered Containers & Smooth Focus Transitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* 1. Visible Source Input Container */}
        <div className="rounded-2xl sm:rounded-3xl liquid-glass-card liquid-specular border-2 border-white/60 dark:border-white/10 focus-within:border-black/50 dark:focus-within:border-white/50 transition-all duration-300 p-3 sm:p-4 shadow-sm flex flex-col h-44 sm:h-64">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/60 shrink-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              Source Text (Type or Paste)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePaste}
                className="px-2.5 py-1 rounded-xl liquid-glass-btn text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all duration-150 flex items-center gap-1 active:scale-95"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                <span>Paste</span>
              </button>
              {inputText && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  title="Clear text"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste Nudi / Baraha / Shree-Lipi ASCII or Unicode Kannada text here... (Auto-detection starts automatically)"
            className="flex-1 w-full bg-transparent resize-none outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-sans p-1.5 overflow-y-auto leading-relaxed"
          />

          {/* Footer stats */}
          <div className="text-[10px] font-medium text-slate-400 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60 shrink-0 flex justify-between items-center">
            <span className="text-slate-800 dark:text-slate-200 font-bold">Input Box</span>
            <span>{inputText.length} chars • {inputText.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>

        {/* 2. Visible Converted Result Container */}
        <div className="rounded-2xl sm:rounded-3xl liquid-glass-card liquid-specular border-2 border-white/60 dark:border-white/10 p-3 sm:p-4 shadow-sm flex flex-col h-44 sm:h-64 transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/60 shrink-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              Converted Result
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputText}
                className="px-3 py-1 rounded-xl liquid-glass-accent disabled:opacity-40 text-[11px] font-bold shadow-md transition-all duration-150 flex items-center gap-1 active:scale-95"
              >
                {copied ? <Check className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!outputText}
                className="p-1 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
                title="Download .txt"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={outputText}
            readOnly
            placeholder="Converted text will instantly appear here with full Kannada Unicode formatting..."
            className="flex-1 w-full bg-transparent resize-none outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-sans p-2 overflow-y-auto leading-relaxed"
          />

          {/* Footer stats */}
          <div className="text-[10.5px] font-medium text-slate-400 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 shrink-0 flex justify-between items-center">
            <span className="text-slate-800 dark:text-slate-200 font-bold">Live Output</span>
            <span>{outputText.length} chars • {outputText.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>
      </div>
    </div>
  );
});
