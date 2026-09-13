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
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
                }
            }
        } catch (Exception ignored) {}
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
            String route = intent.getStringExtra("route");
            if (route != null && !route.isEmpty()) {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() -> {
                        try {
                            getBridge().getWebView().evaluateJavascript("window.location.hash = '" + route + "';", null);
                        } catch (Exception ignored) {}
                    });
                }
            }
        } catch (Exception ignored) {}
    }
}
