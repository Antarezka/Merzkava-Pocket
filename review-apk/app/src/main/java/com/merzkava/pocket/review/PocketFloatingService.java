package com.merzkava.pocket.review;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class PocketFloatingService extends Service {
    static final String ACTION_BUBBLE = "com.merzkava.pocket.BUBBLE";
    static final String ACTION_MINI = "com.merzkava.pocket.MINI";
    private static final String CHANNEL_ID = "merzkava-pocket-floating";
    private static final int NOTIFICATION_ID = 8201;
    private WindowManager windowManager;
    private View bubble;
    private View miniWindow;
    private static volatile boolean serviceRunning = false;

    static boolean isRunning() { return serviceRunning; }

    @Override public void onCreate() {
        super.onCreate();
        serviceRunning = true;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createChannel();
        startForegroundCompat();
        getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE).edit().putBoolean("floating_service_running", true).apply();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundCompat();
        String action = intent == null ? ACTION_BUBBLE : intent.getAction();
        if (ACTION_MINI.equals(action)) showMiniWindow();
        else showBubble();
        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Merzkava Floating Control", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Keeps the user-requested Pocket floating shortcut available.");
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    private void startForegroundCompat() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent open = launch == null ? null : PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("Merzkava Pocket")
            .setContentText("Floating Control is active.")
            .setOngoing(true);
        if (open != null) builder.setContentIntent(open);
        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else startForeground(NOTIFICATION_ID, notification);
    }

    private WindowManager.LayoutParams overlayParams(int width, int height, int gravity) {
        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(width, height, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT);
        params.gravity = gravity;
        return params;
    }

    private GradientDrawable shape(int color, int strokeColor, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(radius);
        drawable.setStroke(2, strokeColor);
        return drawable;
    }

    private void showBubble() {
        if (bubble != null) return;
        TextView mark = new TextView(this);
        mark.setText("M");
        mark.setTextColor(Color.rgb(241, 235, 221));
        mark.setTextSize(19);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(shape(Color.rgb(112, 31, 42), Color.rgb(240, 177, 10), dp(80)));
        bubble = mark;
        WindowManager.LayoutParams params = overlayParams(dp(54), dp(54), Gravity.TOP | Gravity.END);
        params.x = dp(14);
        params.y = dp(150);
        mark.setOnTouchListener(new View.OnTouchListener() {
            float downX, downY;
            int startX, startY;
            boolean moved;
            @Override public boolean onTouch(View view, MotionEvent event) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) {
                    downX = event.getRawX(); downY = event.getRawY();
                    startX = params.x; startY = params.y; moved = false; return true;
                }
                if (event.getAction() == MotionEvent.ACTION_MOVE) {
                    int dx = (int) (event.getRawX() - downX);
                    int dy = (int) (event.getRawY() - downY);
                    if (Math.abs(dx) + Math.abs(dy) > dp(5)) moved = true;
                    params.x = Math.max(0, startX - dx);
                    params.y = Math.max(0, startY + dy);
                    try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) {}
                    return true;
                }
                if (event.getAction() == MotionEvent.ACTION_UP) {
                    if (!moved) openPocket();
                    return true;
                }
                return true;
            }
        });
        try { windowManager.addView(mark, params); } catch (Exception ignored) { bubble = null; }
    }

    private void showMiniWindow() {
        if (miniWindow != null) return;
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(13), dp(16), dp(12));
        panel.setBackground(shape(Color.rgb(23, 25, 27), Color.rgb(240, 177, 10), dp(8)));
        TextView title = new TextView(this);
        title.setText("MERZKAVA POCKET");
        title.setTextColor(Color.rgb(240, 177, 10));
        title.setTextSize(10);
        TextView subtitle = new TextView(this);
        subtitle.setText("Your floating session is ready.");
        subtitle.setTextColor(Color.rgb(241, 235, 221));
        subtitle.setTextSize(12);
        subtitle.setPadding(0, dp(8), 0, dp(12));
        Button resume = new Button(this);
        resume.setText("RESUME POCKET");
        resume.setOnClickListener(v -> openPocket());
        Button close = new Button(this);
        close.setText("CLOSE WINDOW");
        close.setOnClickListener(v -> removeMiniWindow());
        panel.addView(title);
        panel.addView(subtitle);
        panel.addView(resume, new LinearLayout.LayoutParams(-1, dp(42)));
        panel.addView(close, new LinearLayout.LayoutParams(-1, dp(38)));
        miniWindow = panel;
        WindowManager.LayoutParams params = overlayParams(dp(250), -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        params.y = dp(90);
        try { windowManager.addView(panel, params); } catch (Exception ignored) { miniWindow = null; }
    }

    private void removeMiniWindow() {
        if (miniWindow != null) {
            try { windowManager.removeView(miniWindow); } catch (Exception ignored) {}
            miniWindow = null;
        }
    }

    private void openPocket() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(launch);
        }
    }

    private int dp(float value) { return (int) (value * getResources().getDisplayMetrics().density + .5f); }

    @Override public void onDestroy() {
        serviceRunning = false;
        if (bubble != null) { try { windowManager.removeView(bubble); } catch (Exception ignored) {} bubble = null; }
        removeMiniWindow();
        getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE).edit().putBoolean("floating_service_running", false).apply();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
