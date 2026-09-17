package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
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
        String alarmsJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        long now = System.currentTimeMillis();

        try {
            JSONArray arr = new JSONArray(alarmsJsonStr);

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
                        for (int daysAhead = 0; daysAhead < 7; daysAhead++) {
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
                    Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                    alarmIntent.putExtra("alarmId", id);
                    alarmIntent.putExtra("alarmTime", time);
                    alarmIntent.putExtra("alarmLabel", label);
                    alarmIntent.putExtra("alarmSound", soundType);

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

                    PendingIntent pi = PendingIntent.getBroadcast(context, id.hashCode(), alarmIntent, flags);

                    Intent showIntent = new Intent(context, MainActivity.class);
                    showIntent.putExtra("route", "clock");
                    showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    PendingIntent showPI = PendingIntent.getActivity(context, (id + "_show").hashCode(), showIntent, flags);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAt, showPI);
                        alarmManager.setAlarmClock(info, pi);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
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

                    PendingIntent piPrior = PendingIntent.getBroadcast(context, (id + "_prior").hashCode(), intentPrior, flags);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerPrior, piPrior);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerPrior, piPrior);
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

                    PendingIntent piDay = PendingIntent.getBroadcast(context, (id + "_day").hashCode(), intentDay, flags);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerDay, piDay);
                    } else {
                        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerDay, piDay);
                    }
                }
            }
        } catch (Exception ignored) {}
    }
}
