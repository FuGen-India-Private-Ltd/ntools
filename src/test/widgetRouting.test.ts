import { describe, it, expect } from 'vitest';
import { parseDeepLinkRoute, VALID_APP_MODULES } from '../lib/widgetRouting';

describe('Widget and Shortcut Deep-Link Routing Tests', () => {
  it('parses standard app module hash routes correctly', () => {
    expect(parseDeepLinkRoute('#calendar').module).toBe('calendar');
    expect(parseDeepLinkRoute('#tasks').module).toBe('tasks');
    expect(parseDeepLinkRoute('#notes').module).toBe('notes');
    expect(parseDeepLinkRoute('#clock').module).toBe('clock');
    expect(parseDeepLinkRoute('#calc').module).toBe('calc');
    expect(parseDeepLinkRoute('#converter').module).toBe('converter');
    expect(parseDeepLinkRoute('#files').module).toBe('files');
    expect(parseDeepLinkRoute('#widgets').module).toBe('widgets');
    expect(parseDeepLinkRoute('#recorder').module).toBe('recorder');
    expect(parseDeepLinkRoute('#compass').module).toBe('compass');
    expect(parseDeepLinkRoute('#settings').module).toBe('settings');
  });

  it('handles android custom app scheme URIs cleanly', () => {
    const r1 = parseDeepLinkRoute('app://unicodeascii.converter/#calendar');
    expect(r1.module).toBe('calendar');

    const r2 = parseDeepLinkRoute('app://unicodeascii.converter/#clock?subtab=alarm');
    expect(r2.module).toBe('clock');
    expect(r2.subtab).toBe('alarm');

    const r3 = parseDeepLinkRoute('app://unicodeascii.converter/#notes?noteId=note-789');
    expect(r3.module).toBe('notes');
    expect(r3.noteId).toBe('note-789');
  });

  it('resolves widget shortcuts and route aliases', () => {
    // PDF Compressor alias
    const pdfRoute = parseDeepLinkRoute('pdf-compress');
    expect(pdfRoute.module).toBe('files');
    expect(pdfRoute.tab).toBe('pdf-compress');

    const pdfAlt = parseDeepLinkRoute('#pdf');
    expect(pdfAlt.module).toBe('files');
    expect(pdfAlt.tab).toBe('pdf-compress');

    // Image Compressor alias
    const imgRoute = parseDeepLinkRoute('#compressor');
    expect(imgRoute.module).toBe('files');
    expect(imgRoute.tab).toBe('image-compress');

    // Alarm alias
    const alarmRoute = parseDeepLinkRoute('alarm');
    expect(alarmRoute.module).toBe('clock');
    expect(alarmRoute.subtab).toBe('alarm');

    // Timer / Pomodoro alias
    const pomodoroRoute = parseDeepLinkRoute('pomodoro');
    expect(pomodoroRoute.module).toBe('clock');
    expect(pomodoroRoute.subtab).toBe('timer');
  });

  it('extracts action=new for note and task widget shortcuts', () => {
    const noteNew = parseDeepLinkRoute('notes?action=new');
    expect(noteNew.module).toBe('notes');
    expect(noteNew.action).toBe('new');

    const taskNew = parseDeepLinkRoute('tasks?action=new');
    expect(taskNew.module).toBe('tasks');
    expect(taskNew.action).toBe('new');
  });

  it('extracts calendar date parameters for widget day click deep linking', () => {
    const calDate = parseDeepLinkRoute('#calendar?date=2026-10-24');
    expect(calDate.module).toBe('calendar');
    expect(calDate.date).toBe('2026-10-24');
  });

  it('returns null module for invalid or empty routes', () => {
    expect(parseDeepLinkRoute(null).module).toBeNull();
    expect(parseDeepLinkRoute('').module).toBeNull();
    expect(parseDeepLinkRoute('#unknown-non-existent-page').module).toBeNull();
  });
});
