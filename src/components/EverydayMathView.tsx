import React, { useState } from 'react';
import {
  calculateAge,
  calculateDiscount,
  calculateTip,
  calculateBmi,
} from '../lib/mathEngine';
import {
  Calendar,
  Tag,
  HeartPulse,
  Cake,
  Users,
  Percent,
  Activity,
  Sparkles,
  Info,
  Scale,
  CheckCircle2,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export function EverydayMathView() {
  const [activeTab, setActiveTab] = useState<'age' | 'discount' | 'bmi'>('age');

  // Age State
  const [dob, setDob] = useState('2000-01-01');
  const ageResult = calculateAge(dob);

  // Discount & Tip State
  const [price, setPrice] = useState(1500);
  const [discountPct, setDiscountPct] = useState(20);
  const [tipBill, setTipBill] = useState(800);
  const [tipPct, setTipPct] = useState(10);
  const [splitPeople, setSplitPeople] = useState(2);

  const discountResult = calculateDiscount(price, discountPct);
  const tipResult = calculateTip(tipBill, tipPct, splitPeople);

  // BMI State
  const [weightKg, setWeightKg] = useState(65);
  const [heightCm, setHeightCm] = useState(170);
  const bmiResult = calculateBmi(weightKg, heightCm);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Sub Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl liquid-glass-dock liquid-specular shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('age')}
          className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'age'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30'
          }`}
        >
          <Cake className="w-3.5 h-3.5" />
          <span>Age & Date</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discount')}
          className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'discount'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Sale & Tip</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bmi')}
          className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'bmi'
              ? 'liquid-glass-accent text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/30'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>BMI Health</span>
        </button>
      </div>

      {activeTab === 'age' && (
        <div className="p-5 rounded-3xl liquid-glass-card liquid-specular border border-white/60 dark:border-white/10 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            />
          </div>

          {ageResult && (
            <div className="space-y-3">
              {/* Primary Age Highlight */}
              <div className="p-4 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  Exact Age
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {ageResult.years} <span className="text-sm font-normal text-slate-500">Years</span> {ageResult.months} <span className="text-sm font-normal text-slate-500">Months</span> {ageResult.days} <span className="text-sm font-normal text-slate-500">Days</span>
                </div>
              </div>

              {/* Extra Stats */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl liquid-glass-btn">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Next Birthday</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    In {ageResult.nextBirthdayDays} Days 🎂
                  </div>
                </div>
                <div className="p-3 rounded-xl liquid-glass-btn">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Total Days Lived</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {ageResult.totalDays.toLocaleString()} days
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discount' && (
        <div className="space-y-4">
          {/* Discount Box */}
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Discount & Sale Savings</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Original Price (₹)</span>
                <input
                  type="number"
                  value={price || ''}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl liquid-glass-input font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Discount %</span>
                <input
                  type="number"
                  value={discountPct || ''}
                  onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl liquid-glass-input font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">You Pay:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  ₹{discountResult.finalPrice}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">You Save:</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ₹{discountResult.savedAmount} ({discountPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Tip Splitter Box */}
          <div className="p-5 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Tip & Bill Splitter</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Bill (₹)</span>
                <input
                  type="number"
                  value={tipBill || ''}
                  onChange={(e) => setTipBill(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-xl liquid-glass-input font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Tip %</span>
                <input
                  type="number"
                  value={tipPct || ''}
                  onChange={(e) => setTipPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-xl liquid-glass-input font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">People</span>
                <input
                  type="number"
                  min="1"
                  value={splitPeople}
                  onChange={(e) => setSplitPeople(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-2.5 py-1.5 rounded-xl liquid-glass-input font-mono text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Per Person:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">
                  ₹{tipResult.perPerson}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Total with Tip:</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ₹{tipResult.grandTotal} (Tip: ₹{tipResult.tipTotal})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bmi' && bmiResult && (() => {
        const heightM = heightCm > 0 ? heightCm / 100 : 1.7;
        const minHealthyWeight = parseFloat((18.5 * heightM * heightM).toFixed(1));
        const maxHealthyWeight = parseFloat((24.9 * heightM * heightM).toFixed(1));
        const gaugePercent = Math.min(96, Math.max(4, ((bmiResult.bmi - 14) / (38 - 14)) * 100));

        let weightDiffMsg = '';
        if (weightKg < minHealthyWeight) {
          const diff = (minHealthyWeight - weightKg).toFixed(1);
          weightDiffMsg = `You need to gain approximately +${diff} kg to enter the healthy weight threshold (18.5).`;
        } else if (weightKg > maxHealthyWeight) {
          const diff = (weightKg - maxHealthyWeight).toFixed(1);
          weightDiffMsg = `You need to lose approximately -${diff} kg to enter the healthy weight threshold (24.9).`;
        } else {
          weightDiffMsg = 'Excellent! Your weight is in the optimal healthy range for your height.';
        }

        return (
          <div className="space-y-5">
            {/* Input & Score Card */}
            <div className="p-5 sm:p-6 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  BMI Body Mass Health Calculator
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full liquid-glass-btn text-slate-500 dark:text-slate-400">
                  WHO Standard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Weight (kg)</span>
                  <input
                    type="number"
                    value={weightKg || ''}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 68"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input font-mono text-base font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-black dark:focus:border-white transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Height (cm)</span>
                  <input
                    type="number"
                    value={heightCm || ''}
                    onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 172"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-input font-mono text-base font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-black dark:focus:border-white transition"
                  />
                </div>
              </div>

              {/* BMI Result Showcase */}
              <div className="p-5 rounded-3xl liquid-glass border border-black/10 dark:border-white/10 text-center space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Your Body Mass Index</span>
                
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl sm:text-5xl font-mono font-black text-slate-900 dark:text-white">
                    {bmiResult.bmi}
                  </div>
                  <div className="text-left">
                    <span
                      className={`inline-block px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${
                        bmiResult.category === 'Normal'
                          ? 'liquid-glass-emerald'
                          : bmiResult.category === 'Underweight'
                          ? 'liquid-glass-amber'
                          : bmiResult.category === 'Overweight'
                          ? 'bg-orange-500 text-white shadow-orange-500/25'
                          : 'liquid-glass-rose'
                      }`}
                    >
                      {bmiResult.category}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Normal: 18.5 – 24.9 kg/m²
                    </p>
                  </div>
                </div>

                {/* Visual Spectrum Gauge Bar */}
                <div className="space-y-2 pt-2 px-1">
                  <div className="relative w-full h-3.5 rounded-full overflow-visible flex bg-black/10 dark:bg-white/10 p-0.5">
                    <div className="h-full w-[19%] rounded-l-full bg-amber-400 shadow-sm" title="Underweight (<18.5)" />
                    <div className="h-full w-[27%] bg-emerald-500 shadow-sm" title="Normal (18.5-24.9)" />
                    <div className="h-full w-[21%] bg-orange-500 shadow-sm" title="Overweight (25-29.9)" />
                    <div className="h-full w-[33%] rounded-r-full bg-rose-500 shadow-sm" title="Obese (≥30)" />

                    {/* Indicator Needle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-6 rounded-md bg-white border-2 border-slate-900 dark:border-white shadow-lg -translate-x-1/2 transition-all duration-300 pointer-events-none"
                      style={{ left: `${gaugePercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9.5px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                    <span className="text-amber-500">&lt; 18.5</span>
                    <span className="text-emerald-500">18.5 – 24.9</span>
                    <span className="text-orange-500">25.0 – 29.9</span>
                    <span className="text-rose-500">≥ 30.0</span>
                  </div>
                </div>

                {/* Healthy Weight Guidance */}
                <div className="p-3.5 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-xs space-y-1">
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Ideal weight range for your height ({heightCm} cm):
                    <strong className="text-slate-900 dark:text-white font-bold ml-1">
                      {minHealthyWeight} kg – {maxHealthyWeight} kg
                    </strong>
                  </div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {weightDiffMsg}
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Educational Guide (What is BMI, How Much It Should Be, and Guidelines) */}
            <div className="p-5 sm:p-6 rounded-3xl liquid-glass-card liquid-specular border border-black/10 dark:border-white/10 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  BMI Guide: What It Is & What Yours Should Be
                </h3>
              </div>

              {/* What is BMI */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  What is Body Mass Index (BMI)?
                </h4>
                <p>
                  Body Mass Index (BMI) is a clinical screening metric defined by the World Health Organization (WHO). It estimates whether an individual has a healthy amount of body weight proportional to their height:
                </p>
                <div className="p-2.5 rounded-xl liquid-glass-btn font-mono text-xs font-bold text-center text-slate-900 dark:text-white">
                  BMI = Weight (kg) ÷ [Height (m)]²
                </div>
              </div>

              {/* What should it be */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  What should your BMI be?
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  For healthy adults, the universally recommended optimal BMI is <strong className="text-slate-900 dark:text-white">18.5 to 24.9 kg/m²</strong>. Maintaining your BMI within this window carries the lowest statistical risk of heart disease, type-2 diabetes, hypertension, and metabolic syndrome.
                </p>

                {/* WHO Categories Matrix */}
                <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 mt-2">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-black/5 dark:bg-white/5 font-bold text-slate-900 dark:text-white border-b border-black/10 dark:border-white/10">
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">BMI Range</th>
                        <th className="p-2.5">Health Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      <tr>
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">Underweight</td>
                        <td className="p-2.5 font-mono">&lt; 18.5</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">May indicate nutritional deficit, lower immunity, or bone loss.</td>
                      </tr>
                      <tr className="bg-black/5 dark:bg-white/5">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">Normal / Healthy</td>
                        <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">18.5 – 24.9</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">Lowest risk of cardiovascular and metabolic illness. Optimal target.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">Overweight</td>
                        <td className="p-2.5 font-mono">25.0 – 29.9</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">Moderate risk of pre-diabetes, elevated cholesterol, and joint strain.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">Obesity (Class I–III)</td>
                        <td className="p-2.5 font-mono">≥ 30.0</td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">High risk of cardiovascular disease, fatty liver, and sleep apnea.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Asian Population Note */}
                <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  <strong>Indian / Asian Population Reference:</strong> According to the Indian Council of Medical Research (ICMR) and WHO Asia-Pacific guidelines, South Asians typically carry a higher percentage of abdominal visceral fat at lower weights. Health experts frequently recommend aiming for a BMI of <strong>18.5 to 22.9 kg/m²</strong> for optimal metabolic wellness.
                </div>
              </div>

              {/* Actionable Health Habits */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  Key Daily Habits to Maintain a Healthy BMI
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">1. Physical Activity</span>
                    <p className="text-slate-500 dark:text-slate-400">
                      Target 150 minutes of moderate aerobic exercise (brisk walking, cycling) and 2 resistance workouts per week.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">2. Balanced Whole Foods</span>
                    <p className="text-slate-500 dark:text-slate-400">
                      Prioritize dietary fiber, leafy vegetables, lentils, and lean proteins while minimizing sugar-sweetened beverages.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">3. Daily Hydration</span>
                    <p className="text-slate-500 dark:text-slate-400">
                      Drink 2.5 to 3.5 liters of water daily to support metabolism, digestive health, and satiety.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white">4. Quality Sleep</span>
                    <p className="text-slate-500 dark:text-slate-400">
                      7 to 8 hours of restful sleep helps regulate cortisol and ghrelin (hunger hormones) to prevent overeating.
                    </p>
                  </div>
                </div>
              </div>

              {/* Limitations */}
              <div className="p-3.5 rounded-2xl liquid-glass-card border border-black/10 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  Clinical Limitations of BMI:
                </span>
                <p>
                  BMI does not differentiate between dense skeletal muscle and adipose fat. Athletes, bodybuilders, and pregnant individuals may record higher BMI numbers without having excess fat. For full body composition assessments, combine BMI with waist circumference and body fat percentage.
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
