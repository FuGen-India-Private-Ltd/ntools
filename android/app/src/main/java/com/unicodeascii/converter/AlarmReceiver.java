package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class AlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_UPCOMING_ALARM_NOTICE = "com.unicodeascii.converter.ACTION_UPCOMING_ALARM_NOTICE";
    public static final String ACTION_DISMISS_UPCOMING_ALARM = "com.unicodeascii.converter.ACTION_DISMISS_UPCOMING_ALARM";
    public static final String UPCOMING_CHANNEL_ID = "ntools_upcoming_alarms";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String alarmId = intent.getStringExtra("alarmId");
        String alarmLabel = intent.getStringExtra("alarmLabel");
        String alarmTime = intent.getStringExtra("alarmTime");
        String alarmSound = intent.getStringExtra("alarmSound");

        if (alarmLabel == null || alarmLabel.isEmpty()) {
            alarmLabel = "Alarm";
        }

        // Case A: 15-Minute Prior Upcoming Alarm Notification
        if (ACTION_UPCOMING_ALARM_NOTICE.equals(action)) {
            handleUpcomingAlarmNotice(context, alarmId, alarmLabel, alarmTime);
            return;
        }

        // Case B: User Tapped "Turn Off / Dismiss Now" on the 15-min Prior Notice
        if (ACTION_DISMISS_UPCOMING_ALARM.equals(action)) {
            handleDismissUpcomingAlarm(context, alarmId);
            return;
        }

        // Case C: Actual Alarm Rings
        handleActualAlarmTrigger(context, alarmId, alarmLabel, alarmTime, alarmSound);
    }

    private void handleUpcomingAlarmNotice(Context context, String alarmId, String alarmLabel, String alarmTime) {
        try {
            createUpcomingChannel(context);

            int notifId = (alarmId != null ? alarmId + "_upcoming" : "alarm_upcoming").hashCode();

            // Intent to dismiss/turn off this upcoming alarm
            Intent dismissIntent = new Intent(context, AlarmReceiver.class);
            dismissIntent.setAction(ACTION_DISMISS_UPCOMING_ALARM);
            dismissIntent.putExtra("alarmId", alarmId);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

            PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                context,
                notifId,
                dismissIntent,
                flags
            );

            // Intent to open app clock tab
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setAction(Intent.ACTION_VIEW);
            openAppIntent.putExtra("route", "clock");
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, notifId + 1, openAppIntent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, UPCOMING_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("⏰ Upcoming Alarm: " + (alarmTime != null ? alarmTime : "Soon"))
                .setContentText(alarmLabel + " • Rings in 15 minutes")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(openAppPendingIntent)
                .addAction(R.mipmap.ic_launcher, "Turn Off / Dismiss", dismissPendingIntent);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(notifId, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleDismissUpcomingAlarm(Context context, String alarmId) {
        try {
            // Cancel upcoming notification
            int notifId = (alarmId != null ? alarmId + "_upcoming" : "alarm_upcoming").hashCode();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(notifId);
            }

            // Cancel the scheduled AlarmManager alarm for today
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null && alarmId != null) {
                Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(context, alarmId.hashCode(), alarmIntent, flags);
                am.cancel(pi);
            }

            Toast.makeText(context, "Alarm turned off for today", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleActualAlarmTrigger(Context context, String alarmId, String alarmLabel, String alarmTime, String alarmSound) {
        // Clear any upcoming notice for this alarm
        try {
            int upcomingNotifId = (alarmId != null ? alarmId + "_upcoming" : "alarm_upcoming").hashCode();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(upcomingNotifId);
            }
        } catch (Exception ignored) {}

        // 1. Wake CPU briefly (5s PARTIAL_WAKE_LOCK to prevent system freezing/battery drain)
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ntools:alarm_short_wake"
                );
                wl.acquire(5000); // 5 seconds maximum
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Launch Full-Screen Overlay Activity directly (NO duplicate noisy notification!)
        Intent overlayIntent = new Intent(context, AlarmAlertOverlayActivity.class);
        overlayIntent.putExtra("alarmId", alarmId);
        overlayIntent.putExtra("alarmLabel", alarmLabel);
        overlayIntent.putExtra("alarmTime", alarmTime);
        overlayIntent.putExtra("alarmSound", alarmSound);
        overlayIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        try {
            context.startActivity(overlayIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createUpcomingChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Upcoming Alarm Notifications";
            String description = "Notice 15 minutes before an alarm with quick option to turn off";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(UPCOMING_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(false);
            channel.setSound(null, null); // Silent heads-up notice

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
