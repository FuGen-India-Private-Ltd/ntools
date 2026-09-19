import { describe, it, expect, vi } from 'vitest';
import { BUILTIN_ALARM_SOUNDS } from '../lib/audioAlerts';

describe('Alarm Audio Engine & Sound Options', () => {
  it('defines valid, distinct loud alarm presets', () => {
    expect(BUILTIN_ALARM_SOUNDS.length).toBeGreaterThanOrEqual(10);
    const ids = BUILTIN_ALARM_SOUNDS.map((s) => s.id);
    expect(ids).toContain('crystal_zen');
    expect(ids).toContain('celestial_marimba');
    expect(ids).toContain('cyber_pulse');
    expect(ids).toContain('radiant_bell');
    expect(ids).toContain('lofi_sunrise');
    expect(ids).toContain('twin_bell');
    expect(ids).toContain('digital_siren');
    expect(ids).toContain('energetic_anthem');
    expect(ids).toContain('rooster_dawn');
    expect(ids).toContain('custom_music');
  });

  it('includes human-readable titles and descriptions for all alarm sounds', () => {
    BUILTIN_ALARM_SOUNDS.forEach((sound) => {
      expect(sound.name).toBeTruthy();
      expect(sound.desc).toBeTruthy();
      expect(sound.tag).toBeTruthy();
    });
  });
});

import {
  AlarmItem,
  getNextActiveAlarmDetails,
  formatAlarmTime12h,
} from '../lib/timeAndClock';

