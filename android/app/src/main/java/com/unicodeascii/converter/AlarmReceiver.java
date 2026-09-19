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
    public static final String ACTION_SHOW_UPCOMING = "com.unicodeascii.converter.ACTION_SHOW_UPCOMING";
    public static final int UPCOMING_SCHEDULE_REQUEST_CODE = 90020;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (action == null) return;

        String alarmId = intent.getStringExtra("alarmId");
        String alarmLabel = intent.getStringExtra("alarmLabel");
        String alarmTime = intent.getStringExtra("alarmTime");
        String alarmSound = intent.getStringExtra("alarmSound");

        if (alarmLabel == null || alarmLabel.isEmpty()) {
            alarmLabel = "Alarm";
        }

        // Case 1: Trigger 15-minute Pre-Alarm Warning Notification
        if (ACTION_SHOW_UPCOMING.equals(action)) {
            long triggerAt = intent.getLongExtra("triggerAt", 0L);
            if (triggerAt > System.currentTimeMillis()) {
                BootReceiver.updateUpcomingAlarmNotification(context, triggerAt, alarmTime, alarmLabel, alarmId);
            }
            return;
        }

        // Case 2: User Tapped "Turn Off" / "Dismiss Now" on 15-minute Upcoming Alarm Notification
        if (ACTION_DISMISS_UPCOMING.equals(action)) {
            long triggerAt = intent.getLongExtra("triggerAt", 0L);
            handleDismissUpcomingAlarm(context, alarmId, triggerAt);
            return;
        }

        // Case 3: User Tapped "Turn Off / Dismiss" on Ringing Notification or Overlay
        if (ACTION_DISMISS_ALARM.equals(action)) {
            handleDismissRingingAlarm(context, alarmId);
            return;
        }

        // Case 4: User Tapped "Snooze" (10m) on Notification or Overlay
        if (ACTION_SNOOZE_ALARM.equals(action)) {
            handleSnoozeRingingAlarm(context, alarmId, alarmLabel, alarmTime, alarmSound);
            return;
        }

        // Case 5: Actual Alarm Rings -> Start Foreground AlarmService
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

    private void handleDismissUpcomingAlarm(Context context, String alarmId, long triggerAt) {
        try {
            // 1. Immediately cancel the upcoming notification
            BootReceiver.cancelUpcomingAlarmNotification(context);

            // 2. Cancel today's exact AlarmManager trigger so the alarm DOES NOT sound at target time
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null && alarmId != null) {
                Intent cancelIntent = new Intent(context, AlarmReceiver.class);
                cancelIntent.setAction(AlarmReceiver.ACTION_ALARM_TRIGGER);
                cancelIntent.setData(android.net.Uri.parse("ntools://alarm/" + alarmId));
                cancelIntent.setPackage(context.getPackageName());
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent cancelPI = PendingIntent.getBroadcast(context, Math.abs(alarmId.hashCode()), cancelIntent, flags);
                am.cancel(cancelPI);
            }

            // 3. Mark today skipped for recurring alarms, or disable one-time alarms
            if (alarmId != null && !alarmId.isEmpty()) {
                SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                String alarmsJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");
                JSONArray arr = new JSONArray(alarmsJsonStr);
                boolean isOneTime = true;
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    if (alarmId.equals(obj.optString("id"))) {
                        JSONArray daysArr = obj.optJSONArray("days");
                        if (daysArr != null && daysArr.length() > 0) {
                            isOneTime = false;
                        }
                        break;
                    }
                }

                if (isOneTime) {
                    disableOneTimeAlarm(context, alarmId);
                } else {
                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault());
                    String targetDateStr = (triggerAt > 0) ? sdf.format(new java.util.Date(triggerAt)) : sdf.format(new java.util.Date());
                    prefs.edit().putString(alarmId + "_skipped_date", targetDateStr).commit();
                }
            }

            // 4. Auto-reschedule so future occurrences are scheduled
            BootReceiver.rescheduleAllClockAlarms(context);

            MainActivity.dispatchJsEvent("alarms-updated");
            Toast.makeText(context, "Upcoming alarm dismissed", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleDismissRingingAlarm(Context context, String alarmId) {
        try {
            // 1. Stop foreground service audio and vibration
            AlarmService.stopAlarm(context);
            AlarmAlertOverlayActivity.dismissActiveOverlay();

            // 2. Cancel ringing notification (1001) and any fallback IDs
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(AlarmService.NOTIFICATION_ID);
                if (alarmId != null) {
                    nm.cancel(Math.abs(alarmId.hashCode()));
                }
            }

            // 3. If one-time alarm (no repeating days), disable it in saved preferences
            disableOneTimeAlarm(context, alarmId);

            // 4. Auto-reschedule recurring alarms for next cycle
            BootReceiver.rescheduleAllClockAlarms(context);

            MainActivity.dispatchJsEvent("alarms-updated");
            Toast.makeText(context, "Alarm turned off", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleSnoozeRingingAlarm(Context context, String alarmId, String alarmLabel, String alarmTime, String alarmSound) {
        try {
            // 1. Stop current ringing
            AlarmService.stopAlarm(context);
            AlarmAlertOverlayActivity.dismissActiveOverlay();

            // 2. Cancel ringing notification (1001)
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(AlarmService.NOTIFICATION_ID);
                if (alarmId != null) {
                    nm.cancel(Math.abs(alarmId.hashCode()));
                }
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
