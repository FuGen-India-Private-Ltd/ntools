import React, { useState } from 'react';
import { calculateGst, calculateLoanEmi } from '../lib/mathEngine';
import {
  Percent,
  Landmark,
  Receipt,
  PieChart,
  IndianRupee,
  Sparkles,
} from 'lucide-react';

export function FinancialCalculatorView() {
  const [activeTool, setActiveTool] = useState<'gst' | 'emi'>('gst');

  // GST State
  const [gstAmount, setGstAmount] = useState<number>(1000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [isReverseGst, setIsReverseGst] = useState<boolean>(false);

  // EMI State
  const [principal, setPrincipal] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(9.5);
  const [tenureYears, setTenureYears] = useState<number>(5);

  const gstResult = calculateGst(gstAmount, gstRate, isReverseGst);
  const emiResult = calculateLoanEmi(principal, interestRate, tenureYears * 12);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Tool Selector */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl liquid-glass-dock shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTool('gst')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTool === 'gst'
              ? 'liquid-glass-accent font-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>GST & Sales Tax</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('emi')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTool === 'emi'
              ? 'liquid-glass-accent font-black shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Loan & EMI Calculator</span>
        </button>
      </div>

      {activeTool === 'gst' ? (
        /* GST Calculator View */
        <div className="p-5 rounded-3xl liquid-glass-card liquid-specular space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Indian GST & Tax Calculator
            </span>
            <div className="flex items-center gap-1 liquid-glass-dock p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsReverseGst(false)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                  !isReverseGst ? 'liquid-glass-accent shadow-sm' : 'text-slate-500'
                }`}
              >
                +GST (Add)
              </button>
              <button
                type="button"
                onClick={() => setIsReverseGst(true)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                  isReverseGst ? 'liquid-glass-accent shadow-sm' : 'text-slate-500'
                }`}
              >
                -GST (Remove)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500">
              {isReverseGst ? 'Gross Amount (Inclusive of GST)' : 'Net Amount (Exclusive of GST)'}
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl liquid-glass-input">
              <IndianRupee className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />
              <input
                type="number"
                value={gstAmount || ''}
                onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
                className="w-full bg-transparent font-mono text-lg font-bold text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Slabs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500">
              GST Slab Rate ({gstRate}%)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 12, 18, 28].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setGstRate(rate)}
                  className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                    gstRate === rate
                      ? 'liquid-glass-accent font-black shadow-sm'
                      : 'liquid-glass-btn text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Result Card */}
          <div className="p-4 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Net Amount:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(gstResult.netAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">CGST ({gstRate / 2}%):</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(gstResult.cgst)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">SGST ({gstRate / 2}%):</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(gstResult.sgst)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Total GST ({gstRate}%):</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(gstResult.gstAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-white/20 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Total Gross Payable:
              </span>
              <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(gstResult.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Loan EMI Calculator View */
        <div className="p-5 rounded-3xl liquid-glass-card liquid-specular space-y-4">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            Loan & EMI Amortization Calculator
          </span>

          {/* Principal */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>Loan Amount</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(principal)}</span>
            </div>
            <input
              type="number"
              value={principal || ''}
              onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>Interest Rate (% p.a.)</span>
              <span className="font-mono text-slate-900 dark:text-white">{interestRate}%</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={interestRate || ''}
              onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          {/* Tenure */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>Loan Tenure</span>
              <span className="font-mono text-slate-900 dark:text-white">{tenureYears} Years ({tenureYears * 12} Mos)</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={tenureYears}
              onChange={(e) => setTenureYears(parseInt(e.target.value, 10))}
              className="w-full liquid-slider my-2"
            />
          </div>

          {/* Monthly EMI Highlight Card */}
          <div className="p-4 rounded-2xl liquid-glass-card border border-white/20 dark:border-white/10 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
              Monthly EMI Payable
            </span>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              {formatCurrency(emiResult.monthlyEmi)}
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl liquid-glass-card border border-white/10">
              <span className="text-[10px] text-slate-400">Total Interest</span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatCurrency(emiResult.totalInterest)}
              </div>
            </div>
            <div className="p-3 rounded-xl liquid-glass-card border border-white/10">
              <span className="text-[10px] text-slate-400">Total Amount</span>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatCurrency(emiResult.totalPayment)}
              </div>
            </div>
          </div>

          {/* Ratio Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              <span>Principal: {emiResult.principalPercentage}%</span>
              <span>Interest: {emiResult.interestPercentage}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200/50 dark:bg-slate-700/50 overflow-hidden flex">
              <div
                className="bg-black dark:bg-white h-full"
                style={{ width: `${emiResult.principalPercentage}%` }}
              />
              <div
                className="bg-slate-400 dark:bg-slate-600 h-full"
                style={{ width: `${emiResult.interestPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
