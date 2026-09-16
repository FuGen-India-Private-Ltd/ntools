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

public class CalculatorWidget extends AppWidgetProvider {

    public static final String ACTION_CALC_KEY = "com.unicodeascii.converter.ACTION_CALC_KEY";
    private static final String PREF_CALC_DISPLAY = "widget_calc_display_value";
    private static final String PREF_JUST_EVALUATED = "widget_calc_just_evaluated";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_CALC_KEY.equals(intent.getAction())) {
            String key = intent.getStringExtra("key");
            if (key == null && intent.getData() != null) {
                key = intent.getData().getQueryParameter("key");
            }
            if (key != null) {
                processKey(context, key);
            }
        }
    }

    private void processKey(Context context, String key) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String current = prefs.getString(PREF_CALC_DISPLAY, "0");
            boolean justEvaluated = prefs.getBoolean(PREF_JUST_EVALUATED, false);

            String next;
            boolean nextJustEvaluated = false;

            if ("C".equalsIgnoreCase(key)) {
                next = "0";
                nextJustEvaluated = false;
            } else if ("=".equals(key)) {
                next = evaluateExpression(current);
                nextJustEvaluated = true;
            } else if ("+".equals(key) || "−".equals(key) || "-".equals(key) || "×".equals(key) || "*".equals(key) || "÷".equals(key) || "/".equals(key)) {
                String opSymbol = "+";
                if ("−".equals(key) || "-".equals(key)) opSymbol = "−";
                else if ("×".equals(key) || "*".equals(key)) opSymbol = "×";
                else if ("÷".equals(key) || "/".equals(key)) opSymbol = "÷";

                if ("Error".equals(current)) {
                    next = "0 " + opSymbol + " ";
                } else if (current.endsWith(" + ") || current.endsWith(" − ") || current.endsWith(" × ") || current.endsWith(" ÷ ")) {
                    next = current.substring(0, current.length() - 3) + " " + opSymbol + " ";
                } else {
                    next = current + " " + opSymbol + " ";
                }
                nextJustEvaluated = false;
            } else {
                // Digits (0-9)
                if (justEvaluated || "0".equals(current) || "Error".equals(current)) {
                    next = key;
                } else {
                    if (current.length() < 20) {
                        next = current + key;
                    } else {
                        next = current;
                    }
                }
                nextJustEvaluated = false;
            }

            prefs.edit()
                .putString(PREF_CALC_DISPLAY, next)
                .putBoolean(PREF_JUST_EVALUATED, nextJustEvaluated)
                .apply();

            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName cn = new ComponentName(context, CalculatorWidget.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids != null) {
                for (int id : ids) {
                    updateAppWidget(context, manager, id);
                }
            }
        } catch (Exception ignored) {}
    }

    private String evaluateExpression(String expr) {
        try {
            String sanitized = expr.replace("−", "-").replace("×", "*").replace("÷", "/").trim();
            if (sanitized.isEmpty() || sanitized.equals("0")) return "0";

            String[] tokens = sanitized.split("\\s+");
            if (tokens.length == 0) return "0";
            if (tokens.length == 1) {
                double val = Double.parseDouble(tokens[0]);
                return formatDouble(val);
            }

            double result = Double.parseDouble(tokens[0]);
            for (int i = 1; i < tokens.length; i += 2) {
                if (i + 1 >= tokens.length) break;
                String op = tokens[i];
                double nextVal = Double.parseDouble(tokens[i + 1]);

                switch (op) {
                    case "+":
                        result += nextVal;
                        break;
                    case "-":
                        result -= nextVal;
                        break;
                    case "*":
                        result *= nextVal;
                        break;
                    case "/":
                        if (nextVal == 0) return "Error";
                        result /= nextVal;
                        break;
                }
            }

            return formatDouble(result);
        } catch (Exception e) {
            return "Error";
        }
    }

    private String formatDouble(double d) {
        if (d == (long) d) {
            return String.format(java.util.Locale.US, "%d", (long) d);
        } else {
            String str = String.format(java.util.Locale.US, "%.4f", d);
            while (str.contains(".") && (str.endsWith("0") || str.endsWith("."))) {
                str = str.substring(0, str.length() - 1);
            }
            return str;
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calculator);

            int immutableFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                immutableFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            // Enlarge Button opens Calculator in app
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.setData(Uri.parse("app://unicodeascii.converter/#calc"));
            openAppIntent.putExtra("route", "calc");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openPending = PendingIntent.getActivity(context, 701, openAppIntent, immutableFlags);
            views.setOnClickPendingIntent(R.id.btn_calc_enlarge, openPending);

            // Read display value
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String displayVal = prefs.getString(PREF_CALC_DISPLAY, "0");
            views.setTextViewText(R.id.widget_calc_display, displayVal);

            // Bind Keypad Buttons
            int[] btnIds = {
                R.id.btn_calc_0, R.id.btn_calc_1, R.id.btn_calc_2, R.id.btn_calc_3, R.id.btn_calc_4,
                R.id.btn_calc_5, R.id.btn_calc_6, R.id.btn_calc_7, R.id.btn_calc_8, R.id.btn_calc_9,
                R.id.btn_calc_add, R.id.btn_calc_sub, R.id.btn_calc_mul, R.id.btn_calc_div,
                R.id.btn_calc_eq, R.id.btn_calc_clear
            };
            String[] keys = {
                "0", "1", "2", "3", "4",
                "5", "6", "7", "8", "9",
                "+", "−", "×", "÷",
                "=", "C"
            };

            for (int i = 0; i < btnIds.length; i++) {
                Intent keyIntent = new Intent(context, CalculatorWidget.class);
                keyIntent.setAction(ACTION_CALC_KEY);
                keyIntent.setPackage(context.getPackageName());
                keyIntent.setData(Uri.parse("calc://key/" + i + "?key=" + Uri.encode(keys[i])));
                keyIntent.putExtra("key", keys[i]);
                PendingIntent pi = PendingIntent.getBroadcast(context, 1000 + i, keyIntent, immutableFlags);
                views.setOnClickPendingIntent(btnIds[i], pi);
            }

            // Apply Theme Customization
            WidgetThemeHelper.applyTheme(
                context,
                views,
                R.id.widget_calc_root,
                new int[]{R.id.btn_calc_add, R.id.btn_calc_sub, R.id.btn_calc_mul, R.id.btn_calc_div, R.id.btn_calc_enlarge},
                btnIds
            );

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }
}
