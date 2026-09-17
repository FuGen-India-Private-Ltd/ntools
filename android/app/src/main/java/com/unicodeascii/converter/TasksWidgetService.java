package com.unicodeascii.converter;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class TasksWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TasksRemoteViewsFactory(this.getApplicationContext(), intent);
    }
}

class TasksRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private final List<JSONObject> taskItems = new ArrayList<>();

    public TasksRemoteViewsFactory(Context context, Intent intent) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        loadData();
    }

    @Override
    public void onDataSetChanged() {
        loadData();
    }

    private void loadData() {
        taskItems.clear();
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String tasksJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");

            JSONArray arr = new JSONArray(tasksJsonStr);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (!obj.optBoolean("isCompleted", false)) {
                    taskItems.add(obj);
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        taskItems.clear();
    }

    @Override
    public int getCount() {
        return taskItems.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position < 0 || position >= taskItems.size()) return null;

        try {
            JSONObject task = taskItems.get(position);
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_tasks_item);

            String taskId = task.optString("id", "");
            String title = task.optString("title", "Task");
            String dueDate = task.optString("dueDate", "");
            String dueTime = task.optString("dueTime", "");
            String priority = task.optString("priority", "medium");
            if (priority == null || priority.trim().isEmpty()) {
                priority = "medium";
            }

            row.setTextViewText(R.id.item_task_title, title);

            StringBuilder subtitle = new StringBuilder();
            if (!dueDate.isEmpty()) {
                subtitle.append(dueDate);
                if (!dueTime.isEmpty()) subtitle.append(" at ").append(dueTime);
                subtitle.append(" • ");
            }
            subtitle.append(priority.substring(0, 1).toUpperCase()).append(priority.substring(1)).append(" Priority");

            row.setTextViewText(R.id.item_task_subtitle, subtitle.toString());

            // FillInIntent for completing task
            Intent fillInIntent = new Intent();
            fillInIntent.setAction(TasksWidget.ACTION_COMPLETE_TASK);
            fillInIntent.putExtra(TasksWidget.EXTRA_TASK_ID, taskId);
            row.setOnClickFillInIntent(R.id.btn_item_complete, fillInIntent);

            // FillInIntent for opening Tasks in app
            Intent openTaskIntent = new Intent();
            openTaskIntent.setAction(TasksWidget.ACTION_OPEN_TASK);
            openTaskIntent.putExtra(TasksWidget.EXTRA_TASK_ID, taskId);
            row.setOnClickFillInIntent(R.id.item_task_click_area, openTaskIntent);
            row.setOnClickFillInIntent(R.id.item_task_title, openTaskIntent);
            row.setOnClickFillInIntent(R.id.item_task_subtitle, openTaskIntent);

            return row;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public RemoteViews getLoadingView() {
        try {
            RemoteViews loading = new RemoteViews(context.getPackageName(), R.layout.widget_tasks_item);
            loading.setTextViewText(R.id.item_task_title, "Loading...");
            loading.setTextViewText(R.id.item_task_subtitle, "");
            return loading;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
