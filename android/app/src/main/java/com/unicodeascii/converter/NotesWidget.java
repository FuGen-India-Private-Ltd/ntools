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

public class NotesWidget extends AppWidgetProvider {

    public static final String ACTION_PREV_NOTE = "com.unicodeascii.converter.ACTION_PREV_NOTE";
    public static final String ACTION_NEXT_NOTE = "com.unicodeascii.converter.ACTION_NEXT_NOTE";
    public static final String PREF_NOTE_ID_PREFIX = "widget_note_id_";
    public static final String PREF_NOTE_INDEX_PREFIX = "widget_note_index_";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();

        if (ACTION_PREV_NOTE.equals(action) || ACTION_NEXT_NOTE.equals(action)) {
            int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                cycleWidgetNote(context, appWidgetId, ACTION_NEXT_NOTE.equals(action));
            }
        }
    }

    private void cycleWidgetNote(Context context, int appWidgetId, boolean forward) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String notesJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_NOTES, "[]");
            JSONArray arr = new JSONArray(notesJsonStr);
            int total = arr.length();
            if (total <= 1) return;

            int currentIndex = prefs.getInt(PREF_NOTE_INDEX_PREFIX + appWidgetId, 0);
            int newIndex;
            if (forward) {
                newIndex = (currentIndex + 1) % total;
            } else {
                newIndex = (currentIndex - 1 + total) % total;
            }

            JSONObject targetNote = arr.getJSONObject(newIndex);
            String targetId = targetNote.optString("id", "");

            prefs.edit()
                .putInt(PREF_NOTE_INDEX_PREFIX + appWidgetId, newIndex)
                .putString(PREF_NOTE_ID_PREFIX + appWidgetId, targetId)
                .apply();

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            updateAppWidget(context, manager, appWidgetId);
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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_notes);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String notesJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_NOTES, "[]");

            JSONArray arr = new JSONArray(notesJsonStr);
            int total = arr.length();

            JSONObject currentNote = null;
            int foundIndex = 0;

            String assignedId = prefs.getString(PREF_NOTE_ID_PREFIX + appWidgetId, null);
            if (assignedId != null && total > 0) {
                for (int i = 0; i < total; i++) {
                    JSONObject n = arr.getJSONObject(i);
                    if (assignedId.equals(n.optString("id"))) {
                        currentNote = n;
                        foundIndex = i;
                        break;
                    }
                }
            }

            if (currentNote == null && total > 0) {
                int storedIdx = prefs.getInt(PREF_NOTE_INDEX_PREFIX + appWidgetId, 0);
                if (storedIdx < 0 || storedIdx >= total) storedIdx = 0;
                currentNote = arr.getJSONObject(storedIdx);
                foundIndex = storedIdx;
            }

            String noteIdForIntent = "";

            if (currentNote != null) {
                noteIdForIntent = currentNote.optString("id", "");
                String title = currentNote.optString("title", "Quick Note");
                String content = currentNote.optString("content", "Tap to open and edit...");
                views.setTextViewText(R.id.widget_note_title, title);
                views.setTextViewText(R.id.widget_note_snippet, content);
                views.setTextViewText(R.id.widget_note_badge, "📝 Note " + (foundIndex + 1) + "/" + total);
            } else {
                views.setTextViewText(R.id.widget_note_title, "Rich Notes");
                views.setTextViewText(R.id.widget_note_snippet, "No notes yet. Tap + to create your first note.");
                views.setTextViewText(R.id.widget_note_badge, "📝 Notes");
            }

            // Click on widget note opens that specific note
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            String routeUri = "app://unicodeascii.converter/#notes" + (!noteIdForIntent.isEmpty() ? "?noteId=" + noteIdForIntent : "");
            openAppIntent.setData(Uri.parse(routeUri));
            openAppIntent.putExtra("route", "notes");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, 5000 + appWidgetId, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.widget_note_title, openAppPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_note_snippet, openAppPendingIntent);

            // Add Note button opens notes creation
            Intent addNoteIntent = new Intent(context, MainActivity.class);
            addNoteIntent.setAction(Intent.ACTION_VIEW);
            addNoteIntent.setData(Uri.parse("app://unicodeascii.converter/#notes?action=new"));
            addNoteIntent.putExtra("route", "notes");
            addNoteIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent addNotePI = PendingIntent.getActivity(context, 5500 + appWidgetId, addNoteIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_note_add, addNotePI);

            // Prev Note Button
            Intent prevIntent = new Intent(context, NotesWidget.class);
            prevIntent.setAction(ACTION_PREV_NOTE);
            prevIntent.setPackage(context.getPackageName());
            prevIntent.setData(Uri.parse("notes://prev/" + appWidgetId));
            prevIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            PendingIntent prevPI = PendingIntent.getBroadcast(context, 6000 + appWidgetId, prevIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_note_prev, prevPI);

            // Next Note Button
            Intent nextIntent = new Intent(context, NotesWidget.class);
            nextIntent.setAction(ACTION_NEXT_NOTE);
            nextIntent.setPackage(context.getPackageName());
            nextIntent.setData(Uri.parse("notes://next/" + appWidgetId));
            nextIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            PendingIntent nextPI = PendingIntent.getBroadcast(context, 7000 + appWidgetId, nextIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_note_next, nextPI);

            WidgetThemeHelper.applyTheme(context, views, R.id.widget_notes_root, new int[]{R.id.widget_note_title}, null);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
