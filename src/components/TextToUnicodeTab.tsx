import React, { useState, useMemo } from 'react';
import {
  textToUnicode,
  textToEncodings,
  analyzeTextTokens,
  computeTextMetrics,
  PrefixType,
  NumberBase,
  DelimiterType,
} from '../lib/unicode';
import { MetricsBar } from './MetricsBar';
import { CopyButton } from './CopyButton';
import { TokenInspector } from './TokenInspector';
import { Trash2, Clipboard, Sparkles, Sliders, Code2, Binary, Cpu } from 'lucide-react';

export const TextToUnicodeTab: React.FC = () => {
  const [inputText, setInputText] = useState('Hello World 🚀 ✨');
  const [prefix, setPrefix] = useState<PrefixType>('U+');
  const [base, setBase] = useState<NumberBase>('hex');
  const [delimiter, setDelimiter] = useState<DelimiterType>('space');
  const [uppercase, setUppercase] = useState(true);
  const [padHex, setPadHex] = useState(true);

  // Quick preset samples
  const samples = [
    { label: '👋 Standard', text: 'Hello World!' },
    { label: '🚀 Astral Emoji', text: '🚀 ✨ 🦄 🍕 🔥 🌈' },
    { label: '👨‍👩‍👦 ZWJ Complex', text: '👨‍👩‍👧‍👦 👩🏽‍💻 🏳️‍🌈' },
    { label: '☕ Diacritics', text: 'Café, façade, niño & naïve' },
    { label: '📐 Math & Greek', text: '∀x ∈ ℝ : ∑_{i=1}^n i = ½n(n+1)' },
    { label: 'CJK 漢字', text: '日本語・中文・한국어' },
  ];

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) setInputText(clipText);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const metrics = useMemo(() => computeTextMetrics(inputText), [inputText]);
  const tokens = useMemo(() => analyzeTextTokens(inputText), [inputText]);
  const formattedUnicode = useMemo(
    () => textToUnicode(inputText, { prefix, base, delimiter, uppercase, padHex }),
    [inputText, prefix, base, delimiter, uppercase, padHex]
  );
  const encodings = useMemo(() => textToEncodings(inputText), [inputText]);

  return (
    <div className="space-y-6">
      {/* Input Panel */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 dark:bg-white"></span>
            Input Text
          </label>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg liquid-glass-btn text-slate-600 dark:text-slate-300 transition"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste
            </button>
            <button
              type="button"
              onClick={() => setInputText('')}
              disabled={!inputText}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-black dark:hover:text-white liquid-glass-btn disabled:opacity-40 transition"
              title="Clear input"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste any text, emoji, symbols, or multilingual characters..."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-slate-900 dark:text-slate-100 text-sm font-sans outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition resize-y min-h-[90px]"
        />

        {/* Live Metrics Bar */}
        <MetricsBar metrics={metrics} />

        {/* Sample Presets */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-900 dark:text-white" /> Presets:
          </span>
          {samples.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => setInputText(sample.text)}
              className="text-xs px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 transition active:scale-95"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formatting Controls Bar */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
          Format Toggles & Options
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          {/* Prefix */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Prefix Format</label>
            <select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value as PrefixType)}
              className="w-full px-2.5 py-1.5 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 font-mono text-xs outline-none"
            >
              <option value="U+">U+ (Standard: U+0041)</option>
              <option value="\u">{`\\u (JS/Java: \\u0041)`}</option>
              <option value="\u{}">{`\\u{} (ES6: \\u{1F600})`}</option>
              <option value="0x">0x (C/C++: 0x0041)</option>
              <option value="&#x;">&#x; (HTML Hex: &#x41;)</option>
              <option value="none">None (Raw Hex: 0041)</option>
            </select>
          </div>

          {/* Number Base */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Number Base</label>
            <select
              value={base}
              onChange={(e) => setBase(e.target.value as NumberBase)}
              className="w-full px-2.5 py-1.5 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 text-xs outline-none"
            >
              <option value="hex">Hexadecimal (16)</option>
              <option value="dec">Decimal (10)</option>
              <option value="bin">Binary (2)</option>
            </select>
          </div>

          {/* Delimiter */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Delimiter / Separator</label>
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as DelimiterType)}
              className="w-full px-2.5 py-1.5 rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 text-xs outline-none"
            >
              <option value="space">Space (" ")</option>
              <option value="comma">Comma (",")</option>
              <option value="comma-space">Comma Space (", ")</option>
              <option value="newline">Newline (\n)</option>
              <option value="semicolon">Semicolon ("; ")</option>
              <option value="none">None (Concatenated)</option>
            </select>
          </div>

          {/* Letter Case */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Letter Case</label>
            <button
              type="button"
              onClick={() => setUppercase(!uppercase)}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium transition ${
                uppercase
                  ? 'liquid-glass-accent shadow-sm'
                  : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
              }`}
            >
              {uppercase ? 'UPPERCASE (A-F)' : 'lowercase (a-f)'}
            </button>
          </div>

          {/* Hex Padding */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Hex Zero Padding</label>
            <button
              type="button"
              onClick={() => setPadHex(!padHex)}
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium transition ${
                padHex
                  ? 'liquid-glass-accent shadow-sm'
                  : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
              }`}
            >
              {padHex ? '4+ Digits (U+0041)' : 'Compact (U+41)'}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Output Display */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-900 dark:text-white" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Unicode Code Points
            </h3>
          </div>
          <CopyButton text={formattedUnicode} label="Copy Output" />
        </div>

        <div className="p-4 rounded-xl liquid-glass text-slate-900 dark:text-white font-mono text-sm sm:text-base break-all select-all overflow-x-auto min-h-[70px] border border-black/10 dark:border-white/10 shadow-inner">
          {formattedUnicode || <span className="text-slate-500 italic">No output</span>}
        </div>
      </div>

      {/* Multi-byte Encoding Representations (UTF-8, UTF-16, UTF-32) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* UTF-8 */}
        <div className="rounded-2xl liquid-glass-card liquid-specular p-4 space-y-2 border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> UTF-8 Bytes
            </span>
            <CopyButton text={encodings.utf8.hex} iconOnly />
          </div>
          <div className="p-3 rounded-xl liquid-glass font-mono text-xs text-slate-900 dark:text-white break-all min-h-[50px] border border-black/10 dark:border-white/10">
            {encodings.utf8.hex || <span className="text-slate-500 italic">Empty</span>}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Total bytes: <span className="font-semibold text-slate-900 dark:text-white">{encodings.utf8.bytes.length}</span>
          </div>
        </div>

        {/* UTF-16 */}
        <div className="rounded-2xl liquid-glass-card liquid-specular p-4 space-y-2 border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> UTF-16 Code Units
            </span>
            <CopyButton text={encodings.utf16.hex} iconOnly />
          </div>
          <div className="p-3 rounded-xl liquid-glass font-mono text-xs text-slate-900 dark:text-white break-all min-h-[50px] border border-black/10 dark:border-white/10">
            {encodings.utf16.hex || <span className="text-slate-500 italic">Empty</span>}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Surrogate pairs: <span className="font-semibold text-slate-900 dark:text-white">{encodings.utf16.hasSurrogates ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {/* UTF-32 */}
        <div className="rounded-2xl liquid-glass-card liquid-specular p-4 space-y-2 border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> UTF-32 (Scalar)
            </span>
            <CopyButton text={encodings.utf32.hex} iconOnly />
          </div>
          <div className="p-3 rounded-xl liquid-glass font-mono text-xs text-slate-900 dark:text-white break-all min-h-[50px] border border-black/10 dark:border-white/10">
            {encodings.utf32.hex || <span className="text-slate-500 italic">Empty</span>}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Scalar count: <span className="font-semibold text-slate-900 dark:text-white">{encodings.utf32.codePoints.length}</span>
          </div>
        </div>
      </div>

      {/* Interactive Token Inspector */}
      <TokenInspector tokens={tokens} />
    </div>
  );
};
