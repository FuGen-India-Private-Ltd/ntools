import { describe, it, expect } from 'vitest';
import { parsePageRange } from '../lib/pdfMerger';
import {
  calculateGst,
  calculateLoanEmi,
  calculateAge,
  calculateDiscount,
  calculateTip,
  calculateBmi,
  convertUnits,
} from '../lib/mathEngine';
import { getCountdownToAlarm, calculateSleepCycles } from '../lib/timeAndClock';

describe('PDF Tools & Page Range Parser', () => {
  it('correctly parses "all" page ranges', () => {
    const pages = parsePageRange('all', 5);
    expect(pages).toEqual([0, 1, 2, 3, 4]);
  });

  it('correctly parses comma-separated and dash ranges (1-indexed to 0-indexed)', () => {
    const pages = parsePageRange('1-3, 5', 5);
    expect(pages).toEqual([0, 1, 2, 4]);
  });

  it('gracefully handles out-of-bound or inverted ranges', () => {
    const pages = parsePageRange('4-2, 10', 5);
    expect(pages).toEqual([1, 2, 3]);
  });
});

describe('Financial Math Engine (GST & Loan EMI)', () => {
  it('calculates forward +GST correctly (18% on ₹1000)', () => {
    const res = calculateGst(1000, 18, false);
    expect(res.netAmount).toBe(1000);
    expect(res.gstAmount).toBe(180);
    expect(res.cgst).toBe(90);
    expect(res.sgst).toBe(90);
    expect(res.totalAmount).toBe(1180);
  });

  it('calculates reverse -GST correctly (extract from ₹1180 gross)', () => {
    const res = calculateGst(1180, 18, true);
    expect(res.netAmount).toBe(1000);
    expect(res.gstAmount).toBe(180);
    expect(res.cgst).toBe(90);
    expect(res.sgst).toBe(90);
    expect(res.totalAmount).toBe(1180);
  });

  it('calculates standard home/personal loan EMI correctly', () => {
    // Principal ₹100,000, 12% annual rate, 12 months (1 year)
    const res = calculateLoanEmi(100000, 12, 12);
    expect(res.monthlyEmi).toBeGreaterThan(8800);
    expect(res.monthlyEmi).toBeLessThan(8900);
    expect(res.totalPayment).toBeGreaterThan(100000);
    expect(res.totalInterest).toBeCloseTo(res.totalPayment - 100000, 2);
  });
});

describe('Everyday Life Math (Age, Discount, Tip, BMI)', () => {
  it('calculates age correctly from DOB', () => {
    const asOf = new Date('2026-01-15T00:00:00Z');
    const res = calculateAge('2000-01-15', asOf);
    expect(res).not.toBeNull();
    if (res) {
      expect(res.years).toBe(26);
      expect(res.months).toBe(0);
      expect(res.days).toBe(0);
    }
  });

  it('calculates discount and savings accurately', () => {
    const res = calculateDiscount(2000, 25);
    expect(res.finalPrice).toBe(1500);
    expect(res.savedAmount).toBe(500);
  });

  it('calculates restaurant tip and per-person bill split', () => {
    const res = calculateTip(1000, 10, 2);
    expect(res.tipTotal).toBe(100);
    expect(res.grandTotal).toBe(1100);
    expect(res.perPerson).toBe(550);
  });

  it('calculates BMI index and category', () => {
    // 70 kg, 175 cm -> 70 / (1.75 * 1.75) = 22.86 (Normal)
    const res = calculateBmi(70, 175);
    expect(res).not.toBeNull();
    if (res) {
      expect(res.bmi).toBe(22.9);
      expect(res.category).toBe('Normal');
    }
  });
});

describe('9-Category Unit Converter Engine', () => {
  it('converts length units (km to meters, miles to km)', () => {
    expect(convertUnits('length', 5, 'km', 'm')).toBe(5000);
    expect(convertUnits('length', 1, 'mi', 'km')).toBe(1.609344);
  });

  it('converts weight units (kg to grams, lbs to kg)', () => {
    expect(convertUnits('mass', 2, 'kg', 'g')).toBe(2000);
    expect(convertUnits('mass', 1, 'lb', 'kg')).toBe(0.45359237);
  });

  it('converts temperature (°C to °F, °F to °C, °C to K)', () => {
    expect(convertUnits('temperature', 0, 'c', 'f')).toBe(32);
    expect(convertUnits('temperature', 100, 'c', 'f')).toBe(212);
    expect(convertUnits('temperature', 212, 'f', 'c')).toBe(100);
    expect(convertUnits('temperature', 0, 'c', 'k')).toBe(273.15);
  });

  it('converts digital storage units (GB to MB, TB to GB)', () => {
    expect(convertUnits('storage', 1, 'gb', 'mb')).toBe(1024);
    expect(convertUnits('storage', 2, 'tb', 'gb')).toBe(2048);
  });
});

describe('Time & Alarm Countdown Helpers', () => {
  it('returns valid alarm countdown string', () => {
    const countdown = getCountdownToAlarm('07:00');
    expect(countdown).toMatch(/^Rings in \d+(?:h(?: \d+m)?|m)$/);
  });

  it('calculates 90-minute REM sleep cycle options', () => {
    const cycles = calculateSleepCycles(new Date('2026-09-07T22:00:00Z'));
    expect(cycles.length).toBe(4);
    expect(cycles[0].cycles).toBe(6);
    expect(cycles[1].cycles).toBe(5);
  });
});
