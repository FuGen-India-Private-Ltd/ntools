package com.unicodeascii.converter;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class WidgetThemeHelper {

    public static class WidgetTheme {
        public String bgStyle = "glass";
        public int opacity = 85;
        public String accentColor = "indigo";
        public String customColorHex = "";
        public String typographyScale = "standard";
        public String borderRadius = "lg";
        public boolean showBorders = true;
        public boolean showGlassGlow = true;

        public int getAccentColorInt() {
            if (customColorHex != null && customColorHex.startsWith("#") && customColorHex.length() >= 7) {
                try {
                    return Color.parseColor(customColorHex);
                } catch (Exception ignored) {}
            }
            switch (accentColor.toLowerCase()) {
                case "emerald":
                    return Color.parseColor("#10B981");
                case "amber":
                    return Color.parseColor("#F59E0B");
                case "rose":
                    return Color.parseColor("#F43F5E");
                case "cyan":
                    return Color.parseColor("#06B6D4");
                case "monochrome":
                    return Color.parseColor("#FFFFFF");
                case "titanium":
                    return Color.parseColor("#71717A");
                case "silver":
                    return Color.parseColor("#E4E4E7");
                case "graphite":
                    return Color.parseColor("#38BDF8");
                case "frost":
                    return Color.parseColor("#F4F4F5");
                case "obsidian":
                    return Color.parseColor("#38BDF8");
                case "indigo":
                default:
                    return Color.parseColor("#6366F1");
            }
        }

        public int getBackgroundColorInt(boolean forceTransparent) {
            if (forceTransparent || opacity <= 0) {
                return Color.TRANSPARENT;
            }
            int alpha = (int) Math.min(255, Math.max(0, (opacity * 255.0f) / 100.0f));
            if ("solid".equalsIgnoreCase(bgStyle)) {
                return Color.argb(255, 0, 0, 0); // Pure pitch black OLED
            } else if ("gradient".equalsIgnoreCase(bgStyle) || "mesh".equalsIgnoreCase(bgStyle)) {
                return Color.argb(alpha, 12, 12, 12);
            } else {
                // Liquid Glass: translucent deep navy-black with high optical clarity
                return Color.argb((int)(alpha * 0.75f), 12, 16, 26);
            }
        }

        public int getButtonBackgroundColorInt() {
            int alpha = (int) Math.min(255, Math.max(40, (opacity * 255.0f) / 100.0f));
            return Color.argb(alpha, 30, 36, 52); // translucent glass tile
        }
    }

    public static WidgetTheme getTheme(Context context) {
        WidgetTheme theme = new WidgetTheme();
        theme.bgStyle = "liquid-glass";
        theme.opacity = 85;
        try {
            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String jsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_WIDGET_CONFIG, "{}");
            JSONObject obj = new JSONObject(jsonStr);
            theme.bgStyle = obj.optString("bgStyle", "liquid-glass");
            theme.opacity = obj.optInt("opacity", 85);
            theme.accentColor = obj.optString("accentColor", "indigo");
            theme.customColorHex = obj.optString("customColorHex", "");
            theme.typographyScale = obj.optString("typographyScale", "standard");
            theme.borderRadius = obj.optString("borderRadius", "lg");
            theme.showBorders = obj.optBoolean("showBorders", true);
            theme.showGlassGlow = obj.optBoolean("showGlassGlow", true);
        } catch (Exception ignored) {}
        return theme;
    }

    public static void applyTheme(Context context, RemoteViews views, int rootId, int[] accentViewIds, int[] btnViewIds) {
        try {
            WidgetTheme theme = getTheme(context);
            if (rootId != 0) {
                if (theme.opacity <= 0) {
                    views.setInt(rootId, "setBackgroundColor", Color.TRANSPARENT);
                } else if ("solid".equalsIgnoreCase(theme.bgStyle)) {
                    views.setInt(rootId, "setBackgroundColor", Color.BLACK);
                } else {
                    // Liquid Glass: preserve rounded corners and specular border drawable
                    views.setInt(rootId, "setBackgroundResource", R.drawable.widget_bg);
                }
            }
            int accentColor = theme.getAccentColorInt();
            if (accentViewIds != null) {
                for (int id : accentViewIds) {
                    views.setTextColor(id, accentColor);
                }
            }
            if (btnViewIds != null) {
                for (int id : btnViewIds) {
                    if ("solid".equalsIgnoreCase(theme.bgStyle)) {
                        views.setInt(id, "setBackgroundColor", Color.parseColor("#18181B"));
                    } else {
                        views.setInt(id, "setBackgroundResource", R.drawable.widget_btn_bg);
                    }
                }
            }
        } catch (Exception ignored) {}
    }
}
