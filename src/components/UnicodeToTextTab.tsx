import React, { useState, useMemo } from 'react';
import { unicodeToText, analyzeTextTokens, computeTextMetrics } from '../lib/unicode';
import { CopyButton } from './CopyButton';
import { MetricsBar } from './MetricsBar';
import { TokenInspector } from './TokenInspector';
import { AlertCircle, AlertTriangle, Clipboard, Trash2, Sparkles, Binary, CheckCircle2 } from 'lucide-react';

export const UnicodeToTextTab: React.FC = () => {
  const [inputCodes, setInputCodes] = useState('U+0048 U+0065 U+006C U+006C U+006F U+0020 U+1F680 U+2728');

  const presets = [
    { label: 'U+ Hex Space', text: 'U+0048 U+0065 U+006C U+006C U+006F U+0020 U+1F680' },
    { label: '\\u Escapes', text: '\\u0052\\u0065\\u0061\\u0063\\u0074\\u0020\\u{1F525}' },
    { label: '0x Comma Hex', text: '0x43, 0x6F, 0x64, 0x65, 0x21' },
    { label: 'HTML Entities', text: '&#72;&#101;&#108;&#108;&#111;&#32;&#128512;' },
    { label: 'Raw Hex List', text: '48 65 6C 6C 6F 20 57 6F 72 6C 64' },
  ];

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) setInputCodes(clipText);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const parsed = useMemo(() => unicodeToText(inputCodes), [inputCodes]);
  const metrics = useMemo(() => computeTextMetrics(parsed.text), [parsed.text]);
  const tokens = useMemo(() => analyzeTextTokens(parsed.text), [parsed.text]);

  return (
    <div className="space-y-6">
      {/* Input Box */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 dark:bg-white"></span>
            Paste Unicode Code Points or Escaped Sequences
          </label>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg liquid-glass-btn text-slate-600 dark:text-slate-300 transition"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste
            </button>
            <button
              type="button"
              onClick={() => setInputCodes('')}
              disabled={!inputCodes}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-black dark:hover:text-white liquid-glass-btn disabled:opacity-40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={inputCodes}
          onChange={(e) => setInputCodes(e.target.value)}
          placeholder="Paste U+0041, \u0041, \u{1F600}, 0x41, &#65;, &#x41;, or space/comma separated hex..."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition resize-y min-h-[90px]"
        />

        {/* Presets */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-900 dark:text-white" /> Presets:
          </span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setInputCodes(preset.text)}
              className="text-xs px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 transition active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warnings & Errors */}
      {parsed.error && (
        <div className="rounded-2xl liquid-glass border border-black/10 dark:border-white/10 p-3.5 text-xs text-slate-900 dark:text-white flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-slate-900 dark:text-white mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Conversion Error</div>
            <div>{parsed.error}</div>
          </div>
        </div>
      )}

      {parsed.warnings.length > 0 && (
        <div className="rounded-2xl liquid-glass border border-black/10 dark:border-white/10 p-3.5 text-xs text-slate-900 dark:text-white space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-slate-900 dark:text-white" />
            {parsed.warnings.length} Parsing Warning{parsed.warnings.length > 1 ? 's' : ''}:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
            {parsed.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Decoded Text Output */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-900 dark:text-white" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Decoded Readable Text
            </h3>
          </div>
          <CopyButton text={parsed.text} label="Copy Text" />
        </div>

        <div className="p-4 rounded-xl liquid-glass text-slate-900 dark:text-slate-100 font-sans text-base sm:text-lg break-words select-all min-h-[70px] border border-black/10 dark:border-white/10 shadow-inner">
          {parsed.text || <span className="text-slate-400 italic">Enter code points above to see decoded text</span>}
        </div>

        {parsed.text && <MetricsBar metrics={metrics} />}
      </div>

      {/* Interactive Token breakdown if text exists */}
      {parsed.text && <TokenInspector tokens={tokens} />}
    </div>
  );
};
