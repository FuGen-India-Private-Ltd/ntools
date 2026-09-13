import React, { useState, useMemo } from 'react';
import { inspectCharacter, getCodePoints } from '../lib/unicode';
import { UNICODE_BLOCKS, GENERAL_CATEGORIES } from '../lib/unicodeData';
import { CopyButton } from './CopyButton';
import { Search, Sparkles, Hash, Layers, ShieldCheck, Binary, Info } from 'lucide-react';

export const CharacterInspectorTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('🚀');
  const [selectedBlock, setSelectedBlock] = useState<string>('All');

  // Parse search input into a character
  const targetChar = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return 'A';

    // If hex code point like U+1F600, 0x1F600, 1F600
    if (trimmed.toUpperCase().startsWith('U+') || trimmed.startsWith('0x') || /^[0-9A-Fa-f]{3,6}$/.test(trimmed)) {
      const hexStr = trimmed.replace(/^(U\+|0x)/i, '');
      const cp = parseInt(hexStr, 16);
      if (!isNaN(cp) && cp >= 0 && cp <= 0x10FFFF) {
        try {
          return String.fromCodePoint(cp);
        } catch {
          return 'A';
        }
      }
    }

    // Direct character or first grapheme
    return Array.from(trimmed)[0] || 'A';
  }, [searchTerm]);

  const info = useMemo(() => inspectCharacter(targetChar), [targetChar]);

  const quickSamples = ['A', '€', 'ñ', '🚀', '✨', '∑', '日', '𝄞', '', '¶'];

  return (
    <div className="space-y-6">
      {/* Lookup Card */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-900 dark:text-white" />
            Inspect Any Character or Code Point
          </label>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 mr-1">Quick Select:</span>
            {quickSamples.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSearchTerm(s)}
                className="w-7 h-7 rounded-lg liquid-glass-btn text-slate-800 dark:text-slate-200 font-mono text-sm flex items-center justify-center transition active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type any single character, emoji, or hex code point (e.g. U+1F680, 0x0041, €)..."
            className="w-full pl-4 pr-12 py-3 rounded-2xl liquid-glass-input text-slate-900 dark:text-slate-100 font-mono text-base outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl">
            {targetChar}
          </div>
        </div>
      </div>

      {/* Main Inspection Display */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-6">
        {/* Top Hero Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl liquid-glass bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-4xl sm:text-5xl font-mono shadow-inner">
              {info.char === ' ' ? '␣' : info.char}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {info.hex}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20">
                  Dec: {info.dec}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {info.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Block: <strong className="text-slate-700 dark:text-slate-300">{info.block}</strong></span>
                <span>•</span>
                <span>Category: <strong className="text-slate-700 dark:text-slate-300">{info.categoryDesc} ({info.category})</strong></span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2">
            <CopyButton text={info.hex} label="Copy U+ Code" />
            <CopyButton text={info.char} label="Copy Character" />
          </div>
        </div>

        {/* Technical Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* UTF-8 Bytes */}
          <div className="p-4 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-emerald-500" /> UTF-8 Byte Sequence
              </span>
              <CopyButton text={info.utf8BytesHex.join(' ')} iconOnly />
            </div>
            <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
              {info.utf8BytesHex.join(' ')}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Binary: {info.utf8BytesBin.join(' ')}
            </div>
            <div className="text-[11px] text-slate-400">
              Length: {info.utf8BytesHex.length} byte{info.utf8BytesHex.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* UTF-16 Code Units */}
          <div className="p-4 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> UTF-16 Representation
              </span>
              <CopyButton text={info.utf16UnitsHex.map(u => `\\u${u}`).join('')} iconOnly />
            </div>
            <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
              {info.utf16UnitsHex.map(u => `\\u${u}`).join(' ')}
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              {info.isSurrogatePair ? (
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Surrogate Pair: High ({info.highSurrogate}) + Low ({info.lowSurrogate})
                </span>
              ) : (
                'Single BMP Code Unit (≤ U+FFFF)'
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Units: {info.utf16UnitsHex.length}
            </div>
          </div>

          {/* Web & HTML Entities */}
          <div className="p-4 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-500" /> HTML & URL Encodings
              </span>
              <CopyButton text={info.htmlEntityHex} iconOnly />
            </div>
            <div className="font-mono text-xs space-y-1 text-slate-800 dark:text-slate-200">
              <div>HTML Hex: <span className="font-semibold text-slate-900 dark:text-white">{info.htmlEntityHex}</span></div>
              <div>HTML Dec: <span className="font-semibold text-slate-900 dark:text-white">{info.htmlEntityDec}</span></div>
              <div>URL Percent: <span className="font-semibold text-slate-900 dark:text-white">{info.urlEncoded}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
