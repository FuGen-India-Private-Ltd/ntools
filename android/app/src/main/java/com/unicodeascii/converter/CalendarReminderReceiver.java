package com.unicodeascii.converter;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

public class CalendarReminderReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "ntools_calendar_reminders";
    public static final String ACTION_DAILY_SCHEDULE_6AM = "com.unicodeascii.converter.ACTION_DAILY_SCHEDULE_6AM";
    public static final String ACTION_MARK_WISHED = "com.unicodeascii.converter.ACTION_MARK_WISHED";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        // 1. Morning 6:00 AM Daily Briefing
        if (ACTION_DAILY_SCHEDULE_6AM.equals(action)) {
            handleDailySchedule6AM(context);
            // Re-schedule for next morning
            BootReceiver.rescheduleAllCalendarReminders(context);
            return;
        }

        // 2. Mark Birthday as Wished
        if (ACTION_MARK_WISHED.equals(action)) {
            String eventId = intent.getStringExtra("eventId");
            handleMarkWished(context, eventId);
            return;
        }

        // 3. Regular Event / Birthday / Prior-Day Notification
        handleEventReminder(context, intent);
    }

    private void handleDailySchedule6AM(Context context) {
        try {
            createNotificationChannel(context);

            SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
            String eventsJson = prefs.getString(AppWidgetSyncPlugin.KEY_CALENDAR, "[]");
            String tasksJson = prefs.getString(AppWidgetSyncPlugin.KEY_TASKS, "[]");

            Calendar cal = Calendar.getInstance();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            SimpleDateFormat displayFormat = new SimpleDateFormat("EEEE, MMM d", Locale.getDefault());
            String todayIso = sdf.format(cal.getTime());
            String todayFormatted = displayFormat.format(cal.getTime());

            StringBuilder summary = new StringBuilder();
            int itemCount = 0;

            // Check events
            try {
                JSONArray eventsArr = new JSONArray(eventsJson);
                for (int i = 0; i < eventsArr.length(); i++) {
                    JSONObject ev = eventsArr.getJSONObject(i);
                    if (ev.optBoolean("isCompleted", false)) continue;
                    if (todayIso.equals(ev.optString("date", ""))) {
                        String title = ev.optString("title", "Event");
                        String cat = ev.optString("category", "");
                        if ("birthday".equalsIgnoreCase(cat)) {
                            summary.append("🎂 Birthday: ").append(title).append("\n");
                        } else if ("holiday".equalsIgnoreCase(cat) || title.contains("Festival")) {
                            summary.append("🌟 ").append(title).append("\n");
                        } else {
                            summary.append("📌 ").append(title).append("\n");
                        }
                        itemCount++;
                    }
                }
            } catch (Exception ignored) {}

            // Check regional festival if none found
            int m = cal.get(Calendar.MONTH) + 1;
            int day = cal.get(Calendar.DAY_OF_MONTH);
            if (itemCount == 0) {
                if (m == 9 && day == 13) {
                    summary.append("🌟 Ganesh Chaturthi Festival\n");
                    itemCount++;
                } else if (m == 11 && day == 1) {
                    summary.append("🌟 Kannada Rajyotsava (ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ)\n");
                    itemCount++;
                }
            }

            // Check tasks due today
            try {
                JSONArray tasksArr = new JSONArray(tasksJson);
                int tasksDue = 0;
                for (int i = 0; i < tasksArr.length(); i++) {
                    JSONObject t = tasksArr.getJSONObject(i);
                    if (!t.optBoolean("isCompleted", false) && todayIso.equals(t.optString("dueDate", ""))) {
                        tasksDue++;
                    }
                }
                if (tasksDue > 0) {
                    summary.append("☑ ").append(tasksDue).append(" task").append(tasksDue > 1 ? "s" : "").append(" due today\n");
                    itemCount += tasksDue;
                }
            } catch (Exception ignored) {}

            String notifText = summary.toString().trim();
            if (notifText.isEmpty()) {
                notifText = "No events or deadlines scheduled for today. Have a productive day!";
            }

            Intent appIntent = new Intent(context, MainActivity.class);
            appIntent.setAction(Intent.ACTION_VIEW);
            appIntent.setData(Uri.parse("app://unicodeascii.converter/#calendar"));
            appIntent.putExtra("route", "calendar");
            appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

            PendingIntent appPendingIntent = PendingIntent.getActivity(context, 60001, appIntent, flags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("☀️ Today's Schedule • " + todayFormatted)
                .setContentText(itemCount > 0 ? itemCount + " items today: " + notifText.replace("\n", " • ") : notifText)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(notifText))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setAutoCancel(true)
                .setContentIntent(appPendingIntent);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(60000, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleMarkWished(Context context, String eventId) {
        try {
            if (eventId != null) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(eventId.hashCode());
                }

                SharedPreferences prefs = context.getSharedPreferences(AppWidgetSyncPlugin.PREFS_NAME, Context.MODE_PRIVATE);
                String eventsJson = prefs.getString(AppWidgetSyncPlugin.KEY_CALENDAR, "[]");
                JSONArray arr = new JSONArray(eventsJson);
                JSONArray updated = new JSONArray();

                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    if (eventId.equals(obj.optString("id"))) {
                        obj.put("isWished", true);
                        obj.put("wishedDate", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new java.util.Date()));
                    }
                    updated.put(obj);
                }

                prefs.edit().putString(AppWidgetSyncPlugin.KEY_CALENDAR, updated.toString()).apply();
                MainActivity.dispatchJsEvent("birthday-wished-updated");
            }
            Toast.makeText(context, "Marked as Wished! 🎉", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleEventReminder(Context context, Intent intent) {
        String eventId = intent.getStringExtra("eventId");
        String eventTitle = intent.getStringExtra("eventTitle");
        String eventCategory = intent.getStringExtra("eventCategory");
        String eventDate = intent.getStringExtra("eventDate");
        String eventTime = intent.getStringExtra("eventTime");
        boolean isTomorrow = intent.getBooleanExtra("isTomorrow", true);
        boolean isWished = intent.getBooleanExtra("isWished", false);

        if (eventTitle == null || eventTitle.isEmpty()) {
            eventTitle = "Upcoming Calendar Event";
        }

        createNotificationChannel(context);

        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setAction(Intent.ACTION_VIEW);
        appIntent.setData(Uri.parse("app://unicodeascii.converter/#calendar"));
        appIntent.putExtra("route", "calendar");
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        PendingIntent appPendingIntent = PendingIntent.getActivity(
            context,
            (eventId != null ? eventId : "cal").hashCode(),
            appIntent,
            flags
        );

        String notifTitle;
        String notifText;

        boolean isBirthday = "birthday".equalsIgnoreCase(eventCategory);

        if (isBirthday) {
            if (isTomorrow) {
                notifTitle = "🎂 Tomorrow: " + eventTitle + "'s Birthday!";
                notifText = "Don't forget to wish them tomorrow! 🎂";
            } else {
                notifTitle = "🎂 Today: " + eventTitle + "'s Birthday!";
                notifText = isWished ? "Marked as wished 🎉" : "Birthday celebration today! Don't forget to wish them 🎂";
            }
        } else if ("anniversary".equalsIgnoreCase(eventCategory)) {
            notifTitle = (isTomorrow ? "💍 Tomorrow: " : "💍 Today: ") + eventTitle;
            notifText = isTomorrow ? "Anniversary celebration tomorrow!" : "Happy Anniversary celebration today!";
        } else if ("holiday".equalsIgnoreCase(eventCategory)) {
            notifTitle = (isTomorrow ? "🌟 Tomorrow: " : "🌟 Today: ") + eventTitle;
            notifText = "Regional Festival & Holiday Reminder";
        } else {
            notifTitle = (isTomorrow ? "📅 Tomorrow: " : "📅 Today: ") + eventTitle;
            notifText = (eventTime != null && !eventTime.isEmpty()) ? "Scheduled at " + eventTime : "Upcoming scheduled event reminder";
        }

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(notifTitle)
            .setContentText(notifText)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(notifText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 300, 200, 300})
            .setContentIntent(appPendingIntent);

        // For birthdays on the day: sticky until user confirms wished!
        if (isBirthday && !isTomorrow && !isWished) {
            builder.setOngoing(true);
            builder.setAutoCancel(false);

            // Action to Mark as Wished directly from notification
            Intent wishIntent = new Intent(context, CalendarReminderReceiver.class);
            wishIntent.setAction(ACTION_MARK_WISHED);
            wishIntent.putExtra("eventId", eventId);
            PendingIntent wishPendingIntent = PendingIntent.getBroadcast(
                context,
                (eventId != null ? eventId + "_wish" : "wish").hashCode(),
                wishIntent,
                flags
            );

            builder.addAction(R.mipmap.ic_launcher, "Mark as Wished ✓", wishPendingIntent);
        } else {
            builder.setAutoCancel(true);
        }

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(eventId != null ? eventId.hashCode() : 8881, builder.build());
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Calendar & Birthday Reminders";
            String description = "Daily 6:00 AM schedule briefings, event notices, and sticky birthday reminders";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
