import React, { useState, useMemo } from 'react';
import {
  textToAscii,
  asciiToText,
  getAsciiTable,
  AsciiFormat,
  NonAsciiMode,
  transliterateToAscii,
} from '../lib/ascii';
import { CopyButton } from './CopyButton';
import {
  Binary,
  AlertTriangle,
  Wand2,
  Trash2,
  Clipboard,
  Search,
  BookOpen,
  ArrowRightLeft,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';

export const AsciiStudioTab: React.FC = () => {
  const [direction, setDirection] = useState<'text-to-ascii' | 'ascii-to-text'>('text-to-ascii');
  const [textInput, setTextInput] = useState('Hello World! Café €100 — 🚀');
  const [asciiInput, setAsciiInput] = useState('72 101 108 108 111 32 87 111 114 108 100 33');

  const [format, setFormat] = useState<AsciiFormat>('dec');
  const [delimiter, setDelimiter] = useState<'space' | 'comma' | 'comma-space' | 'newline' | 'none'>('space');
  const [nonAsciiMode, setNonAsciiMode] = useState<NonAsciiMode>('highlight');
  const [tableSearch, setTableSearch] = useState('');
  const [showTable, setShowTable] = useState(false);

  const asciiResult = useMemo(
    () => textToAscii(textInput, { format, delimiter, nonAsciiMode }),
    [textInput, format, delimiter, nonAsciiMode]
  );

  const decodedResult = useMemo(
    () => asciiToText(asciiInput, format),
    [asciiInput, format]
  );

  const asciiTable = useMemo(() => getAsciiTable(), []);
  const filteredTable = useMemo(() => {
    if (!tableSearch.trim()) return asciiTable;
    const q = tableSearch.toLowerCase();
    return asciiTable.filter(
      (entry) =>
        entry.dec.toString().includes(q) ||
        entry.hex.toLowerCase().includes(q) ||
        entry.char.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q)
    );
  }, [asciiTable, tableSearch]);

  const handleApplyTransliteration = () => {
    setTextInput(transliterateToAscii(textInput));
  };

  return (
    <div className="space-y-6">
      {/* Direction & Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl liquid-glass-card liquid-specular shadow-sm">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setDirection('text-to-ascii')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
              direction === 'text-to-ascii'
                ? 'liquid-glass-accent shadow-sm'
                : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            Text ➔ ASCII Values
          </button>
          <button
            type="button"
            onClick={() => setDirection('ascii-to-text')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition ${
              direction === 'ascii-to-text'
                ? 'liquid-glass-accent shadow-sm'
                : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            ASCII Numbers ➔ Text
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium liquid-glass-btn text-slate-700 dark:text-slate-300 transition"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
          {showTable ? 'Hide ASCII Table (0–127)' : 'View ASCII Table (0–127)'}
        </button>
      </div>

      {direction === 'text-to-ascii' ? (
        <>
          {/* Text to ASCII Panel */}
          <div className="rounded-2xl liquid-glass-card liquid-specular p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950 dark:bg-white"></span>
                Input Plain / Unicode Text
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTextInput('')}
                  disabled={!textInput}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-black dark:hover:text-white liquid-glass-btn disabled:opacity-40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type any text to convert to ASCII codes..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-input text-slate-900 dark:text-slate-100 text-sm font-sans outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition resize-y min-h-[80px]"
            />

            {/* Non-ASCII Character Warning Banner */}
            {asciiResult.hasNonAscii && (
              <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {asciiResult.nonAsciiItems.length} Non-ASCII Character{asciiResult.nonAsciiItems.length > 1 ? 's' : ''} Detected
                      </h4>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                        Standard ASCII is strictly 7-bit (values 0–127). Characters outside 0–127 cannot be represented in pure ASCII without loss or substitution.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyTransliteration}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg liquid-glass-accent font-medium text-xs shadow-sm transition active:scale-95 shrink-0"
                    title="Convert accented characters to closest ASCII match"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Transliterate All
                  </button>
                </div>

                {/* Badges of detected non-ASCII tokens */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {asciiResult.nonAsciiItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-100 text-xs font-mono border border-amber-500/30"
                    >
                      <span className="font-bold">{item.char}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">({item.hex})</span>
                      {item.transliteration && (
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-200">➔ {item.transliteration}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Options & Non-ASCII Mode Bar */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Output Format */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">ASCII Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as AsciiFormat)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono"
                >
                  <option value="dec">Decimal (65 66 67)</option>
                  <option value="hex">Hexadecimal (41 42 43)</option>
                  <option value="bin">Binary (01000001 01000010)</option>
                  <option value="oct">Octal (101 102 103)</option>
                </select>
              </div>

              {/* Delimiter */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Separator / Delimiter</label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs"
                >
                  <option value="space">Space (" ")</option>
                  <option value="comma">Comma (",")</option>
                  <option value="comma-space">Comma + Space (", ")</option>
                  <option value="newline">Newline (\n)</option>
                  <option value="none">None (Continuous)</option>
                </select>
              </div>

              {/* Non-ASCII Policy */}
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Non-ASCII Policy</label>
                <select
                  value={nonAsciiMode}
                  onChange={(e) => setNonAsciiMode(e.target.value as NonAsciiMode)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs"
                >
                  <option value="highlight">Highlight & Keep Values</option>
                  <option value="transliterate">Auto-Transliterate (é ➔ e)</option>
                  <option value="replace">Replace with Question Mark (?)</option>
                  <option value="escape">Escape as \xHH / \uHHHH</option>
                </select>
              </div>
            </div>
          </div>

          {/* ASCII Output Box */}
          <div className="rounded-2xl liquid-glass-card liquid-specular p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Binary className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  ASCII Output ({format.toUpperCase()})
                </h3>
              </div>
              <CopyButton text={asciiResult.output} label="Copy ASCII" />
            </div>

            <div className="p-4 rounded-xl liquid-glass text-slate-900 dark:text-white font-mono text-sm sm:text-base break-all select-all min-h-[70px] border border-black/10 dark:border-white/10 shadow-inner">
              {asciiResult.output || <span className="text-slate-400 italic">No output</span>}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ASCII to Text Panel */}
          <div className="rounded-2xl liquid-glass-card liquid-specular p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950 dark:bg-white"></span>
                Input ASCII Numbers ({format.toUpperCase()})
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAsciiInput('')}
                  disabled={!asciiInput}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-black dark:hover:text-white liquid-glass-btn disabled:opacity-40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            </div>

            <textarea
              value={asciiInput}
              onChange={(e) => setAsciiInput(e.target.value)}
              placeholder="Paste ASCII numbers (e.g. 72 101 108 108 111)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-input text-slate-900 dark:text-slate-100 font-mono text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition resize-y min-h-[80px]"
            />

            {/* Radix selector */}
            <div className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <span className="text-xs text-slate-500">Input Radix:</span>
              {(['dec', 'hex', 'bin', 'oct'] as AsciiFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono transition ${
                    format === f
                      ? 'liquid-glass-accent font-semibold shadow-sm'
                      : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {decodedResult.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
                  Warnings:
                </div>
                {decodedResult.warnings.map((w, i) => (
                  <div key={i} className="text-[11px]">• {w}</div>
                ))}
              </div>
            )}
          </div>

          {/* Decoded Text Box */}
          <div className="rounded-2xl liquid-glass-card liquid-specular p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Decoded Plain Text
                </h3>
              </div>
              <CopyButton text={decodedResult.text} label="Copy Text" />
            </div>

            <div className="p-4 rounded-xl liquid-glass text-slate-900 dark:text-slate-100 font-sans text-base break-words select-all min-h-[70px] border border-black/10 dark:border-white/10 shadow-inner">
              {decodedResult.text || <span className="text-slate-400 italic">Enter ASCII numbers above</span>}
            </div>
          </div>
        </>
      )}

      {/* ASCII 0-127 Interactive Reference Table */}
      {showTable && (
        <div className="rounded-2xl liquid-glass-card liquid-specular p-4 sm:p-5 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-white/10">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-900 dark:text-white" />
                Complete ASCII Reference Table (0–127)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standard 7-bit ASCII character codes, control pictures, hexadecimal, binary, and descriptions.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search char, dec, hex..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg liquid-glass-input text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-black dark:focus:ring-white w-full sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 rounded-xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-300 sticky top-0 border-b border-black/10 dark:border-white/10">
                <tr>
                  <th className="py-2 px-3">Dec</th>
                  <th className="py-2 px-3">Hex</th>
                  <th className="py-2 px-3">Binary</th>
                  <th className="py-2 px-3">Char</th>
                  <th className="py-2 px-3 font-sans">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                {filteredTable.map((entry) => (
                  <tr
                    key={entry.dec}
                    className={`hover:bg-black/5 dark:hover:bg-white/5 transition ${
                      entry.isControl ? 'text-slate-500 dark:text-slate-400' : ''
                    }`}
                  >
                    <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{entry.dec}</td>
                    <td className="py-1.5 px-3">0x{entry.hex}</td>
                    <td className="py-1.5 px-3 text-[11px] text-slate-500">{entry.bin}</td>
                    <td className="py-1.5 px-3 font-bold text-sm">
                      {entry.char}
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-600 dark:text-slate-400">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
