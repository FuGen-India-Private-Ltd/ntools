package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            rescheduleAllClockAlarms(context);
            rescheduleAllTaskAlarms(context);
            rescheduleAllCalendarReminders(context);
        }
    }

    public static void rescheduleAllClockAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String alarmsJson = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        try {
            JSONArray arr = new JSONArray(alarmsJson);
            long now = System.currentTimeMillis();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject alarm = arr.getJSONObject(i);
                if (!alarm.optBoolean("isEnabled", false)) continue;

                String time = alarm.optString("time", "07:00");
                String label = alarm.optString("label", "Alarm");
                String id = alarm.optString("id", "alarm_" + i);
                String soundType = alarm.optString("soundType", "twin_bell");

                String[] timeParts = time.split(":");
                if (timeParts.length == 2) {
                    int hour = Integer.parseInt(timeParts[0]);
                    int min = Integer.parseInt(timeParts[1]);

                    Calendar cal = Calendar.getInstance();
                    cal.set(Calendar.HOUR_OF_DAY, hour);
                    cal.set(Calendar.MINUTE, min);
                    cal.set(Calendar.SECOND, 0);
                    cal.set(Calendar.MILLISECOND, 0);

                    // If time has passed today, schedule for tomorrow
                    if (cal.getTimeInMillis() <= (now - 5000)) {
                        cal.add(Calendar.DAY_OF_YEAR, 1);
                    }

                    long triggerAt = cal.getTimeInMillis();

                    // 1. Actual Alarm Intent
                    Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                    alarmIntent.putExtra("alarmId", id);
                    alarmIntent.putExtra("alarmTime", time);
                    alarmIntent.putExtra("alarmLabel", label);
                    alarmIntent.putExtra("alarmSound", soundType);

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

                    PendingIntent pi = PendingIntent.getBroadcast(context, id.hashCode(), alarmIntent, flags);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAt, pi);
                        alarmManager.setAlarmClock(info, pi);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }

                    // 2. Schedule 15-Minute Prior Notice
                    long upcomingNoticeTime = triggerAt - (15 * 60 * 1000); // 15 mins prior
                    if (upcomingNoticeTime > now) {
                        Intent upcomingIntent = new Intent(context, AlarmReceiver.class);
                        upcomingIntent.setAction(AlarmReceiver.ACTION_UPCOMING_ALARM_NOTICE);
                        upcomingIntent.putExtra("alarmId", id);
                        upcomingIntent.putExtra("alarmTime", time);
                        upcomingIntent.putExtra("alarmLabel", label);

                        PendingIntent upcomingPI = PendingIntent.getBroadcast(
                            context,
                            (id + "_upcoming").hashCode(),
                            upcomingIntent,
                            flags
                        );

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, upcomingNoticeTime, upcomingPI);
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, upcomingNoticeTime, upcomingPI);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    public static void rescheduleAllTaskAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String tasksJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
        long now = System.currentTimeMillis();

        try {
            JSONArray arr = new JSONArray(tasksJsonStr);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject task = arr.getJSONObject(i);
                if (task.optBoolean("isCompleted", false)) continue;

                String dueDate = task.optString("dueDate", "");
                String dueTime = task.optString("dueTime", "09:00");
                if (dueDate.isEmpty()) continue;

                String dateStr = dueDate + " " + dueTime;
                Date d = sdf.parse(dateStr);
                if (d == null) continue;

                long triggerAt = d.getTime();
                if (triggerAt <= now) continue;

                String id = task.optString("id", "task_" + i);
                String title = task.optString("title", "Task Due");
                String priority = task.optString("priority", "medium");

                Intent intent = new Intent(context, TaskReminderReceiver.class);
                intent.putExtra("taskId", id);
                intent.putExtra("taskTitle", title);
                intent.putExtra("taskPriority", priority);
                intent.putExtra("taskDueDate", dueDate);
                intent.putExtra("taskDueTime", dueTime);

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

                PendingIntent pi = PendingIntent.getBroadcast(context, id.hashCode(), intent, flags);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAt, pi);
                    alarmManager.setAlarmClock(info, pi);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception ignored) {}
    }

    public static void rescheduleAllCalendarReminders(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String eventsJson = prefs.getString(AppWidgetSyncPlugin.KEY_CALENDAR, "[]");

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        SimpleDateFormat sdfDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        long now = System.currentTimeMillis();

        try {
            // 1. Schedule Daily 6:00 AM Morning Schedule Briefing
            Calendar morningCal = Calendar.getInstance();
            morningCal.set(Calendar.HOUR_OF_DAY, 6);
            morningCal.set(Calendar.MINUTE, 0);
            morningCal.set(Calendar.SECOND, 0);
            morningCal.set(Calendar.MILLISECOND, 0);
            if (morningCal.getTimeInMillis() <= now) {
                morningCal.add(Calendar.DAY_OF_YEAR, 1);
            }

            Intent briefingIntent = new Intent(context, CalendarReminderReceiver.class);
            briefingIntent.setAction(CalendarReminderReceiver.ACTION_DAILY_SCHEDULE_6AM);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

            PendingIntent briefingPI = PendingIntent.getBroadcast(context, 600600, briefingIntent, flags);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, morningCal.getTimeInMillis(), briefingPI);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, morningCal.getTimeInMillis(), briefingPI);
            }

            // 2. Schedule Event-Specific Prior-Day Reminders
            JSONArray arr = new JSONArray(eventsJson);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject ev = arr.getJSONObject(i);
                if (ev.optBoolean("isCompleted", false)) continue;

                String dateStr = ev.optString("date", "");
                if (dateStr.isEmpty()) continue;

                Date eventDate = sdfDate.parse(dateStr);
                if (eventDate == null) continue;

                Calendar cal = Calendar.getInstance();
                cal.setTime(eventDate);
                cal.add(Calendar.DAY_OF_YEAR, -1);
                cal.set(Calendar.HOUR_OF_DAY, 20); // 8:00 PM prior evening
                cal.set(Calendar.MINUTE, 0);
                cal.set(Calendar.SECOND, 0);

                long triggerAt = cal.getTimeInMillis();
                if (triggerAt <= now) continue;

                String id = ev.optString("id", "cal_evt_" + i);
                String title = ev.optString("title", "Event");
                String cat = ev.optString("category", "personal");
                String time = ev.optString("startTime", "");
                boolean isWished = ev.optBoolean("isWished", false);

                Intent intent = new Intent(context, CalendarReminderReceiver.class);
                intent.putExtra("eventId", id);
                intent.putExtra("eventTitle", title);
                intent.putExtra("eventCategory", cat);
                intent.putExtra("eventDate", dateStr);
                intent.putExtra("eventTime", time);
                intent.putExtra("isTomorrow", true);
                intent.putExtra("isWished", isWished);

                PendingIntent pi = PendingIntent.getBroadcast(context, id.hashCode(), intent, flags);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            }
        } catch (Exception ignored) {}
    }
}
