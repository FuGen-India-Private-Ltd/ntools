// Real-Time Native Android Widget Sync Bridge
// Dispatches updates to Android SharedPreferences & AppWidgetManager immediately on data change

import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AppWidgetSyncPluginInterface {
  syncTasks(options: { tasksJson: string }): Promise<{ success: boolean }>;
  syncAlarms(options: { alarmsJson: string }): Promise<{ success: boolean }>;
  syncNotes(options: { notesJson: string }): Promise<{ success: boolean }>;
  syncCalendar(options: { eventsJson: string }): Promise<{ success: boolean }>;
  syncPomodoro(options: { stateJson: string }): Promise<{ success: boolean }>;
  syncWidgetConfig(options: { configJson: string }): Promise<{ success: boolean }>;
  syncAll(): Promise<{ success: boolean }>;
  checkOverlayPermission(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<{ success: boolean }>;
  checkExactAlarmPermission(): Promise<{ granted: boolean }>;
  requestExactAlarmPermission(): Promise<{ success: boolean }>;
  requestBatteryOptimizationExemption(): Promise<{ success: boolean }>;
  checkBatteryOptimizationExempt(): Promise<{ isExempt: boolean }>;
  openAppDetailsSettings(): Promise<{ success: boolean }>;
  scheduleTimerAlarm(options: { seconds: number; label: string; id: string }): Promise<{ success: boolean }>;
  cancelTimerAlarm(options: { id: string }): Promise<{ success: boolean }>;
  testAlarmPopup(): Promise<{ success: boolean }>;
  dismissAlarm(): Promise<{ success: boolean }>;
  snoozeAlarm(options?: { minutes?: number }): Promise<{ success: boolean }>;
}

const AppWidgetSync = registerPlugin<AppWidgetSyncPluginInterface>('AppWidgetSyncPlugin');

export async function syncTasksToNative(tasks: any[]) {
  try {
    if (Capacitor.isNativePlatform()) {
      const topPending = tasks
        .filter((t) => !t.isCompleted)
        .slice(0, 8);
      await AppWidgetSync.syncTasks({ tasksJson: JSON.stringify(topPending) });
    }
  } catch (e) {
    console.debug('Widget sync notice (tasks):', e);
  }
}

export async function syncAlarmsToNative(alarms: any[]) {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.syncAlarms({ alarmsJson: JSON.stringify(alarms) });
    }
  } catch (e) {
    console.debug('Widget sync notice (alarms):', e);
  }
}

export async function syncNotesToNative(notes: any[]) {
  try {
    if (Capacitor.isNativePlatform()) {
      const pinnedWidgetId = localStorage.getItem('notes_widget_pinned_id');
      const sortedNotes = [...notes];
      if (pinnedWidgetId) {
        const targetIdx = sortedNotes.findIndex((n) => n.id === pinnedWidgetId);
        if (targetIdx > 0) {
          const [target] = sortedNotes.splice(targetIdx, 1);
          sortedNotes.unshift(target);
        }
      }
      const recentNotes = sortedNotes.slice(0, 5);
      await AppWidgetSync.syncNotes({ notesJson: JSON.stringify(recentNotes) });
    }
  } catch (e) {
    console.debug('Widget sync notice (notes):', e);
  }
}

export async function syncCalendarToNative(events: any[]) {
  try {
    if (Capacitor.isNativePlatform()) {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const yStr = yesterday.toISOString().split('T')[0];
      const upcoming = events
        .filter((e) => e.date >= yStr && !e.isCompleted)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 30);
      await AppWidgetSync.syncCalendar({ eventsJson: JSON.stringify(upcoming) });
    }
  } catch (e) {
    console.debug('Widget sync notice (calendar):', e);
  }
}

export async function syncPomodoroToNative(state: {
  secondsLeft: number;
  isRunning: boolean;
  mode: string;
}) {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.syncPomodoro({ stateJson: JSON.stringify(state) });
    }
  } catch (e) {
    console.debug('Widget sync notice (pomodoro):', e);
  }
}

export async function syncWidgetConfigToNative(config: any) {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.syncWidgetConfig({ configJson: JSON.stringify(config) });
    }
  } catch (e) {
    console.debug('Widget sync notice (config):', e);
  }
}

export async function triggerSyncAllWidgets() {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.syncAll();
    }
  } catch (e) {
    console.debug('Widget sync notice (all):', e);
  }
}

export async function checkOverlayPermissionNative(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await AppWidgetSync.checkOverlayPermission();
      return !!res.granted;
    }
    return true;
  } catch {
    return true;
  }
}

export async function requestOverlayPermissionNative(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.requestOverlayPermission();
    }
  } catch (e) {
    console.debug('Overlay permission request error:', e);
  }
}

export async function checkExactAlarmPermissionNative(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await AppWidgetSync.checkExactAlarmPermission();
      return !!res.granted;
    }
    return true;
  } catch {
    return true;
  }
}

export async function requestExactAlarmPermissionNative(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.requestExactAlarmPermission();
    }
  } catch (e) {
    console.debug('Exact alarm permission request error:', e);
  }
}

export async function checkBatteryOptimizationExemptNative(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await AppWidgetSync.checkBatteryOptimizationExempt();
      return !!res?.isExempt;
    }
    return true;
  } catch {
    return true;
  }
}

export async function requestBatteryOptimizationExemptionNative(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.requestBatteryOptimizationExemption();
    }
  } catch (e) {
    console.debug('Battery optimization request error:', e);
  }
}

export async function openAppDetailsSettingsNative(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.openAppDetailsSettings();
    }
  } catch (e) {
    console.debug('App details settings request error:', e);
  }
}

export async function scheduleTimerAlarmToNative(seconds: number, label: string = 'Timer Finished!', id: string = 'timer_native_alarm'): Promise<void> {
  try {
    if (Capacitor.isNativePlatform() && seconds > 0) {
      await AppWidgetSync.scheduleTimerAlarm({ seconds, label, id });
    }
  } catch (e) {
    console.debug('Schedule timer error:', e);
  }
}

export async function cancelTimerAlarmFromNative(id: string = 'timer_native_alarm'): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.cancelTimerAlarm({ id });
    }
  } catch (e) {
    console.debug('Cancel timer error:', e);
  }
}

export async function testAlarmPopupNative(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.testAlarmPopup();
    }
  } catch (e) {
    console.debug('Test alarm error:', e);
  }
}

export async function dismissAlarmNative(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.dismissAlarm();
    }
  } catch (e) {
    console.debug('Dismiss native alarm error:', e);
  }
}

export async function snoozeAlarmNative(minutes: number = 10): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppWidgetSync.snoozeAlarm({ minutes });
    }
  } catch (e) {
    console.debug('Snooze native alarm error:', e);
  }
}


