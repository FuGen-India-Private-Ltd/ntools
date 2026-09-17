package com.unicodeascii.converter;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(name = "AppWidgetSyncPlugin")
public class AppWidgetSyncPlugin extends Plugin {

    public static final String PREFS_NAME = "kannada_suite_widget_prefs";
    public static final String KEY_TASKS = "widget_tasks_json";
    public static final String KEY_NOTES = "widget_notes_json";
    public static final String KEY_CALENDAR = "widget_calendar_json";
    public static final String KEY_POMODORO = "widget_pomodoro_json";
    public static final String KEY_ALARMS = "widget_alarms_json";
    public static final String KEY_WIDGET_CONFIG = "widget_custom_config_json";

    @PluginMethod
    public void syncTasks(PluginCall call) {
        try {
            String tasksJson = call.getString("tasksJson", "[]");
            savePref(KEY_TASKS, tasksJson);
            Context context = getContext();
            if (context != null) {
                BootReceiver.rescheduleAllTaskAlarms(context);
            }
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncAlarms(PluginCall call) {
        try {
            String alarmsJson = call.getString("alarmsJson", "[]");
            savePref(KEY_ALARMS, alarmsJson);
            Context context = getContext();
            if (context != null) {
                BootReceiver.rescheduleAllClockAlarms(context);
            }
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncNotes(PluginCall call) {
        try {
            String notesJson = call.getString("notesJson", "[]");
            savePref(KEY_NOTES, notesJson);
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncCalendar(PluginCall call) {
        try {
            String eventsJson = call.getString("eventsJson", "[]");
            savePref(KEY_CALENDAR, eventsJson);
            Context context = getContext();
            if (context != null) {
                BootReceiver.rescheduleAllCalendarReminders(context);
            }
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncPomodoro(PluginCall call) {
        try {
            String stateJson = call.getString("stateJson", "{}");
            savePref(KEY_POMODORO, stateJson);
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncWidgetConfig(PluginCall call) {
        try {
            String configJson = call.getString("configJson", "{}");
            savePref(KEY_WIDGET_CONFIG, configJson);
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void syncAll(PluginCall call) {
        try {
            Context context = getContext();
            if (context != null) {
                BootReceiver.rescheduleAllTaskAlarms(context);
                BootReceiver.rescheduleAllClockAlarms(context);
                BootReceiver.rescheduleAllCalendarReminders(context);
            }
            updateAllWidgets();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        boolean canDraw = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Context ctx = getContext();
            canDraw = ctx != null && Settings.canDrawOverlays(ctx);
        }
        JSObject ret = new JSObject();
        ret.put("granted", canDraw);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Activity act = getActivity();
            Context ctx = act != null ? act : getContext();
            String pkg = ctx != null ? ctx.getPackageName() : "com.unicodeascii.converter";
            boolean started = false;
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + pkg));
                if (act != null) {
                    act.startActivity(intent);
                } else if (ctx != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
                started = true;
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    if (act != null) {
                        act.startActivity(intent);
                    } else if (ctx != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(intent);
                    }
                    started = true;
                } catch (Exception ignored) {}
            }
            if (!started) {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
                    if (act != null) {
                        act.startActivity(intent);
                    } else if (ctx != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(intent);
                    }
                } catch (Exception ignored) {}
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkExactAlarmPermission(PluginCall call) {
        boolean canSchedule = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Context ctx = getContext();
            if (ctx != null) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                canSchedule = (am != null) && am.canScheduleExactAlarms();
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", canSchedule);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Activity act = getActivity();
            Context ctx = act != null ? act : getContext();
            String pkg = ctx != null ? ctx.getPackageName() : "com.unicodeascii.converter";
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + pkg));
                if (act != null) {
                    act.startActivity(intent);
                } else if (ctx != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    if (act != null) {
                        act.startActivity(intent);
                    } else if (ctx != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(intent);
                    }
                } catch (Exception ignored) {}
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkBatteryOptimizationExempt(PluginCall call) {
        boolean isExempt = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Context ctx = getContext();
            String pkg = ctx != null ? ctx.getPackageName() : "com.unicodeascii.converter";
            PowerManager pm = ctx != null ? (PowerManager) ctx.getSystemService(Context.POWER_SERVICE) : null;
            isExempt = (pm != null) && pm.isIgnoringBatteryOptimizations(pkg);
        }
        JSObject ret = new JSObject();
        ret.put("isExempt", isExempt);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Activity act = getActivity();
            Context ctx = act != null ? act : getContext();
            String pkg = ctx != null ? ctx.getPackageName() : "com.unicodeascii.converter";
            try {
                PowerManager pm = ctx != null ? (PowerManager) ctx.getSystemService(Context.POWER_SERVICE) : null;
                if (pm != null && !pm.isIgnoringBatteryOptimizations(pkg)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + pkg));
                    if (act != null) {
                        act.startActivity(intent);
                    } else if (ctx != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(intent);
                    }
                }
            } catch (Exception ignored) {}
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void checkAllStartupPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean exactAlarm = true;
        boolean batteryExempt = true;
        boolean overlay = true;
        boolean notifications = true;
        boolean audioRecord = true;

        if (ctx != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                exactAlarm = (am != null) && am.canScheduleExactAlarms();
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                batteryExempt = (pm != null) && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
                overlay = Settings.canDrawOverlays(ctx);
                audioRecord = ctx.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                notifications = ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }
        }

        JSObject ret = new JSObject();
        ret.put("exactAlarm", exactAlarm);
        ret.put("batteryExempt", batteryExempt);
        ret.put("overlay", overlay);
        ret.put("notifications", notifications);
        ret.put("audioRecord", audioRecord);
        ret.put("allEssentialGranted", exactAlarm && batteryExempt && overlay);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Activity act = getActivity();
            if (act != null) {
                act.requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 102);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Activity act = getActivity();
            if (act != null) {
                act.requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 103);
            }
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingRoute(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("route", MainActivity.pendingRoute != null ? MainActivity.pendingRoute : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingRoute(PluginCall call) {
        MainActivity.pendingRoute = null;
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppDetailsSettings(PluginCall call) {
        try {
            Activity act = getActivity();
            Context ctx = act != null ? act : getContext();
            String pkg = ctx != null ? ctx.getPackageName() : "com.unicodeascii.converter";
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
            if (act != null) {
                act.startActivity(intent);
            } else if (ctx != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleTimerAlarm(PluginCall call) {
        try {
            int seconds = call.getInt("seconds", 0);
            String label = call.getString("label", "Timer Finished!");
            String id = call.getString("id", "timer_native_alarm");
            Context ctx = getContext();
            if (ctx != null && seconds > 0) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent intent = new Intent(ctx, AlarmReceiver.class);
                    intent.putExtra("alarmId", id);
                    intent.putExtra("alarmLabel", label);
                    intent.putExtra("alarmTime", new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(System.currentTimeMillis() + ((long) seconds * 1000))));
                    intent.putExtra("alarmSound", "digital_siren");

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, id.hashCode(), intent, flags);

                    long triggerAt = System.currentTimeMillis() + ((long) seconds * 1000);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        am.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, pi), pi);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }
                }
            }
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelTimerAlarm(PluginCall call) {
        try {
            String id = call.getString("id", "timer_native_alarm");
            Context ctx = getContext();
            if (ctx != null) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent intent = new Intent(ctx, AlarmReceiver.class);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, id.hashCode(), intent, flags);
                    am.cancel(pi);
                }
            }
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void testAlarmPopup(PluginCall call) {
        try {
            Context ctx = getContext();
            if (ctx != null) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent intent = new Intent(ctx, AlarmReceiver.class);
                    intent.putExtra("alarmId", "test_alarm_" + System.currentTimeMillis());
                    intent.putExtra("alarmLabel", "Test Alarm Popup");
                    intent.putExtra("alarmTime", new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date()));
                    intent.putExtra("alarmSound", "twin_bell");

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, 99999, intent, flags);

                    long triggerAt = System.currentTimeMillis() + 1500; // 1.5 seconds
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        am.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, pi), pi);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                    }
                }
            }
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void dismissAlarm(PluginCall call) {
        try {
            Context ctx = getContext();
            if (ctx != null) {
                AlarmService.stopAlarm(ctx);
            }
            AlarmAlertOverlayActivity.dismissActiveOverlay();
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void snoozeAlarm(PluginCall call) {
        try {
            int minutes = call.getInt("minutes", 10);
            Context ctx = getContext();
            if (ctx != null) {
                AlarmService.stopAlarm(ctx);
            }
            AlarmAlertOverlayActivity.snoozeActiveOverlay((long) minutes * 60 * 1000);
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void savePref(String key, String value) {
        try {
            Context context = getContext();
            if (context != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(key, value).apply();
            }
        } catch (Exception ignored) {}
    }

    public void updateAllWidgets() {
        Context context = getContext();
        if (context != null) {
            updateAllWidgets(context);
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            if (context == null) return;

            AppWidgetManager manager = AppWidgetManager.getInstance(context);

            // 1. Update Tasks Widget
            try {
                int[] taskIds = manager.getAppWidgetIds(new ComponentName(context, TasksWidget.class));
                if (taskIds != null && taskIds.length > 0) {
                    manager.notifyAppWidgetViewDataChanged(taskIds, R.id.widget_tasks_list);
                    for (int id : taskIds) {
                        TasksWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 2. Update Clock Widget
            try {
                int[] clockIds = manager.getAppWidgetIds(new ComponentName(context, ClockWidget.class));
                if (clockIds != null && clockIds.length > 0) {
                    for (int id : clockIds) {
                        ClockWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 3. Update Transparent Clock Widget
            try {
                int[] transClockIds = manager.getAppWidgetIds(new ComponentName(context, ClockTransparentWidget.class));
                if (transClockIds != null && transClockIds.length > 0) {
                    for (int id : transClockIds) {
                        ClockTransparentWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 4. Update Alarm Widget
            try {
                int[] alarmIds = manager.getAppWidgetIds(new ComponentName(context, AlarmWidget.class));
                if (alarmIds != null && alarmIds.length > 0) {
                    for (int id : alarmIds) {
                        AlarmWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 4b. Update Vertical Clock Widget
            try {
                int[] vertClockIds = manager.getAppWidgetIds(new ComponentName(context, ClockVerticalWidget.class));
                if (vertClockIds != null && vertClockIds.length > 0) {
                    for (int id : vertClockIds) {
                        ClockVerticalWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 5. Update Notes Widget
            try {
                int[] noteIds = manager.getAppWidgetIds(new ComponentName(context, NotesWidget.class));
                if (noteIds != null && noteIds.length > 0) {
                    for (int id : noteIds) {
                        NotesWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 6. Update Calendar Month Widget
            try {
                int[] calIds = manager.getAppWidgetIds(new ComponentName(context, CalendarWidget.class));
                if (calIds != null && calIds.length > 0) {
                    for (int id : calIds) {
                        CalendarWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 7. Update Calendar Today & Agenda Widget
            try {
                int[] calTodayIds = manager.getAppWidgetIds(new ComponentName(context, CalendarTodayWidget.class));
                if (calTodayIds != null && calTodayIds.length > 0) {
                    for (int id : calTodayIds) {
                        CalendarTodayWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 8. Update Pomodoro Widget
            try {
                int[] pomoIds = manager.getAppWidgetIds(new ComponentName(context, PomodoroWidget.class));
                if (pomoIds != null && pomoIds.length > 0) {
                    for (int id : pomoIds) {
                        PomodoroWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 9. Update Calculator Widget
            try {
                int[] calcIds = manager.getAppWidgetIds(new ComponentName(context, CalculatorWidget.class));
                if (calcIds != null && calcIds.length > 0) {
                    for (int id : calcIds) {
                        CalculatorWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 10. Update Quick Launch Widget
            try {
                int[] quickIds = manager.getAppWidgetIds(new ComponentName(context, QuickLaunchWidget.class));
                if (quickIds != null && quickIds.length > 0) {
                    for (int id : quickIds) {
                        QuickLaunchWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}

            // 11. Update Single Tool Widget
            try {
                int[] singleIds = manager.getAppWidgetIds(new ComponentName(context, SingleToolWidget.class));
                if (singleIds != null && singleIds.length > 0) {
                    for (int id : singleIds) {
                        SingleToolWidget.updateAppWidget(context, manager, id);
                    }
                }
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
    }
}
