package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

public class AlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_ALARM_TRIGGER = "com.unicodeascii.converter.ACTION_ALARM_TRIGGER";
    public static final String ACTION_DISMISS_ALARM = "com.unicodeascii.converter.ACTION_DISMISS_ALARM";
    public static final String ACTION_SNOOZE_ALARM = "com.unicodeascii.converter.ACTION_SNOOZE_ALARM";
    public static final String ACTION_DISMISS_UPCOMING = "com.unicodeascii.converter.ACTION_DISMISS_UPCOMING";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String alarmId = intent.getStringExtra("alarmId");
        String alarmLabel = intent.getStringExtra("alarmLabel");
        String alarmTime = intent.getStringExtra("alarmTime");
        String alarmSound = intent.getStringExtra("alarmSound");

        if (alarmLabel == null || alarmLabel.isEmpty()) {
            alarmLabel = "Alarm";
        }

        // Case A: User Tapped "Turn Off" on Upcoming Alarm in Status Bar
        if (ACTION_DISMISS_UPCOMING.equals(action)) {
            handleDismissUpcomingAlarm(context, alarmId);
            return;
        }

        // Case B: User Tapped "Turn Off / Dismiss" on Ringing Notification or Overlay
        if (ACTION_DISMISS_ALARM.equals(action)) {
            handleDismissRingingAlarm(context, alarmId);
            return;
        }

        // Case C: User Tapped "Snooze" (10m) on Notification or Overlay
        if (ACTION_SNOOZE_ALARM.equals(action)) {
            handleSnoozeRingingAlarm(context, alarmId, alarmLabel, alarmTime, alarmSound);
            return;
        }

        // Case D: Actual Alarm Rings -> Start Foreground AlarmService
        handleActualAlarmTrigger(context, alarmId, alarmLabel, alarmTime, alarmSound);
    }

    private void handleActualAlarmTrigger(Context context, String alarmId, String alarmLabel, String alarmTime, String alarmSound) {
        // Cancel the upcoming notification as this alarm is actively ringing
        BootReceiver.cancelUpcomingAlarmNotification(context);

        // 1. Acquire 30-second CPU WakeLock to guarantee device stays awake during service launch
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ntools:alarm_trigger_wake"
                );
                wl.acquire(30000); // 30 seconds
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Start robust, continuous Foreground Service for ringing audio + vibration + notification
        AlarmService.startAlarm(context, alarmId, alarmLabel, alarmTime, alarmSound);
    }

    private void handleDismissUpcomingAlarm(Context context, String alarmId) {
        try {
            if (alarmId != null && !alarmId.isEmpty()) {
                disableOneTimeAlarm(context, alarmId);
            }
            BootReceiver.rescheduleAllClockAlarms(context);
            Toast.makeText(context, "Upcoming alarm turned off", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleDismissRingingAlarm(Context context, String alarmId) {
        try {
            // Stop foreground service audio and vibration
            AlarmService.stopAlarm(context);
            AlarmAlertOverlayActivity.dismissActiveOverlay();

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && alarmId != null) {
                nm.cancel(alarmId.hashCode());
            }

            // If one-time alarm (no repeating days), disable it in saved preferences
            disableOneTimeAlarm(context, alarmId);

            // Auto-reschedule recurring alarms for next cycle
            BootReceiver.rescheduleAllClockAlarms(context);

            Toast.makeText(context, "Alarm turned off", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleSnoozeRingingAlarm(Context context, String alarmId, String alarmLabel, String alarmTime, String alarmSound) {
        try {
            // Stop current ringing
            AlarmService.stopAlarm(context);
            AlarmAlertOverlayActivity.dismissActiveOverlay();

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && alarmId != null) {
                nm.cancel(alarmId.hashCode());
            }

            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
                snoozeIntent.setAction(ACTION_ALARM_TRIGGER);
                snoozeIntent.setData(android.net.Uri.parse("ntools://alarm/" + alarmId + "_snooze"));
                snoozeIntent.putExtra("alarmId", alarmId);
                snoozeIntent.putExtra("alarmLabel", alarmLabel + " (Snoozed)");
                snoozeIntent.putExtra("alarmTime", alarmTime);
                snoozeIntent.putExtra("alarmSound", alarmSound);

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(context, Math.abs((alarmId + "_snooze").hashCode()), snoozeIntent, flags);

                long triggerAt = System.currentTimeMillis() + (10 * 60 * 1000); // 10 minutes

                Intent showIntent = new Intent(context, MainActivity.class);
                showIntent.putExtra("route", "clock");
                PendingIntent showPI = PendingIntent.getActivity(context, Math.abs((alarmId + "_snooze_show").hashCode()), showIntent, flags);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        am.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, showPI), pi);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }
                } catch (SecurityException se) {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                        } else {
                            am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                        }
                    } catch (Exception fallback) {
                        try {
                            am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                        } catch (Exception ignored) {}
                    }
                }

                BootReceiver.updateUpcomingAlarmNotification(
                    context,
                    triggerAt,
                    new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(new java.util.Date(triggerAt)),
                    alarmLabel + " (Snoozed)",
                    alarmId
                );
            }

            Toast.makeText(context, "Alarm snoozed for 10 minutes", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void disableOneTimeAlarm(Context context, String alarmId) {
        if (alarmId == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");
            JSONArray arr = new JSONArray(alarmsJsonStr);
            boolean modified = false;

            for (int i = 0; i < arr.length(); i++) {
                JSONObject alarm = arr.getJSONObject(i);
                String id = alarm.optString("id", "");
                if (id.equals(alarmId)) {
                    JSONArray daysArr = alarm.optJSONArray("days");
                    if (daysArr == null || daysArr.length() == 0) {
                        // One-time alarm has completed -> turn off toggle
                        alarm.put("isEnabled", false);
                        modified = true;
                    }
                    break;
                }
            }

            if (modified) {
                prefs.edit().putString(AppWidgetSyncPlugin.KEY_ALARMS, arr.toString()).commit();
                MainActivity.dispatchJsEvent("alarms-updated");
            }
        } catch (Exception ignored) {}
    }
}
