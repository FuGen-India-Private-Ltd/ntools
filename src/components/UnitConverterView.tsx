import React, { useState } from 'react';
import {
  UnitCategory,
  UNIT_CATEGORIES,
  convertUnits,
} from '../lib/mathEngine';
import {
  ArrowLeftRight,
  Ruler,
  Scale,
  Maximize2,
  Beaker,
  Thermometer,
  Gauge,
  Clock,
  HardDrive,
  Zap,
  Copy,
  Check,
} from 'lucide-react';

const CATEGORY_ICONS: Record<UnitCategory, React.ComponentType<{ className?: string }>> = {
  length: Ruler,
  mass: Scale,
  area: Maximize2,
  volume: Beaker,
  temperature: Thermometer,
  speed: Gauge,
  time: Clock,
  storage: HardDrive,
  energy: Zap,
};

export function UnitConverterView() {
  const [category, setCategory] = useState<UnitCategory>('length');
  const catData = UNIT_CATEGORIES[category];

  const [fromUnit, setFromUnit] = useState<string>(catData.units[0].id);
  const [toUnit, setToUnit] = useState<string>(catData.units[1].id);
  const [fromValue, setFromValue] = useState<string>('1');
  const [copied, setCopied] = useState(false);

  const numVal = parseFloat(fromValue) || 0;
  const converted = convertUnits(category, numVal, fromUnit, toUnit);

  const handleCategoryChange = (newCat: UnitCategory) => {
    setCategory(newCat);
    const newCatData = UNIT_CATEGORIES[newCat];
    setFromUnit(newCatData.units[0].id);
    setToUnit(newCatData.units[1]?.id || newCatData.units[0].id);
  };

  const handleSwap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(converted.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const IconComponent = CATEGORY_ICONS[category];

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Category Horizontal Scroller */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {(Object.keys(UNIT_CATEGORIES) as UnitCategory[]).map((cat) => {
          const isSelected = category === cat;
          const CatIcon = CATEGORY_ICONS[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`py-2 px-3 rounded-2xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 ${
                isSelected
                  ? 'liquid-glass-accent shadow-md'
                  : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
              }`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              <span>{UNIT_CATEGORIES[cat].name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Converter Card */}
      <div className="p-5 rounded-3xl liquid-glass-card liquid-specular space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
            <IconComponent className="w-4 h-4 text-slate-900 dark:text-white" />
            <span>{catData.name}</span>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Swap Units"
            className="p-2 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition active:scale-90"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Input: From */}
        <div className="p-3.5 rounded-2xl liquid-glass-input space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              {catData.units.map((u) => (
                <option key={u.id} value={u.id} className="bg-black text-white">
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            value={fromValue}
            onChange={(e) => setFromValue(e.target.value)}
            className="w-full bg-transparent text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
            placeholder="0"
          />
        </div>

        {/* Output: To */}
        <div className="p-3.5 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10 space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">To (Result)</span>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              {catData.units.map((u) => (
                <option key={u.id} value={u.id} className="bg-black text-white">
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white select-all overflow-x-auto">
              {converted}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition"
            >
              {copied ? <Check className="w-4 h-4 text-black dark:text-white" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Value Presets */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Presets:</span>
          {[1, 5, 10, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFromValue(v.toString())}
              className="px-2.5 py-1 rounded-xl liquid-glass-btn text-slate-600 dark:text-slate-300 text-xs font-bold hover:text-black dark:hover:text-white transition active:scale-95"
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
