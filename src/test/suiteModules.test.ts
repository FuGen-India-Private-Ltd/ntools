import { describe, it, expect } from 'vitest';
import { evaluateMathExpression, calculateFactorial } from '../lib/mathEngine';
import { searchAndFilterNotes, NoteItem } from '../lib/notesStorage';
import { getHolidaysForMonth } from '../lib/calendarStorage';
import { formatStopwatchTime } from '../lib/timeAndClock';
import { formatFileSize } from '../lib/imageCompressor';

describe('All-in-One Utility Suite Tests', () => {
  describe('Smart Math Calculator Engine', () => {
    it('evaluates basic arithmetic operations', () => {
      expect(evaluateMathExpression('25 + 75').result).toBe('100');
      expect(evaluateMathExpression('100 − 35').result).toBe('65');
      expect(evaluateMathExpression('12 × 12').result).toBe('144');
      expect(evaluateMathExpression('100 ÷ 4').result).toBe('25');
    });

    it('evaluates percentages', () => {
      expect(evaluateMathExpression('50%').result).toBe('0.5');
      expect(evaluateMathExpression('200 × 15%').result).toBe('30');
    });

    it('evaluates square roots and cube roots', () => {
      expect(evaluateMathExpression('√(144)').result).toBe('12');
      expect(evaluateMathExpression('∛(27)').result).toBe('3');
    });

    it('evaluates powers and exponents', () => {
      expect(evaluateMathExpression('2^8').result).toBe('256');
    });

    it('evaluates trigonometry (degrees and radians)', () => {
      expect(evaluateMathExpression('sin(90)', false).result).toBe('1');
      expect(evaluateMathExpression('cos(0)', false).result).toBe('1');
    });

    it('calculates factorials correctly', () => {
      expect(calculateFactorial(0)).toBe(1);
      expect(calculateFactorial(1)).toBe(1);
      expect(calculateFactorial(5)).toBe(120);
      expect(calculateFactorial(6)).toBe(720);
    });
  });

  describe('Rich Notes Search & Filter', () => {
    const sampleNotes: NoteItem[] = [
      {
        id: '1',
        title: 'Kannada Literature Notes',
        content: 'Kuvempu and Bendre poetry revision',
        category: 'kannada',
        isPinned: true,
        isFavorite: true,
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: '2',
        title: 'React Architecture Plan',
        content: 'Component state and storage guidelines',
        category: 'study',
        isPinned: false,
        isFavorite: false,
        createdAt: 1500,
        updatedAt: 2500,
      },
    ];

    it('filters notes by search query', () => {
      const results = searchAndFilterNotes(sampleNotes, 'Kuvempu', 'all');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Kannada Literature Notes');
    });

    it('filters notes by category', () => {
      const results = searchAndFilterNotes(sampleNotes, '', 'study');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('React Architecture Plan');
    });

    it('prioritizes pinned notes in sort order', () => {
      const results = searchAndFilterNotes(sampleNotes, '', 'all');
      expect(results[0].isPinned).toBe(true);
    });
  });

  describe('Calendar & Localized Holidays', () => {
    it('finds Kannada Rajyotsava in November (Month index 10)', () => {
      const holidays = getHolidaysForMonth(2026, 10); // November is index 10
      const rajyotsava = holidays.find((h) => h.day === 1);
      expect(rajyotsava).toBeDefined();
      expect(rajyotsava?.holiday.name).toBe('Kannada Rajyotsava');
    });

    it('finds Ganesh Chaturthi and Gauri Habba in September 2026 (Month index 8)', () => {
      const holidays = getHolidaysForMonth(2026, 8); // September is index 8
      const ganesh = holidays.find((h) => h.day === 14);
      const gauri = holidays.find((h) => h.day === 13);
      expect(ganesh).toBeDefined();
      expect(ganesh?.holiday.name).toContain('Ganesh Chaturthi');
      expect(gauri).toBeDefined();
      expect(gauri?.holiday.name).toContain('Swarna Gauri');
    });

    it('finds Ganesh Chaturthi in August 2025 (Month index 7)', () => {
      const holidays = getHolidaysForMonth(2025, 7); // August is index 7
      const ganesh = holidays.find((h) => h.day === 27);
      expect(ganesh).toBeDefined();
      expect(ganesh?.holiday.name).toContain('Ganesh Chaturthi');
    });
  });

  describe('Time & Formatting Helpers', () => {
    it('formats stopwatch milliseconds accurately', () => {
      const formatted = formatStopwatchTime(65430); // 1m 5s 430ms
      expect(formatted.minutes).toBe('01');
      expect(formatted.seconds).toBe('05');
      expect(formatted.millis).toBe('43');
    });

    it('formats file sizes accurately', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024 * 500)).toBe('500 KB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });
  });
});
