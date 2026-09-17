package com.unicodeascii.converter;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static MainActivity instance = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        instance = this;
        registerPlugin(AppWidgetSyncPlugin.class);
        super.onCreate(savedInstanceState);
        requestNeededPermissions();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                android.webkit.WebView wv = getBridge().getWebView();
                android.webkit.WebSettings ws = wv.getSettings();
                ws.setDomStorageEnabled(true);
                ws.setDatabaseEnabled(true);
                ws.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
                wv.setLayerType(android.view.View.LAYER_TYPE_NONE, null);
            }
        } catch (Exception ignored) {}
        try {
            handleIntent(getIntent());
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        // Pause WebView JS timers and rendering threads when minimized to eliminate phone hanging/stutter
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().onPause();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        // Resume WebView when user returns
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().onResume();
            }
        } catch (Exception ignored) {}
    }

    private void requestNeededPermissions() {
        try {
            java.util.ArrayList<String> perms = new java.util.ArrayList<>();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.POST_NOTIFICATIONS);
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    perms.add(android.Manifest.permission.RECORD_AUDIO);
                }
            }
            if (!perms.isEmpty()) {
                requestPermissions(perms.toArray(new String[0]), 101);
            }

            // Prompt battery optimization exemption on first launch if not already exempt
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) getSystemService(android.content.Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    android.content.SharedPreferences prefs = getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, android.content.Context.MODE_PRIVATE);
                    boolean hasAskedBattery = prefs.getBoolean("has_prompted_battery_opt", false);
                    if (!hasAskedBattery) {
                        prefs.edit().putBoolean("has_prompted_battery_opt", true).apply();
                        Intent bIntent = new Intent(
                            android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                            android.net.Uri.parse("package:" + getPackageName())
                        );
                        startActivity(bIntent);
                    }
                }
            }

            // Prompt exact alarm permission on Android 12+ if not granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(android.content.Context.ALARM_SERVICE);
                if (am != null && !am.canScheduleExactAlarms()) {
                    android.content.SharedPreferences prefs = getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, android.content.Context.MODE_PRIVATE);
                    boolean hasAskedExact = prefs.getBoolean("has_prompted_exact_alarm", false);
                    if (!hasAskedExact) {
                        prefs.edit().putBoolean("has_prompted_exact_alarm", true).apply();
                        try {
                            Intent aIntent = new Intent(
                                android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                                android.net.Uri.parse("package:" + getPackageName())
                            );
                            startActivity(aIntent);
                        } catch (Exception ignored) {}
                    }
                }
            }

            // Prompt full-screen intent permission on Android 14+ if not granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                android.app.NotificationManager nm = (android.app.NotificationManager) getSystemService(android.content.Context.NOTIFICATION_SERVICE);
                if (nm != null && !nm.canUseFullScreenIntent()) {
                    android.content.SharedPreferences prefs = getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, android.content.Context.MODE_PRIVATE);
                    boolean hasAskedFsi = prefs.getBoolean("has_prompted_full_screen_intent", false);
                    if (!hasAskedFsi) {
                        prefs.edit().putBoolean("has_prompted_full_screen_intent", true).apply();
                        try {
                            Intent fsiIntent = new Intent(
                                android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                                android.net.Uri.parse("package:" + getPackageName())
                            );
                            startActivity(fsiIntent);
                        } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        dispatchJsEvent("permissions-updated");
    }

    private boolean isExitingFromBack = false;

    @Override
    public void onBackPressed() {
        if (isExitingFromBack) {
            super.onBackPressed();
            return;
        }

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function() { " +
                "  if (typeof window.handleAppBackButton === 'function') { " +
                "    return window.handleAppBackButton() ? 'true' : 'false'; " +
                "  } " +
                "  return 'false'; " +
                "})()",
                value -> {
                    if (value == null || !"\"true\"".equals(value)) {
                        runOnUiThread(() -> {
                            isExitingFromBack = true;
                            MainActivity.super.onBackPressed();
                            isExitingFromBack = false;
                        });
                    }
                }
            );
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }

    public static void dispatchJsEvent(String eventName) {
        if (instance != null && instance.getBridge() != null && instance.getBridge().getWebView() != null) {
            instance.runOnUiThread(() -> {
                try {
                    instance.getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('" + eventName + "'));", null
                    );
                } catch (Exception ignored) {}
            });
        }
    }

    public static String pendingRoute = null;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        try {
            handleIntent(intent);
        } catch (Exception ignored) {}
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        try {
            String route = null;

            // 1. Check intent URI data (e.g. app://unicodeascii.converter/#calendar or app://unicodeascii.converter/#notes?noteId=123)
            android.net.Uri data = intent.getData();
            if (data != null) {
                String fragment = data.getFragment();
                if (fragment != null && !fragment.trim().isEmpty()) {
                    route = fragment.trim();
                } else {
                    String path = data.getPath();
                    if (path != null && path.length() > 1) {
                        route = path.substring(1).trim();
                    }
                }
            }

            // 2. Fallback to extra string "route"
            if (route == null || route.isEmpty()) {
                route = intent.getStringExtra("route");
            }

            if (route != null && !route.trim().isEmpty()) {
                if (route.startsWith("#")) {
                    route = route.substring(1);
                }
                pendingRoute = route;
                final String finalRoute = route;

                // Dispatch to WebView via hash and CustomEvent
                deliverRouteToWebView(finalRoute);
            }
        } catch (Exception ignored) {}
    }

    private void deliverRouteToWebView(String route) {
        if (route == null || route.isEmpty()) return;
        final String safeRoute = route.replace("'", "\\'");

        Runnable dispatchNav = () -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { " +
                        "  try { " +
                        "    window.location.hash = '" + safeRoute + "'; " +
                        "    window.dispatchEvent(new CustomEvent('app-route-navigate', { detail: { route: '" + safeRoute + "' } })); " +
                        "  } catch(e) {} " +
                        "})()", null
                    );
                }
            } catch (Exception ignored) {}
        };

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(dispatchNav);
            // Re-dispatch after short delay to ensure React components mounted during cold boot
            getBridge().getWebView().postDelayed(dispatchNav, 350);
            getBridge().getWebView().postDelayed(dispatchNav, 900);
        }
    }
}
