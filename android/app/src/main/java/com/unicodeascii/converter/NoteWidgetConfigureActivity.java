package com.unicodeascii.converter;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;

public class NoteWidgetConfigureActivity extends Activity {

    private int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    static class NoteEntry {
        String id;
        String title;
        String preview;
        int index;

        NoteEntry(String id, String title, String preview, int index) {
            this.id = id;
            this.title = title;
            this.preview = preview;
            this.index = index;
        }

        @Override
        public String toString() {
            return title;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);

        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            );
        }

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        // Build a sleek dialog UI dynamically
        android.widget.LinearLayout root = new android.widget.LinearLayout(this);
        root.setOrientation(android.widget.LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#18181B")); // zinc-900 dark theme
        root.setPadding(48, 48, 48, 48);

        TextView header = new TextView(this);
        header.setText("📝 Select Note for Widget");
        header.setTextColor(Color.WHITE);
        header.setTextSize(18f);
        header.setTypeface(null, android.graphics.Typeface.BOLD);
        header.setPadding(0, 0, 0, 24);
        root.addView(header);

        SharedPreferences prefs = getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String notesJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_NOTES, "[]");

        final ArrayList<NoteEntry> notesList = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(notesJsonStr);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String id = obj.optString("id", "note_" + i);
                String title = obj.optString("title", "Untitled Note");
                String content = obj.optString("content", "");
                String preview = content.length() > 60 ? content.substring(0, 60) + "..." : content;
                notesList.add(new NoteEntry(id, title, preview, i));
            }
        } catch (Exception ignored) {}

        if (notesList.isEmpty()) {
            TextView emptyText = new TextView(this);
            emptyText.setText("No saved notes found. Tap Create Note in nTools first.");
            emptyText.setTextColor(Color.parseColor("#A1A1AA"));
            emptyText.setTextSize(14f);
            emptyText.setPadding(0, 16, 0, 32);
            root.addView(emptyText);
        }

        ListView listView = new ListView(this);
        listView.setDivider(new android.graphics.drawable.ColorDrawable(Color.parseColor("#27272A")));
        listView.setDividerHeight(2);

        ArrayAdapter<NoteEntry> adapter = new ArrayAdapter<NoteEntry>(this, android.R.layout.simple_list_item_2, android.R.id.text1, notesList) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                View view = super.getView(position, convertView, parent);
                TextView text1 = view.findViewById(android.R.id.text1);
                TextView text2 = view.findViewById(android.R.id.text2);

                NoteEntry entry = getItem(position);
                if (entry != null) {
                    text1.setText(entry.title);
                    text1.setTextColor(Color.WHITE);
                    text1.setTextSize(15f);
                    text1.setTypeface(null, android.graphics.Typeface.BOLD);

                    text2.setText(entry.preview);
                    text2.setTextColor(Color.parseColor("#94A3B8"));
                    text2.setTextSize(12f);
                }
                view.setPadding(24, 24, 24, 24);
                return view;
            }
        };

        listView.setAdapter(adapter);
        listView.setOnItemClickListener((parent, view, position, id) -> {
            NoteEntry selected = notesList.get(position);
            prefs.edit()
                .putString(NotesWidget.PREF_NOTE_ID_PREFIX + appWidgetId, selected.id)
                .putInt(NotesWidget.PREF_NOTE_INDEX_PREFIX + appWidgetId, selected.index)
                .apply();

            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(NoteWidgetConfigureActivity.this);
            NotesWidget.updateAppWidget(NoteWidgetConfigureActivity.this, appWidgetManager, appWidgetId);

            Intent resultValue = new Intent();
            resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            setResult(RESULT_OK, resultValue);
            finish();
        });

        root.addView(listView);
        setContentView(root);
    }
}
