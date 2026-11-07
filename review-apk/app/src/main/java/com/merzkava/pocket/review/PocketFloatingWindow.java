package com.merzkava.pocket.review;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.provider.Settings;
import android.net.Uri;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

final class PocketFloatingWindow {
    private final MainActivity activity;
    private final WebView webView;
    private final WindowManager windowManager;
    private LinearLayout root;
    private FrameLayout contentFrame;
    private WindowManager.LayoutParams params;
    private int windowWidth;
    private int windowHeight;

    PocketFloatingWindow(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.windowManager = (WindowManager) activity.getApplicationContext().getSystemService(Context.WINDOW_SERVICE);
    }

    private int dp(float value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }

    private GradientDrawable surface(int fill, int stroke, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private TextView control(String text, int widthDp) {
        TextView view = new TextView(activity);
        view.setText(text);
        view.setTextColor(Color.rgb(239, 228, 202));
        view.setTextSize(17);
        view.setGravity(Gravity.CENTER);
        view.setBackgroundColor(Color.TRANSPARENT);
        view.setClickable(true);
        view.setFocusable(true);
        view.setLayoutParams(new LinearLayout.LayoutParams(dp(widthDp), ViewGroup.LayoutParams.MATCH_PARENT));
        return view;
    }

    boolean isShowing() {
        return root != null && root.getParent() != null;
    }

    void show() {
        if (isShowing()) return;
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(activity)) {
            throw new IllegalStateException("Allow Display over other apps before opening the mini window.");
        }
        if (windowManager == null) throw new IllegalStateException("Android overlay service is unavailable.");

        Intent hideBubble = new Intent(activity, PocketFloatingService.class);
        hideBubble.setAction(PocketFloatingService.ACTION_HIDE_BUBBLE);
        if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(hideBubble);
        else activity.startService(hideBubble);

        buildWindow();
        detachWebView();
        contentFrame.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        int type = Build.VERSION.SDK_INT >= 26
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        params = new WindowManager.LayoutParams(
            windowWidth, windowHeight, type,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        params.x = activity.getPreferences(Context.MODE_PRIVATE).getInt("floating_x", dp(8));
        params.y = activity.getPreferences(Context.MODE_PRIVATE).getInt("floating_y", dp(90));
        clampPosition();
        try {
            windowManager.addView(root, params);
            webView.evaluateJavascript("document.body.classList.add('native-floating-mode')", null);
            activity.getPreferences(Context.MODE_PRIVATE).edit().putInt("floating_width", windowWidth)
                .putInt("floating_height", windowHeight).apply();
        } catch (Exception error) {
            detachWebView();
            activity.setContentView(webView);
            root = null;
            throw error;
        }
    }

    private void buildWindow() {
        float density = activity.getResources().getDisplayMetrics().density;
        int screenWidthDp = Math.round(activity.getResources().getDisplayMetrics().widthPixels / density);
        int screenHeightDp = Math.round(activity.getResources().getDisplayMetrics().heightPixels / density);
        int defaultWidth = Math.min(dp(440), Math.max(dp(280), Math.round(screenWidthDp * density) - dp(18)));
        int defaultHeight = Math.min(dp(720), Math.max(dp(360), Math.round(screenHeightDp * density * .70f)));
        windowWidth = activity.getPreferences(Context.MODE_PRIVATE).getInt("floating_width", defaultWidth);
        windowHeight = activity.getPreferences(Context.MODE_PRIVATE).getInt("floating_height", defaultHeight);
        windowWidth = Math.max(dp(260), Math.min(dp(520), windowWidth));
        windowHeight = Math.max(dp(320), Math.min(dp(760), windowHeight));

        root = new LinearLayout(activity);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(surface(Color.rgb(18, 24, 21), Color.rgb(169, 140, 84), 12));
        root.setClipToOutline(true);
        root.setElevation(dp(12));

        LinearLayout header = new LinearLayout(activity);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setPadding(dp(10), 0, dp(4), 0);
        header.setBackgroundColor(Color.rgb(30, 43, 36));
        root.addView(header, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(42)));

        TextView title = new TextView(activity);
        title.setText("MERZKAVA  ·  POCKET WINDOW");
        title.setTextColor(Color.rgb(223, 202, 159));
        title.setTextSize(9);
        title.setLetterSpacing(.09f);
        title.setGravity(Gravity.CENTER_VERTICAL);
        header.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
        title.setOnTouchListener((view, event) -> dragWindow(event));

        TextView toBubble = control("⌄", 40);
        TextView fullscreen = control("□", 36);
        header.addView(toBubble);
        header.addView(fullscreen);
        toBubble.setOnClickListener(view -> minimizeToBubble());
        fullscreen.setOnClickListener(view -> restoreToActivity());

        contentFrame = new FrameLayout(activity);
        contentFrame.setBackgroundColor(Color.rgb(18, 23, 20));
        root.addView(contentFrame, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        TextView resize = new TextView(activity);
        resize.setText("◢");
        resize.setTextColor(Color.rgb(202, 180, 130));
        resize.setTextSize(18);
        resize.setGravity(Gravity.CENTER);
        resize.setBackgroundColor(Color.rgb(33, 44, 36));
        FrameLayout.LayoutParams resizeParams = new FrameLayout.LayoutParams(
            dp(34), dp(34), Gravity.END | Gravity.BOTTOM);
        contentFrame.addView(resize, resizeParams);
        resize.setOnTouchListener((view, event) -> resizeWindow(event));
    }

    private void detachWebView() {
        if (webView.getParent() instanceof ViewGroup) {
            ((ViewGroup) webView.getParent()).removeView(webView);
        }
    }

    private void clampPosition() {
        int screenWidth = activity.getResources().getDisplayMetrics().widthPixels;
        int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
        params.x = Math.max(0, Math.min(screenWidth - windowWidth, params.x));
        params.y = Math.max(0, Math.min(screenHeight - windowHeight, params.y));
    }

    private boolean dragWindow(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                dragStartX = event.getRawX();
                dragStartY = event.getRawY();
                startWindowX = params.x;
                startWindowY = params.y;
                return true;
            case MotionEvent.ACTION_MOVE:
                params.x = startWindowX + Math.round(event.getRawX() - dragStartX);
                params.y = startWindowY + Math.round(event.getRawY() - dragStartY);
                clampPosition();
                try { windowManager.updateViewLayout(root, params); } catch (Exception ignored) { }
                return true;
            case MotionEvent.ACTION_UP:
                activity.getPreferences(Context.MODE_PRIVATE).edit()
                    .putInt("floating_x", params.x).putInt("floating_y", params.y).apply();
                return true;
            default:
                return true;
        }
    }

