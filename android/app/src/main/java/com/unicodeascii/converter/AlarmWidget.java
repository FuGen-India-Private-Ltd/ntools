package com.unicodeascii.converter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class AlarmWidget extends AppWidgetProvider {

    public static final String ACTION_TOGGLE_ALARM = "com.unicodeascii.converter.ACTION_TOGGLE_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_TOGGLE_ALARM.equals(intent.getAction())) {
            toggleAlarm(context);
        }
    }

    private void toggleAlarm(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");

            JSONArray arr = new JSONArray(alarmsJson);
            if (arr.length() > 0) {
                JSONObject first = arr.getJSONObject(0);
                boolean current = first.optBoolean("isEnabled", true);
                first.put("isEnabled", !current);
                arr.put(0, first);
                prefs.edit().putString(AppWidgetSyncPlugin.KEY_ALARMS, arr.toString()).apply();
                BootReceiver.rescheduleAllClockAlarms(context);
            }

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, AlarmWidget.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids != null) {
                for (int id : ids) {
                    updateAppWidget(context, manager, id);
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_alarm);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            // Click root opens clock/alarms tab
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#clock"));
            openAppIntent.putExtra("route", "clock");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openPending = PendingIntent.getActivity(context, 820, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_alarm_root, openPending);

            // Toggle button
            Intent toggleIntent = new Intent(context, AlarmWidget.class);
            toggleIntent.setAction(ACTION_TOGGLE_ALARM);
            PendingIntent togglePending = PendingIntent.getBroadcast(context, 821, toggleIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_widget_toggle_alarm_action, togglePending);

            // Read next alarm
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");

            try {
                JSONArray arr = new JSONArray(alarmsJson);
                if (arr.length() > 0) {
                    JSONObject nextAlarm = arr.getJSONObject(0);
                    String time = nextAlarm.optString("time", "07:00 AM");
                    String label = nextAlarm.optString("label", "Morning Alarm");
                    String days = nextAlarm.optString("days", "Mon-Fri");
                    boolean isEnabled = nextAlarm.optBoolean("isEnabled", true);

                    views.setTextViewText(R.id.widget_alarm_time_text, time);
                    views.setTextViewText(R.id.widget_alarm_label_text, label + (days.isEmpty() ? "" : " • " + days));

                    if (isEnabled) {
                        views.setTextViewText(R.id.btn_widget_toggle_alarm_action, "ON");
                        views.setTextColor(R.id.btn_widget_toggle_alarm_action, Color.parseColor("#34D399"));
                        views.setTextViewText(R.id.widget_alarm_status_tag, "● Active");
                        views.setTextColor(R.id.widget_alarm_status_tag, Color.parseColor("#34D399"));
                    } else {
                        views.setTextViewText(R.id.btn_widget_toggle_alarm_action, "OFF");
                        views.setTextColor(R.id.btn_widget_toggle_alarm_action, Color.parseColor("#94A3B8"));
                        views.setTextViewText(R.id.widget_alarm_status_tag, "○ Disabled");
                        views.setTextColor(R.id.widget_alarm_status_tag, Color.parseColor("#94A3B8"));
                    }
                } else {
                    views.setTextViewText(R.id.widget_alarm_time_text, "--:--");
                    views.setTextViewText(R.id.widget_alarm_label_text, "No alarms set • Tap to add");
                    views.setTextViewText(R.id.btn_widget_toggle_alarm_action, "+");
                    views.setTextColor(R.id.btn_widget_toggle_alarm_action, Color.parseColor("#F59E0B"));
                    views.setTextViewText(R.id.widget_alarm_status_tag, "Idle");
                    views.setTextColor(R.id.widget_alarm_status_tag, Color.parseColor("#94A3B8"));
                }
            } catch (Exception e) {
                views.setTextViewText(R.id.widget_alarm_time_text, "07:00 AM");
                views.setTextViewText(R.id.widget_alarm_label_text, "Alarms");
            }

            // Apply Theme Customization
            WidgetThemeHelper.applyTheme(
                context,
                views,
                R.id.widget_alarm_root,
                null,
                new int[]{R.id.btn_widget_toggle_alarm_action}
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
