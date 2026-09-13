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

public class ClockWidget extends AppWidgetProvider {

    public static final String ACTION_TOGGLE_NEXT_ALARM = "com.unicodeascii.converter.ACTION_TOGGLE_NEXT_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_TOGGLE_NEXT_ALARM.equals(intent.getAction())) {
            toggleNextAlarm(context);
        }
    }

    private void toggleNextAlarm(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString("widget_alarms_json", "[]");

            JSONArray arr = new JSONArray(alarmsJson);
            if (arr.length() > 0) {
                JSONObject first = arr.getJSONObject(0);
                boolean current = first.optBoolean("isEnabled", true);
                first.put("isEnabled", !current);
                arr.put(0, first);
                prefs.edit().putString("widget_alarms_json", arr.toString()).apply();
            }

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, ClockWidget.class);
            int[] ids = manager.getAppWidgetIds(cn);
            for (int id : ids) {
                updateAppWidget(context, manager, id);
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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_clock);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            // Click on widget root opens Clock tab
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#clock"));
            openAppIntent.putExtra("route", "clock");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, 801, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_clock_root, openAppPendingIntent);

            // Toggle button click
            Intent toggleIntent = new Intent(context, ClockWidget.class);
            toggleIntent.setAction(ACTION_TOGGLE_NEXT_ALARM);
            PendingIntent togglePendingIntent = PendingIntent.getBroadcast(
                context,
                802,
                toggleIntent,
                immutableFlags
            );
            views.setOnClickPendingIntent(R.id.btn_widget_toggle_alarm, togglePendingIntent);

            // Read alarms state
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJson = prefs.getString("widget_alarms_json", "[]");

            try {
                JSONArray arr = new JSONArray(alarmsJson);
                if (arr.length() > 0) {
                    JSONObject nextAlarm = arr.getJSONObject(0);
                    String time = nextAlarm.optString("time", "07:00");
                    String label = nextAlarm.optString("label", "Alarm");
                    boolean isEnabled = nextAlarm.optBoolean("isEnabled", true);

                    views.setTextViewText(R.id.widget_clock_time_text, time);
                    views.setTextViewText(R.id.widget_clock_label_text, label);

                    if (isEnabled) {
                        views.setTextViewText(R.id.btn_widget_toggle_alarm, "ON");
                        views.setTextColor(R.id.btn_widget_toggle_alarm, Color.parseColor("#34D399")); // Emerald
                        views.setTextViewText(R.id.widget_clock_status_tag, "● Scheduled");
                        views.setTextColor(R.id.widget_clock_status_tag, Color.parseColor("#34D399"));
                    } else {
                        views.setTextViewText(R.id.btn_widget_toggle_alarm, "OFF");
                        views.setTextColor(R.id.btn_widget_toggle_alarm, Color.parseColor("#CBD5E1")); // Crisp Slate
                        views.setTextViewText(R.id.widget_clock_status_tag, "○ Disabled");
                        views.setTextColor(R.id.widget_clock_status_tag, Color.parseColor("#CBD5E1"));
                    }
                } else {
                    views.setTextViewText(R.id.widget_clock_time_text, "--:--");
                    views.setTextViewText(R.id.widget_clock_label_text, "No alarms set");
                    views.setTextViewText(R.id.btn_widget_toggle_alarm, "+");
                    views.setTextColor(R.id.btn_widget_toggle_alarm, Color.parseColor("#F59E0B"));
                    views.setTextViewText(R.id.widget_clock_status_tag, "Tap to add");
                    views.setTextColor(R.id.widget_clock_status_tag, Color.parseColor("#CBD5E1"));
                }
            } catch (Exception e) {
                views.setTextViewText(R.id.widget_clock_time_text, "--:--");
                views.setTextViewText(R.id.widget_clock_label_text, "Alarms");
            }

            WidgetThemeHelper.applyTheme(context, views, R.id.widget_clock_root, null, new int[]{R.id.btn_widget_toggle_alarm});

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
