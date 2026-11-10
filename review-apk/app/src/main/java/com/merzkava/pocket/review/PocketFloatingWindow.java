package com.merzkava.pocket.review;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
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
    private static final int MODE_FULL_SCREEN = 0;
    private static final int MODE_WINDOW = 1;
    private static final int MODE_STRIP = 2;
    private static final int MODE_BUBBLE = 3;

    private static final String PREFS = "merzkava-pocket-access";
    private static final String KEY_X = "floating_x";
    private static final String KEY_Y = "floating_y";
    private static final String KEY_WIDTH = "floating_width";
    private static final String KEY_HEIGHT = "floating_height";
    private static final String KEY_STRIP_X = "floating_strip_x";
    private static final String KEY_STRIP_Y = "floating_strip_y";

    private final MainActivity activity;
    private final WebView webView;
    private final WindowManager windowManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private LinearLayout root;
    private FrameLayout contentFrame;
    private TextView stripView;
    private WindowManager.LayoutParams params;
    private WindowManager.LayoutParams stripParams;

    private int windowWidth;
    private int windowHeight;
    private int mode = MODE_FULL_SCREEN;
    private int transitionToken;
    private boolean transitionInProgress;

    private float touchRawX;
    private float touchRawY;
    private int touchStartX;
    private int touchStartY;
    private int resizeStartWidth;
    private int resizeStartHeight;
    private boolean dragged;

    private float stripTouchRawX;
    private float stripTouchRawY;
    private int stripTouchStartX;
    private int stripTouchStartY;
    private boolean stripDragged;

    PocketFloatingWindow(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.windowManager = (WindowManager) activity.getApplicationContext()
            .getSystemService(Context.WINDOW_SERVICE);
    }

    private int dp(float value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }

    private GradientDrawable surface(int fill, int stroke, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radiusDp));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private TextView control(String text, int widthDp, String description) {
        TextView view = new TextView(activity);
        view.setText(text);
        view.setTextColor(Color.rgb(239, 228, 202));
        view.setTextSize(17);
        view.setGravity(Gravity.CENTER);
        view.setBackgroundColor(Color.TRANSPARENT);
        view.setClickable(true);
        view.setFocusable(true);
        view.setContentDescription(description);
        view.setLayoutParams(new LinearLayout.LayoutParams(
            dp(widthDp), ViewGroup.LayoutParams.MATCH_PARENT));
        return view;
    }

    boolean isShowing() {
        return isWindowShowing() || isStripShowing();
    }

    private boolean isWindowShowing() {
        return root != null && root.getParent() != null;
    }

    private boolean isStripShowing() {
        return stripView != null && stripView.getParent() != null;
    }

    private void dispatchRenderMode(String renderMode, Runnable afterDispatch) {
        if (webView == null) {
            if (afterDispatch != null) mainHandler.post(afterDispatch);
            return;
        }
        String script = "window.dispatchEvent(new CustomEvent('pocket:render-mode',{detail:{mode:"
            + org.json.JSONObject.quote(renderMode) + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, result -> {
            if (afterDispatch != null) afterDispatch.run();
        }));
    }

    void show() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            activity.runOnUiThread(this::show);
            return;
        }
        if (isWindowShowing()) return;
        if (transitionInProgress && mode != MODE_BUBBLE) return;
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(activity)) {
            throw new IllegalStateException("Allow Display over other apps before opening the mini window.");
        }
        if (windowManager == null) {
            throw new IllegalStateException("Android overlay service is unavailable.");
        }

        transitionInProgress = true;
        int token = ++transitionToken;
        try {
            Intent hideBubble = new Intent(activity, PocketFloatingService.class);
            hideBubble.setAction(PocketFloatingService.ACTION_HIDE_BUBBLE);
            if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(hideBubble);
            else activity.startService(hideBubble);

            removeStripOverlay();
            ensureWindowBuilt();
            ensureWebViewInWindow();

            if (params == null) createWindowParams();
            clampWindowPosition();
            windowManager.addView(root, params);

            webView.evaluateJavascript(
                "document.body.classList.add('native-floating-mode')", null);
            activity.getPreferences(Context.MODE_PRIVATE).edit()
                .putInt(KEY_WIDTH, windowWidth)
                .putInt(KEY_HEIGHT, windowHeight)
                .apply();

            mode = MODE_WINDOW;
            dispatchRenderMode("window", () -> mainHandler.postDelayed(() -> {
                if (token != transitionToken) return;
                if (activity.isFinishing()) {
                    restoreToActivity();
                    return;
                }
                if (isWindowShowing()) {
                    transitionInProgress = false;
                    activity.moveTaskToBack(true);
                } else {
                    transitionInProgress = false;
                    restoreToActivity();
                }
            }, 140L));
        } catch (Exception error) {
            transitionInProgress = false;
            transitionToken++;
            rollbackToActivity();
            throw error;
        }
    }

    private void ensureWindowBuilt() {
        if (root != null && contentFrame != null) return;

        int screenWidth = activity.getResources().getDisplayMetrics().widthPixels;
        int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
        int defaultWidth = Math.min(dp(440), Math.max(dp(260), screenWidth - dp(18)));
        int defaultHeight = Math.min(dp(760),
            Math.max(dp(320), Math.round(screenHeight * 0.72f)));

        windowWidth = activity.getPreferences(Context.MODE_PRIVATE)
            .getInt(KEY_WIDTH, defaultWidth);
        windowHeight = activity.getPreferences(Context.MODE_PRIVATE)
            .getInt(KEY_HEIGHT, defaultHeight);
        windowWidth = clamp(windowWidth, dp(240),
            Math.max(dp(240), Math.min(dp(560), screenWidth - dp(16))));
        windowHeight = clamp(windowHeight, dp(300),
            Math.max(dp(300), Math.min(dp(780), screenHeight - dp(24))));

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
        header.addView(title, new LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
        title.setOnTouchListener((view, event) -> handleWindowTouch(event, false));

        // The standard minimize control always collapses to Pocket's TV bubble.
        // Do not route it to the text-only strip; the TV is the floating identity.
        TextView minimize = control("—", 38, "Minimize to Pocket television bubble");
        TextView fullscreen = control("□", 36, "Restore full Pocket window");
        header.addView(minimize);
        header.addView(fullscreen);
        minimize.setOnClickListener(view -> minimizeToBubble());
        fullscreen.setOnClickListener(view -> restoreToActivity());

        contentFrame = new FrameLayout(activity);
        contentFrame.setBackgroundColor(Color.rgb(18, 23, 20));
        root.addView(contentFrame, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        // The same WebView is moved into the overlay. Add the resize grip after it
        // so the grip stays above the page and remains touchable.
        detachWebView();
        contentFrame.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView resize = new TextView(activity);
        resize.setText("◢");
        resize.setTextColor(Color.rgb(202, 180, 130));
        resize.setTextSize(18);
        resize.setGravity(Gravity.CENTER);
        resize.setBackgroundColor(Color.rgb(33, 44, 36));
        FrameLayout.LayoutParams resizeParams = new FrameLayout.LayoutParams(
            dp(36), dp(36), Gravity.END | Gravity.BOTTOM);
        contentFrame.addView(resize, resizeParams);
        resize.setOnTouchListener((view, event) -> handleWindowTouch(event, true));
    }

    private void ensureWebViewInWindow() {
        if (contentFrame == null) {
            throw new IllegalStateException("Floating window content frame is unavailable.");
        }
        if (webView.getParent() != contentFrame) {
            detachWebView();
            contentFrame.addView(webView, 0, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            View resize = contentFrame.getChildAt(contentFrame.getChildCount() - 1);
            if (resize != null) resize.bringToFront();
        }
    }

    private void detachWebView() {
        if (webView.getParent() instanceof ViewGroup) {
            ((ViewGroup) webView.getParent()).removeView(webView);
        }
    }

    private int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    private WindowManager.LayoutParams newOverlayParams(int width, int height, boolean focusable) {
        int type = Build.VERSION.SDK_INT >= 26
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        int flags = WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
        if (!focusable) flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;

        WindowManager.LayoutParams result = new WindowManager.LayoutParams(
            width, height, type, flags, PixelFormat.TRANSLUCENT);
        result.gravity = Gravity.TOP | Gravity.START;
        result.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        return result;
    }

    private void createWindowParams() {
        params = newOverlayParams(windowWidth, windowHeight, true);
        params.x = activity.getPreferences(Context.MODE_PRIVATE).getInt(KEY_X, dp(8));
        params.y = activity.getPreferences(Context.MODE_PRIVATE).getInt(KEY_Y, dp(90));
        clampWindowPosition();
    }

    private void clampWindowPosition() {
        if (params == null) return;
        int screenWidth = activity.getResources().getDisplayMetrics().widthPixels;
        int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
        params.x = clamp(params.x, 0, Math.max(0, screenWidth - windowWidth));
        params.y = clamp(params.y, 0, Math.max(0, screenHeight - windowHeight));
    }

    private boolean handleWindowTouch(MotionEvent event, boolean resize) {
        if (params == null || root == null) return false;
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                touchStartX = params.x;
                touchStartY = params.y;
                touchRawX = event.getRawX();
                touchRawY = event.getRawY();
                resizeStartWidth = windowWidth;
                resizeStartHeight = windowHeight;
                dragged = false;
                return true;
            case MotionEvent.ACTION_MOVE:
                int dx = Math.round(event.getRawX() - touchRawX);
                int dy = Math.round(event.getRawY() - touchRawY);
                if (Math.abs(dx) + Math.abs(dy) > dp(5)) dragged = true;
                if (resize) {
                    int screenWidth = activity.getResources().getDisplayMetrics().widthPixels;
                    int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
                    int maxWidth = Math.max(dp(240),
                        Math.min(dp(560), screenWidth - params.x - dp(12)));
                    int maxHeight = Math.max(dp(300),
                        Math.min(dp(780), screenHeight - params.y - dp(20)));
                    windowWidth = clamp(resizeStartWidth + dx, dp(240), maxWidth);
                    windowHeight = clamp(resizeStartHeight + dy, dp(300), maxHeight);
                    params.width = windowWidth;
                    params.height = windowHeight;
                } else {
                    params.x = touchStartX + dx;
                    params.y = touchStartY + dy;
                    clampWindowPosition();
                }
                try {
                    windowManager.updateViewLayout(root, params);
                } catch (Exception ignored) { }
                return true;
            case MotionEvent.ACTION_UP:
                if (dragged) {
                    activity.getPreferences(Context.MODE_PRIVATE).edit()
                        .putInt(KEY_X, params.x)
                        .putInt(KEY_Y, params.y)
                        .putInt(KEY_WIDTH, windowWidth)
                        .putInt(KEY_HEIGHT, windowHeight)
                        .apply();
                }
                return true;
            case MotionEvent.ACTION_CANCEL:
                return true;
            default:
                return true;
        }
    }

    private void minimizeToStrip() {
        if (!isWindowShowing() || transitionInProgress) return;
        transitionInProgress = true;
        transitionToken++;
        try {
            removeWindowOverlay();
            ensureStripView();
            createStripParams();
            windowManager.addView(stripView, stripParams);
            mode = MODE_STRIP;
            transitionInProgress = false;
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not show the floating mini-window strip", error);
            transitionInProgress = false;
            removeStripOverlay();
            try {
                if (root != null && root.getParent() == null && params != null) {
                    windowManager.addView(root, params);
                }
            } catch (Exception restoreError) {
                android.util.Log.e("PocketFloating", "Could not restore the mini window", restoreError);
                restoreToActivity();
            }
        }
    }

    private void ensureStripView() {
        if (stripView != null) return;
        stripView = new TextView(activity);
        stripView.setText("MERZKAVA  ·  TAP TO RESTORE");
        stripView.setTextColor(Color.rgb(238, 231, 214));
        stripView.setTextSize(8.5f);
        stripView.setLetterSpacing(.08f);
        stripView.setGravity(Gravity.CENTER);
        stripView.setPadding(dp(16), 0, dp(16), 0);
        stripView.setBackground(surface(
            Color.rgb(30, 43, 36), Color.rgb(180, 155, 104), 18));
        stripView.setElevation(dp(10));
        stripView.setClickable(true);
        stripView.setOnTouchListener((view, event) -> handleStripTouch(event));
    }

    private void createStripParams() {
        if (stripParams != null) return;
        stripParams = newOverlayParams(dp(236), dp(42), false);
        stripParams.x = activity.getPreferences(Context.MODE_PRIVATE)
            .getInt(KEY_STRIP_X, dp(12));
        stripParams.y = activity.getPreferences(Context.MODE_PRIVATE)
            .getInt(KEY_STRIP_Y, dp(90));
        clampStripPosition();
    }

    private void clampStripPosition() {
        if (stripParams == null) return;
        int screenWidth = activity.getResources().getDisplayMetrics().widthPixels;
        int screenHeight = activity.getResources().getDisplayMetrics().heightPixels;
        stripParams.x = clamp(stripParams.x, 0, Math.max(0, screenWidth - stripParams.width));
        stripParams.y = clamp(stripParams.y, 0, Math.max(0, screenHeight - stripParams.height));
    }

    private boolean handleStripTouch(MotionEvent event) {
        if (stripParams == null || stripView == null) return false;
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                stripTouchRawX = event.getRawX();
                stripTouchRawY = event.getRawY();
                stripTouchStartX = stripParams.x;
                stripTouchStartY = stripParams.y;
                stripDragged = false;
                return true;
            case MotionEvent.ACTION_MOVE:
                int dx = Math.round(event.getRawX() - stripTouchRawX);
                int dy = Math.round(event.getRawY() - stripTouchRawY);
                if (Math.abs(dx) + Math.abs(dy) > dp(5)) stripDragged = true;
                stripParams.x = stripTouchStartX + dx;
                stripParams.y = stripTouchStartY + dy;
                clampStripPosition();
                try {
                    windowManager.updateViewLayout(stripView, stripParams);
                } catch (Exception ignored) { }
                return true;
            case MotionEvent.ACTION_UP:
                if (stripDragged) {
                    activity.getPreferences(Context.MODE_PRIVATE).edit()
                        .putInt(KEY_STRIP_X, stripParams.x)
                        .putInt(KEY_STRIP_Y, stripParams.y)
                        .apply();
                } else {
                    show();
                }
                return true;
            case MotionEvent.ACTION_CANCEL:
                return true;
            default:
                return true;
        }
    }

    private void removeWindowOverlay() {
        if (root != null && root.getParent() != null && windowManager != null) {
            try { windowManager.removeViewImmediate(root); }
            catch (Exception error) {
                android.util.Log.w("PocketFloating", "Mini-window removal failed", error);
            }
        }
        params = null;
    }

    private void removeStripOverlay() {
        if (stripView != null && stripView.getParent() != null && windowManager != null) {
            try { windowManager.removeViewImmediate(stripView); }
            catch (Exception error) {
                android.util.Log.w("PocketFloating", "Mini-window strip removal failed", error);
            }
        }
        stripParams = null;
    }

    private void removeOverlay() {
        removeWindowOverlay();
        removeStripOverlay();
        detachWebView();
        root = null;
        contentFrame = null;
        stripView = null;
        params = null;
        stripParams = null;
    }

    void minimizeToBubble() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            activity.runOnUiThread(this::minimizeToBubble);
            return;
        }
        if (!isShowing() || (transitionInProgress && mode != MODE_BUBBLE)) return;

        transitionInProgress = true;
        int token = ++transitionToken;
        try {
            removeOverlay();
            activity.setContentView(webView);
            webView.evaluateJavascript(
                "document.body.classList.remove('native-floating-mode')", null);

            Intent showBubble = new Intent(activity, PocketFloatingService.class);
            showBubble.setAction(PocketFloatingService.ACTION_BUBBLE);
            if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(showBubble);
            else activity.startService(showBubble);

            mode = MODE_BUBBLE;
            mainHandler.postDelayed(() -> {
                if (token != transitionToken) return;
                if (PocketFloatingService.isBubbleVisible()) {
                    dispatchRenderMode("bubble", () -> {
                        transitionInProgress = false;
                        activity.moveTaskToBack(true);
                    });
                } else {
                    android.util.Log.e("PocketFloating",
                        "The TV bubble was not attached; keeping Pocket in the foreground.");
                    dispatchRenderMode("full", () -> {
                        activity.stopService(new Intent(activity, PocketFloatingService.class));
                        bringTaskToFront();
                        mode = MODE_FULL_SCREEN;
                        transitionInProgress = false;
                    });
                }
            }, 450L);
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not minimize to the TV bubble", error);
            transitionInProgress = false;
            transitionToken++;
            rollbackToActivity();
        }
    }

    void restoreToActivity() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            activity.runOnUiThread(this::restoreToActivity);
            return;
        }
        transitionInProgress = true;
        transitionToken++;
        removeOverlay();
        activity.setContentView(webView);
        webView.evaluateJavascript(
            "document.body.classList.remove('native-floating-mode')", null);
        dispatchRenderMode("full", () -> {
            activity.stopService(new Intent(activity, PocketFloatingService.class));
            bringTaskToFront();
            mode = MODE_FULL_SCREEN;
            transitionInProgress = false;
        });
    }

    private void rollbackToActivity() {
        removeOverlay();
        activity.setContentView(webView);
        webView.evaluateJavascript(
            "document.body.classList.remove('native-floating-mode')", null);
        dispatchRenderMode("full", () -> {
            activity.stopService(new Intent(activity, PocketFloatingService.class));
            bringTaskToFront();
            mode = MODE_FULL_SCREEN;
            transitionInProgress = false;
        });
    }

    private void bringTaskToFront() {
        try {
            ActivityManager manager = (ActivityManager)
                activity.getSystemService(Context.ACTIVITY_SERVICE);
            if (manager == null) return;
            java.util.List<ActivityManager.AppTask> tasks = manager.getAppTasks();
            if (!tasks.isEmpty()) tasks.get(0).moveToFront();
        } catch (Exception error) {
            android.util.Log.w("PocketFloating", "Could not bring Pocket back to the foreground", error);
        }
    }

    void dispose() {
        transitionToken++;
        transitionInProgress = false;
        mainHandler.removeCallbacksAndMessages(null);
        removeOverlay();
        if (!activity.isFinishing()) {
            activity.setContentView(webView);
            webView.evaluateJavascript(
                "document.body.classList.remove('native-floating-mode')", null);
        } else {
            activity.stopService(new Intent(activity, PocketFloatingService.class));
        }
        mode = MODE_FULL_SCREEN;
    }
}
