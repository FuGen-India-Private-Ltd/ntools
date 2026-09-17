package com.unicodeascii.converter;

import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONArray;
import org.json.JSONObject;

public class AlarmAlertOverlayActivity extends AppCompatActivity {

    public static AlarmAlertOverlayActivity activeOverlayInstance = null;

    private String alarmId;
    private String alarmLabel;
    private String alarmTime;
    private String alarmSound;

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

            // Ensure Foreground Service is actively ringing the alarm
            if (!AlarmService.isRinging()) {
                AlarmService.startAlarm(this, alarmId, alarmLabel, alarmTime, alarmSound);
            }

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
                        float clampedX = Math.max(0, Math.min(newX, maxDrag));
                        view.setTranslationX(clampedX);

                        if (sliderHint != null && maxDrag > 0) {
                            float progress = clampedX / maxDrag;
                            sliderHint.setAlpha(Math.max(0f, 1f - (progress * 1.5f)));
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        float currentX = view.getTranslationX();
                        if (maxDrag > 0 && currentX >= maxDrag * 0.65f) {
                            isDismissed = true;
                            view.animate().translationX(maxDrag).setDuration(120).withEndAction(() -> {
                                performDismiss();
                            }).start();
                        } else {
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
        // Stop foreground service ringing & vibration
        AlarmService.stopAlarm(this);
        cancelNotification();

        // If one-time alarm, disable in preferences
        disableOneTimeAlarm(alarmId);

        try {
            android.os.Vibrator v = (android.os.Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(android.os.VibrationEffect.createOneShot(45, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(45);
                }
            }
        } catch (Exception ignored) {}

        if (sliderHint != null) {
            sliderHint.setText("✓ Alarm Turned Off");
            sliderHint.setTextColor(android.graphics.Color.parseColor("#10B981"));
            sliderHint.setAlpha(1.0f);
        }

        View card = findViewById(R.id.overlay_dialog_card);
        if (card != null) {
            card.animate()
                .alpha(0f)
                .scaleX(0.88f)
                .scaleY(0.88f)
                .setDuration(260)
                .setInterpolator(new android.view.animation.AccelerateInterpolator())
                .withEndAction(this::finish)
                .start();
        } else {
            finish();
        }
    }

    private void performSnooze(long delayMillis) {
        AlarmService.stopAlarm(this);
        cancelNotification();
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
        if (!AlarmService.isRinging()) {
            AlarmService.startAlarm(this, alarmId, alarmLabel, alarmTime, alarmSound);
        }
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

        // If this is a timer or pomodoro, hide the 10m snooze button
        if (alarmId != null && (alarmId.contains("timer") || alarmId.contains("pomo"))) {
            if (btnSnooze != null) {
                btnSnooze.setVisibility(android.view.View.GONE);
            }
        } else if (btnSnooze != null) {
            btnSnooze.setVisibility(android.view.View.VISIBLE);
        }
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
                nm.cancel(AlarmService.NOTIFICATION_ID);
                if (alarmId != null) nm.cancel(alarmId.hashCode());
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
        intent.putExtra("alarmSound", alarmSound);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent pi = PendingIntent.getBroadcast(this, (alarmId + "_snooze").hashCode(), intent, flags);
        long triggerAt = System.currentTimeMillis() + delayMillis;

        Intent showIntent = new Intent(this, MainActivity.class);
        showIntent.putExtra("route", "clock");
        PendingIntent showPI = PendingIntent.getActivity(this, (alarmId + "_snooze_show").hashCode(), showIntent, flags);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, showPI), pi);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }

        try {
            BootReceiver.rescheduleAllClockAlarms(this);
        } catch (Exception ignored) {}
    }

    private void disableOneTimeAlarm(String alarmId) {
        if (alarmId == null) return;
        try {
            SharedPreferences prefs = getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String alarmsJsonStr = prefs.getString(AppWidgetSyncPlugin.KEY_ALARMS, "[]");
            JSONArray arr = new JSONArray(alarmsJsonStr);
            boolean modified = false;

            for (int i = 0; i < arr.length(); i++) {
                JSONObject alarm = arr.getJSONObject(i);
                String id = alarm.optString("id", "");
                if (id.equals(alarmId)) {
                    JSONArray daysArr = alarm.optJSONArray("days");
                    if (daysArr == null || daysArr.length() == 0) {
                        alarm.put("isEnabled", false);
                        modified = true;
                    }
                    break;
                }
            }

            if (modified) {
                prefs.edit().putString(AppWidgetSyncPlugin.KEY_ALARMS, arr.toString()).apply();
                MainActivity.dispatchJsEvent("alarms-updated");
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onDestroy() {
        if (activeOverlayInstance == this) {
            activeOverlayInstance = null;
        }
        super.onDestroy();
    }
}
