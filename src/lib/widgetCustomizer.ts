// Widget Customization & Styling Engine for Home Screen & In-App Widgets

export type WidgetBgStyle = 'glass' | 'solid' | 'gradient' | 'mesh';
export type WidgetAccentColor =
  | 'monochrome'
  | 'titanium'
  | 'silver'
  | 'graphite'
  | 'frost'
  | 'obsidian'
  | 'amber'
  | 'indigo'
  | 'emerald'
  | 'rose'
  | 'cyan';
export type WidgetType = 'notes' | 'clock' | 'converter' | 'calendar';

export interface WidgetCustomizationConfig {
  bgStyle: WidgetBgStyle;
  opacity: number; // 0 to 100
  accentColor: WidgetAccentColor;
  customColorHex?: string;
  typographyScale: 'compact' | 'standard' | 'large';
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
  showBorders: boolean;
  showGlassGlow: boolean;
}

export const DEFAULT_WIDGET_CONFIG: WidgetCustomizationConfig = {
  bgStyle: 'solid',
  opacity: 100,
  accentColor: 'indigo',
  typographyScale: 'standard',
  borderRadius: 'lg',
  showBorders: true,
  showGlassGlow: true,
};

export const ACCENT_COLOR_MAP: Record<
  WidgetAccentColor,
  {
    name: string;
    primaryHex: string;
    borderClass: string;
    bgAccentClass: string;
    textAccentClass: string;
    glowShadow: string;
  }
> = {
  indigo: {
    name: 'Electric Indigo',
    primaryHex: '#6366f1',
    borderClass: 'border-indigo-500/40 dark:border-indigo-400/40',
    bgAccentClass: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
    textAccentClass: 'text-indigo-600 dark:text-indigo-400',
    glowShadow: 'shadow-indigo-500/30',
  },
  emerald: {
    name: 'Emerald Mint',
    primaryHex: '#10b981',
    borderClass: 'border-emerald-500/40 dark:border-emerald-400/40',
    bgAccentClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
    textAccentClass: 'text-emerald-600 dark:text-emerald-400',
    glowShadow: 'shadow-emerald-500/30',
  },
  amber: {
    name: 'Sunset Amber',
    primaryHex: '#f59e0b',
    borderClass: 'border-amber-500/40 dark:border-amber-400/40',
    bgAccentClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    textAccentClass: 'text-amber-600 dark:text-amber-400',
    glowShadow: 'shadow-amber-500/30',
  },
  rose: {
    name: 'Neon Rose',
    primaryHex: '#f43f5e',
    borderClass: 'border-rose-500/40 dark:border-rose-400/40',
    bgAccentClass: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white',
    textAccentClass: 'text-rose-600 dark:text-rose-400',
    glowShadow: 'shadow-rose-500/30',
  },
  cyan: {
    name: 'Ocean Cyan',
    primaryHex: '#06b6d4',
    borderClass: 'border-cyan-500/40 dark:border-cyan-400/40',
    bgAccentClass: 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white',
    textAccentClass: 'text-cyan-600 dark:text-cyan-400',
    glowShadow: 'shadow-cyan-500/30',
  },
  monochrome: {
    name: 'Liquid Monochrome',
    primaryHex: '#ffffff',
    borderClass: 'border-white/30 dark:border-white/20',
    bgAccentClass: 'bg-black text-white dark:bg-white dark:text-black',
    textAccentClass: 'text-slate-900 dark:text-white',
    glowShadow: 'shadow-white/10',
  },
  titanium: {
    name: 'Natural Titanium',
    primaryHex: '#71717a',
    borderClass: 'border-zinc-400/40 dark:border-zinc-600/40',
    bgAccentClass: 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950',
    textAccentClass: 'text-zinc-800 dark:text-zinc-200',
    glowShadow: 'shadow-zinc-500/20',
  },
  silver: {
    name: 'Liquid Silver',
    primaryHex: '#e4e4e7',
    borderClass: 'border-zinc-300/60 dark:border-zinc-500/30',
    bgAccentClass: 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
    textAccentClass: 'text-zinc-900 dark:text-zinc-100',
    glowShadow: 'shadow-zinc-300/20',
  },
  graphite: {
    name: 'Deep Graphite',
    primaryHex: '#27272a',
    borderClass: 'border-zinc-700/50 dark:border-zinc-500/40',
    bgAccentClass: 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900',
    textAccentClass: 'text-zinc-800 dark:text-zinc-200',
    glowShadow: 'shadow-zinc-900/40',
  },
  frost: {
    name: 'Frosted Crystal',
    primaryHex: '#f4f4f5',
    borderClass: 'border-white/40 dark:border-white/15',
    bgAccentClass: 'bg-white/30 text-black dark:bg-white/20 dark:text-white',
    textAccentClass: 'text-slate-900 dark:text-white',
    glowShadow: 'shadow-white/15',
  },
  obsidian: {
    name: 'Pitch Obsidian',
    primaryHex: '#000000',
    borderClass: 'border-black/40 dark:border-white/20',
    bgAccentClass: 'bg-black text-white dark:bg-neutral-900 dark:text-white',
    textAccentClass: 'text-slate-900 dark:text-slate-100',
    glowShadow: 'shadow-black/50',
  },
};

const WIDGET_CONFIG_STORAGE_KEY = 'app_widget_customizer_config_v1';

export function getStoredWidgetConfig(): WidgetCustomizationConfig {
  try {
    const raw = localStorage.getItem(WIDGET_CONFIG_STORAGE_KEY);
    return raw ? { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(raw) } : DEFAULT_WIDGET_CONFIG;
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

export function saveStoredWidgetConfig(config: WidgetCustomizationConfig) {
  try {
    localStorage.setItem(WIDGET_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save widget config', e);
  }
}
