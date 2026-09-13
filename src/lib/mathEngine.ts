// Comprehensive Standard & Scientific Math Calculator Engine
// Supports Trigonometry, Logarithms, Powers, Roots, Factorial, Constants, History,
// Unit Converter (9 categories), GST, Loan/EMI, Age/Date, Discount/Tip, and BMI.

export interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = 'app_calc_history_v1';
const MEMORY_STORAGE_KEY = 'app_calc_memory_v1';

export function getStoredCalcHistory(): CalculationHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredCalcHistory(history: CalculationHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save calculation history', e);
  }
}

export function getStoredMemoryValue(): number {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

export function saveStoredMemoryValue(val: number) {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, val.toString());
  } catch (e) {
    console.error('Failed to save memory value', e);
  }
}

export function calculateFactorial(n: number): number {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let res = 1;
  for (let i = 2; i <= Math.floor(n); i++) {
    res *= i;
  }
  return res;
}

export function autoCloseParentheses(expr: string): string {
  if (!expr) return '';
  let openCount = 0;
  let closeCount = 0;
  for (const char of expr) {
    if (char === '(') openCount++;
    else if (char === ')') closeCount++;
  }
  if (openCount > closeCount) {
    return expr + ')'.repeat(openCount - closeCount);
  }
  return expr;
}

