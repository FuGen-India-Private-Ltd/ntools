import React from 'react';
import { TranslationSchema } from '../lib/i18n';
import { Type, AlignLeft, ListOrdered, Zap } from 'lucide-react';

interface ConversionStatsProps {
  text: string;
  latencyMs: number;
  t: TranslationSchema;
}

export function ConversionStats({ text, latencyMs, t }: ConversionStatsProps) {
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = text ? text.split('\n').length : 0;

  return (
    <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400">
      <div className="flex items-center gap-1.5 liquid-glass-dock px-2.5 py-1 rounded-xl border border-black/10 dark:border-white/10">
        <Type className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">{charCount.toLocaleString()}</span>
        <span className="text-[11px]">{t.statsChars}</span>
      </div>

      <div className="flex items-center gap-1.5 liquid-glass-dock px-2.5 py-1 rounded-xl border border-black/10 dark:border-white/10">
        <AlignLeft className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">{wordCount.toLocaleString()}</span>
        <span className="text-[11px]">{t.statsWords}</span>
      </div>

      <div className="flex items-center gap-1.5 liquid-glass-dock px-2.5 py-1 rounded-xl border border-black/10 dark:border-white/10">
        <ListOrdered className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">{lineCount.toLocaleString()}</span>
        <span className="text-[11px]">{t.statsLines}</span>
      </div>

      <div className="flex items-center gap-1.5 liquid-glass-dock px-2.5 py-1 rounded-xl border border-black/10 dark:border-white/10 ml-auto hidden sm:flex">
        <Zap className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold text-slate-700 dark:text-slate-200">{latencyMs} ms</span>
        <span className="text-[11px]">{t.statsSpeed}</span>
      </div>
    </div>
  );
}
