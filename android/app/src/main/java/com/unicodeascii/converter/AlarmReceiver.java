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

    public static final String ACTION_DISMISS_ALARM = "com.unicodeascii.converter.ACTION_DISMISS_ALARM";
    public static final String ACTION_SNOOZE_ALARM = "com.unicodeascii.converter.ACTION_SNOOZE_ALARM";
    public static final String ALARM_CHANNEL_ID = "ntools_ringing_alarms";

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

        // Case C: Notification Action "Dismiss"
        if (ACTION_DISMISS_ALARM.equals(action)) {
            handleDismissRingingAlarm(context, alarmId);
            return;
        }

        // Case D: Notification Action "Snooze"
        if (ACTION_SNOOZE_ALARM.equals(action)) {
            handleSnoozeRingingAlarm(context, alarmId, alarmLabel, alarmTime, alarmSound);
            return;
        }

        // Case E: Actual Alarm Rings
        handleActualAlarmTrigger(context, alarmId, alarmLabel, alarmTime, alarmSound);
    }

    private void handleDismissRingingAlarm(Context context, String alarmId) {
        try {
            AlarmAlertOverlayActivity.dismissActiveOverlay();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && alarmId != null) {
                nm.cancel(alarmId.hashCode());
            }
            // Auto-reschedule recurring alarm for next cycle
            BootReceiver.rescheduleAllClockAlarms(context);
            Toast.makeText(context, "Alarm dismissed", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleSnoozeRingingAlarm(Context context, String alarmId, String alarmLabel, String alarmTime, String alarmSound) {
        try {
            AlarmAlertOverlayActivity.dismissActiveOverlay();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && alarmId != null) {
                nm.cancel(alarmId.hashCode());
            }

            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
                snoozeIntent.putExtra("alarmId", alarmId);
                snoozeIntent.putExtra("alarmLabel", alarmLabel + " (Snoozed)");
                snoozeIntent.putExtra("alarmTime", alarmTime);
                snoozeIntent.putExtra("alarmSound", alarmSound);

                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                PendingIntent pi = PendingIntent.getBroadcast(context, (alarmId + "_snooze").hashCode(), snoozeIntent, flags);

                long triggerAt = System.currentTimeMillis() + (10 * 60 * 1000); // 10 minutes
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    Intent showIntent = new Intent(context, MainActivity.class);
                    showIntent.putExtra("route", "clock");
                    PendingIntent showPI = PendingIntent.getActivity(context, (alarmId + "_snooze_show").hashCode(), showIntent, flags);
                    am.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, showPI), pi);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            }

            Toast.makeText(context, "Alarm snoozed for 10 minutes", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleUpcomingAlarmNotice(Context context, String alarmId, String alarmLabel, String alarmTime) {
        try {
            createUpcomingChannel(context);

            int notifId = (alarmId != null ? alarmId + "_upcoming" : "alarm_upcoming").hashCode();

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
            int notifId = (alarmId != null ? alarmId + "_upcoming" : "alarm_upcoming").hashCode();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(notifId);
            }

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

        // 1. Wake CPU briefly (10s PARTIAL_WAKE_LOCK to guarantee system doesn't sleep while launching overlay)
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ntools:alarm_short_wake"
                );
                wl.acquire(10000); // 10 seconds maximum
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Prepare Overlay Intent
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

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        int alarmNotifId = (alarmId != null ? alarmId : "alarm_active").hashCode();
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            alarmNotifId,
            overlayIntent,
            flags
        );

        // 3. Prepare Notification Actions for instant Dismiss and Snooze from lockscreen
        Intent dismissIntent = new Intent(context, AlarmReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS_ALARM);
        dismissIntent.putExtra("alarmId", alarmId);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            alarmNotifId + 10,
            dismissIntent,
            flags
        );

        Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
        snoozeIntent.setAction(ACTION_SNOOZE_ALARM);
        snoozeIntent.putExtra("alarmId", alarmId);
        snoozeIntent.putExtra("alarmLabel", alarmLabel);
        snoozeIntent.putExtra("alarmTime", alarmTime);
        snoozeIntent.putExtra("alarmSound", alarmSound);
        PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
            context,
            alarmNotifId + 20,
            snoozeIntent,
            flags
        );

        // 4. Create High-Priority Alarm Notification Channel & Post FullScreenIntent
        createAlarmChannel(context);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, ALARM_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("⏰ " + (alarmLabel != null && !alarmLabel.isEmpty() ? alarmLabel : "Alarm"))
            .setContentText("Alarm ringing for " + (alarmTime != null ? alarmTime : "now"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true) // Required for Android 10+ Lockscreen Wake
            .addAction(R.mipmap.ic_launcher, "Dismiss", dismissPendingIntent)
            .addAction(R.mipmap.ic_launcher, "Snooze (10m)", snoozePendingIntent);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(alarmNotifId, builder.build());
        }

        // 5. Also try direct Activity start as best-effort for unlocked screens
        try {
            context.startActivity(overlayIntent);
        } catch (Exception ignored) {}

        // 6. Schedule next occurrence for recurring alarms
        try {
            BootReceiver.rescheduleAllClockAlarms(context);
        } catch (Exception ignored) {}
    }

    private void createAlarmChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Active Ringing Alarms";
            String description = "High-priority lockscreen notifications for ringing alarms";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(ALARM_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
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
            channel.setSound(null, null);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
