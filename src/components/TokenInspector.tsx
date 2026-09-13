import React, { useState } from 'react';
import { GraphemeToken, inspectCharacter } from '../lib/unicode';
import { CharacterInfo } from '../lib/unicodeData';
import { CopyButton } from './CopyButton';
import { X, Search, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TokenInspectorProps {
  tokens: GraphemeToken[];
}

export const TokenInspector: React.FC<TokenInspectorProps> = ({ tokens }) => {
  const [selectedChar, setSelectedChar] = useState<string | null>(tokens[0]?.grapheme || null);

  if (tokens.length === 0) return null;

  const currentInfo: CharacterInfo | null = selectedChar ? inspectCharacter(selectedChar) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
          Interactive Character Inspector
          <span className="text-[10px] font-normal normal-case text-slate-500">
            (Tap any character to inspect details)
          </span>
        </h3>
        <span className="text-xs text-slate-500">{tokens.length} tokens</span>
      </div>

      {/* Interactive Token Ribbon */}
      <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 max-h-48 overflow-y-auto">
        {tokens.map((token, idx) => {
          const isSelected = selectedChar === token.grapheme;
          return (
            <button
              key={`${token.grapheme}-${idx}`}
              type="button"
              onClick={() => setSelectedChar(token.grapheme)}
              className={`group flex flex-col items-center justify-center min-w-[2.75rem] h-14 px-2 py-1 rounded-xl border transition-all active:scale-95 ${
                isSelected
                  ? 'liquid-glass-accent font-bold shadow-md ring-2 ring-black/20 dark:ring-white/20'
                  : 'liquid-glass-btn text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="text-base leading-none font-mono">
                {token.grapheme === ' ' ? '␣' : token.grapheme === '\n' ? '↵' : token.grapheme}
              </span>
              <span className="text-[9px] font-mono mt-1 opacity-70">
                {token.codePointsFormatted[0] || 'U+????'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detailed Inspector Modal / Card */}
      {currentInfo && (
        <div className="rounded-3xl liquid-glass-card liquid-specular p-5 shadow-lg border border-black/10 dark:border-white/15 relative animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 text-3xl font-mono">
                {currentInfo.char === ' ' ? '␣' : currentInfo.char === '\n' ? '↵' : currentInfo.char}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
                  {currentInfo.hex}
                  <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    Dec: {currentInfo.dec}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {currentInfo.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CopyButton text={currentInfo.hex} label="Copy U+" />
              <CopyButton text={currentInfo.char} label="Copy Char" />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 text-xs">
            {/* Block & Category */}
            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Unicode Block</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentInfo.block}</span>
            </div>

            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">General Category</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentInfo.category} — {currentInfo.categoryDesc}
              </span>
            </div>

            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Encoding Standard</span>
              <div className="flex items-center gap-1.5 font-medium">
                {currentInfo.isAscii ? (
                  <span className="inline-flex items-center gap-1 text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Basic ASCII (0–127)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-900 dark:text-white">
                    <ShieldAlert className="w-3.5 h-3.5" /> Non-ASCII Unicode
                  </span>
                )}
              </div>
            </div>

            {/* UTF-8 Bytes */}
            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">UTF-8 Bytes ({currentInfo.utf8BytesHex.length} byte{currentInfo.utf8BytesHex.length > 1 ? 's' : ''})</span>
                <CopyButton text={currentInfo.utf8BytesHex.join(' ')} iconOnly className="h-5 px-1.5 py-0" />
              </div>
              <div className="font-mono text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentInfo.utf8BytesHex.join(' ')}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-[11px] text-slate-500">
                  Bin: {currentInfo.utf8BytesBin.join(' ')}
                </span>
              </div>
            </div>

            {/* UTF-16 Code Units */}
            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">UTF-16 Code Units</span>
              <div className="font-mono text-slate-800 dark:text-slate-200">
                {currentInfo.isSurrogatePair ? (
                  <span className="text-slate-900 dark:text-white font-semibold">
                    {currentInfo.highSurrogate} {currentInfo.lowSurrogate} (Surrogate Pair)
                  </span>
                ) : (
                  <span>\u{currentInfo.utf16UnitsHex[0]}</span>
                )}
              </div>
            </div>

            {/* HTML Entities & URL */}
            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">HTML Entity</span>
              <div className="font-mono text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>{currentInfo.htmlEntityHex} / {currentInfo.htmlEntityDec}</span>
                <CopyButton text={currentInfo.htmlEntityHex} iconOnly className="h-5 px-1.5 py-0" />
              </div>
            </div>

            <div className="space-y-1 p-3 rounded-2xl liquid-glass border border-black/10 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">URL Percent-Encoding</span>
              <div className="font-mono text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>{currentInfo.urlEncoded}</span>
                <CopyButton text={currentInfo.urlEncoded} iconOnly className="h-5 px-1.5 py-0" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
