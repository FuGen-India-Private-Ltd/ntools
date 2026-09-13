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
import org.json.JSONArray;
import org.json.JSONObject;

public class TasksWidget extends AppWidgetProvider {

    public static final String ACTION_COMPLETE_TASK = "com.unicodeascii.converter.ACTION_COMPLETE_TASK";
    public static final String EXTRA_TASK_ID = "extra_task_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_COMPLETE_TASK.equals(intent.getAction())) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            if (taskId != null && !taskId.isEmpty()) {
                markTaskComplete(context, taskId);
            }
        }
    }

    private void markTaskComplete(Context context, String taskId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String tasksJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");

            JSONArray arr = new JSONArray(tasksJsonStr);
            JSONArray updated = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (taskId.equals(obj.optString("id"))) {
                    obj.put("isCompleted", true);
                    obj.put("completedAt", System.currentTimeMillis());
                }
                updated.put(obj);
            }
            prefs.edit().putString(AppWidgetSyncPlugin.KEY_TASKS, updated.toString()).apply();

            // Refresh all Tasks widgets immediately
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, TasksWidget.class);
            int[] ids = manager.getAppWidgetIds(cn);
            manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_tasks_list);

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
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_tasks_list);
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            int mutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                mutableFlags |= PendingIntent.FLAG_MUTABLE;
            }

            // Header click opens Tasks tab
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#tasks"));
            openAppIntent.putExtra("route", "tasks");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, 301, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_tasks_header, openAppPendingIntent);
            views.setOnClickPendingIntent(R.id.btn_widget_add_task, openAppPendingIntent);

            // Connect scrollable ListView service
            Intent serviceIntent = new Intent(context, TasksWidgetService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_tasks_list, serviceIntent);
            views.setEmptyView(R.id.widget_tasks_list, R.id.widget_tasks_empty);

            // PendingIntent template for clicking complete
            Intent completeIntent = new Intent(context, TasksWidget.class);
            completeIntent.setAction(ACTION_COMPLETE_TASK);
            PendingIntent completePendingIntent = PendingIntent.getBroadcast(
                context,
                302,
                completeIntent,
                mutableFlags
            );
            views.setPendingIntentTemplate(R.id.widget_tasks_list, completePendingIntent);

            // Task count
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String tasksJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");
            int pending = 0;
            try {
                JSONArray tasksArray = new JSONArray(tasksJsonStr);
                for (int i = 0; i < tasksArray.length(); i++) {
                    if (!tasksArray.getJSONObject(i).optBoolean("isCompleted", false)) pending++;
                }
            } catch (Exception ignored) {}

            if (pending == 0) {
                views.setTextViewText(R.id.widget_tasks_count, "All done! 🎉");
            } else if (pending == 1) {
                views.setTextViewText(R.id.widget_tasks_count, "1 task pending");
            } else {
                views.setTextViewText(R.id.widget_tasks_count, pending + " tasks pending");
            }

            WidgetThemeHelper.applyTheme(context, views, R.id.widget_tasks_root, null, new int[]{R.id.btn_widget_add_task});

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
