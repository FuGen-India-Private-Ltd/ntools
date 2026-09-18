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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    ws.setOffscreenPreRaster(true);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ws.setSafeBrowsingEnabled(false);
                }
                wv.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);

                wv.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(final android.webkit.PermissionRequest request) {
                        MainActivity.this.runOnUiThread(() -> {
                            boolean hasAudio = false;
                            for (String res : request.getResources()) {
                                if (android.webkit.PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                                    hasAudio = true;
                                    break;
                                }
                            }
                            if (hasAudio) {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                        request.grant(request.getResources());
                                    } else {
                                        pendingPermissionRequest = request;
                                        requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO}, 101);
                                    }
                                } else {
                                    request.grant(request.getResources());
                                }
                            } else {
                                request.grant(request.getResources());
                            }
                        });
                    }
                });
            }
        } catch (Exception ignored) {}
        try {
            handleIntent(getIntent());
        } catch (Exception ignored) {}
    }

    public static android.webkit.PermissionRequest pendingPermissionRequest = null;

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

        // Ensure alarms and upcoming status bar notifications are synchronized when app resumes
        try {
            BootReceiver.rescheduleAllClockAlarms(this);
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(ALARM_SERVICE);
                if (am != null && !am.canScheduleExactAlarms()) {
                    dispatchJsEvent("exact-alarm-permission-needed");
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (pendingPermissionRequest != null) {
            boolean audioGranted = false;
            if (permissions != null && grantResults != null) {
                for (int i = 0; i < permissions.length; i++) {
                    if (android.Manifest.permission.RECORD_AUDIO.equals(permissions[i]) && grantResults.length > i && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                        audioGranted = true;
                    }
                }
            }
            try {
                if (audioGranted) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                } else {
                    pendingPermissionRequest.deny();
                }
            } catch (Exception ignored) {}
            pendingPermissionRequest = null;
        }
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
