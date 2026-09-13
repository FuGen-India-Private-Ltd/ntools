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