export function evaluateMathExpression(
  expr: string,
  isRadians: boolean = false
): { result: string; error?: string } {
  if (!expr || !expr.trim()) return { result: '0' };

  try {
    let balanced = autoCloseParentheses(expr.trim());

    let sanitized = balanced
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'Math.PI')
      .replace(/e(?![a-zA-Z0-9])/g, 'Math.E');

    sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
    sanitized = sanitized.replace(/√\(/g, 'Math.sqrt(');
    sanitized = sanitized.replace(/√(\d+(\.\d+)?)/g, 'Math.sqrt($1)');
    sanitized = sanitized.replace(/∛\(/g, 'Math.cbrt(');
    sanitized = sanitized.replace(/∛(\d+(\.\d+)?)/g, 'Math.cbrt($1)');
    sanitized = sanitized.replace(/(\w+)\^(\w+|\([^)]+\))/g, 'Math.pow($1, $2)');

    // Trigonometry
    if (!isRadians) {
      sanitized = sanitized.replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)');
      sanitized = sanitized.replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)');
      sanitized = sanitized.replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');
    } else {
      sanitized = sanitized.replace(/sin\(/g, 'Math.sin(');
      sanitized = sanitized.replace(/cos\(/g, 'Math.cos(');
      sanitized = sanitized.replace(/tan\(/g, 'Math.tan(');
    }

    sanitized = sanitized.replace(/ln\(/g, 'Math.log(');
    sanitized = sanitized.replace(/log\(/g, 'Math.log10(');
    // Whitelist check: allow numbers, arithmetic operators, and safe Math functions
    const validTokens = /^(?:[0-9+\-*/()., \t]|Math\.(?:sqrt|cbrt|pow|sin|cos|tan|log|log10|abs|PI|E))+$/;
    if (!validTokens.test(sanitized)) {
      return { result: 'Error', error: 'Invalid characters in expression' };
    }

    const evalFn = new Function(`"use strict"; return (${sanitized});`);
    const val = evalFn();

    if (typeof val !== 'number' || isNaN(val)) {
      return { result: 'Error', error: 'Undefined calculation' };
    }

    if (!isFinite(val)) {
      return { result: 'Infinity' };
    }

    const rounded = Math.abs(val) < 1e-12 ? 0 : parseFloat(val.toPrecision(12));
    return { result: rounded.toString() };
  } catch (err: any) {
    return { result: 'Error', error: err.message || 'Syntax Error' };
  }
}

// --------------------------------------------------------------------------
// 2. GST & TAX CALCULATION ENGINE
// --------------------------------------------------------------------------
export interface GstResult {
  netAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  ratePercent: number;
}

export function calculateGst(
  amount: number,
  ratePercent: number,
  isReverse = false
): GstResult {
  if (amount <= 0 || ratePercent < 0) {
    return { netAmount: 0, gstAmount: 0, cgst: 0, sgst: 0, totalAmount: 0, ratePercent };
  }

  if (isReverse) {
    // Reverse GST (Exclusive of tax: amount is gross, find original net)
    const net = amount / (1 + ratePercent / 100);
    const tax = amount - net;
    return {
      netAmount: parseFloat(net.toFixed(2)),
      gstAmount: parseFloat(tax.toFixed(2)),
      cgst: parseFloat((tax / 2).toFixed(2)),
      sgst: parseFloat((tax / 2).toFixed(2)),
      totalAmount: parseFloat(amount.toFixed(2)),
      ratePercent,
    };
  }

  // Forward GST (+GST)
  const tax = (amount * ratePercent) / 100;
  const total = amount + tax;
  return {
    netAmount: parseFloat(amount.toFixed(2)),
    gstAmount: parseFloat(tax.toFixed(2)),
    cgst: parseFloat((tax / 2).toFixed(2)),
    sgst: parseFloat((tax / 2).toFixed(2)),
    totalAmount: parseFloat(total.toFixed(2)),
    ratePercent,
  };
}

// --------------------------------------------------------------------------
// 3. LOAN & EMI CALCULATION ENGINE
// --------------------------------------------------------------------------
export interface EmiResult {
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  principalPercentage: number;
  interestPercentage: number;
}

export function calculateLoanEmi(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EmiResult {
  if (principal <= 0 || tenureMonths <= 0) {
    return { monthlyEmi: 0, totalInterest: 0, totalPayment: 0, principalPercentage: 0, interestPercentage: 0 };
  }

  if (annualInterestRate === 0) {
    const emi = principal / tenureMonths;
    return {
      monthlyEmi: parseFloat(emi.toFixed(2)),
      totalInterest: 0,
      totalPayment: principal,
      principalPercentage: 100,
      interestPercentage: 0,
    };
  }

  const monthlyRate = annualInterestRate / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;

  const principalPct = Math.round((principal / totalPayment) * 100);
  const interestPct = 100 - principalPct;

  return {
    monthlyEmi: parseFloat(emi.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalPayment: parseFloat(totalPayment.toFixed(2)),
    principalPercentage: principalPct,
    interestPercentage: interestPct,
  };
}

// --------------------------------------------------------------------------
// 4. AGE & DATE CALCULATION ENGINE
// --------------------------------------------------------------------------
export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthdayDays: number;
  dayOfWeek: string;
}

export function calculateAge(dobStr: string, asOfDate = new Date()): AgeResult | null {
  if (!dobStr) return null;
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return null;

  let years = asOfDate.getFullYear() - birthDate.getFullYear();
  let months = asOfDate.getMonth() - birthDate.getMonth();
  let days = asOfDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const diffMs = asOfDate.getTime() - birthDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Next birthday calculation
  let nextBday = new Date(asOfDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBday < asOfDate) {
    nextBday = new Date(asOfDate.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }
  const nextBdayMs = nextBday.getTime() - asOfDate.getTime();
  const nextBirthdayDays = Math.ceil(nextBdayMs / (1000 * 60 * 60 * 24));

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[birthDate.getDay()];

  return {
    years,
    months,
    days,
    totalDays,
    nextBirthdayDays,
    dayOfWeek,
  };
}

// --------------------------------------------------------------------------
// 5. DISCOUNT & TIP CALCULATORS
// --------------------------------------------------------------------------
export function calculateDiscount(price: number, discountPercent: number): {
  finalPrice: number;
  savedAmount: number;
} {
  const savings = (price * discountPercent) / 100;
  const finalPrice = Math.max(0, price - savings);
  return {
    finalPrice: parseFloat(finalPrice.toFixed(2)),
    savedAmount: parseFloat(savings.toFixed(2)),
  };
}

export function calculateTip(
  bill: number,
  tipPercent: number,
  peopleCount = 1
): {
  tipTotal: number;
  grandTotal: number;
  perPerson: number;
} {
  const count = Math.max(1, peopleCount);
  const tipTotal = (bill * tipPercent) / 100;
  const grandTotal = bill + tipTotal;
  return {
    tipTotal: parseFloat(tipTotal.toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    perPerson: parseFloat((grandTotal / count).toFixed(2)),
  };
}

// --------------------------------------------------------------------------
// 6. BMI HEALTH CALCULATOR ENGINE
// --------------------------------------------------------------------------
export interface BmiResult {
  bmi: number;
  category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  color: string;
  idealRange: string;
}

export function calculateBmi(weightKg: number, heightCm: number): BmiResult | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const roundedBmi = parseFloat(bmi.toFixed(1));

  let category: BmiResult['category'] = 'Normal';
  let color = 'text-emerald-500';

  if (bmi < 18.5) {
    category = 'Underweight';
    color = 'text-amber-500';
  } else if (bmi < 25) {
    category = 'Normal';
    color = 'text-emerald-500';
  } else if (bmi < 30) {
    category = 'Overweight';
    color = 'text-orange-500';
  } else {
    category = 'Obese';
    color = 'text-rose-500';
  }

  const minIdeal = (18.5 * heightM * heightM).toFixed(1);
  const maxIdeal = (24.9 * heightM * heightM).toFixed(1);

  return {
    bmi: roundedBmi,
    category,
    color,
    idealRange: `${minIdeal} kg – ${maxIdeal} kg`,
  };
}

// --------------------------------------------------------------------------
// 7. COMPREHENSIVE 9-CATEGORY UNIT CONVERTER ENGINE
// --------------------------------------------------------------------------
export type UnitCategory =
  | 'length'
  | 'mass'
  | 'area'
  | 'volume'
  | 'temperature'
  | 'speed'
  | 'time'
  | 'storage'
  | 'energy';

export interface UnitDefinition {
  id: string;
  name: string;
  factorToBase: number; // Multiply by this to get base unit
}

export const UNIT_CATEGORIES: Record<
  UnitCategory,
  { name: string; baseUnit: string; units: UnitDefinition[] }
> = {
  length: {
    name: 'Length & Distance',
    baseUnit: 'meter',
    units: [
      { id: 'km', name: 'Kilometer (km)', factorToBase: 1000 },
      { id: 'm', name: 'Meter (m)', factorToBase: 1 },
      { id: 'cm', name: 'Centimeter (cm)', factorToBase: 0.01 },
      { id: 'mm', name: 'Millimeter (mm)', factorToBase: 0.001 },
      { id: 'mi', name: 'Mile (mi)', factorToBase: 1609.344 },
      { id: 'yd', name: 'Yard (yd)', factorToBase: 0.9144 },
      { id: 'ft', name: 'Foot (ft)', factorToBase: 0.3048 },
      { id: 'in', name: 'Inch (in)', factorToBase: 0.0254 },
    ],
  },
  mass: {
    name: 'Weight & Mass',
    baseUnit: 'kilogram',
    units: [
      { id: 'kg', name: 'Kilogram (kg)', factorToBase: 1 },
      { id: 'g', name: 'Gram (g)', factorToBase: 0.001 },
      { id: 'mg', name: 'Milligram (mg)', factorToBase: 0.000001 },
      { id: 'lb', name: 'Pound (lb)', factorToBase: 0.45359237 },
      { id: 'oz', name: 'Ounce (oz)', factorToBase: 0.0283495231 },
      { id: 'ton', name: 'Metric Ton (t)', factorToBase: 1000 },
    ],
  },
  area: {
    name: 'Area',
    baseUnit: 'sq_meter',
    units: [
      { id: 'sq_m', name: 'Square Meter (m²)', factorToBase: 1 },
      { id: 'sq_km', name: 'Square Kilometer (km²)', factorToBase: 1000000 },
      { id: 'sq_ft', name: 'Square Foot (ft²)', factorToBase: 0.092903 },
      { id: 'acre', name: 'Acre (ac)', factorToBase: 4046.86 },
      { id: 'hectare', name: 'Hectare (ha)', factorToBase: 10000 },
      { id: 'guntha', name: 'Guntha (India)', factorToBase: 101.17 },
    ],
  },
  volume: {
    name: 'Volume & Liquid',
    baseUnit: 'liter',
    units: [
      { id: 'l', name: 'Liter (L)', factorToBase: 1 },
      { id: 'ml', name: 'Milliliter (mL)', factorToBase: 0.001 },
      { id: 'gal', name: 'Gallon (US)', factorToBase: 3.78541 },
      { id: 'cup', name: 'Cup', factorToBase: 0.236588 },
      { id: 'fl_oz', name: 'Fluid Ounce (fl oz)', factorToBase: 0.0295735 },
      { id: 'm3', name: 'Cubic Meter (m³)', factorToBase: 1000 },
    ],
  },
  temperature: {
    name: 'Temperature',
    baseUnit: 'celsius',
    units: [
      { id: 'c', name: 'Celsius (°C)', factorToBase: 1 },
      { id: 'f', name: 'Fahrenheit (°F)', factorToBase: 1 },
      { id: 'k', name: 'Kelvin (K)', factorToBase: 1 },
    ],
  },
  speed: {
    name: 'Speed',
    baseUnit: 'm_per_s',
    units: [
      { id: 'kmh', name: 'Kilometers/hour (km/h)', factorToBase: 0.277778 },
      { id: 'mph', name: 'Miles/hour (mph)', factorToBase: 0.44704 },
      { id: 'ms', name: 'Meters/second (m/s)', factorToBase: 1 },
      { id: 'knot', name: 'Knot (kn)', factorToBase: 0.514444 },
    ],
  },
  time: {
    name: 'Time',
    baseUnit: 'second',
    units: [
      { id: 'yr', name: 'Year (yr)', factorToBase: 31536000 },
      { id: 'wk', name: 'Week (wk)', factorToBase: 604800 },
      { id: 'd', name: 'Day (d)', factorToBase: 86400 },
      { id: 'h', name: 'Hour (h)', factorToBase: 3600 },
      { id: 'min', name: 'Minute (min)', factorToBase: 60 },
      { id: 's', name: 'Second (s)', factorToBase: 1 },
      { id: 'ms', name: 'Millisecond (ms)', factorToBase: 0.001 },
    ],
  },
  storage: {
    name: 'Digital Data & Storage',
    baseUnit: 'byte',
    units: [
      { id: 'tb', name: 'Terabyte (TB)', factorToBase: 1099511627776 },
      { id: 'gb', name: 'Gigabyte (GB)', factorToBase: 1073741824 },
      { id: 'mb', name: 'Megabyte (MB)', factorToBase: 1048576 },
      { id: 'kb', name: 'Kilobyte (KB)', factorToBase: 1024 },
      { id: 'b', name: 'Byte (B)', factorToBase: 1 },
      { id: 'bit', name: 'Bit (b)', factorToBase: 0.125 },
    ],
  },
  energy: {
    name: 'Energy',
    baseUnit: 'joule',
    units: [
      { id: 'kj', name: 'Kilojoule (kJ)', factorToBase: 1000 },
      { id: 'j', name: 'Joule (J)', factorToBase: 1 },
      { id: 'kcal', name: 'Kilocalorie (kcal)', factorToBase: 4184 },
      { id: 'kwh', name: 'Kilowatt-hour (kWh)', factorToBase: 3600000 },
    ],
  },
};

export function convertUnits(
  category: UnitCategory,
  value: number,
  fromUnitId: string,
  toUnitId: string
): number {
  if (isNaN(value)) return 0;
  if (fromUnitId === toUnitId) return value;

  // Special handling for Temperature (°C, °F, K)
  if (category === 'temperature') {
    let celsius = value;
    if (fromUnitId === 'f') {
      celsius = ((value - 32) * 5) / 9;
    } else if (fromUnitId === 'k') {
      celsius = value - 273.15;
    }

    if (toUnitId === 'c') return parseFloat(celsius.toFixed(4));
    if (toUnitId === 'f') return parseFloat(((celsius * 9) / 5 + 32).toFixed(4));
    if (toUnitId === 'k') return parseFloat((celsius + 273.15).toFixed(4));
    return celsius;
  }

  const catData = UNIT_CATEGORIES[category];
  const fromDef = catData.units.find((u) => u.id === fromUnitId);
  const toDef = catData.units.find((u) => u.id === toUnitId);

  if (!fromDef || !toDef) return value;

  const baseValue = value * fromDef.factorToBase;
  const result = baseValue / toDef.factorToBase;
  return parseFloat(result.toPrecision(8));
}
