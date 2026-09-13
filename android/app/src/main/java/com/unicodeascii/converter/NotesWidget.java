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
import org.json.JSONArray;
import org.json.JSONObject;

public class NotesWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_notes);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#notes"));
            openAppIntent.putExtra("route", "notes");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, 501, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_notes_root, openAppPendingIntent);

            // Read notes from SharedPreferences
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String notesJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_NOTES, "[]");

            try {
                JSONArray arr = new JSONArray(notesJsonStr);
                if (arr.length() > 0) {
                    JSONObject note = arr.getJSONObject(0);
                    views.setTextViewText(R.id.widget_note_title, note.optString("title", "Quick Note"));
                    views.setTextViewText(R.id.widget_note_snippet, note.optString("content", "Tap to open and edit notes..."));
                } else {
                    views.setTextViewText(R.id.widget_note_title, "Rich Notes");
                    views.setTextViewText(R.id.widget_note_snippet, "No notes yet. Tap to create a new markdown note.");
                }
            } catch (Exception e) {
                views.setTextViewText(R.id.widget_note_title, "Rich Notes");
                views.setTextViewText(R.id.widget_note_snippet, "Tap to open and capture thoughts.");
            }

            WidgetThemeHelper.applyTheme(context, views, R.id.widget_notes_root, new int[]{R.id.widget_note_title}, null);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
