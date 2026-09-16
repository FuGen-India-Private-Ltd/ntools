import React, { useState, useEffect } from 'react';
import {
  WidgetCustomizationConfig,
  WidgetBgStyle,
  WidgetAccentColor,
  ACCENT_COLOR_MAP,
  getStoredWidgetConfig,
  saveStoredWidgetConfig,
} from '../lib/widgetCustomizer';
import { syncWidgetConfigToNative } from '../lib/widgetSyncBridge';
import { evaluateMathExpression } from '../lib/mathEngine';
import {
  Layers,
  Sliders,
  Check,
  StickyNote,
  Timer,
  FileCode,
  Calendar as CalendarIcon,
  Flame,
  CheckSquare,
  Calculator as CalcIcon,
  LayoutGrid,
  Clock as ClockIcon,
  Smartphone,
  Sparkles,
  Play,
  Pause,
  Square,
  Bell,
  CalendarDays,
  Maximize2,
} from 'lucide-react';

export type WidgetPreviewType =
  | 'clock_transparent'
  | 'clock_vertical'
  | 'alarm'
  | 'calendar_today'
  | 'calculator'
  | 'pomodoro'
  | 'clock'
  | 'notes'
  | 'calendar'
  | 'tasks'
  | 'converter'
  | 'quick_launch';

interface WidgetDef {
  id: WidgetPreviewType;
  label: string;
  icon: React.ElementType;
  previewImg: string;
  sizeDesc: string;
}

const WIDGET_TABS: WidgetDef[] = [
  { id: 'clock_transparent', label: 'Transparent Clock', icon: ClockIcon, previewImg: '/widget-previews/widget_preview_clock_transparent.png', sizeDesc: '3 × 1 Cells' },
  { id: 'clock_vertical', label: 'Vertical Stacked Clock', icon: ClockIcon, previewImg: '/widget-previews/widget_preview_clock_vertical.png', sizeDesc: '2 × 2 Cells' },
  { id: 'alarm', label: 'Next Alarm', icon: Bell, previewImg: '/widget-previews/widget_preview_alarm.png', sizeDesc: '3 × 1 Cells' },
  { id: 'calendar_today', label: "Today's Agenda", icon: CalendarDays, previewImg: '/widget-previews/widget_preview_calendar_today.png', sizeDesc: '4 × 1 Cells' },
  { id: 'calculator', label: 'Smart Calculator', icon: CalcIcon, previewImg: '/widget-previews/widget_preview_calculator.png', sizeDesc: '3 × 2 Cells' },
  { id: 'pomodoro', label: 'Pomodoro Focus', icon: Timer, previewImg: '/widget-previews/widget_preview_pomodoro.png', sizeDesc: '3 × 1 Cells' },
  { id: 'clock', label: 'Clock & Alarms', icon: ClockIcon, previewImg: '/widget-previews/widget_preview_clock.png', sizeDesc: '3 × 1 Cells' },
  { id: 'notes', label: 'Quick Notes', icon: StickyNote, previewImg: '/widget-previews/widget_preview_notes.png', sizeDesc: '3 × 2 Cells' },
  { id: 'calendar', label: 'Monthly Calendar', icon: CalendarIcon, previewImg: '/widget-previews/widget_preview_calendar.png', sizeDesc: '4 × 3 Cells' },
  { id: 'tasks', label: 'Tasks Checklist', icon: CheckSquare, previewImg: '/widget-previews/widget_preview_tasks.png', sizeDesc: '4 × 2 Cells' },
  { id: 'converter', label: 'Kannada Quick', icon: FileCode, previewImg: '/widget-previews/widget_preview_single_tool.png', sizeDesc: '2 × 1 Cells' },
  { id: 'quick_launch', label: 'Tool Dock', icon: LayoutGrid, previewImg: '/widget-previews/widget_preview_quick_launch.png', sizeDesc: '4 × 1 Cells' },
];

