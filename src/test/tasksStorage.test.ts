import { describe, it, expect } from 'vitest';
import {
  getStoredTasks,
  saveStoredTasks,
  getDueDateBadge,
  TaskItem,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
} from '../lib/tasksStorage';

describe('Tasks Storage & Engine Tests', () => {
  it('initializes clean with empty array when storage is fresh', () => {
    const tasks = getStoredTasks();
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('correctly categorizes due date badges', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const pastStr = '2020-01-01';

    const todayBadge = getDueDateBadge(todayStr);
    expect(todayBadge?.text).toBe('Due Today');

    const tomorrowBadge = getDueDateBadge(tomorrowStr);
    expect(tomorrowBadge?.text).toBe('Due Tomorrow');

    const pastBadge = getDueDateBadge(pastStr);
    expect(pastBadge?.text).toBe('Overdue');
  });

  it('defines valid categories and priorities', () => {
    expect(TASK_CATEGORIES.study).toBeDefined();
    expect(TASK_CATEGORIES.kannada).toBeDefined();
    expect(TASK_PRIORITIES.high).toBeDefined();
    expect(TASK_PRIORITIES.medium).toBeDefined();
    expect(TASK_PRIORITIES.low).toBeDefined();
  });
});
