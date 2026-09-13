import React, { useState, useMemo } from 'react';
import { kannadaAsciiToUnicode, kannadaUnicodeToAscii } from '../lib/kannadaConverter';
import { CopyButton } from './CopyButton';
import { Languages, ArrowRightLeft, Sparkles, Trash2, CheckSquare, Square } from 'lucide-react';

export const KannadaTab: React.FC = () => {
  const [direction, setDirection] = useState<'ascii-to-unicode' | 'unicode-to-ascii'>('ascii-to-unicode');
  const [inputText, setInputText] = useState('PÀ£ÀßqÀ £ÁqÀÄ - £ÀªÀÄ¸ÁÌgÀ!');
  const [removeSpaces, setRemoveSpaces] = useState(false);

  const samples = [
    { label: 'ಕನ್ನಡ ನಾಡು', ascii: 'PÀ£ÀßqÀ £ÁqÀÄ', unicode: 'ಕನ್ನಡ ನಾಡು' },
    { label: 'ನಮಸ್ಕಾರ', ascii: '£ÀªÀÄ¸ÁÌgÀ', unicode: 'ನಮಸ್ಕಾರ' },
    { label: 'ಬೆಂಗಳೂರು', ascii: '¨ÉAUÀ¼ÀÆgÀÄ', unicode: 'ಬೆಂಗಳೂರು' },
    { label: 'ಕರ್ನಾಟಕ', ascii: 'PÀ£ÁðlPÀ', unicode: 'ಕರ್ನಾಟಕ' },
    { label: 'ಸ್ವಾಗತ', ascii: '¸ÁéUÀvÀ', unicode: 'ಸ್ವಾಗತ' },
  ];

  const outputText = useMemo(() => {
    if (direction === 'ascii-to-unicode') {
      return kannadaAsciiToUnicode(inputText, { removeExtraSpaces: removeSpaces });
    } else {
      return kannadaUnicodeToAscii(inputText, { removeExtraSpaces: removeSpaces });
    }
  }, [inputText, direction, removeSpaces]);

  const handleReset = () => {
    setInputText('');
  };

  return (
    <div className="space-y-6">
      {/* Title / Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 rounded-3xl liquid-glass-card liquid-specular shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl liquid-glass-accent flex items-center justify-center font-bold text-xl shadow-sm">
            ಕ
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Kannada ASCII ⇄ Unicode Converter
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lookup-based conversion between legacy Nudi / Baraha / KP-Rao ASCII fonts and standard Kannada Unicode
            </p>
          </div>
        </div>
      </div>

      {/* Direction & Option Toggles */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Radio direction */}
        <div className="flex items-center gap-2 flex-wrap">
          <label
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition select-none ${
              direction === 'ascii-to-unicode'
                ? 'liquid-glass-accent font-bold shadow-sm'
                : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
            }`}
          >
            <input
              type="radio"
              name="kannada-dir"
              value="ascii-to-unicode"
              checked={direction === 'ascii-to-unicode'}
              onChange={() => setDirection('ascii-to-unicode')}
              className="hidden"
            />
            <span>ASCII (Nudi/Baraha) ➔ Unicode</span>
          </label>

          <label
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition select-none ${
              direction === 'unicode-to-ascii'
                ? 'liquid-glass-accent font-bold shadow-sm'
                : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
            }`}
          >
            <input
              type="radio"
              name="kannada-dir"
              value="unicode-to-ascii"
              checked={direction === 'unicode-to-ascii'}
              onChange={() => setDirection('unicode-to-ascii')}
              className="hidden"
            />
            <span>Unicode ➔ ASCII (Nudi/Baraha)</span>
          </label>
        </div>

        {/* Remove extra spaces checkbox */}
        <button
          type="button"
          onClick={() => setRemoveSpaces(!removeSpaces)}
          className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${
            removeSpaces
              ? 'liquid-glass-accent font-semibold'
              : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
          }`}
        >
          {removeSpaces ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
          Remove extra spaces
        </button>
      </div>

      {/* Quick Samples */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <span className="text-slate-500 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> Quick Samples:
        </span>
        {samples.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setInputText(direction === 'ascii-to-unicode' ? s.ascii : s.unicode)}
            className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 transition"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Text Area Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Card */}
        <div className="rounded-3xl liquid-glass-card liquid-specular p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {direction === 'ascii-to-unicode' ? 'Input: ASCII (Nudi) Text' : 'Input: Kannada Unicode Text'}
            </span>
            <span className="text-xs text-slate-400">{inputText.length} chars</span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={direction === 'ascii-to-unicode' ? 'Paste Nudi/Baraha ASCII text...' : 'Type or paste Kannada Unicode text...'}
            rows={8}
            className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-slate-900 dark:text-slate-100 text-sm font-sans outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition resize-y"
          />
        </div>

        {/* Output Card */}
        <div className="rounded-3xl liquid-glass-card liquid-specular p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {direction === 'ascii-to-unicode' ? 'Output: Kannada Unicode Text' : 'Output: ASCII (Nudi) Text'}
            </span>
            <span className="text-xs text-slate-400">{outputText.length} chars</span>
          </div>

          <textarea
            value={outputText}
            readOnly
            placeholder="Converted text will appear live here..."
            rows={8}
            className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input text-slate-900 dark:text-slate-100 text-sm font-sans outline-none select-all transition resize-y"
          />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={!inputText}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl liquid-glass-btn text-slate-800 dark:text-slate-200 disabled:opacity-40 transition active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reset
        </button>

        <CopyButton text={outputText} label="Copy Output" />
      </div>
    </div>
  );
};
