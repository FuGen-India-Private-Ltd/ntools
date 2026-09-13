// Tasks & To-Do Data Model & Storage Engine
// Integrated with Calendar and Android Home Screen Widgets

import { syncTasksToNative } from './widgetSyncBridge';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'study' | 'kannada' | 'work' | 'personal';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  category: TaskCategory;
  isCompleted: boolean;
  createdAt: number;
  completedAt?: number;
}

const STORAGE_KEY = 'kannada_suite_tasks';

export const TASK_CATEGORIES: Record<
  TaskCategory,
  { labelEn: string; labelKn: string; color: string }
> = {
  study: { labelEn: 'Study', labelKn: 'ಅಧ್ಯಯನ', color: 'text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10' },
  kannada: { labelEn: 'Kannada Project', labelKn: 'ಕನ್ನಡ ಪ್ರಾಜೆಕ್ಟ್', color: 'text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10' },
  work: { labelEn: 'Work', labelKn: 'ಕೆಲಸ', color: 'text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10' },
  personal: { labelEn: 'Personal', labelKn: 'ವೈಯಕ್ತಿಕ', color: 'text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10' },
};

export const TASK_PRIORITIES: Record<
  TaskPriority,
  { label: string; badgeColor: string; dotColor: string }
> = {
  high: { label: 'High', badgeColor: 'text-slate-950 dark:text-white bg-black/15 dark:bg-white/20 border-black/30 dark:border-white/30 font-bold', dotColor: 'bg-black dark:bg-white' },
  medium: { label: 'Medium', badgeColor: 'text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-white/10 border-black/15 dark:border-white/15', dotColor: 'bg-slate-400' },
  low: { label: 'Low', badgeColor: 'text-slate-600 dark:text-slate-400 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10', dotColor: 'bg-slate-300 dark:bg-slate-600' },
};

const DEFAULT_SAMPLE_TASKS: TaskItem[] = [];

export function getStoredTasks(): TaskItem[] {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SAMPLE_TASKS;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveStoredTasks(DEFAULT_SAMPLE_TASKS);
      return DEFAULT_SAMPLE_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAMPLE_TASKS;
  }
}

export function saveStoredTasks(tasks: TaskItem[]) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
    // Trigger instant native Android widget refresh
    syncTasksToNative(tasks);
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function getDueDateBadge(dueDate?: string): { text: string; color: string } | null {
  if (!dueDate) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  if (dueDate === todayStr) {
    return { text: 'Due Today', color: 'text-slate-900 dark:text-slate-100 bg-black/10 dark:bg-white/15 border-black/20 dark:border-white/20 font-bold' };
  }
  if (dueDate === tomorrow) {
    return { text: 'Due Tomorrow', color: 'text-slate-800 dark:text-slate-200 bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10' };
  }
  if (dueDate < todayStr) {
    return { text: 'Overdue', color: 'text-slate-950 dark:text-white bg-black/20 dark:bg-white/25 border-black/40 dark:border-white/40 font-black' };
  }

  const dateObj = new Date(dueDate + 'T00:00:00');
  const formatted = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { text: `Due ${formatted}`, color: 'text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10' };
}
