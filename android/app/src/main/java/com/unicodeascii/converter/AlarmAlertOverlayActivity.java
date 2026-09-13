package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class AlarmAlertOverlayActivity extends AppCompatActivity {

    public static AlarmAlertOverlayActivity activeOverlayInstance = null;

    private String alarmId;
    private String alarmLabel;
    private String alarmTime;
    private String alarmSound;
    private static Ringtone ringtoneInstance = null;
    private Vibrator vibrator = null;

    private FrameLayout sliderTrack;
    private FrameLayout sliderCircle;
    private TextView sliderHint;
    private float dX = 0f;
    private boolean isDismissed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        activeOverlayInstance = this;
        super.onCreate(savedInstanceState);

        try {
            // Turn screen on and display over lock screen / any other open apps
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
                KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                if (km != null) {
                    km.requestDismissKeyguard(this, null);
                }
            } else {
                getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            }

            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );

            setContentView(R.layout.activity_alarm_alert_overlay);

            if (getWindow() != null) {
                int dialogWidth = (int) (getResources().getDisplayMetrics().widthPixels * 0.90);
                getWindow().setLayout(dialogWidth, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
                getWindow().setGravity(android.view.Gravity.CENTER);
                getWindow().setBackgroundDrawableResource(android.R.color.transparent);
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
                getWindow().setDimAmount(0.65f);
            }
            setFinishOnTouchOutside(false);

            initFromIntent(getIntent());

            startAlarmAudioAndVibration();
            notifyAppAlarmStarted();

            setupSlideToDismiss();

            Button btnSnooze = findViewById(R.id.btn_alarm_snooze);
            if (btnSnooze != null) {
                btnSnooze.setOnClickListener(v -> {
                    performSnooze(10 * 60 * 1000); // 10 minutes
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupSlideToDismiss() {
        sliderTrack = findViewById(R.id.slider_dismiss_track);
        sliderCircle = findViewById(R.id.slider_dismiss_circle);
        sliderHint = findViewById(R.id.slider_dismiss_hint);

        if (sliderCircle == null || sliderTrack == null) return;

        sliderCircle.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View view, MotionEvent event) {
                if (isDismissed) return false;

                int trackWidth = sliderTrack.getWidth();
                int circleWidth = sliderCircle.getWidth();
                float maxDrag = Math.max(0, trackWidth - circleWidth - 12);

                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        dX = view.getX() - event.getRawX();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float newX = event.getRawX() + dX;
                        // Clamp translation between 0 and maxDrag
                        float clampedX = Math.max(0, Math.min(newX, maxDrag));
                        view.setTranslationX(clampedX);

                        // Fade out hint text as user slides
                        if (sliderHint != null && maxDrag > 0) {
                            float progress = clampedX / maxDrag;
                            sliderHint.setAlpha(Math.max(0f, 1f - (progress * 1.5f)));
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        float currentX = view.getTranslationX();
                        if (maxDrag > 0 && currentX >= maxDrag * 0.65f) {
                            // Successfully slid to turn off
                            isDismissed = true;
                            // Complete slide animation to end
                            view.animate().translationX(maxDrag).setDuration(120).withEndAction(() -> {
                                performDismiss();
                            }).start();
                        } else {
                            // Snap back to starting position
                            view.animate().translationX(0f).setDuration(220).start();
                            if (sliderHint != null) {
                                sliderHint.animate().alpha(1.0f).setDuration(220).start();
                            }
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void performDismiss() {
        stopAlarmAudioAndVibration();
        cancelNotification();
        notifyAppAlarmDismissed();
        finish();
    }

    private void performSnooze(long delayMillis) {
        stopAlarmAudioAndVibration();
        cancelNotification();
        notifyAppAlarmDismissed();
        snoozeAlarm(delayMillis);
        finish();
    }

    public static void dismissActiveOverlay() {
        if (activeOverlayInstance != null) {
            activeOverlayInstance.runOnUiThread(() -> {
                activeOverlayInstance.performDismiss();
            });
        }
    }

    public static void snoozeActiveOverlay(long delayMillis) {
        if (activeOverlayInstance != null) {
            activeOverlayInstance.runOnUiThread(() -> {
                activeOverlayInstance.performSnooze(delayMillis);
            });
        }
    }

    private void notifyAppAlarmStarted() {
        MainActivity.dispatchJsEvent("native-alarm-started");
    }

    private void notifyAppAlarmDismissed() {
        MainActivity.dispatchJsEvent("native-alarm-dismissed");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        initFromIntent(intent);
        isDismissed = false;
        if (sliderCircle != null) {
            sliderCircle.setTranslationX(0f);
        }
        if (sliderHint != null) {
            sliderHint.setAlpha(1f);
        }
        startAlarmAudioAndVibration();
        notifyAppAlarmStarted();
    }

    private void initFromIntent(Intent intent) {
        if (intent == null) return;
        alarmId = intent.getStringExtra("alarmId");
        alarmLabel = intent.getStringExtra("alarmLabel");
        alarmTime = intent.getStringExtra("alarmTime");
        alarmSound = intent.getStringExtra("alarmSound");

        if (alarmLabel == null || alarmLabel.isEmpty()) {
            alarmLabel = "Alarm Wakeup";
        }
        if (alarmTime == null || alarmTime.isEmpty()) {
            alarmTime = "07:00";
        }

        TextView tvTime = findViewById(R.id.overlay_alarm_time);
        TextView tvLabel = findViewById(R.id.overlay_alarm_label);
        TextView tvSound = findViewById(R.id.overlay_alarm_sound_name);
        Button btnSnooze = findViewById(R.id.btn_alarm_snooze);

        if (tvTime != null) tvTime.setText(alarmTime);
        if (tvLabel != null) tvLabel.setText(alarmLabel);
        if (tvSound != null && alarmSound != null && !alarmSound.isEmpty()) {
            tvSound.setText("🔔 " + alarmSound);
        }

        // If this is a timer or pomodoro, hide the 10m alarm snooze button
        if (alarmId != null && (alarmId.contains("timer") || alarmId.contains("pomo"))) {
            if (btnSnooze != null) {
                btnSnooze.setVisibility(android.view.View.GONE);
            }
        } else if (btnSnooze != null) {
            btnSnooze.setVisibility(android.view.View.VISIBLE);
        }
    }

    private void startAlarmAudioAndVibration() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 600, 300, 600, 300, 600};
                vibrator.vibrate(pattern, 0); // repeat
            }

            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }

            if (alarmUri != null) {
                if (ringtoneInstance != null && ringtoneInstance.isPlaying()) {
                    ringtoneInstance.stop();
                }
                ringtoneInstance = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
                if (ringtoneInstance != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AudioAttributes attributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build();
                        ringtoneInstance.setAudioAttributes(attributes);
                    }
                    ringtoneInstance.play();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void stopAlarmAudioAndVibration() {
        try {
            if (ringtoneInstance != null && ringtoneInstance.isPlaying()) {
                ringtoneInstance.stop();
                ringtoneInstance = null;
            }
            if (vibrator != null) {
                vibrator.cancel();
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
    }

    private void cancelNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                if (alarmId != null) nm.cancel(alarmId.hashCode());
                nm.cancel(888);
            }
        } catch (Exception ignored) {}
    }

    private void snoozeAlarm(long delayMillis) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(this, AlarmReceiver.class);
        intent.putExtra("alarmId", alarmId);
        intent.putExtra("alarmLabel", alarmLabel + " (Snoozed)");
        intent.putExtra("alarmTime", alarmTime);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pi = PendingIntent.getBroadcast(this, (alarmId + "_snooze").hashCode(), intent, flags);
        long triggerAt = System.currentTimeMillis() + delayMillis;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
    }

    @Override
    protected void onDestroy() {
        if (activeOverlayInstance == this) {
            activeOverlayInstance = null;
        }
        stopAlarmAudioAndVibration();
        super.onDestroy();
    }
}
