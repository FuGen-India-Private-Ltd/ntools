import { describe, it, expect, beforeEach } from 'vitest';
import { AppModule } from '../components/FloatingDock';

const DEFAULT_TOOL_IDS: AppModule[] = [
  'files',
  'calc',
  'clock',
  'calendar',
  'converter',
  'tasks',
  'notes',
  'widgets',
  'recorder',
  'compass',
  'settings',
];

const STORAGE_KEY = 'ntools_home_tools_order';

function getInitialToolOrder(storage: Storage): AppModule[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validIds = parsed.filter((id) =>
          DEFAULT_TOOL_IDS.includes(id as AppModule)
        ) as AppModule[];
        for (const defaultId of DEFAULT_TOOL_IDS) {
          if (!validIds.includes(defaultId)) {
            validIds.push(defaultId);
          }
        }
        return validIds;
      }
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_TOOL_IDS];
}

function moveToolOrder(list: AppModule[], fromIndex: number, toIndex: number): AppModule[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= list.length) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

describe('Home Tools Ordering & Persistence', () => {
  let mockStorage: Record<string, string> = {};
  const fakeStorage: Storage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      mockStorage = {};
    },
    length: 0,
    key: () => null,
  };

  beforeEach(() => {
    mockStorage = {};
  });

  it('returns default order when storage is empty', () => {
    const order = getInitialToolOrder(fakeStorage);
    expect(order).toEqual(DEFAULT_TOOL_IDS);
  });

  it('correctly reorders items when shifted', () => {
    const initial = [...DEFAULT_TOOL_IDS];
    // Move 'converter' (index 4) to index 0 (top)
    const updated = moveToolOrder(initial, 4, 0);
    expect(updated[0]).toBe('converter');
    expect(updated.length).toBe(DEFAULT_TOOL_IDS.length);
    expect(updated[1]).toBe('files');
  });

  it('persists and restores custom tool order from storage', () => {
    const customOrder: AppModule[] = [
      'calc',
      'files',
      'clock',
      'calendar',
      'converter',
      'tasks',
      'notes',
      'widgets',
      'recorder',
      'compass',
      'settings',
    ];
    fakeStorage.setItem(STORAGE_KEY, JSON.stringify(customOrder));

    const restored = getInitialToolOrder(fakeStorage);
    expect(restored[0]).toBe('calc');
    expect(restored[1]).toBe('files');
    expect(restored.length).toBe(DEFAULT_TOOL_IDS.length);
  });

  it('safely handles missing or unknown tools in persisted order', () => {
    // Persist only 2 tools with an invalid tool
    const partialOrder = ['calc', 'unknown_tool', 'notes'];
    fakeStorage.setItem(STORAGE_KEY, JSON.stringify(partialOrder));

    const restored = getInitialToolOrder(fakeStorage);
    // Should prioritize 'calc' and 'notes', ignore 'unknown_tool', and append all remaining default tools
    expect(restored[0]).toBe('calc');
    expect(restored[1]).toBe('notes');
    expect(restored).not.toContain('unknown_tool');
    expect(restored.length).toBe(DEFAULT_TOOL_IDS.length);
    for (const tool of DEFAULT_TOOL_IDS) {
      expect(restored).toContain(tool);
    }
  });

  it('gracefully handles corrupted JSON in storage', () => {
    fakeStorage.setItem(STORAGE_KEY, '{invalid json');
    const restored = getInitialToolOrder(fakeStorage);
    expect(restored).toEqual(DEFAULT_TOOL_IDS);
  });
});
