import React, { useState, useEffect } from 'react';
import {
  CalculationHistoryItem,
  getStoredCalcHistory,
  saveStoredCalcHistory,
  getStoredMemoryValue,
  saveStoredMemoryValue,
  evaluateMathExpression,
  calculateFactorial,
} from '../lib/mathEngine';
import {
  History,
  Delete,
  Copy,
  Check,
  RotateCcw,
  Calculator as CalcIcon,
  ArrowLeftRight,
  Receipt,
  HeartPulse,
} from 'lucide-react';
import { UnitConverterView } from './UnitConverterView';
import { FinancialCalculatorView } from './FinancialCalculatorView';
import { EverydayMathView } from './EverydayMathView';

export function SmartCalculatorTab() {
  const [activeCalcMode, setActiveCalcMode] = useState<'calc' | 'unit' | 'finance' | 'tools'>('calc');
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [livePreview, setLivePreview] = useState('');
  const [justCalculated, setJustCalculated] = useState(false);
  const [isScientific, setIsScientific] = useState(false);
  const [isRadians, setIsRadians] = useState(false);
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => getStoredCalcHistory());
  const [memory, setMemory] = useState<number>(() => getStoredMemoryValue());
  const [copied, setCopied] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isErrorShake, setIsErrorShake] = useState(false);

  useEffect(() => {
    saveStoredCalcHistory(history);
  }, [history]);

  useEffect(() => {
    saveStoredMemoryValue(memory);
  }, [memory]);

  // Real-time live evaluation preview as user types
  useEffect(() => {
    if (!expression.trim() || justCalculated) {
      setLivePreview('');
      return;
    }
    try {
      const evalRes = evaluateMathExpression(expression, isRadians);
      if (evalRes.result !== 'Error' && evalRes.result !== expression) {
        setLivePreview(evalRes.result);
      } else {
        setLivePreview('');
      }
    } catch {
      setLivePreview('');
    }
  }, [expression, isRadians, justCalculated]);

  const triggerErrorShake = () => {
    setIsErrorShake(true);
    setTimeout(() => setIsErrorShake(false), 240);
  };

  const handleInput = (val: string) => {
    const isOperator = ['+', '−', '×', '÷', '%', '^'].includes(val);

    if (justCalculated) {
      if (isOperator) {
        setExpression((result !== 'Error' ? result : '0') + val);
      } else {
        setExpression(val);
        setResult('0');
      }
      setJustCalculated(false);
    } else {
      setExpression((prev) => prev + val);
    }
  };

  const handleClear = () => {
    setExpression('');
    setResult('0');
    setLivePreview('');
    setJustCalculated(false);
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
    setJustCalculated(false);
  };

  const handlePercentage = () => {
    if (!expression) return;
    try {
      const num = parseFloat(result !== '0' ? result : expression);
      if (!isNaN(num)) {
        const pct = (num / 100).toString();
        setResult(pct);
        setExpression(pct);
        setJustCalculated(true);
      }
    } catch {
      triggerErrorShake();
    }
  };

  const handleToggleSign = () => {
    if (expression.startsWith('-')) {
      setExpression(expression.slice(1));
    } else if (expression.length > 0) {
      setExpression('-' + expression);
    }
  };

  const handleEquals = () => {
    if (!expression.trim()) return;
    const evalRes = evaluateMathExpression(expression, isRadians);

    if (evalRes.result === 'Error') {
      triggerErrorShake();
      setResult('Error');
    } else {
      setResult(evalRes.result);
      setLivePreview('');

      const item: CalculationHistoryItem = {
        id: `calc-${Date.now()}`,
        expression,
        result: evalRes.result,
        timestamp: Date.now(),
      };
      setHistory([item, ...history.slice(0, 49)]);
    }
    setJustCalculated(true);
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Memory Actions
  const handleMemoryClear = () => setMemory(0);
  const handleMemoryRecall = () => {
    if (justCalculated) {
      setExpression(memory.toString());
      setResult('0');
      setJustCalculated(false);
    } else {
      setExpression((prev) => prev + memory.toString());
    }
  };
  const handleMemoryAdd = () => {
    const num = parseFloat(result !== '0' && result !== 'Error' ? result : expression) || 0;
    setMemory((prev) => prev + num);
  };
  const handleMemorySubtract = () => {
    const num = parseFloat(result !== '0' && result !== 'Error' ? result : expression) || 0;
    setMemory((prev) => prev - num);
  };

  const handleFactorial = () => {
    const num = parseFloat(result !== '0' && result !== 'Error' ? result : expression);
    if (!isNaN(num)) {
      const fact = calculateFactorial(num);
      setResult(fact.toString());
      setExpression(`${num}!`);
      setJustCalculated(true);
    } else {
      triggerErrorShake();
    }
  };

  // Dynamic font sizing
  const getResultFontSize = (text: string) => {
    if (text.length > 14) return 'text-2xl sm:text-3xl';
    if (text.length > 9) return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl';
  };

  return (
    <div className="max-w-md mx-auto space-y-3 pb-20 select-none">
      {/* Top Segmented Sub-Tab Switcher */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl liquid-glass-dock liquid-specular shadow-sm">
        <button
          type="button"
          onClick={() => setActiveCalcMode('calc')}
          className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeCalcMode === 'calc'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CalcIcon className="w-3.5 h-3.5" />
          <span>Calc</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCalcMode('unit')}
          className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeCalcMode === 'unit'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Units</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCalcMode('finance')}
          className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeCalcMode === 'finance'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Finance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCalcMode('tools')}
          className={`py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 ${
            activeCalcMode === 'tools'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Tools</span>
        </button>
      </div>

      {activeCalcMode === 'unit' && <UnitConverterView />}
      {activeCalcMode === 'finance' && <FinancialCalculatorView />}
      {activeCalcMode === 'tools' && <EverydayMathView />}

      {activeCalcMode === 'calc' && (
        <div className="flex flex-col justify-between h-[calc(100dvh-13rem)] max-h-[520px]">
          {/* 1. Header with Mode Toggles */}
          <div className="flex items-center justify-between px-1 py-0.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Calculator
              </span>
              {isRadians && (
                <span className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10 text-[10px] font-bold">
                  RAD
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsScientific(!isScientific)}
                className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all duration-100 active:scale-95 ${
                  isScientific
                    ? 'liquid-glass-accent shadow-sm'
                    : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                }`}
              >
                {isScientific ? 'Scientific' : 'Sci'}
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="p-1.5 rounded-full liquid-glass-btn text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors relative active:scale-95"
                title="Tape History"
              >
                <History className="w-3.5 h-3.5" />
                {history.length > 0 && (
                  <span className="absolute 0.5 top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Visual Display Window */}
          <div
            className={`my-1 p-3.5 rounded-3xl liquid-glass liquid-specular shadow-sm text-right flex flex-col justify-end min-h-[95px] max-h-[110px] shrink-0 transition-colors duration-100 ${
              isErrorShake
                ? 'border-neutral-500 bg-neutral-500/10'
                : 'border-white/60 dark:border-white/10'
            }`}
          >
        {/* Running Formula */}
        <div className="text-xs sm:text-sm font-mono font-medium text-slate-400 dark:text-slate-500 h-5 overflow-x-auto no-scrollbar whitespace-nowrap leading-none">
          {expression || ' '}
        </div>

        {/* Live Preview / Main Result */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <button
            type="button"
            onClick={handleCopyResult}
            className="p-1.5 rounded-xl liquid-glass-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-95"
            title="Copy Result"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex flex-col items-end overflow-x-auto no-scrollbar">
            {livePreview && !justCalculated && (
              <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                = {livePreview}
              </span>
            )}
            <div
              className={`font-semibold tracking-tight overflow-x-auto no-scrollbar transition-all duration-100 ${getResultFontSize(
                result
              )} ${
                result === 'Error'
                  ? 'text-neutral-500 dark:text-neutral-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {result}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Memory Strip */}
      <div className="flex items-center justify-between gap-1 text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1 px-1 shrink-0">
        <button
          type="button"
          onClick={handleMemoryClear}
          className="py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 active:scale-95 transition-transform flex-1 text-center"
        >
          MC
        </button>
        <button
          type="button"
          onClick={handleMemoryRecall}
          className="py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 active:scale-95 transition-transform flex-1 text-center"
        >
          MR
        </button>
        <button
          type="button"
          onClick={handleMemoryAdd}
          className="py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 active:scale-95 transition-transform flex-1 text-center"
        >
          M+
        </button>
        <button
          type="button"
          onClick={handleMemorySubtract}
          className="py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 active:scale-95 transition-transform flex-1 text-center"
        >
          M−
        </button>
      </div>

      {/* 4. Keypad Grid */}
      <div className="flex-1 flex flex-col justify-between gap-1 min-h-0">
        {/* Optional Scientific Grid */}
        {isScientific && (
          <div className="grid grid-cols-5 gap-1 text-xs font-semibold shrink-0 mb-1">
            <button
              type="button"
              onClick={() => setIsRadians(!isRadians)}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              {isRadians ? 'RAD' : 'DEG'}
            </button>
            <button
              type="button"
              onClick={() => handleInput('sin(')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              sin
            </button>
            <button
              type="button"
              onClick={() => handleInput('cos(')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              cos
            </button>
            <button
              type="button"
              onClick={() => handleInput('tan(')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              tan
            </button>
            <button
              type="button"
              onClick={() => handleInput('√(')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              √
            </button>
            <button
              type="button"
              onClick={() => handleInput('^')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              xʸ
            </button>
            <button
              type="button"
              onClick={() => handleInput('(')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              (
            </button>
            <button
              type="button"
              onClick={() => handleInput(')')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              )
            </button>
            <button
              type="button"
              onClick={() => handleInput('π')}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              π
            </button>
            <button
              type="button"
              onClick={handleFactorial}
              className="py-1.5 rounded-xl liquid-glass-btn font-bold active:scale-90 transition-transform"
            >
              n!
            </button>
          </div>
        )}

        {/* 4x5 Keypad Grid with High-Contrast Color Tiers */}
        <div className="flex-1 grid grid-cols-4 gap-1.5 min-h-0">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="rounded-2xl liquid-glass-btn text-rose-600 dark:text-rose-400 font-bold text-base active:scale-90 transition-all duration-100 flex items-center justify-center"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold active:scale-90 transition-all duration-100 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handlePercentage}
            className="rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold text-base active:scale-90 transition-all duration-100 flex items-center justify-center"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleInput('÷')}
            className="rounded-2xl liquid-glass-amber font-black text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-md"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleInput('7')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleInput('8')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleInput('9')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleInput('×')}
            className="rounded-2xl liquid-glass-amber font-black text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-md"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleInput('4')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleInput('5')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleInput('6')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleInput('−')}
            className="rounded-2xl liquid-glass-amber font-black text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-md"
          >
            −
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleInput('1')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleInput('2')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleInput('3')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleInput('+')}
            className="rounded-2xl liquid-glass-amber font-black text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-md"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={handleToggleSign}
            className="rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-300 font-bold text-base active:scale-90 transition-all duration-100 flex items-center justify-center"
          >
            ±
          </button>
          <button
            type="button"
            onClick={() => handleInput('0')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleInput('.')}
            className="rounded-2xl liquid-glass-card text-slate-900 dark:text-slate-100 font-bold text-xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-sm border border-white/60 dark:border-white/10"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="rounded-2xl liquid-glass-amber font-black text-2xl active:scale-90 transition-all duration-100 flex items-center justify-center shadow-lg border border-white/25"
          >
            =
          </button>
        </div>
      </div>
    </div>
  )}

      {/* 5. Tape History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex flex-col justify-end p-3 animate-fade-in">
          <div className="w-full max-w-md mx-auto rounded-3xl liquid-glass liquid-specular border border-white/60 dark:border-white/10 p-5 space-y-4 max-h-[75vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-900 dark:text-white" />
                Calculation History
              </h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white underline"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No calculations yet
                </div>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      setExpression(h.result);
                      setResult(h.result);
                      setIsHistoryOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors text-right"
                  >
                    <div className="text-xs font-mono text-slate-400">{h.expression}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      = {h.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
