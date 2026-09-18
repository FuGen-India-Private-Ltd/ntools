package com.unicodeascii.converter;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * Robust, system-standard Foreground Service for ringing alarms.
 * Guarantees continuous audio playback, wake lock, and vibration even when the
 * screen has been turned off for hours and the device is in deep Doze mode.
 */
public class AlarmService extends Service {

    public static final String ACTION_START_ALARM = "com.unicodeascii.converter.ACTION_START_ALARM";
    public static final String ACTION_STOP_ALARM = "com.unicodeascii.converter.ACTION_STOP_ALARM";
    public static final String ALARM_CHANNEL_ID = "ntools_ringing_alarms";
    public static final int NOTIFICATION_ID = 1001;

    private static boolean isAlarmRinging = false;

    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;
    private PowerManager.WakeLock wakeLock = null;
    private Handler autoStopHandler = new Handler(Looper.getMainLooper());
    private Runnable autoStopRunnable = null;

    private String currentAlarmId = null;
    private String currentAlarmLabel = null;
    private String currentAlarmTime = null;
    private String currentAlarmSound = null;

    public static boolean isRinging() {
        return isAlarmRinging;
    }

    public static void startAlarm(Context context, String alarmId, String alarmLabel, String alarmTime, String alarmSound) {
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.setAction(ACTION_START_ALARM);
        serviceIntent.putExtra("alarmId", alarmId);
        serviceIntent.putExtra("alarmLabel", alarmLabel);
        serviceIntent.putExtra("alarmTime", alarmTime);
        serviceIntent.putExtra("alarmSound", alarmSound);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void stopAlarm(Context context) {
        try {
            Intent serviceIntent = new Intent(context, AlarmService.class);
            serviceIntent.setAction(ACTION_STOP_ALARM);
            context.startService(serviceIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopAlarmExecution();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP_ALARM.equals(action)) {
            stopAlarmExecution();
            return START_NOT_STICKY;
        }

        if (ACTION_START_ALARM.equals(action)) {
            currentAlarmId = intent.getStringExtra("alarmId");
            currentAlarmLabel = intent.getStringExtra("alarmLabel");
            currentAlarmTime = intent.getStringExtra("alarmTime");
            currentAlarmSound = intent.getStringExtra("alarmSound");
            startAlarmExecution();
            return START_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void startAlarmExecution() {
        isAlarmRinging = true;

        // 1. Acquire CPU WakeLock for up to 15 minutes while alarm is ringing
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ntools:alarm_service_ringing"
                );
                wakeLock.acquire(15 * 60 * 1000L); // 15 minutes max
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 2. Ensure Notification Channel exists with USAGE_ALARM sound attributes
        createAlarmChannel();

        // 3. Prepare Full-Screen Intent for AlarmAlertOverlayActivity
        Intent overlayIntent = new Intent(this, AlarmAlertOverlayActivity.class);
        overlayIntent.putExtra("alarmId", currentAlarmId);
        overlayIntent.putExtra("alarmLabel", currentAlarmLabel);
        overlayIntent.putExtra("alarmTime", currentAlarmTime);
        overlayIntent.putExtra("alarmSound", currentAlarmSound);
        overlayIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) piFlags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent fullScreenPI = PendingIntent.getActivity(
            this,
            NOTIFICATION_ID,
            overlayIntent,
            piFlags
        );

        // 4. Prepare Notification Action PendingIntents (Dismiss and Snooze)
        Intent dismissIntent = new Intent(this, AlarmReceiver.class);
        dismissIntent.setAction(AlarmReceiver.ACTION_DISMISS_ALARM);
        dismissIntent.putExtra("alarmId", currentAlarmId);
        PendingIntent dismissPI = PendingIntent.getBroadcast(this, NOTIFICATION_ID + 10, dismissIntent, piFlags);

        Intent snoozeIntent = new Intent(this, AlarmReceiver.class);
        snoozeIntent.setAction(AlarmReceiver.ACTION_SNOOZE_ALARM);
        snoozeIntent.putExtra("alarmId", currentAlarmId);
        snoozeIntent.putExtra("alarmLabel", currentAlarmLabel);
        snoozeIntent.putExtra("alarmTime", currentAlarmTime);
        snoozeIntent.putExtra("alarmSound", currentAlarmSound);
        PendingIntent snoozePI = PendingIntent.getBroadcast(this, NOTIFICATION_ID + 20, snoozeIntent, piFlags);

        // 5. Build Ongoing High-Priority Foreground Notification
        String title = (currentAlarmLabel != null && !currentAlarmLabel.isEmpty())
            ? "⏰ " + currentAlarmLabel
            : "⏰ Alarm Ringing";
        String subtitle = "Scheduled for " + (currentAlarmTime != null ? currentAlarmTime : "now");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_alarm)
            .setContentTitle(title)
            .setContentText(subtitle)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreenPI)
            .setFullScreenIntent(fullScreenPI, true)
            .addAction(R.drawable.ic_stat_alarm, "Turn Off", dismissPI)
            .addAction(R.drawable.ic_stat_alarm, "Snooze (10m)", snoozePI);

        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // 6. Ensure device Alarm Stream Volume is sufficiently loud
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int currentVol = am.getStreamVolume(AudioManager.STREAM_ALARM);
                int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                if (currentVol == 0 || currentVol < maxVol / 3) {
                    am.setStreamVolume(AudioManager.STREAM_ALARM, Math.max(1, (int) (maxVol * 0.75f)), 0);
                }
            }
        } catch (Exception ignored) {}

        // 7. Start Looping Audio Playback via MediaPlayer
        startAudioPlayback();

        // 8. Start Repeating Vibration
        startVibration();

        // 9. Launch Overlay Activity from Foreground Service
        try {
            startActivity(overlayIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 10. Notify Web App Bridge that alarm started
        MainActivity.dispatchJsEvent("native-alarm-started");

        // 11. Auto-snooze after 10 minutes of continuous ringing to prevent battery depletion
        if (autoStopRunnable != null) {
            autoStopHandler.removeCallbacks(autoStopRunnable);
        }
        autoStopRunnable = () -> {
            stopAlarmExecution();
        };
        autoStopHandler.postDelayed(autoStopRunnable, 10 * 60 * 1000L);
    }

    private void startAudioPlayback() {
        stopAudioPlayback();
        try {
            // First priority: bundled loud mechanical twin-bell sound
            try {
                mediaPlayer = MediaPlayer.create(this, R.raw.alarm_twin_bell);
            } catch (Exception ignored) {}

            // Fallback: System default alarm tone
            if (mediaPlayer == null) {
                Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alertUri == null) {
                    alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
                if (alertUri != null) {
                    mediaPlayer = new MediaPlayer();
                    mediaPlayer.setDataSource(this, alertUri);
                    mediaPlayer.prepare();
                }
            }

            if (mediaPlayer != null) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                mediaPlayer.setAudioAttributes(audioAttributes);
                mediaPlayer.setLooping(true);
                mediaPlayer.setVolume(1.0f, 1.0f);
                mediaPlayer.start();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopAudioPlayback() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.reset();
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {}
    }

    private void startVibration() {
        stopVibration();
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 800, 400, 800, 400, 800};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); // 0 = repeat
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}
    }

    private void stopVibration() {
        try {
            if (vibrator != null) {
                vibrator.cancel();
                vibrator = null;
            }
        } catch (Exception ignored) {}
    }

    private void stopAlarmExecution() {
        isAlarmRinging = false;

        if (autoStopRunnable != null) {
            autoStopHandler.removeCallbacks(autoStopRunnable);
            autoStopRunnable = null;
        }

        stopAudioPlayback();
        stopVibration();

        // Release wake lock
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception ignored) {}

        // Remove foreground notification
        try {
            stopForeground(true);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
        } catch (Exception ignored) {}

        MainActivity.dispatchJsEvent("native-alarm-dismissed");

        stopSelf();
    }

    private void createAlarmChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Active Ringing Alarms";
            String description = "High-priority lockscreen notifications for ringing alarms";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(ALARM_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800});
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (soundUri == null) {
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            channel.setSound(soundUri, audioAttributes);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        stopAlarmExecution();
        super.onDestroy();
    }
}
