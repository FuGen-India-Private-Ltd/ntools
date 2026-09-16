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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

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
                } else if (current.endsWith(" 0")) {
                    // Replace trailing leading zero on second operand: e.g. "5 + 0" -> "5 + 7"
                    if (!"0".equals(key)) {
                        next = current.substring(0, current.length() - 1) + key;
                    } else {
                        next = current;
                    }
                } else {
                    if (current.length() < 24) {
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

    public static String evaluateExpression(String expr) {
        if (expr == null) return "0";
        try {
            // Replace unicode operators with standard symbols
            String sanitized = expr.replace("−", "-").replace("×", "*").replace("÷", "/").trim();
            if (sanitized.isEmpty() || "0".equals(sanitized) || "Error".equalsIgnoreCase(sanitized)) {
                return "0";
            }

            // Split into tokens by whitespace
            String[] tokens = sanitized.split("\\s+");
            if (tokens.length == 0) return "0";

            // Strip trailing operators from token list (e.g. "10 + " -> "10")
            int validTokenCount = tokens.length;
            while (validTokenCount > 0 && isOperator(tokens[validTokenCount - 1])) {
                validTokenCount--;
            }
            if (validTokenCount == 0) return "0";

            List<BigDecimal> numbers = new ArrayList<>();
            List<String> operators = new ArrayList<>();

            int index = 0;
            // Handle optional leading sign: e.g. ["-", "5", "+", "3"]
            boolean negateFirst = false;
            if ("-".equals(tokens[0])) {
                negateFirst = true;
                index = 1;
            } else if ("+".equals(tokens[0])) {
                index = 1;
            }

            if (index >= validTokenCount) return "0";

            BigDecimal firstNum = new BigDecimal(tokens[index]);
            if (negateFirst) {
                firstNum = firstNum.negate();
            }
            numbers.add(firstNum);
            index++;

            while (index < validTokenCount) {
                String op = tokens[index++];
                if (!isOperator(op)) {
                    return "Error";
                }
                if (index >= validTokenCount) {
                    break;
                }
                String numToken = tokens[index++];
                BigDecimal num = new BigDecimal(numToken);
                operators.add(op);
                numbers.add(num);
            }

            if (numbers.isEmpty()) return "0";
            if (operators.isEmpty()) {
                return formatBigDecimal(numbers.get(0));
            }

            // PASS 1: Multiplication and Division (high precedence, left-to-right)
            int i = 0;
            while (i < operators.size()) {
                String op = operators.get(i);
                if ("*".equals(op) || "/".equals(op)) {
                    BigDecimal a = numbers.get(i);
                    BigDecimal b = numbers.get(i + 1);
                    BigDecimal res;
                    if ("*".equals(op)) {
                        res = a.multiply(b);
                    } else {
                        if (b.compareTo(BigDecimal.ZERO) == 0) {
                            return "Error";
                        }
                        res = a.divide(b, 10, RoundingMode.HALF_UP);
                    }
                    numbers.set(i, res);
                    numbers.remove(i + 1);
                    operators.remove(i);
                } else {
                    i++;
                }
            }

            // PASS 2: Addition and Subtraction (low precedence, left-to-right)
            while (!operators.isEmpty()) {
                String op = operators.remove(0);
                BigDecimal a = numbers.remove(0);
                BigDecimal b = numbers.get(0);
                BigDecimal res;
                if ("+".equals(op)) {
                    res = a.add(b);
                } else if ("-".equals(op)) {
                    res = a.subtract(b);
                } else {
                    return "Error";
                }
                numbers.set(0, res);
            }

            return formatBigDecimal(numbers.get(0));
        } catch (Exception e) {
            return "Error";
        }
    }

    private static boolean isOperator(String s) {
        return "+".equals(s) || "-".equals(s) || "*".equals(s) || "/".equals(s);
    }

    private static String formatBigDecimal(BigDecimal bd) {
        if (bd == null) return "0";
        if (bd.compareTo(BigDecimal.ZERO) == 0) {
            return "0";
        }

        BigDecimal abs = bd.abs();
        if (abs.compareTo(new BigDecimal("1000000000000")) >= 0) {
            java.text.DecimalFormat df = new java.text.DecimalFormat("0.######E0");
            return df.format(bd.doubleValue());
        }

        if (bd.scale() > 8) {
            bd = bd.setScale(8, RoundingMode.HALF_UP);
        }

        BigDecimal stripped = bd.stripTrailingZeros();
        if (stripped.compareTo(BigDecimal.ZERO) == 0) {
            return "0";
        }
        return stripped.toPlainString();
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
