package com.merzkava.pocket.review;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

import java.util.Random;

public final class PocketFloatingService extends Service {
    static final String ACTION_BUBBLE = "com.merzkava.pocket.BUBBLE";
    static final String ACTION_HIDE_BUBBLE = "com.merzkava.pocket.HIDE_BUBBLE";
    static final String ACTION_OPEN_WINDOW = "com.merzkava.pocket.OPEN_WINDOW";
    private static final String CHANNEL_ID = "merzkava-pocket-floating";
    private static final int NOTIFICATION_ID = 8201;
    private static final String PREFS = "merzkava-pocket-access";
    private static final String KEY_X = "pocket_bubble_x";
    private static final String KEY_Y = "pocket_bubble_y";

    private WindowManager windowManager;
    private View bubble;
    private WindowManager.LayoutParams bubbleParams;
    private View dismissZone;
    private WindowManager.LayoutParams dismissZoneParams;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private volatile boolean internetAvailable = false;
    private final Runnable noiseFrame = new Runnable() {
        @Override public void run() {
            if (!internetAvailable || bubble == null || !bubbleVisible) return;
            bubble.invalidate();
            mainHandler.postDelayed(this, 105);
        }
    };
    private static volatile boolean serviceRunning = false;
    private static volatile boolean bubbleVisible = false;

    static boolean isRunning() { return serviceRunning; }
    static boolean isBubbleVisible() { return bubbleVisible; }

    @Override public void onCreate() {
        super.onCreate();
        serviceRunning = true;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createChannel();
        startForegroundCompat();
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("floating_service_running", true).apply();
        registerNetworkListener();
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundCompat();
        String action = intent == null ? ACTION_BUBBLE : intent.getAction();
        if (ACTION_HIDE_BUBBLE.equals(action)) {
            removeBubble();
        } else if (ACTION_BUBBLE.equals(action) || action == null) {
            showBubble();
        }
        return START_STICKY;
    }

    private void registerNetworkListener() {
        connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        refreshInternetState();
        if (connectivityManager == null || Build.VERSION.SDK_INT < 24) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) {
                refreshInternetState();
            }

