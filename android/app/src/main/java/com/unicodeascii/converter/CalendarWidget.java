package com.unicodeascii.converter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;

public class CalendarWidget extends AppWidgetProvider {

    private static final int[] CELL_IDS = {
        R.id.cell_0_0, R.id.cell_0_1, R.id.cell_0_2, R.id.cell_0_3, R.id.cell_0_4, R.id.cell_0_5, R.id.cell_0_6,
        R.id.cell_1_0, R.id.cell_1_1, R.id.cell_1_2, R.id.cell_1_3, R.id.cell_1_4, R.id.cell_1_5, R.id.cell_1_6,
        R.id.cell_2_0, R.id.cell_2_1, R.id.cell_2_2, R.id.cell_2_3, R.id.cell_2_4, R.id.cell_2_5, R.id.cell_2_6,
        R.id.cell_3_0, R.id.cell_3_1, R.id.cell_3_2, R.id.cell_3_3, R.id.cell_3_4, R.id.cell_3_5, R.id.cell_3_6,
        R.id.cell_4_0, R.id.cell_4_1, R.id.cell_4_2, R.id.cell_4_3, R.id.cell_4_4, R.id.cell_4_5, R.id.cell_4_6,
        R.id.cell_5_0, R.id.cell_5_1, R.id.cell_5_2, R.id.cell_5_3, R.id.cell_5_4, R.id.cell_5_5, R.id.cell_5_6,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#calendar"));
            openAppIntent.putExtra("route", "calendar");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, 601, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_calendar_root, openAppPendingIntent);

            Calendar cal = Calendar.getInstance();
            int todayDay = cal.get(Calendar.DAY_OF_MONTH);
            int currentMonth = cal.get(Calendar.MONTH);
            int currentYear = cal.get(Calendar.YEAR);

            SimpleDateFormat monthFormat = new SimpleDateFormat("MMMM yyyy", Locale.getDefault());
            views.setTextViewText(R.id.widget_cal_month_title, monthFormat.format(cal.getTime()));

            // Read event dates for indicator dots
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String eventsJson = prefs.getString(AppWidgetSyncPlugin.KEY_CALENDAR, "[]");
            String tasksJson = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");

            Set<Integer> activeDays = new HashSet<>();
            try {
                JSONArray eventsArr = new JSONArray(eventsJson);
                for (int i = 0; i < eventsArr.length(); i++) {
                    String d = eventsArr.getJSONObject(i).optString("date", "");
                    if (d.startsWith(String.format(Locale.US, "%04d-%02d", currentYear, currentMonth + 1))) {
                        String[] parts = d.split("-");
                        if (parts.length == 3) activeDays.add(Integer.parseInt(parts[2]));
                    }
                }
                JSONArray tasksArr = new JSONArray(tasksJson);
                for (int i = 0; i < tasksArr.length(); i++) {
                    String d = tasksArr.getJSONObject(i).optString("dueDate", "");
                    if (d.startsWith(String.format(Locale.US, "%04d-%02d", currentYear, currentMonth + 1))) {
                        String[] parts = d.split("-");
                        if (parts.length == 3) activeDays.add(Integer.parseInt(parts[2]));
                    }
                }
            } catch (Exception ignored) {}

            // Calculate days layout
            cal.set(Calendar.DAY_OF_MONTH, 1);
            int firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - 1; // 0 = Sunday
            int daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH);

            int cellIndex = 0;
            // Blank cells before month start
            for (int i = 0; i < firstDayOfWeek && cellIndex < CELL_IDS.length; i++) {
                views.setTextViewText(CELL_IDS[cellIndex], "");
                views.setTextColor(CELL_IDS[cellIndex], Color.TRANSPARENT);
                cellIndex++;
            }

            // Current month cells
            for (int day = 1; day <= daysInMonth && cellIndex < CELL_IDS.length; day++) {
                int cellId = CELL_IDS[cellIndex];
                boolean isToday = (day == todayDay);
                boolean hasDot = activeDays.contains(day);

                String text = String.valueOf(day) + (hasDot ? "•" : "");
                views.setTextViewText(cellId, text);

                if (isToday) {
                    views.setTextColor(cellId, Color.parseColor("#F59E0B")); // Amber
                } else {
                    views.setTextColor(cellId, Color.parseColor("#F8FAFC")); // Crisp White
                }
                cellIndex++;
            }

            // Blank cells after month end
            while (cellIndex < CELL_IDS.length) {
                views.setTextViewText(CELL_IDS[cellIndex], "");
                views.setTextColor(CELL_IDS[cellIndex], Color.TRANSPARENT);
                cellIndex++;
            }

            WidgetThemeHelper.applyTheme(context, views, R.id.widget_calendar_root, new int[]{R.id.widget_cal_month_title}, null);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
