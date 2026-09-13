package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONArray;
import org.json.JSONObject;

public class TaskReminderOverlayActivity extends AppCompatActivity {

    private String taskId;
    private String taskTitle;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
                KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (km != null) {
                    km.requestDismissKeyguard(this, null);
                }
            } else {
                getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                );
            }

            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );

            setContentView(R.layout.activity_task_reminder_overlay);

            if (getWindow() != null) {
                int dialogWidth = (int) (getResources().getDisplayMetrics().widthPixels * 0.90);
                getWindow().setLayout(dialogWidth, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
                getWindow().setGravity(android.view.Gravity.CENTER);
                getWindow().setBackgroundDrawableResource(android.R.color.transparent);
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
                getWindow().setDimAmount(0.65f);
            }
            setFinishOnTouchOutside(false);

            taskId = getIntent().getStringExtra("taskId");
            taskTitle = getIntent().getStringExtra("taskTitle");
            String taskTime = getIntent().getStringExtra("taskTime");
            String taskDesc = getIntent().getStringExtra("taskDesc");

            TextView tvTitle = findViewById(R.id.overlay_task_title);
            TextView tvTime = findViewById(R.id.overlay_task_time);
            TextView tvDesc = findViewById(R.id.overlay_task_desc);

            if (taskTitle != null) tvTitle.setText(taskTitle);
            if (taskTime != null) tvTime.setText("Scheduled for " + taskTime);
            if (taskDesc != null && !taskDesc.isEmpty()) {
                tvDesc.setText(taskDesc);
            } else {
                tvDesc.setVisibility(android.view.View.GONE);
            }

            Button btnDismiss = findViewById(R.id.btn_overlay_dismiss);
            Button btnSnooze = findViewById(R.id.btn_overlay_snooze);
            Button btnComplete = findViewById(R.id.btn_overlay_complete);

            btnDismiss.setOnClickListener(v -> {
                dismissNotification();
                finish();
            });

            btnSnooze.setOnClickListener(v -> {
                dismissNotification();
                snoozeTask(10 * 60 * 1000); // 10 minutes
                finish();
            });

            btnComplete.setOnClickListener(v -> {
                dismissNotification();
                markComplete();
                finish();
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void dismissNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && taskId != null) {
                nm.cancel(taskId.hashCode());
                nm.cancel(999);
            }
        } catch (Exception ignored) {}
    }

    private void markComplete() {
        if (taskId == null) return;
        try {
            SharedPreferences prefs = getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
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

            android.appwidget.AppWidgetManager manager = android.appwidget.AppWidgetManager.getInstance(this);
            ComponentName cn = new ComponentName(this, TasksWidget.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids != null && ids.length > 0) {
                manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_tasks_list);
                for (int id : ids) {
                    TasksWidget.updateAppWidget(this, manager, id);
                }
            }

            MainActivity.dispatchJsEvent("task-completed-native");
            Toast.makeText(this, "Task marked as complete! ✓", Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {}
    }

    private void snoozeTask(long delayMillis) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(this, TaskReminderReceiver.class);
        intent.putExtra("taskId", taskId);
        intent.putExtra("taskTitle", taskTitle);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pi = PendingIntent.getBroadcast(this, (taskId + "_snooze").hashCode(), intent, flags);
        long triggerAt = System.currentTimeMillis() + delayMillis;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }

        Toast.makeText(this, "Task snoozed for 10 minutes", Toast.LENGTH_SHORT).show();
    }
}