export const WidgetStudioTab = React.memo(function WidgetStudioTab() {
  const [config, setConfig] = useState<WidgetCustomizationConfig>(() => getStoredWidgetConfig());
  const [selectedPreview, setSelectedPreview] = useState<WidgetPreviewType>('clock_transparent');
  const [viewMode, setViewMode] = useState<'interactive' | 'homescreen'>('interactive');
  const [syncNotice, setSyncNotice] = useState(false);

  // Interactive mini calculator preview state
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Interactive pomodoro preview state
  const [pomoSecs, setPomoSecs] = useState(1500);
  const [pomoRunning, setPomoRunning] = useState(false);

  // Alarm preview toggle state
  const [alarmActive, setAlarmActive] = useState(true);

  // Debounced native sync to eliminate phone hanging/stutter on slider adjustments
  useEffect(() => {
    saveStoredWidgetConfig(config);
    const timer = setTimeout(() => {
      syncWidgetConfigToNative(config);
      setSyncNotice(true);
      setTimeout(() => setSyncNotice(false), 1500);
    }, 250);
    return () => clearTimeout(timer);
  }, [config]);

  // Pomodoro countdown timer in preview
  useEffect(() => {
    let interval: any;
    if (pomoRunning) {
      interval = setInterval(() => {
        setPomoSecs((s) => (s > 0 ? s - 1 : 1500));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomoRunning]);

  const handleCalcKey = (k: string) => {
    if (k === 'C') {
      setCalcDisplay('0');
    } else if (k === '=') {
      try {
        const evalResult = evaluateMathExpression(calcDisplay);
        setCalcDisplay(evalResult.result);
      } catch {
        setCalcDisplay('Error');
      }
    } else if (['+', '−', '×', '÷'].includes(k)) {
      if (calcDisplay.endsWith(' + ') || calcDisplay.endsWith(' − ') || calcDisplay.endsWith(' × ') || calcDisplay.endsWith(' ÷ ')) {
        setCalcDisplay(calcDisplay.substring(0, calcDisplay.length - 3) + ` ${k} `);
      } else {
        setCalcDisplay(calcDisplay + ` ${k} `);
      }
    } else {
      if (calcDisplay === '0' || calcDisplay === 'Error') {
        setCalcDisplay(k === '.' ? '0.' : k);
      } else {
        setCalcDisplay(calcDisplay + k);
      }
    }
  };

  const accent = ACCENT_COLOR_MAP[config.accentColor];
  const activeWidgetDef = WIDGET_TABS.find((w) => w.id === selectedPreview) || WIDGET_TABS[0];

  const getWidgetBgClasses = () => {
    switch (config.bgStyle) {
      case 'solid':
        return 'bg-slate-900 dark:bg-slate-950 text-slate-100';
      case 'gradient':
        return 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100';
      case 'mesh':
        return 'bg-gradient-to-tr from-slate-800/60 via-slate-900 to-slate-800/60 text-slate-100';
      case 'liquid-glass':
        return 'liquid-glass-dock liquid-specular backdrop-blur-3xl bg-slate-950/70 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-slate-100';
      case 'glass':
      default:
        return 'liquid-glass-card backdrop-blur-2xl bg-slate-900/80 border border-white/15 text-slate-100';
    }
  };

  const getBorderRadiusClass = () => {
    switch (config.borderRadius) {
      case 'sm':
        return 'rounded-xl';
      case 'md':
        return 'rounded-2xl';
      case 'full':
      case 'lg':
      default:
        return 'rounded-3xl';
    }
  };

  return (
    <div className="space-y-6 pb-36 max-w-5xl mx-auto select-none">
      {/* Title Header */}
      <div className="rounded-3xl p-5 sm:p-6 liquid-glass-card liquid-specular flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl liquid-glass-accent flex items-center justify-center font-bold shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Android Widgets &amp; Customizer</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/25">
                11 Widgets Available
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live previews for all home screen widgets. In Android's widget picker, you will see how each widget actually looks!
            </p>
          </div>
        </div>

        {/* Live Auto-Applied Status & View Mode Switcher */}
        <div className="flex items-center gap-2">
          {syncNotice && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center gap-1 animate-pulse">
              <Check className="w-3 h-3" /> Auto-Applied to Home Screen
            </span>
          )}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl liquid-glass-dock border border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'interactive'
                  ? 'liquid-glass-accent shadow-sm text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('homescreen')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'homescreen'
                  ? 'liquid-glass-accent shadow-sm text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Picker</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Accent Color Palette */}
          <div className="rounded-3xl p-5 liquid-glass-card liquid-specular space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Accent Tint
              </span>
              <span className="text-[10px] font-bold text-slate-500 capitalize">
                {accent.name}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {(Object.keys(ACCENT_COLOR_MAP) as WidgetAccentColor[]).map((key) => {
                const isSelected = config.accentColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setConfig({ ...config, accentColor: key })}
                    className={`h-8 rounded-xl border flex items-center justify-center transition active:scale-95 ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                        : 'border-black/10 dark:border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: ACCENT_COLOR_MAP[key].primaryHex }}
                    title={ACCENT_COLOR_MAP[key].name}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          ['monochrome', 'silver', 'frost'].includes(key) ? 'text-black' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Material & Opacity */}
          <div className="rounded-3xl p-5 liquid-glass-card liquid-specular space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Material Style</span>
                <span className="text-[10px] text-slate-500 capitalize">{config.bgStyle}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(['liquid-glass', 'glass', 'solid', 'gradient', 'mesh'] as WidgetBgStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setConfig({ ...config, bgStyle: style })}
                    className={`py-1.5 text-xs font-bold rounded-xl capitalize transition ${
                      config.bgStyle === style
                        ? 'liquid-glass-accent text-white shadow-sm'
                        : 'liquid-glass-btn text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {style === 'liquid-glass' ? 'Liquid' : style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Glass Opacity (Auto-Applies)</span>
                <span className="text-[10px] font-mono text-indigo-500 font-bold">{config.opacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={config.opacity}
                onChange={(e) => setConfig({ ...config, opacity: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                <span>Transparent (0%)</span>
                <span>Subtle (50%)</span>
                <span>Opaque (100%)</span>
              </div>
            </div>

            {/* Corner Radius */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Corner Rounding</span>
                <span className="text-[10px] text-slate-500 uppercase">{config.borderRadius}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sm', 'md', 'lg', 'full'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setConfig({ ...config, borderRadius: r })}
                    className={`py-1.5 text-xs font-bold rounded-xl uppercase transition ${
                      config.borderRadius === r
                        ? 'liquid-glass-accent text-white shadow-sm'
                        : 'liquid-glass-btn text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="rounded-3xl p-4 liquid-glass-card text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 block">
              💡 How to Add Widgets on Android:
            </span>
            <ol className="list-decimal pl-4 space-y-0.5 text-[11px]">
              <li>Long press on any empty space on your phone home screen.</li>
              <li>Tap <strong>Widgets</strong> in the popup menu.</li>
              <li>Scroll to <strong>nTools</strong> to see realistic full-color previews.</li>
              <li>Touch and hold your chosen widget, then drag it onto your home screen!</li>
            </ol>
          </div>
        </div>

        {/* Right: Live Dynamic Widget Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Widget Type Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {WIDGET_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedPreview === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedPreview(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    isSelected
                      ? 'liquid-glass-accent shadow-sm text-white'
                      : 'liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Widget Info Strip */}
          <div className="flex items-center justify-between text-xs px-2 text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {activeWidgetDef.label}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-semibold">
                {activeWidgetDef.sizeDesc}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {viewMode === 'interactive' ? 'Live Interactive Preview' : 'Exact Android Picker Preview'}
            </span>
          </div>

          {/* Smartphone Mockup Preview Frame */}
          <div className="relative rounded-3xl p-6 sm:p-8 liquid-glass-card liquid-specular flex flex-col items-center justify-center min-h-[380px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/[0.02] to-black/[0.06] dark:via-white/[0.01] dark:to-white/[0.03] pointer-events-none" />

            {/* Mode 1: Exact Home Screen Reality Image */}
            {viewMode === 'homescreen' ? (
              <div className="w-full max-w-md flex flex-col items-center space-y-3 z-10">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/15 bg-black/40">
                  <img
                    src={activeWidgetDef.previewImg}
                    alt={`${activeWidgetDef.label} Preview`}
                    className="w-full h-auto max-h-[300px] object-contain block"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Visible directly in Android OS Widget Picker</span>
                </div>
              </div>
            ) : (
              /* Mode 2: Live Customizable Interactive Mockups */
              <div className="w-full max-w-sm transition-all z-10">
                {/* 1. Transparent Clock Widget */}
                {selectedPreview === 'clock_transparent' && (
                  <div
                    className="w-full p-6 text-center space-y-1 transition-all rounded-3xl"
                    style={{
                      backgroundColor: config.opacity === 0 ? 'transparent' : `rgba(15, 23, 42, ${(config.opacity / 100) * 0.4})`,
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    }}
                  >
                    <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white flex items-baseline justify-center gap-2">
                      <span>10:45</span>
                      <span className="text-base font-bold text-sky-400">AM</span>
                    </div>
                    <div className="text-xs font-bold text-slate-200 tracking-wide">
                      Sun, Sep 13 • 12h / 24h Adaptive Scale
                    </div>
                    <div className="text-[10px] text-slate-300/80 pt-1">
                      100% Transparent • Color adapts to phone wallpaper
                    </div>
                  </div>
                )}

                {/* Vertical Stacked Clock Widget */}
                {selectedPreview === 'clock_vertical' && (
                  <div
                    className={`w-full max-w-[240px] mx-auto p-6 border border-white/15 shadow-2xl flex flex-col items-center justify-center space-y-1 transition-all text-center ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="font-mono font-black text-6xl sm:text-7xl tracking-tighter text-white leading-none">
                      10
                    </div>
                    <div className="font-mono font-black text-6xl sm:text-7xl tracking-tighter text-white/90 leading-none">
                      45
                    </div>
                    <div className="flex items-center gap-2 pt-3 text-xs font-bold text-slate-300">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-sky-400 font-mono text-[11px]">AM</span>
                      <span>Sun, Sep 13</span>
                    </div>
                  </div>
                )}

                {/* 2. Dedicated Next Alarm Widget */}
                {selectedPreview === 'alarm' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Bell className="w-4 h-4" /> Next Alarm
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${alarmActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                        {alarmActive ? '● Active' : '○ Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-3xl font-black font-mono tracking-tight text-white">
                          07:00 AM
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Morning Alarm • Mon-Fri (In 8h 15m)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAlarmActive(!alarmActive)}
                        className={`w-12 h-12 rounded-2xl font-black flex items-center justify-center text-xs shadow-md border transition active:scale-90 ${
                          alarmActive
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {alarmActive ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Today's Agenda & Date Widget */}
                {selectedPreview === 'calendar_today' && (
                  <div
                    className={`w-full p-4 border border-white/15 shadow-2xl flex items-center gap-4 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="w-20 p-3 rounded-2xl bg-white/10 border border-white/10 text-center shrink-0">
                      <span className="text-[10px] font-bold text-sky-400 block uppercase">Sunday</span>
                      <span className="text-3xl font-black text-white block my-0.5">13</span>
                      <span className="text-[10px] text-slate-300 block">Sep 2026</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-xs font-bold text-amber-400 block truncate">
                        🌟 Ganesh Chaturthi Festival
                      </span>
                      <span className="text-xs font-bold text-white block truncate">
                        🎂 Birthday Celebration &amp; Study
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        ☑ Review Literature Notes (Due today)
                      </span>
                      <span className="text-[10px] text-sky-400 font-bold block pt-1">
                        Tap to open calendar ➔
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Interactive Smart Calculator Widget */}
                {selectedPreview === 'calculator' && (
                  <div
                    className={`w-full p-4 border border-white/15 shadow-2xl space-y-2 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between pb-1 px-1 border-b border-white/10">
                      <span className="font-mono text-xl font-bold text-white tracking-wider truncate">
                        {calcDisplay}
                      </span>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-sky-400 flex items-center justify-center text-xs font-bold"
                        title="Enlarge in app"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', 'C', '0', '=', '+'].map((k) => {
                        const isOp = ['+', '−', '×', '÷'].includes(k);
                        const isEq = k === '=';
                        const isClear = k === 'C';
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleCalcKey(k)}
                            className={`h-9 rounded-xl font-bold text-sm flex items-center justify-center transition active:scale-90 ${
                              isClear
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isEq
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : isOp
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
                            }`}
                          >
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Pomodoro Focus Timer Widget */}
                {selectedPreview === 'pomodoro' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                          ⏱
                        </span>
                        <div>
                          <div className="text-2xl font-black font-mono tracking-tight text-white">
                            {String(Math.floor(pomoSecs / 60)).padStart(2, '0')}:
                            {String(pomoSecs % 60).padStart(2, '0')}
                          </div>
                          <div className="text-[10px] text-purple-300 font-semibold">
                            Focus Session • {pomoRunning ? '● Running' : '○ Paused'}
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPomoRunning(true)}
                          className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center active:scale-90"
                          title="Start"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPomoRunning(false)}
                          className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center active:scale-90"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPomoRunning(false);
                            setPomoSecs(1500);
                          }}
                          className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center active:scale-90"
                          title="Reset"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Clock & Alarms (Original) */}
                {selectedPreview === 'clock' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${accent.textAccentClass}`}>
                        <ClockIcon className="w-4 h-4" /> Clock &amp; Alarms
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-3xl font-black font-mono tracking-tight text-white">
                          07:00
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Morning Alarm • Mon-Fri
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black flex items-center justify-center text-xs shadow-md">
                        ON
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Quick Notes Widget */}
                {selectedPreview === 'notes' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${accent.textAccentClass}`}>
                        <StickyNote className="w-4 h-4" /> Quick Notes
                      </span>
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                        +
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                      <span className="text-xs font-bold text-white block truncate">
                        Kannada Literature Study Notes
                      </span>
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        Kuvempu, Bendre &amp; Karanth literary analysis with key exam questions...
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>2 pinned notes</span>
                      <span className="text-slate-300 font-semibold">Tap to capture ➔</span>
                    </div>
                  </div>
                )}

                {/* 8. Monthly Calendar Widget */}
                {selectedPreview === 'calendar' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${accent.textAccentClass}`}>
                        <CalendarIcon className="w-4 h-4" /> September 2026
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold py-1 border-b border-white/10">
                      <span className="text-slate-400">S</span>
                      <span className="text-slate-400">M</span>
                      <span className="text-slate-400">T</span>
                      <span className="text-slate-400">W</span>
                      <span className="text-slate-400">T</span>
                      <span className="text-slate-400">F</span>
                      <span className="text-slate-400">S</span>
                      <span>13</span>
                      <span>14</span>
                      <span className="text-amber-400">15</span>
                      <span>16</span>
                      <span className="rounded-full bg-blue-500 text-white">17</span>
                      <span>18</span>
                      <span>19</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">🌟 Ganesh Chaturthi</span>
                        <span className="text-[10px] text-amber-300">Local &amp; Regional Festival</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300">Sep 15</span>
                    </div>
                  </div>
                )}

                {/* 9. Tasks Checklist Widget */}
                {selectedPreview === 'tasks' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${accent.textAccentClass}`}>
                        <CheckSquare className="w-4 h-4" /> Tasks Checklist
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                          3 pending
                        </span>
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                          +
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-3.5 h-3.5 rounded border border-white/40 shrink-0" />
                          <span className="font-medium text-white truncate">Kannada Unicode review</span>
                        </div>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold shrink-0">
                          TODAY
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-3.5 h-3.5 rounded border border-white/40 shrink-0" />
                          <span className="font-medium text-slate-200 truncate">PDF study materials merge</span>
                        </div>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold shrink-0">
                          TOMORROW
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. Kannada Quick Sanka Widget */}
                {selectedPreview === 'converter' && (
                  <div
                    className={`w-full p-5 border border-white/15 shadow-2xl space-y-3 transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${accent.textAccentClass}`}>
                        <FileCode className="w-4 h-4" /> Kannada Quick
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        NUDI ➔ UNI
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-xs font-mono space-y-1">
                      <div className="text-slate-300">PÀ£ÀßqÀ £ÁqÀÄ ¸ÀÄAzÀgÀ £ÁqÀÄ</div>
                      <div className="text-white font-bold font-sans">➔ ಕನ್ನಡ ನಾಡು ಸುಂದರ ನಾಡು</div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Auto-detect enabled</span>
                      <span className="text-amber-300 font-semibold">1-Tap Live</span>
                    </div>
                  </div>
                )}

                {/* 11. Tool Dock Widget */}
                {selectedPreview === 'quick_launch' && (
                  <div
                    className={`w-full p-4 border border-white/15 shadow-2xl transition-all ${getWidgetBgClasses()} ${getBorderRadiusClass()}`}
                    style={{ opacity: Math.max(0.1, config.opacity / 100) }}
                  >
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                        <span className="text-lg font-black text-amber-400">ಕ</span>
                        <span className="text-[10px] font-bold text-white">Sanka</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                        <span className="text-sm font-black text-rose-400 mt-1">PDF</span>
                        <span className="text-[10px] font-bold text-white mt-1">Files</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                        <span className="text-base font-black text-teal-400">☑</span>
                        <span className="text-[10px] font-bold text-white">Tasks</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-white/10 border border-white/10 flex flex-col items-center gap-1">
                        <span className="text-base font-black text-indigo-400">⏰</span>
                        <span className="text-[10px] font-bold text-white">Clock</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
