package com.unicodeascii.converter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class CalendarTodayWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_today);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            // Click root opens Calendar
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#calendar"));
            openAppIntent.putExtra("route", "calendar");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openPending = PendingIntent.getActivity(context, 830, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_cal_today_root, openPending);
            views.setOnClickPendingIntent(R.id.widget_cal_today_dayname, openPending);
            views.setOnClickPendingIntent(R.id.widget_cal_today_daynum, openPending);
            views.setOnClickPendingIntent(R.id.widget_cal_today_month, openPending);
            views.setOnClickPendingIntent(R.id.widget_cal_today_festival, openPending);
            views.setOnClickPendingIntent(R.id.widget_cal_today_event, openPending);

            // Date calculations
            Calendar cal = Calendar.getInstance();
            SimpleDateFormat dayFormat = new SimpleDateFormat("EEEE", Locale.getDefault());
            SimpleDateFormat monthFormat = new SimpleDateFormat("MMM yyyy", Locale.getDefault());
            SimpleDateFormat fullDateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

            String dayName = dayFormat.format(cal.getTime());
            String dayNum = String.valueOf(cal.get(Calendar.DAY_OF_MONTH));
            String monthYear = monthFormat.format(cal.getTime());
            String todayIso = fullDateFormat.format(cal.getTime());

            views.setTextViewText(R.id.widget_cal_today_dayname, dayName);
            views.setTextViewText(R.id.widget_cal_today_daynum, dayNum);
            views.setTextViewText(R.id.widget_cal_today_month, monthYear);

            // Read events & festivals for today
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String eventsJson = prefs.getString(AppWidgetSyncPlugin.KEY_CALENDAR, "[]");
            String tasksJson = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");

            String todayFestival = "";
            String todayEvent = "";

            try {
                JSONArray eventsArr = new JSONArray(eventsJson);
                for (int i = 0; i < eventsArr.length(); i++) {
                    JSONObject ev = eventsArr.getJSONObject(i);
                    String d = ev.optString("date", "");
                    if (d.equals(todayIso)) {
                        String title = ev.optString("title", "");
                        String type = ev.optString("type", "");
                        if ("festival".equalsIgnoreCase(type) || title.contains("Festival") || title.contains("Chaturthi") || title.contains("Jayanthi") || title.contains("Ugadi") || title.contains("Diwali")) {
                            if (todayFestival.isEmpty()) todayFestival = "🌟 " + title;
                        } else if ("birthday".equalsIgnoreCase(type) || title.contains("Birthday")) {
                            if (todayEvent.isEmpty()) todayEvent = "🎂 " + title;
                        } else {
                            if (todayEvent.isEmpty()) todayEvent = "📌 " + title;
                        }
                    }
                }

                // If no festival from events, check common Indian/Karnataka dates or tasks
                if (todayFestival.isEmpty()) {
                    int m = cal.get(Calendar.MONTH) + 1;
                    int day = cal.get(Calendar.DAY_OF_MONTH);
                    if (m == 9 && day == 13) {
                        todayFestival = "🌟 Ganesh Chaturthi Festival";
                    } else if (m == 11 && day == 1) {
                        todayFestival = "🌟 Kannada Rajyotsava (ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ)";
                    } else if (m == 8 && day == 15) {
                        todayFestival = "🇮🇳 Independence Day";
                    } else if (m == 1 && day == 26) {
                        todayFestival = "🇮🇳 Republic Day";
                    } else {
                        todayFestival = "📅 All Clear Today";
                    }
                }

                if (todayEvent.isEmpty()) {
                    JSONArray tasksArr = new JSONArray(tasksJson);
                    for (int i = 0; i < tasksArr.length(); i++) {
                        JSONObject t = tasksArr.getJSONObject(i);
                        String due = t.optString("dueDate", "");
                        if (due.equals(todayIso) && !t.optBoolean("isCompleted", false)) {
                            todayEvent = "☑ " + t.optString("title", "Task pending");
                            break;
                        }
                    }
                    if (todayEvent.isEmpty()) {
                        todayEvent = "No pending tasks or deadlines today";
                    }
                }
            } catch (Exception ignored) {}

            views.setTextViewText(R.id.widget_cal_today_festival, todayFestival);
            views.setTextViewText(R.id.widget_cal_today_event, todayEvent);

            // Apply Theme Customization
            WidgetThemeHelper.applyTheme(
                context,
                views,
                R.id.widget_cal_today_root,
                new int[]{R.id.widget_cal_today_dayname},
                null
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
