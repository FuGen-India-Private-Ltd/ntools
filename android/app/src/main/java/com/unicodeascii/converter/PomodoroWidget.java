package com.unicodeascii.converter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import java.util.Locale;
import org.json.JSONObject;

public class PomodoroWidget extends AppWidgetProvider {

    public static final String ACTION_POMO_START = "com.unicodeascii.converter.ACTION_POMO_START";
    public static final String ACTION_POMO_PAUSE = "com.unicodeascii.converter.ACTION_POMO_PAUSE";
    public static final String ACTION_POMO_RESET = "com.unicodeascii.converter.ACTION_POMO_RESET";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (ACTION_POMO_START.equals(action)) {
            handleStart(context);
        } else if (ACTION_POMO_PAUSE.equals(action)) {
            handlePause(context);
        } else if (ACTION_POMO_RESET.equals(action)) {
            handleReset(context);
        }
    }

    private void handleStart(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_POMODORO, "{}");
            JSONObject obj = new JSONObject(jsonStr);
            int secs = obj.optInt("secondsLeft", 1500);
            if (secs <= 0) secs = 1500;
            obj.put("secondsLeft", secs);
            obj.put("isRunning", true);
            obj.put("mode", obj.optString("mode", "work"));
            prefs.edit().putString(AppWidgetSyncPlugin.KEY_POMODORO, obj.toString()).apply();
            refreshWidgets(context);
        } catch (Exception ignored) {}
    }

    private void handlePause(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_POMODORO, "{}");
            JSONObject obj = new JSONObject(jsonStr);
            obj.put("isRunning", false);
            prefs.edit().putString(AppWidgetSyncPlugin.KEY_POMODORO, obj.toString()).apply();
            refreshWidgets(context);
        } catch (Exception ignored) {}
    }

    private void handleReset(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            JSONObject obj = new JSONObject();
            obj.put("secondsLeft", 1500);
            obj.put("isRunning", false);
            obj.put("mode", "work");
            prefs.edit().putString(AppWidgetSyncPlugin.KEY_POMODORO, obj.toString()).apply();
            refreshWidgets(context);
        } catch (Exception ignored) {}
    }

    private void refreshWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName cn = new ComponentName(context, PomodoroWidget.class);
        int[] ids = manager.getAppWidgetIds(cn);
        if (ids != null) {
            for (int id : ids) {
                updateAppWidget(context, manager, id);
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_pomodoro);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#clock?subtab=timer&mode=focus"));
            openAppIntent.putExtra("route", "clock?subtab=timer&mode=focus");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openPending = PendingIntent.getActivity(context, 401, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_pomo_root, openPending);

            // Bind Start Button
            Intent startIntent = new Intent(context, PomodoroWidget.class);
            startIntent.setAction(ACTION_POMO_START);
            PendingIntent startPI = PendingIntent.getBroadcast(context, 402, startIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_pomo_start, startPI);

            // Bind Pause Button
            Intent pauseIntent = new Intent(context, PomodoroWidget.class);
            pauseIntent.setAction(ACTION_POMO_PAUSE);
            PendingIntent pausePI = PendingIntent.getBroadcast(context, 403, pauseIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_pomo_pause, pausePI);

            // Bind End / Reset Button
            Intent endIntent = new Intent(context, PomodoroWidget.class);
            endIntent.setAction(ACTION_POMO_RESET);
            PendingIntent endPI = PendingIntent.getBroadcast(context, 404, endIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_pomo_end, endPI);

            // Read state
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String stateJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_POMODORO, "{}");

            try {
                JSONObject obj = new JSONObject(stateJsonStr);
                int secs = obj.optInt("secondsLeft", 1500);
                boolean isRunning = obj.optBoolean("isRunning", false);
                String mode = obj.optString("mode", "work");

                int mins = secs / 60;
                int remSecs = secs % 60;
                String timeFormatted = String.format(Locale.US, "%02d:%02d", mins, remSecs);

                views.setTextViewText(R.id.widget_pomo_digits, timeFormatted);
                String statusDesc = (mode.equals("work") ? "Focus Session" : "Break Time") + (isRunning ? " • ● Running" : " • ○ Paused");
                views.setTextViewText(R.id.widget_pomo_status, statusDesc);
            } catch (Exception e) {
                views.setTextViewText(R.id.widget_pomo_digits, "25:00");
                views.setTextViewText(R.id.widget_pomo_status, "Focus Session • Ready");
            }

            // Apply Theme Customization
            WidgetThemeHelper.applyTheme(
                context,
                views,
                R.id.widget_pomo_root,
                new int[]{R.id.widget_pomo_icon},
                new int[]{R.id.btn_pomo_start, R.id.btn_pomo_pause, R.id.btn_pomo_end}
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