    private float dragStartX, dragStartY;
    private int startWindowX, startWindowY;
    private int startWidth, startHeight;

    private boolean resizeWindow(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                dragStartX = event.getRawX();
                dragStartY = event.getRawY();
                startWidth = windowWidth;
                startHeight = windowHeight;
                return true;
            case MotionEvent.ACTION_MOVE:
                float dx = event.getRawX() - dragStartX;
                float dy = event.getRawY() - dragStartY;
                int screenWidth = activity.getResources().getDisplayMetrics().widthPixels;
                int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
                windowWidth = Math.max(dp(260), Math.min(Math.min(dp(520), screenWidth - params.x), startWidth + Math.round(dx)));
                windowHeight = Math.max(dp(320), Math.min(Math.min(dp(760), screenHeight - params.y), startHeight + Math.round(dy)));
                params.width = windowWidth;
                params.height = windowHeight;
                try { windowManager.updateViewLayout(root, params); } catch (Exception ignored) { }
                return true;
            case MotionEvent.ACTION_UP:
                activity.getPreferences(Context.MODE_PRIVATE).edit()
                    .putInt("floating_width", windowWidth).putInt("floating_height", windowHeight).apply();
                return true;
            default:
                return true;
        }
    }

    void minimizeToBubble() {
        removeOverlay();
        activity.setContentView(webView);
        Intent showBubble = new Intent(activity, PocketFloatingService.class);
        showBubble.setAction(PocketFloatingService.ACTION_BUBBLE);
        if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(showBubble);
        else activity.startService(showBubble);
        activity.moveTaskToBack(true);
    }

    void restoreToActivity() {
        removeOverlay();
        activity.setContentView(webView);
        activity.stopService(new Intent(activity, PocketFloatingService.class));
        webView.evaluateJavascript("document.body.classList.remove('native-floating-mode')", null);
    }

    private void removeOverlay() {
        if (root != null && root.getParent() != null) {
            try { windowManager.removeViewImmediate(root); } catch (Exception ignored) { }
        }
        detachWebView();
        root = null;
        contentFrame = null;
        params = null;
    }

    void dispose() {
        if (isShowing()) {
            removeOverlay();
            if (!activity.isFinishing()) activity.setContentView(webView);
        }
    }
}
