import React from 'react';
import { TextMetrics } from '../lib/unicode';
import { Layers, Binary, Hash, AlertTriangle, Sparkles } from 'lucide-react';

interface MetricsBarProps {
  metrics: TextMetrics;
  className?: string;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs select-none ${className}`}>
      {/* Grapheme Count */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl liquid-glass-dock text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10"
        title="Visual glyphs (Grapheme clusters like combined emojis, flags, and accented letters)"
      >
        <Sparkles className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold">{metrics.graphemeCount}</span>
        <span className="text-slate-500">
          {metrics.graphemeCount === 1 ? 'grapheme' : 'graphemes'}
        </span>
      </div>

      {/* Code Points */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl liquid-glass-dock text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10"
        title="Unicode scalar values (U+XXXX)"
      >
        <Hash className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold">{metrics.codePointCount}</span>
        <span className="text-slate-500">code points</span>
      </div>

      {/* UTF-8 Bytes */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl liquid-glass-dock text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10"
        title="Total UTF-8 encoded bytes in memory"
      >
        <Binary className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold">{metrics.utf8ByteCount}</span>
        <span className="text-slate-500">{metrics.utf8ByteCount === 1 ? 'byte' : 'bytes'} (UTF-8)</span>
      </div>

      {/* UTF-16 Units */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl liquid-glass-dock text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10"
        title="JavaScript string.length (UTF-16 code units)"
      >
        <Layers className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold">{metrics.charCount}</span>
        <span className="text-slate-500">UTF-16 units</span>
      </div>

      {/* Non-ASCII Alert Badge */}
      {metrics.nonAsciiCount > 0 && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl liquid-glass-dock text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10 animate-in fade-in"
          title="Characters with code points > 127 (outside basic 7-bit ASCII)"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold">{metrics.nonAsciiCount}</span>
          <span>non-ASCII</span>
        </div>
      )}

      {/* Surrogate Pair Badge */}
      {metrics.hasSurrogatePairs && (
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl liquid-glass-dock text-slate-700 dark:text-slate-300 text-[11px] border border-black/10 dark:border-white/10">
          Surrogate pairs present (Astral Plane)
        </span>
      )}
    </div>
  );
};
