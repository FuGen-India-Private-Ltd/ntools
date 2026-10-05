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
import android.media.Ringtone;
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

    public static AlarmService instance = null;
    private static boolean isAlarmRinging = false;

    private MediaPlayer mediaPlayer = null;
    private Ringtone fallbackRingtone = null;
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

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
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
            if (instance != null) {
                instance.stopAlarmExecution();
            }
        } catch (Exception ignored) {}
        try {
            if (context != null) {
                Intent serviceIntent = new Intent(context, AlarmService.class);
                context.stopService(serviceIntent);
            }
        } catch (Exception ignored) {}
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

        // Release bridge WakeLock from AlarmReceiver now that AlarmService has started
        AlarmReceiver.releaseWakeLock();

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
        createAlarmChannel(this);

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
        int dismissReqCode = Math.abs(("ring_dismiss_" + currentAlarmId).hashCode());
        int snoozeReqCode = Math.abs(("ring_snooze_" + currentAlarmId).hashCode());

        Intent dismissIntent = new Intent(this, AlarmReceiver.class);
        dismissIntent.setAction(AlarmReceiver.ACTION_DISMISS_ALARM);
        dismissIntent.setData(Uri.parse("ntools://alarm/dismiss/" + currentAlarmId));
        dismissIntent.setPackage(getPackageName());
        dismissIntent.putExtra("alarmId", currentAlarmId);
        PendingIntent dismissPI = PendingIntent.getBroadcast(this, dismissReqCode, dismissIntent, piFlags);

        Intent snoozeIntent = new Intent(this, AlarmReceiver.class);
        snoozeIntent.setAction(AlarmReceiver.ACTION_SNOOZE_ALARM);
        snoozeIntent.setData(Uri.parse("ntools://alarm/snooze/" + currentAlarmId));
        snoozeIntent.setPackage(getPackageName());
        snoozeIntent.putExtra("alarmId", currentAlarmId);
        snoozeIntent.putExtra("alarmLabel", currentAlarmLabel);
        snoozeIntent.putExtra("alarmTime", currentAlarmTime);
        snoozeIntent.putExtra("alarmSound", currentAlarmSound);
        PendingIntent snoozePI = PendingIntent.getBroadcast(this, snoozeReqCode, snoozeIntent, piFlags);

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
            mediaPlayer = new MediaPlayer();
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);

            boolean prepared = false;
            try {
                android.content.res.AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.alarm_twin_bell);
                if (afd != null) {
                    mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                    afd.close();
                    mediaPlayer.prepare();
                    prepared = true;
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }

            if (!prepared) {
                try {
                    Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    if (alertUri == null) {
                        alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                    }
                    if (alertUri != null) {
                        mediaPlayer.reset();
                        mediaPlayer.setAudioAttributes(audioAttributes);
                        mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                        mediaPlayer.setDataSource(this, alertUri);
                        mediaPlayer.prepare();
                        prepared = true;
                    }
                } catch (Exception ex2) {
                    ex2.printStackTrace();
                }
            }

            if (prepared) {
                mediaPlayer.setLooping(true);
                mediaPlayer.setVolume(1.0f, 1.0f);
                mediaPlayer.start();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Secondary fallback: RingtoneManager if MediaPlayer fails or cannot play
        try {
            if (mediaPlayer == null || !mediaPlayer.isPlaying()) {
                Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alertUri == null) {
                    alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
                if (alertUri != null) {
                    fallbackRingtone = RingtoneManager.getRingtone(this, alertUri);
                    if (fallbackRingtone != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            fallbackRingtone.setAudioAttributes(new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build());
                        } else {
                            fallbackRingtone.setStreamType(AudioManager.STREAM_ALARM);
                        }
                        fallbackRingtone.play();
                    }
                }
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
        try {
            if (fallbackRingtone != null) {
                fallbackRingtone.stop();
                fallbackRingtone = null;
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

    public static void createAlarmChannel(Context context) {
        if (context == null) return;
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

            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        stopAlarmExecution();
        instance = null;
        super.onDestroy();
    }
}
