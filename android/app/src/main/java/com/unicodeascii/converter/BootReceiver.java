package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class BootReceiver extends BroadcastReceiver {

    public static final int UPCOMING_ALARM_NOTIF_ID = 9001;
    public static final String UPCOMING_ALARM_CHANNEL_ID = "ntools_upcoming_alarms";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (action == null) return;

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) ||
            Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_DATE_CHANGED.equals(action) ||
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action)) {
            rescheduleAllClockAlarms(context);
            rescheduleAllTaskAlarms(context);
            rescheduleAllCalendarReminders(context);
        }
    }

    public static void rescheduleAllClockAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String alarmsJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        long now = System.currentTimeMillis();
        long earliestTriggerAt = Long.MAX_VALUE;
        String earliestTime = "";
        String earliestLabel = "";
        String earliestId = "";
        boolean hasActiveAlarm = false;

        java.util.Set<String> currentlyScheduledIds = new java.util.HashSet<>();

        try {
            JSONArray arr = new JSONArray(alarmsJsonStr);

            for (int i = 0; i < arr.length(); i++) {
                try {
                    JSONObject alarm = arr.getJSONObject(i);
                    String id = alarm.optString("id", "alarm_" + i);

                    if (!alarm.optBoolean("isEnabled", false)) {
                        // Cancel obsolete or disabled alarm pending intent
                        try {
                            Intent cancelIntent = new Intent(context, AlarmReceiver.class);
                            cancelIntent.setAction(AlarmReceiver.ACTION_ALARM_TRIGGER);
                            cancelIntent.setData(Uri.parse("ntools://alarm/" + id));
                            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                            PendingIntent cancelPI = PendingIntent.getBroadcast(context, Math.abs(id.hashCode()), cancelIntent, flags);
                            alarmManager.cancel(cancelPI);
                        } catch (Exception ignored) {}
                        continue;
                    }

                    String time = alarm.optString("time", "07:00");
                    String label = alarm.optString("label", "Alarm");
                    String soundType = alarm.optString("soundType", "twin_bell");

                    String[] timeParts = time.split(":");
                    if (timeParts.length == 2) {
                        int hour = Integer.parseInt(timeParts[0].trim());
                        int min = Integer.parseInt(timeParts[1].trim());

                        JSONArray daysArr = alarm.optJSONArray("days");
                        List<Integer> daysList = new ArrayList<>();
                        if (daysArr != null) {
                            for (int d = 0; d < daysArr.length(); d++) {
                                daysList.add(daysArr.getInt(d));
                            }
                        }

                        Calendar targetCal = Calendar.getInstance();
                        targetCal.set(Calendar.HOUR_OF_DAY, hour);
                        targetCal.set(Calendar.MINUTE, min);
                        targetCal.set(Calendar.SECOND, 0);
                        targetCal.set(Calendar.MILLISECOND, 0);

                        if (daysList.isEmpty()) {
                            // If time has passed today (<= now), schedule for tomorrow
                            if (targetCal.getTimeInMillis() <= now) {
                                targetCal.add(Calendar.DAY_OF_YEAR, 1);
                            }
                        } else {
                            boolean found = false;
                            for (int daysAhead = 0; daysAhead <= 7; daysAhead++) {
                                Calendar checkCal = Calendar.getInstance();
                                checkCal.setTimeInMillis(now);
                                checkCal.add(Calendar.DAY_OF_YEAR, daysAhead);
                                checkCal.set(Calendar.HOUR_OF_DAY, hour);
                                checkCal.set(Calendar.MINUTE, min);
                                checkCal.set(Calendar.SECOND, 0);
                                checkCal.set(Calendar.MILLISECOND, 0);

                                int jsDayOfWeek = checkCal.get(Calendar.DAY_OF_WEEK) - 1;
                                if (daysList.contains(jsDayOfWeek) && checkCal.getTimeInMillis() > now) {
                                    targetCal = checkCal;
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                targetCal.add(Calendar.DAY_OF_YEAR, 7);
                            }
                        }

                        long triggerAt = targetCal.getTimeInMillis();

                        // 1. Set High-Priority Exact Alarm via AlarmClockInfo
                        // Under USE_EXACT_ALARM, setAlarmClock() is directly granted and is the ONLY
                        // API that activates Android's system status bar alarm symbol next to WiFi/battery
                        // and guarantees Doze-bypassing wake-up.
                        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                        alarmIntent.setAction(AlarmReceiver.ACTION_ALARM_TRIGGER);
                        alarmIntent.setData(Uri.parse("ntools://alarm/" + id));
                        alarmIntent.putExtra("alarmId", id);
                        alarmIntent.putExtra("alarmTime", time);
                        alarmIntent.putExtra("alarmLabel", label);
                        alarmIntent.putExtra("alarmSound", soundType);

                        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

                        PendingIntent pi = PendingIntent.getBroadcast(context, Math.abs(id.hashCode()), alarmIntent, flags);

                        Intent showIntent = new Intent(context, MainActivity.class);
                        showIntent.putExtra("route", "clock");
                        showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        PendingIntent showPI = PendingIntent.getActivity(context, Math.abs((id + "_show").hashCode()), showIntent, flags);

                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAt, showPI);
                                alarmManager.setAlarmClock(info, pi);
                            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                            } else {
                                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                            }
                        } catch (SecurityException se) {
                            // Graceful fallback if exact alarm permission was denied or restricted
                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                                } else {
                                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                                }
                            } catch (Exception seFallback) {
                                try {
                                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                                } catch (Exception ignored) {}
                            }
                        }

                        currentlyScheduledIds.add(id);

                        // Track earliest upcoming alarm for ongoing notification
                        if (triggerAt > now && triggerAt < earliestTriggerAt) {
                            earliestTriggerAt = triggerAt;
                            earliestTime = time;
                            earliestLabel = label;
                            earliestId = id;
                            hasActiveAlarm = true;
                        }
                    }
                } catch (Exception itemEx) {
                    itemEx.printStackTrace();
                }
            }

            // Clean up any previously scheduled alarms that were deleted from the list
            try {
                String previousScheduledIdsStr = prefs.getString("active_scheduled_alarm_ids", "");
                if (!previousScheduledIdsStr.isEmpty()) {
                    String[] prevIds = previousScheduledIdsStr.split(",");
                    for (String oldId : prevIds) {
                        if (!oldId.isEmpty() && !currentlyScheduledIds.contains(oldId)) {
                            try {
                                Intent cancelIntent = new Intent(context, AlarmReceiver.class);
                                cancelIntent.setAction(AlarmReceiver.ACTION_ALARM_TRIGGER);
                                cancelIntent.setData(Uri.parse("ntools://alarm/" + oldId));
                                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                                PendingIntent cancelPI = PendingIntent.getBroadcast(context, Math.abs(oldId.hashCode()), cancelIntent, flags);
                                alarmManager.cancel(cancelPI);
                            } catch (Exception ignored) {}
                        }
                    }
                }
                StringBuilder sb = new StringBuilder();
                for (String sid : currentlyScheduledIds) {
                    if (sb.length() > 0) sb.append(",");
                    sb.append(sid);
                }
                prefs.edit().putString("active_scheduled_alarm_ids", sb.toString()).commit();
            } catch (Exception ignored) {}

            // 2. Update or clear the persistent Upcoming Alarm notification in status bar
            if (hasActiveAlarm && earliestTriggerAt != Long.MAX_VALUE) {
                updateUpcomingAlarmNotification(context, earliestTriggerAt, earliestTime, earliestLabel, earliestId);
            } else {
                cancelUpcomingAlarmNotification(context);
            }
        } catch (Exception ignored) {}
    }

    public static void updateUpcomingAlarmNotification(Context context, long triggerAt, String timeStr, String label, String alarmId) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    UPCOMING_ALARM_CHANNEL_ID,
                    "Upcoming Alarms",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Shows active scheduled alarm in the status bar");
                channel.setShowBadge(true);
                channel.setSound(null, null);
                channel.enableVibration(false);
                nm.createNotificationChannel(channel);
            }

            Calendar targetCal = Calendar.getInstance();
            targetCal.setTimeInMillis(triggerAt);
            Calendar nowCal = Calendar.getInstance();

            String dayText;
            if (targetCal.get(Calendar.YEAR) == nowCal.get(Calendar.YEAR) &&
                targetCal.get(Calendar.DAY_OF_YEAR) == nowCal.get(Calendar.DAY_OF_YEAR)) {
                dayText = "Today";
            } else {
                Calendar tomorrowCal = Calendar.getInstance();
                tomorrowCal.add(Calendar.DAY_OF_YEAR, 1);
                if (targetCal.get(Calendar.YEAR) == tomorrowCal.get(Calendar.YEAR) &&
                    targetCal.get(Calendar.DAY_OF_YEAR) == tomorrowCal.get(Calendar.DAY_OF_YEAR)) {
                    dayText = "Tomorrow";
                } else {
                    SimpleDateFormat dayFormat = new SimpleDateFormat("EEE, MMM d", Locale.getDefault());
                    dayText = dayFormat.format(targetCal.getTime());
                }
            }

            SimpleDateFormat format12h = new SimpleDateFormat("hh:mm a", Locale.getDefault());
            String displayTime = format12h.format(targetCal.getTime());

            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.putExtra("route", "clock");
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent openPI = PendingIntent.getActivity(context, 90011, openIntent, flags);

            Intent dismissIntent = new Intent(context, AlarmReceiver.class);
            dismissIntent.setAction(AlarmReceiver.ACTION_DISMISS_UPCOMING);
            dismissIntent.putExtra("alarmId", alarmId);
            PendingIntent dismissPI = PendingIntent.getBroadcast(context, 90012, dismissIntent, flags);

            String alarmTitle = (label != null && !label.trim().isEmpty() && !label.equalsIgnoreCase("Alarm"))
                ? "⏰ " + displayTime + " • " + label.trim()
                : "⏰ Next Alarm • " + displayTime;

            String alarmSubtext = "Scheduled for " + dayText + " • Tap to open";

            NotificationCompat.Builder builder =
                new NotificationCompat.Builder(context, UPCOMING_ALARM_CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_alarm)
                    .setContentTitle(alarmTitle)
                    .setContentText(alarmSubtext)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setAutoCancel(false)
                    .setContentIntent(openPI)
                    .addAction(R.drawable.ic_stat_alarm, "Turn Off", dismissPI)
                    .addAction(R.drawable.ic_stat_alarm, "Open Clock", openPI);

            nm.notify(UPCOMING_ALARM_NOTIF_ID, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void cancelUpcomingAlarmNotification(Context context) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(UPCOMING_ALARM_NOTIF_ID);
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

                PendingIntent pi = PendingIntent.getBroadcast(context, Math.abs(id.hashCode()), intent, flags);

                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }
                } catch (SecurityException se) {
                    try {
                        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } catch (Exception ignored) {}
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
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, morningCal.getTimeInMillis(), briefingPI);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, morningCal.getTimeInMillis(), briefingPI);
                }
            } catch (SecurityException se) {
                try {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, morningCal.getTimeInMillis(), briefingPI);
                } catch (Exception ignored) {}
            }

            // 2. Schedule Event-Specific Prior-Day Reminders
            JSONArray arr = new JSONArray(eventsJson);
            for (int i = 0; i < arr.length(); i++) {
                try {
                    JSONObject ev = arr.getJSONObject(i);
                    if (ev.optBoolean("isCompleted", false)) continue;

                    String dateStr = ev.optString("date", "");
                    if (dateStr.isEmpty()) continue;

                    Date eventDate = sdfDate.parse(dateStr);
                    if (eventDate == null) continue;

                    String id = ev.optString("id", "cal_evt_" + i);
                    String title = ev.optString("title", "Event");
                    String cat = ev.optString("category", "personal");
                    String time = ev.optString("startTime", "");
                    boolean isWished = ev.optBoolean("isWished", false);

                    // A. Prior-Day 8:00 PM Reminder
                    Calendar calPrior = Calendar.getInstance();
                    calPrior.setTime(eventDate);
                    calPrior.add(Calendar.DAY_OF_YEAR, -1);
                    calPrior.set(Calendar.HOUR_OF_DAY, 20); // 8:00 PM prior evening
                    calPrior.set(Calendar.MINUTE, 0);
                    calPrior.set(Calendar.SECOND, 0);

                    long triggerPrior = calPrior.getTimeInMillis();
                    if (triggerPrior > now) {
                        Intent intentPrior = new Intent(context, CalendarReminderReceiver.class);
                        intentPrior.putExtra("eventId", id);
                        intentPrior.putExtra("eventTitle", title);
                        intentPrior.putExtra("eventCategory", cat);
                        intentPrior.putExtra("eventDate", dateStr);
                        intentPrior.putExtra("eventTime", time);
                        intentPrior.putExtra("isTomorrow", true);
                        intentPrior.putExtra("isWished", isWished);

                        PendingIntent piPrior = PendingIntent.getBroadcast(context, Math.abs((id + "_prior").hashCode()), intentPrior, flags);
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerPrior, piPrior);
                            } else {
                                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerPrior, piPrior);
                            }
                        } catch (SecurityException se) {
                            try {
                                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerPrior, piPrior);
                            } catch (Exception ignored) {}
                        }
                    }

                    // B. On-the-Day Notification
                    Calendar calDay = Calendar.getInstance();
                    calDay.setTime(eventDate);
                    int eventHour = 9;
                    int eventMinute = 0;

                    if (time != null && time.contains(":")) {
                        try {
                            String[] parts = time.split(":");
                            eventHour = Integer.parseInt(parts[0].trim());
                            eventMinute = Integer.parseInt(parts[1].trim());
                        } catch (Exception ignored) {}
                    }

                    calDay.set(Calendar.HOUR_OF_DAY, eventHour);
                    calDay.set(Calendar.MINUTE, eventMinute);
                    calDay.set(Calendar.SECOND, 0);

                    long triggerDay = calDay.getTimeInMillis();
                    if (triggerDay > now) {
                        Intent intentDay = new Intent(context, CalendarReminderReceiver.class);
                        intentDay.putExtra("eventId", id);
                        intentDay.putExtra("eventTitle", title);
                        intentDay.putExtra("eventCategory", cat);
                        intentDay.putExtra("eventDate", dateStr);
                        intentDay.putExtra("eventTime", time);
                        intentDay.putExtra("isTomorrow", false);
                        intentDay.putExtra("isWished", isWished);

                        PendingIntent piDay = PendingIntent.getBroadcast(context, Math.abs((id + "_day").hashCode()), intentDay, flags);
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerDay, piDay);
                            } else {
                                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerDay, piDay);
                            }
                        } catch (SecurityException se) {
                            try {
                                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerDay, piDay);
                            } catch (Exception ignored) {}
                        }
                    }
                } catch (Exception itemEx) {
                    itemEx.printStackTrace();
                }
            }
        } catch (Exception ignored) {}
    }
}
