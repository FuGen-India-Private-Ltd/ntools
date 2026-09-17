package com.unicodeascii.converter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class QuickLaunchWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_launch);

            // 1. Kannada Converter
            views.setOnClickPendingIntent(R.id.btn_widget_converter, getPendingIntentForRoute(context, "converter", 101));

            // 2. PDF Compressor
            views.setOnClickPendingIntent(R.id.btn_widget_pdf, getPendingIntentForRoute(context, "files?tab=pdf-compress", 102));

            // 3. Image Compressor
            views.setOnClickPendingIntent(R.id.btn_widget_image, getPendingIntentForRoute(context, "files?tab=image-compress", 103));

            // 4. Notes
            views.setOnClickPendingIntent(R.id.btn_widget_notes, getPendingIntentForRoute(context, "notes", 104));

            // 5. Calculator
            views.setOnClickPendingIntent(R.id.btn_widget_calc, getPendingIntentForRoute(context, "calc", 105));

            WidgetThemeHelper.applyTheme(context, views, R.id.widget_quick_launch_root, null, new int[]{
                R.id.btn_widget_converter, R.id.btn_widget_pdf, R.id.btn_widget_image, R.id.btn_widget_notes, R.id.btn_widget_calc
            });

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }

    private static PendingIntent getPendingIntentForRoute(Context context, String route, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("app://unicodeascii.converter/#" + route));
        intent.putExtra("route", route);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }
}
