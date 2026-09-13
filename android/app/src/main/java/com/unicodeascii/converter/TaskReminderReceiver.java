package com.unicodeascii.converter;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class TaskReminderReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "kannada_suite_task_reminders";
    public static final String ACTION_COMPLETE_TASK_NOTIF = "com.unicodeascii.converter.ACTION_COMPLETE_TASK_NOTIF";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String taskId = intent.getStringExtra("taskId");

        // Action: User tapped "Complete" button directly in notification
        if (ACTION_COMPLETE_TASK_NOTIF.equals(action)) {
            handleCompleteTask(context, taskId);
            return;
        }

        // Action: Task reminder alarm triggered
        handleTaskAlarmTrigger(context, intent);
    }

    private void handleCompleteTask(Context context, String taskId) {
        if (taskId == null) return;
        try {
            // 1. Immediately dismiss notification
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(taskId.hashCode());
                nm.cancel(999);
            }

            // 2. Mark task complete in SharedPreferences
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

            // 3. Update Tasks widget
            android.appwidget.AppWidgetManager manager = android.appwidget.AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, TasksWidget.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids != null && ids.length > 0) {
                manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_tasks_list);
                for (int id : ids) {
                    TasksWidget.updateAppWidget(context, manager, id);
                }
            }

            MainActivity.dispatchJsEvent("task-completed-native");
            Toast.makeText(context, "Task marked as complete! ✓", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleTaskAlarmTrigger(Context context, Intent intent) {
        String taskId = intent.getStringExtra("taskId");
        String taskTitle = intent.getStringExtra("taskTitle");
        String taskTime = intent.getStringExtra("taskTime");
        String taskDesc = intent.getStringExtra("taskDesc");

        if (taskTitle == null || taskTitle.isEmpty()) {
            taskTitle = "Scheduled Task Due";
        }

        createNotificationChannel(context);

        // 1. Wake Screen and CPU
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ntools:task_reminder_wake"
                );
                wl.acquire(5000); // 5 seconds
            }
        } catch (Exception ignored) {}

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        // 2. Full-Screen Overlay Activity Intent
        Intent overlayIntent = new Intent(context, TaskReminderOverlayActivity.class);
        overlayIntent.putExtra("taskId", taskId);
        overlayIntent.putExtra("taskTitle", taskTitle);
        overlayIntent.putExtra("taskTime", taskTime);
        overlayIntent.putExtra("taskDesc", taskDesc);
        overlayIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            (taskId != null ? taskId + "_overlay" : "task_overlay").hashCode(),
            overlayIntent,
            flags
        );

        // 3. Complete Action Intent
        Intent completeIntent = new Intent(context, TaskReminderReceiver.class);
        completeIntent.setAction(ACTION_COMPLETE_TASK_NOTIF);
        completeIntent.putExtra("taskId", taskId);
        PendingIntent completePendingIntent = PendingIntent.getBroadcast(
            context,
            (taskId != null ? taskId + "_comp_notif" : "comp_notif").hashCode(),
            completeIntent,
            flags
        );

        // 4. Intent to open app
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setAction(Intent.ACTION_VIEW);
        appIntent.setData(Uri.parse("app://unicodeascii.converter/#tasks"));
        appIntent.putExtra("route", "tasks");
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent appPendingIntent = PendingIntent.getActivity(context, (taskId != null ? taskId + "_open" : "open").hashCode(), appIntent, flags);

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("⏰ Task Reminder: " + taskTitle)
            .setContentText(taskTime != null ? "Due at " + taskTime : "Scheduled task due now")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(taskDesc != null && !taskDesc.isEmpty() ? taskDesc : taskTitle))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 250, 200, 250})
            .setAutoCancel(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(appPendingIntent)
            .addAction(R.mipmap.ic_launcher, "✓ Complete", completePendingIntent);

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(taskId != null ? taskId.hashCode() : 999, builder.build());
        }

        // Also launch overlay directly
        try {
            context.startActivity(overlayIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Task Reminders & Alarms";
            String description = "High-priority notifications and popups for scheduled task due times";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