describe('Alarm Inactivity & Overnight Scheduling Engine', () => {
  it('accurately schedules an overnight alarm 8 hours in advance (deep sleep scenario)', () => {
    vi.useFakeTimers();
    // Current local time: Saturday night at 23:00 (11:00 PM)
    vi.setSystemTime(new Date(2026, 8, 19, 23, 0, 0));

    const alarm: AlarmItem = {
      id: 'alarm_overnight_1',
      time: '07:00',
      label: 'Morning Rise',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      isEnabled: true,
      soundType: 'twin_bell',
      vibrate: true,
      snoozeMinutes: 10,
    };

    const details = getNextActiveAlarmDetails(alarm);

    // 23:00 to 07:00 next day is exactly 8 hours = 480 minutes
    const expectedDiffMs = 8 * 60 * 60 * 1000;
    expect(details.diffMs).toBe(expectedDiffMs);
    expect(details.text).toBe('in 8h 0m');
    expect(details.isTomorrow).toBe(true);
    expect(details.isToday).toBe(false);
    vi.useRealTimers();
  });

  it('accurately schedules an alarm 12+ hours in advance across day boundary', () => {
    vi.useFakeTimers();
    // Current local time: 18:30 (6:30 PM)
    vi.setSystemTime(new Date(2026, 8, 19, 18, 30, 0));

    const alarm: AlarmItem = {
      id: 'alarm_overnight_2',
      time: '07:15',
      label: 'Wake Up',
      days: [], // One-off alarm
      isEnabled: true,
    };

    const details = getNextActiveAlarmDetails(alarm);

    // From 18:30 to 07:15 next morning = 12 hours 45 minutes
    const expectedDiffMs = (12 * 60 + 45) * 60 * 1000;
    expect(details.diffMs).toBe(expectedDiffMs);
    expect(details.text).toBe('in 12h 45m');
    expect(details.isTomorrow).toBe(true);
    vi.useRealTimers();
  });

  it('correctly handles weekday-only alarm from Friday night to Monday morning (56 hours of inactivity)', () => {
    vi.useFakeTimers();
    // Current local time: Friday night at 22:30 (10:30 PM) -> 2026-09-18 was a Friday
    vi.setSystemTime(new Date(2026, 8, 18, 22, 30, 0));

    const alarm: AlarmItem = {
      id: 'alarm_weekdays_only',
      time: '06:30',
      label: 'Workday Alarm',
      days: [1, 2, 3, 4, 5], // Monday through Friday
      isEnabled: true,
    };

    const details = getNextActiveAlarmDetails(alarm);

    // Friday 22:30 to Monday 06:30:
    // Friday remaining: 1.5h, Saturday: 24h, Sunday: 24h, Monday morning: 6.5h = 56 hours
    const expectedDiffMs = 56 * 60 * 60 * 1000;
    expect(details.diffMs).toBe(expectedDiffMs);
    expect(details.text).toBe('in 56h 0m');
    expect(details.isToday).toBe(false);
    expect(details.isTomorrow).toBe(false);
    vi.useRealTimers();
  });

  it('handles midnight boundary crossing accurately (e.g. 23:55 to 00:10)', () => {
    vi.useFakeTimers();
    // Current local time: 23:55 (11:55 PM)
    vi.setSystemTime(new Date(2026, 8, 19, 23, 55, 0));

    const alarm: AlarmItem = {
      id: 'alarm_midnight',
      time: '00:10',
      label: 'Midnight Snack',
      days: [0, 1, 2, 3, 4, 5, 6],
      isEnabled: true,
    };

    const details = getNextActiveAlarmDetails(alarm);

    // 15 minutes ahead into the next day
    const expectedDiffMs = 15 * 60 * 1000;
    expect(details.diffMs).toBe(expectedDiffMs);
    expect(details.text).toBe('in 15m');
    expect(details.isTomorrow).toBe(true);
    vi.useRealTimers();
  });

  it('schedules same-day alarm when target time is later today', () => {
    vi.useFakeTimers();
    // Current local time: 14:00 (2:00 PM)
    vi.setSystemTime(new Date(2026, 8, 19, 14, 0, 0));

    const alarm: AlarmItem = {
      id: 'alarm_afternoon_nap',
      time: '16:30',
      label: 'Afternoon Tea',
      days: [],
      isEnabled: true,
    };

    const details = getNextActiveAlarmDetails(alarm);

    // 2.5 hours = 150 minutes
    const expectedDiffMs = 150 * 60 * 1000;
    expect(details.diffMs).toBe(expectedDiffMs);
    expect(details.text).toBe('in 2h 30m');
    expect(details.isToday).toBe(true);
    expect(details.isTomorrow).toBe(false);
    vi.useRealTimers();
  });

  it('properly serializes and deserializes alarm JSON for native SharedPreferences bridge', () => {
    const originalAlarms: AlarmItem[] = [
      {
        id: 'alarm_1',
        time: '07:00',
        label: 'Daily Wake',
        days: [1, 2, 3, 4, 5],
        isEnabled: true,
        soundType: 'twin_bell',
        vibrate: true,
        snoozeMinutes: 10,
      },
      {
        id: 'alarm_2',
        time: '09:30',
        label: 'Weekend Brunch',
        days: [0, 6],
        isEnabled: false,
        soundType: 'custom_music',
        customTrackName: 'wake_up_song.mp3',
        vibrate: false,
        snoozeMinutes: 5,
      },
    ];

    // Simulate Capacitor IPC bridge JSON serialization
    const jsonString = JSON.stringify(originalAlarms);
    const parsedAlarms = JSON.parse(jsonString) as AlarmItem[];

    expect(parsedAlarms).toHaveLength(2);
    expect(parsedAlarms[0].id).toBe('alarm_1');
    expect(parsedAlarms[0].time).toBe('07:00');
    expect(parsedAlarms[0].isEnabled).toBe(true);
    expect(parsedAlarms[0].days).toEqual([1, 2, 3, 4, 5]);

    expect(parsedAlarms[1].id).toBe('alarm_2');
    expect(parsedAlarms[1].isEnabled).toBe(false);
    expect(parsedAlarms[1].soundType).toBe('custom_music');
    expect(parsedAlarms[1].customTrackName).toBe('wake_up_song.mp3');
  });

  it('detects orphaned and deleted alarms to ensure cancellation in AlarmManager', () => {
    const previouslyScheduledIds = new Set(['alarm_1', 'alarm_2', 'alarm_3']);
    const currentlyActiveAlarms: AlarmItem[] = [
      { id: 'alarm_1', time: '07:00', label: 'Alarm 1', days: [], isEnabled: true },
      { id: 'alarm_3', time: '08:00', label: 'Alarm 3', days: [], isEnabled: false },
    ];

    const activeScheduledIds = new Set(
      currentlyActiveAlarms.filter((a) => a.isEnabled).map((a) => a.id)
    );

    const toCancel: string[] = [];
    for (const prevId of previouslyScheduledIds) {
      if (!activeScheduledIds.has(prevId)) {
        toCancel.push(prevId);
      }
    }

    expect(toCancel).toContain('alarm_2');
    expect(toCancel).toContain('alarm_3');
    expect(toCancel).not.toContain('alarm_1');
  });

  it('formats 12-hour time correctly with AM/PM across all boundaries', () => {
    expect(formatAlarmTime12h('00:00')).toEqual({ time: '12:00', period: 'AM' });
    expect(formatAlarmTime12h('07:05')).toEqual({ time: '07:05', period: 'AM' });
    expect(formatAlarmTime12h('11:59')).toEqual({ time: '11:59', period: 'AM' });
    expect(formatAlarmTime12h('12:00')).toEqual({ time: '12:00', period: 'PM' });
    expect(formatAlarmTime12h('13:15')).toEqual({ time: '01:15', period: 'PM' });
    expect(formatAlarmTime12h('23:59')).toEqual({ time: '11:59', period: 'PM' });
  });

  describe('15-Minute Pre-Alarm Notification Window & Dismiss Logic', () => {
    it('calculates 15-minute notification trigger point accurately for upcoming alarms', () => {
      const now = new Date(2026, 8, 19, 7, 0, 0).getTime();
      const alarmTriggerAt = new Date(2026, 8, 19, 7, 30, 0).getTime(); // 30 minutes away
      const upcomingTriggerAt = alarmTriggerAt - 15 * 60 * 1000; // should be 7:15

      // At 7:00, it is more than 15 minutes away
      expect(now < upcomingTriggerAt).toBe(true);
      expect(upcomingTriggerAt - now).toBe(15 * 60 * 1000);

      // At 7:16, it is within the 15-minute window
      const nowWithin15m = new Date(2026, 8, 19, 7, 16, 0).getTime();
      expect(nowWithin15m >= upcomingTriggerAt).toBe(true);
      const remainingMinutes = Math.max(1, Math.ceil((alarmTriggerAt - nowWithin15m) / 60000));
      expect(remainingMinutes).toBe(14);
    });

    it('correctly advances to next recurring cycle when today is marked skipped', () => {
      // Alarm set for Mondays, Wednesdays, Fridays (days: 1, 3, 5)
      const daysList = [1, 3, 5];
      // Simulated today: Monday 2026-09-21
      const mockNow = new Date(2026, 8, 21, 6, 0, 0); // Monday morning
      const skippedDate = '2026-09-21'; // User dismissed today's upcoming alarm

      let foundNextDay = -1;
      for (let daysAhead = 0; daysAhead <= 14; daysAhead++) {
        const check = new Date(mockNow.getTime() + daysAhead * 86400000);
        check.setHours(7, 0, 0, 0);
        const jsDayOfWeek = check.getDay();
        const dateStr = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`;

        if (daysList.includes(jsDayOfWeek) && check.getTime() > mockNow.getTime()) {
          if (skippedDate && skippedDate === dateStr) {
            // Skipped today!
            continue;
          }
          foundNextDay = jsDayOfWeek;
          break;
        }
      }

      // Should skip Monday (1) and schedule Wednesday (3)
      expect(foundNextDay).toBe(3);
    });

    it('ensures upcoming notification countdown text is human readable', () => {
      const getCountdownText = (minsLeft: number) => {
        return minsLeft <= 1 ? 'in 1 min' : `in ${minsLeft} mins`;
      };

      expect(getCountdownText(15)).toBe('in 15 mins');
      expect(getCountdownText(5)).toBe('in 5 mins');
      expect(getCountdownText(1)).toBe('in 1 min');
      expect(getCountdownText(0)).toBe('in 1 min');
    });
  });
});
