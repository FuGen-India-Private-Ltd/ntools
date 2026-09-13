import React, { useState, useMemo } from 'react';
import { FANCY_STYLES } from '../lib/fancyStyles';
import { CopyButton } from './CopyButton';
import { Sparkles, Search, SlidersHorizontal, Trash2, Clipboard } from 'lucide-react';

export const FancyTextTab: React.FC = () => {
  const [inputText, setInputText] = useState('Unicode ASCII Studio');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Math', 'Enclosed', 'Transform', 'Decorated'];

  const filteredStyles = useMemo(() => {
    return FANCY_STYLES.filter((style) => {
      const matchCat = categoryFilter === 'All' || style.category === categoryFilter;
      const matchSearch =
        style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        style.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Input Box */}
      <div className="rounded-3xl liquid-glass-card liquid-specular p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Enter Text for Fancy Unicode Styling
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInputText('')}
              disabled={!inputText}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-black dark:hover:text-white liquid-glass-btn disabled:opacity-40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your bio, title, or name here..."
          className="w-full px-4 py-3 rounded-2xl liquid-glass-input text-slate-900 dark:text-slate-100 text-base font-sans outline-none focus:ring-2 focus:ring-purple-500 transition"
        />

        {/* Quick Sample Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-500 text-[11px]">Quick Ideas:</span>
          {['Developer Pro', 'Crypto King 🚀', 'Bio Link 🌐', 'Design System ✨', '100% Free'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setInputText(t)}
              className="px-2.5 py-1 rounded-lg liquid-glass-btn text-slate-700 dark:text-slate-300 transition"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl liquid-glass border border-black/10 dark:border-white/10 w-full sm:w-auto overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'liquid-glass-accent font-semibold shadow-sm'
                  : 'liquid-glass-btn text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search styles..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl liquid-glass-input text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Grid of Fancy Text Styles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredStyles.map((style) => {
          const transformed = inputText ? style.transform(inputText) : style.sample;
          return (
            <div
              key={style.id}
              className="rounded-2xl liquid-glass-card liquid-specular p-4 shadow-sm border border-black/10 dark:border-white/10 transition group"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{style.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 font-semibold border border-purple-500/20">
                    {style.category}
                  </span>
                </div>
                <CopyButton text={transformed} label="Copy" className="h-7 text-xs" />
              </div>

              <div className="p-3.5 rounded-xl liquid-glass border border-black/10 dark:border-white/10 text-slate-900 dark:text-slate-100 font-sans text-base sm:text-lg break-words select-all min-h-[48px] flex items-center">
                {transformed}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