            @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities capabilities) {
                setInternetState(hasUsableInternet(capabilities));
            }

            @Override public void onLost(Network network) {
                refreshInternetState();
            }
        };
        try {
            connectivityManager.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception error) {
            android.util.Log.w("PocketFloating", "Could not observe network changes", error);
            networkCallback = null;
            refreshInternetState();
        }
    }

    private boolean hasUsableInternet(NetworkCapabilities capabilities) {
        return capabilities != null
            && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private void refreshInternetState() {
        boolean connected = false;
        if (connectivityManager != null && Build.VERSION.SDK_INT >= 23) {
            try {
                Network active = connectivityManager.getActiveNetwork();
                NetworkCapabilities capabilities = active == null
                    ? null : connectivityManager.getNetworkCapabilities(active);
                connected = hasUsableInternet(capabilities);
            } catch (Exception error) {
                android.util.Log.w("PocketFloating", "Could not inspect active network", error);
            }
        }
        setInternetState(connected);
    }

    private void setInternetState(boolean connected) {
        internetAvailable = connected;
        if (bubble instanceof TelevisionBubble) {
            ((TelevisionBubble) bubble).setNoiseEnabled(connected);
        }
        mainHandler.removeCallbacks(noiseFrame);
        if (connected && bubble != null && bubbleVisible) {
            mainHandler.post(noiseFrame);
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Merzkava Floating Control", NotificationManager.IMPORTANCE_LOW);
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
        builder.setSmallIcon(R.drawable.ic_notification_tv)
            .setContentTitle("Merzkava Pocket")
            .setContentText("Floating Control is active.")
            .setOngoing(true);
        if (open != null) builder.setContentIntent(open);
        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private WindowManager.LayoutParams overlayParams(int width, int height) {
        int type = Build.VERSION.SDK_INT >= 26
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            width, height, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        return params;
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class TelevisionBubble extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final float density = getResources().getDisplayMetrics().density;
        private final Random noise = new Random();
        private boolean noiseEnabled;

        TelevisionBubble(Context context) { super(context); }

        void setNoiseEnabled(boolean enabled) {
            if (noiseEnabled != enabled) {
                noiseEnabled = enabled;
                invalidate();
            }
        }

        private void fill(int color) {
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(color);
        }

        private void stroke(int color, float width) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setColor(color);
            paint.setStrokeWidth(width);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeJoin(Paint.Join.ROUND);
        }

        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            canvas.save();
            canvas.scale(density, density);

            // Match the pull-cord CRT silhouette: twin aerials, red-brown case,
            // inset curved glass, right-side dials and two short feet.
            stroke(Color.rgb(198, 164, 105), 1.25f);
            Path aerials = new Path();
            aerials.moveTo(28, 20);
            aerials.lineTo(19.5f, 2.5f);
            aerials.moveTo(28, 20);
            aerials.lineTo(37.5f, 5f);
            canvas.drawPath(aerials, paint);
            stroke(Color.rgb(224, 214, 191), .8f);
            canvas.drawLine(19.5f, 2.5f, 20.4f, 2.5f, paint);
            canvas.drawLine(37.5f, 5f, 38.4f, 5f, paint);

            fill(Color.argb(110, 0, 0, 0));
            canvas.drawRoundRect(6.5f, 20, 51, 49, 7, 7, paint);
            fill(Color.rgb(105, 48, 54));
            canvas.drawRoundRect(7, 18, 50, 48, 7, 8, paint);
            fill(Color.rgb(59, 23, 29));
            canvas.drawRoundRect(7, 39, 50, 48, 6, 6, paint);
            stroke(Color.rgb(196, 193, 181), 1.2f);
            canvas.drawRoundRect(7, 18, 50, 48, 7, 8, paint);

            // Screen well and CRT glass.
            fill(Color.rgb(5, 7, 8));
            RectF glass = new RectF(11, 22, 36, 42);
            canvas.drawRoundRect(glass, 4, 4, paint);
            fill(Color.rgb(18, 23, 24));
            canvas.drawRoundRect(12, 23, 35, 41, 3, 3, paint);
            stroke(Color.rgb(154, 130, 115), .85f);
            canvas.drawRoundRect(glass, 4, 4, paint);
            stroke(Color.argb(95, 230, 221, 198), .45f);
            canvas.drawLine(14, 24, 20, 23.5f, paint);

            if (noiseEnabled) {
                // Moving analogue snow and scan flicker are rendered only while
                // Android reports a validated internet connection.
                fill(Color.argb(36, 206, 219, 205));
                canvas.drawRoundRect(13, 24, 34, 40, 2, 2, paint);
                for (int i = 0; i < 23; i++) {
                    float x = 13.5f + noise.nextFloat() * 20f;
                    float y = 24f + noise.nextFloat() * 15f;
                    float length = .5f + noise.nextFloat() * 4.5f;
                    int alpha = 35 + noise.nextInt(105);
                    int tint = noise.nextBoolean()
                        ? Color.argb(alpha, 225, 226, 205)
                        : Color.argb(alpha, 156, 190, 165);
                    stroke(tint, noise.nextBoolean() ? .45f : .75f);
                    canvas.drawLine(x, y, Math.min(34, x + length), y, paint);
                }
                float scanY = 25f + noise.nextFloat() * 14f;
                stroke(Color.argb(150, 236, 225, 190), .65f);
                canvas.drawLine(13, scanY, 34, scanY, paint);
                if (noise.nextInt(5) == 0) {
                    fill(Color.argb(48, 238, 232, 210));
                    canvas.drawRect(13, 25 + noise.nextInt(13), 34, 26 + noise.nextInt(13), paint);
                }
            } else {
                fill(Color.argb(28, 195, 201, 184));
                canvas.drawRoundRect(13, 24, 34, 40, 2, 2, paint);
            }

            // Right-side tuning controls and the brushed-metal panel strip.
            fill(Color.rgb(133, 124, 105));
            canvas.drawRoundRect(39, 22, 47, 44, 2.5f, 2.5f, paint);
            stroke(Color.rgb(220, 201, 156), .75f);
            canvas.drawRoundRect(39, 22, 47, 44, 2.5f, 2.5f, paint);
            fill(Color.rgb(169, 140, 84));
            canvas.drawCircle(43, 29, 2.25f, paint);
            stroke(Color.rgb(241, 225, 185), .7f);
            canvas.drawCircle(43, 29, 2.25f, paint);
            fill(Color.rgb(74, 55, 43));
            canvas.drawCircle(43, 38, 1.65f, paint);
            stroke(Color.rgb(220, 201, 156), .65f);
            canvas.drawCircle(43, 38, 1.65f, paint);

            // Feet and the deliberately unplugged dangling power lead.
            stroke(Color.rgb(198, 164, 105), 1.15f);
            canvas.drawLine(14, 47, 12, 51, paint);
            canvas.drawLine(43, 47, 46, 51, paint);
            Path looseLead = new Path();
            looseLead.moveTo(29, 47);
            looseLead.cubicTo(31, 50, 25, 51, 27, 54);
            canvas.drawPath(looseLead, paint);
            fill(Color.argb(205, 198, 164, 105));
            canvas.drawRoundRect(25, 53, 29.5f, 56, 1, 1, paint);
            stroke(Color.argb(205, 226, 198, 143), .7f);
            canvas.drawLine(25.8f, 55.5f, 25.4f, 57, paint);
            canvas.drawLine(28.7f, 55.5f, 29.1f, 57, paint);

            canvas.restore();
        }
    }

    private final class BubbleDismissZone extends View {
        private final Paint zonePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final float density = getResources().getDisplayMetrics().density;
        private boolean active;

        BubbleDismissZone(Context context) {
            super(context);
            setClickable(false);
            setFocusable(false);
        }

        void setActive(boolean value) {
            if (active != value) {
                active = value;
                invalidate();
            }
        }

        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            canvas.save();
            canvas.scale(density, density);
            float width = getWidth() / density;
            float height = getHeight() / density;
            RectF panel = new RectF(10, 7, width - 10, height - 7);
            zonePaint.setStyle(Paint.Style.FILL);
            zonePaint.setColor(active ? Color.argb(232, 74, 37, 42) : Color.argb(220, 18, 22, 22));
            canvas.drawRoundRect(panel, 18, 18, zonePaint);
            zonePaint.setStyle(Paint.Style.STROKE);
            zonePaint.setStrokeWidth(1.2f);
            zonePaint.setColor(active ? Color.argb(245, 231, 126, 105) : Color.argb(180, 198, 164, 105));
            canvas.drawRoundRect(panel, 18, 18, zonePaint);

            float cx = width / 2f;
            float cy = 30f;
            zonePaint.setStyle(Paint.Style.STROKE);
            zonePaint.setStrokeWidth(1.8f);
            canvas.drawCircle(cx, cy, 13, zonePaint);
            RectF bin = new RectF(cx - 5, cy - 5, cx + 5, cy + 8);
            canvas.drawRoundRect(bin, 1.5f, 1.5f, zonePaint);
            canvas.drawLine(cx - 7, cy - 7, cx + 7, cy - 7, zonePaint);
            canvas.drawLine(cx - 2.5f, cy - 9, cx + 2.5f, cy - 9, zonePaint);

            zonePaint.setStyle(Paint.Style.FILL);
            zonePaint.setTextAlign(Paint.Align.CENTER);
            zonePaint.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
            zonePaint.setTextSize(8.5f);
            zonePaint.setColor(active ? Color.rgb(255, 218, 201) : Color.rgb(230, 218, 190));
            canvas.drawText(active ? "RELEASE TO TURN OFF" : "DROP TV HERE TO TURN OFF", cx, height - 15, zonePaint);
            canvas.restore();
        }
    }

    private boolean isOverDismissZone(float rawY) {
        int screenHeight = getResources().getDisplayMetrics().heightPixels;
        return rawY >= screenHeight - dp(104);
    }

    private void showDismissZone(boolean active) {
        if (windowManager == null) return;
        if (dismissZone == null || dismissZone.getParent() == null) {
            BubbleDismissZone zone = new BubbleDismissZone(this);
            int screenWidth = getResources().getDisplayMetrics().widthPixels;
            int screenHeight = getResources().getDisplayMetrics().heightPixels;
            WindowManager.LayoutParams zoneParams = overlayParams(screenWidth, dp(104));
            zoneParams.y = Math.max(0, screenHeight - dp(104));
            zoneParams.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            try {
                windowManager.addView(zone, zoneParams);
                dismissZone = zone;
                dismissZoneParams = zoneParams;
            } catch (Exception error) {
                android.util.Log.w("PocketFloating", "Could not show the bubble dismiss target", error);
                dismissZone = null;
                dismissZoneParams = null;
                return;
            }
        }
        ((BubbleDismissZone) dismissZone).setActive(active);
    }

    private void hideDismissZone() {
        if (dismissZone != null && windowManager != null) {
            try {
                if (dismissZone.getParent() != null) windowManager.removeView(dismissZone);
            } catch (Exception error) {
                android.util.Log.w("PocketFloating", "Dismiss target removal failed", error);
            }
        }
        dismissZone = null;
        dismissZoneParams = null;
    }

    private void showBubble() {
        if (bubble != null && bubble.getParent() != null) {
            bubbleVisible = true;
            return;
        }
        bubbleVisible = false;
        if (windowManager == null) windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        TelevisionBubble mark = new TelevisionBubble(this);
        WindowManager.LayoutParams params = overlayParams(dp(58), dp(58));
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int screenHeight = getResources().getDisplayMetrics().heightPixels;
        int maxX = Math.max(0, screenWidth - dp(58));
        int maxY = Math.max(0, screenHeight - dp(58));
        params.x = Math.max(0, Math.min(maxX, prefs.getInt(KEY_X, dp(14))));
        params.y = Math.max(0, Math.min(maxY, prefs.getInt(KEY_Y, dp(150))));
        mark.setAlpha(0.82f);
        mark.setOnTouchListener(new View.OnTouchListener() {
            float downX, downY;
            int startX, startY;
            boolean moved;

            @Override public boolean onTouch(View view, MotionEvent event) {
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        downX = event.getRawX();
                        downY = event.getRawY();
                        startX = params.x;
                        startY = params.y;
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = Math.round(event.getRawX() - downX);
                        int dy = Math.round(event.getRawY() - downY);
                        if (Math.abs(dx) + Math.abs(dy) > dp(5)) moved = true;
                        int maxX = Math.max(0, getResources().getDisplayMetrics().widthPixels - dp(58));
                        int maxY = Math.max(0, getResources().getDisplayMetrics().heightPixels - dp(58));
                        params.x = Math.max(0, Math.min(maxX, startX + dx));
                        params.y = Math.max(0, Math.min(maxY, startY + dy));
                        if (moved) {
                            view.setAlpha(0.60f);
                            showDismissZone(isOverDismissZone(event.getRawY()));
                        }
                        try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) { }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (moved) {
                            boolean dismiss = isOverDismissZone(event.getRawY());
                            hideDismissZone();
                            if (dismiss) {
                                prefs.edit().remove(KEY_X).remove(KEY_Y).apply();
                                removeBubble();
                                stopSelf();
                            } else {
                                int finalMaxX = Math.max(0, getResources().getDisplayMetrics().widthPixels - dp(58));
                                int finalMaxY = Math.max(0, getResources().getDisplayMetrics().heightPixels - dp(58));
                                params.x = Math.max(0, Math.min(finalMaxX, params.x));
                                params.y = Math.max(0, Math.min(finalMaxY, params.y));
                                prefs.edit().putInt(KEY_X, params.x).putInt(KEY_Y, params.y).apply();
                                view.setAlpha(0.82f);
                                try { windowManager.updateViewLayout(view, params); } catch (Exception ignored) { }
                            }
                        } else {
                            hideDismissZone();
                            view.setAlpha(0.82f);
                            openMiniWindow();
                        }
                        return true;
                    case MotionEvent.ACTION_CANCEL:
                        hideDismissZone();
                        view.setAlpha(0.82f);
                        prefs.edit().putInt(KEY_X, params.x).putInt(KEY_Y, params.y).apply();
                        return true;
                    default:
                        return true;
                }
            }
        });

        try {
            windowManager.addView(mark, params);
            bubble = mark;
            bubbleParams = params;
            bubbleVisible = true;
            mark.setNoiseEnabled(internetAvailable);
            if (internetAvailable) {
                mainHandler.removeCallbacks(noiseFrame);
                mainHandler.post(noiseFrame);
            }
        } catch (Exception error) {
            bubble = null;
            bubbleParams = null;
            bubbleVisible = false;
            android.util.Log.e("PocketFloating", "Could not attach the floating bubble overlay", error);
        }
    }

    private void openMiniWindow() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) return;
        launch.setAction(ACTION_OPEN_WINDOW);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            startActivity(launch);
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not open Pocket from the bubble", error);
        }
    }

    private void removeBubble() {
        mainHandler.removeCallbacks(noiseFrame);
        hideDismissZone();
        if (bubble != null && windowManager != null) {
            try {
                if (bubble.getParent() != null) windowManager.removeView(bubble);
            } catch (Exception error) {
                android.util.Log.w("PocketFloating", "Bubble removal failed", error);
            }
        }
        bubble = null;
        bubbleParams = null;
        bubbleVisible = false;
    }

    @Override public void onDestroy() {
        removeBubble();
        mainHandler.removeCallbacksAndMessages(null);
        if (connectivityManager != null && networkCallback != null && Build.VERSION.SDK_INT >= 24) {
            try { connectivityManager.unregisterNetworkCallback(networkCallback); }
            catch (Exception error) { android.util.Log.w("PocketFloating", "Network observer cleanup failed", error); }
        }
        networkCallback = null;
        connectivityManager = null;
        internetAvailable = false;
        serviceRunning = false;
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("floating_service_running", false).apply();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
