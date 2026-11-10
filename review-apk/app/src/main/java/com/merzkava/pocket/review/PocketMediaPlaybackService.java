package com.merzkava.pocket.review;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.util.Log;

import org.json.JSONObject;

public final class PocketMediaPlaybackService extends Service {
    public static final String ACTION_PLAY = "com.merzkava.pocket.MEDIA_PLAY";
    public static final String ACTION_PAUSE = "com.merzkava.pocket.MEDIA_PAUSE";
    public static final String ACTION_VOLUME = "com.merzkava.pocket.MEDIA_VOLUME";
    public static final String ACTION_STATE = "com.merzkava.pocket.MEDIA_STATE";
    public static final String ACTION_STOP = "com.merzkava.pocket.MEDIA_STOP";

    private static final String TAG = "PocketOxiAudio";
    private static final String CHANNEL_ID = "pocket_bgm";
    private static final int NOTIFICATION_ID = 4202;
    private static volatile boolean running = false;
    private static volatile boolean nativeLibraryLoaded = false;

    static {
        try {
            System.loadLibrary("pocket_audio");
            nativeLibraryLoaded = true;
        } catch (UnsatisfiedLinkError error) {
            Log.e(TAG, "The OxiAudio/OxiSound native library could not be loaded.", error);
        }
    }

    private static native boolean nativeInitialize(android.content.Context context);
    private static native boolean nativeStart(String trackId, String path, int volume);
    private static native void nativePause(boolean userPause);
    private static native void nativeStop();
    private static native void nativeSetVolume(int volume);
    private static native String nativeGetState();

    private final Handler handler = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean audioFocusHeld = false;
    private boolean resumeAfterFocusGain = false;
    private String activeTrackId = "";
    private String activeTrackPath = "";
    private int activeVolume = 68;

    private final AudioManager.OnAudioFocusChangeListener audioFocusListener = this::onAudioFocusChanged;
    private boolean nativeReady = false;
    private int lastCycleCount = 0;
    private String notificationTitle = "Merzkava Pocket";
    private final Runnable statePoll = new Runnable() {
        @Override public void run() {
            if (!running) return;
            publishNativeState();
            handler.postDelayed(this, 250L);
        }
    };

    public static boolean isRunning() {
        return running;
    }

    @Override public void onCreate() {
        super.onCreate();
        running = true;
        createNotificationChannel();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build())
            .setAcceptsDelayedFocusGain(false)
            .setWillPauseWhenDucked(false)
            .setOnAudioFocusChangeListener(audioFocusListener, handler)
            .build();
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MerzkavaPocket:OxiAudio");
            wakeLock.setReferenceCounted(false);
        }
        nativeReady = nativeLibraryLoaded && nativeInitialize(this);
        if (!nativeReady) {
            Log.e(TAG, "OxiAudio/OxiSound initialization failed. Android audio context was not prepared.");
            updateStoredState(false, false, "OxiAudio/OxiSound could not initialize on this Android device.", "", false, 0);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_PLAY : intent.getAction();
        if (ACTION_PLAY.equals(action)) {
            String trackId = intent.getStringExtra("trackId");
            String title = intent.getStringExtra("title");
            String path = intent.getStringExtra("path");
            int volume = Math.max(0, Math.min(100, intent.getIntExtra("volume", 68)));
            notificationTitle = (title == null || title.trim().isEmpty()) ? "Merzkava Pocket" : title.trim();
            activeTrackId = trackId == null ? "" : trackId;
            activeTrackPath = path == null ? "" : path;
            activeVolume = volume;
            resumeAfterFocusGain = false;
            enterForeground(notificationTitle);

            if (!requestAudioFocus()) {
                updateStoredState(false, false, "Android audio focus is currently unavailable. Try playback again.", activeTrackId, false, lastCycleCount);
                releaseWakeLock();
            } else if (!nativeReady || !nativeLibraryLoaded) {
                updateStoredState(false, false, "OxiAudio/OxiSound native playback is unavailable.", trackId, false, lastCycleCount);
                releaseWakeLock();
            } else {
                acquireWakeLock();
                if (trackId == null || path == null || path.isEmpty() || !nativeStart(trackId, path, volume)) {
                    updateStoredState(false, false, "OxiAudio could not start the selected audio file.", trackId, false, lastCycleCount);
                    releaseWakeLock();
                } else {
                    // nativeStart() only enqueues a generation-stamped command. The native
                    // manager owns PREPARING -> PLAYING; do not overwrite its snapshot here.
                    nativeSetVolume(volume);
                }
            }
            beginPolling();
        } else if (ACTION_PAUSE.equals(action)) {
            boolean userPause = intent != null && intent.getBooleanExtra("userPause", false);
            if (userPause) resumeAfterFocusGain = false;
            if (nativeReady) nativePause(userPause);
            releaseWakeLock();
            abandonAudioFocus();
            publishNativeState();
        } else if (ACTION_VOLUME.equals(action)) {
            int volume = Math.max(0, Math.min(100, intent == null ? 68 : intent.getIntExtra("volume", 68)));
            activeVolume = volume;
            if (nativeReady) nativeSetVolume(volume);
            publishNativeState();
        } else if (ACTION_STOP.equals(action)) {
            stopNativePlayback();
            stopSelf(startId);
        } else {
            beginPolling();
        }
        return START_NOT_STICKY;
    }

    private boolean requestAudioFocus() {
        if (audioManager == null || audioFocusRequest == null) return false;
        int result = audioManager.requestAudioFocus(audioFocusRequest);
        audioFocusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        return audioFocusHeld;
    }

    private void abandonAudioFocus() {
        if (!audioFocusHeld || audioManager == null || audioFocusRequest == null) return;
        try {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } catch (Exception error) {
            Log.w(TAG, "Could not abandon Android audio focus.", error);
        }
        audioFocusHeld = false;
    }

    private void onAudioFocusChanged(int focusChange) {
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            if (nativeReady) nativeSetVolume(Math.max(0, activeVolume / 4));
            return;
        }

        if (focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            boolean playing = getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE)
                .getBoolean("pocket_native_audio_playing", false);
            boolean preparing = getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE)
                .getBoolean("pocket_native_audio_preparing", false);
            boolean userPaused = getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE)
                .getBoolean("pocket_native_audio_user_paused", false);
            resumeAfterFocusGain = (playing || preparing) && !userPaused;
            if (nativeReady) nativePause(false);
            updateStoredState(false, false, "", activeTrackId, false, lastCycleCount);
            releaseWakeLock();
            return;
        }

        if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
            resumeAfterFocusGain = false;
            if (nativeReady) nativePause(false);
            updateStoredState(false, false, "", activeTrackId, false, lastCycleCount);
            releaseWakeLock();
            abandonAudioFocus();
            return;
        }

        if (focusChange == AudioManager.AUDIOFOCUS_GAIN) {
            audioFocusHeld = true;
            if (nativeReady) nativeSetVolume(activeVolume);
            if (resumeAfterFocusGain && nativeReady && !activeTrackId.isEmpty() && !activeTrackPath.isEmpty()) {
                resumeAfterFocusGain = false;
                acquireWakeLock();
                boolean accepted = nativeStart(activeTrackId, activeTrackPath, activeVolume);
                if (!accepted) {
                    updateStoredState(false, false, "OxiAudio could not resume after Android audio focus returned.", activeTrackId, false, lastCycleCount);
                    releaseWakeLock();
                }
            }
        }
    }

    private void enterForeground(String title) {
        String text = "Playing " + title;
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setSmallIcon(getApplicationInfo().icon)
            .setContentTitle("Merzkava Pocket")
            .setContentText(text)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setOnlyAlertOnce(true);
        startForeground(NOTIFICATION_ID, builder.build());
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Pocket background music", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Background music playback for Merzkava Pocket.");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) wakeLock.acquire();
        } catch (Exception error) {
            Log.w(TAG, "Could not acquire audio wake lock.", error);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception error) {
            Log.w(TAG, "Could not release audio wake lock.", error);
        }
    }

    private void beginPolling() {
        handler.removeCallbacks(statePoll);
        handler.post(statePoll);
    }

    private void publishNativeState() {
        if (!nativeReady) return;
        try {
            String raw = nativeGetState();
            JSONObject state = new JSONObject(raw == null ? "{}" : raw);
            boolean playing = state.optBoolean("playing", false);
            boolean preparing = state.optBoolean("preparing", false);
            String trackId = state.optString("trackId", "");
            String error = state.optString("error", "");
            boolean userPaused = state.optBoolean("userPaused", false);
            int cycleCount = Math.max(0, state.optInt("cycleCount", 0));
            updateStoredState(playing, preparing, error, trackId, userPaused, cycleCount);
            if (playing) acquireWakeLock();
            else if (!preparing) releaseWakeLock();
        } catch (Exception error) {
            Log.w(TAG, "Could not read OxiAudio/OxiSound playback state.", error);
        }
    }

    private void updateStoredState(boolean playing, boolean preparing, String error,
                                   String trackId, boolean userPaused, int cycleCount) {
        getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE).edit()
            .putBoolean("pocket_native_audio_playing", playing)
            .putBoolean("pocket_native_audio_preparing", preparing)
            .putString("pocket_native_audio_error", error == null ? "" : error)
            .putString("pocket_native_audio_track", trackId == null ? "" : trackId)
            .putInt("pocket_native_audio_cycles", Math.max(0, cycleCount))
            .putInt("pocket_native_audio_volume",
                getSharedPreferences("merzkava-pocket-access", MODE_PRIVATE).getInt("pocket_native_audio_volume", 68))
            .putBoolean("pocket_native_audio_user_paused", userPaused)
            .apply();

        Intent broadcast = new Intent(ACTION_STATE);
        broadcast.setPackage(getPackageName());
        broadcast.putExtra("playing", playing);
        broadcast.putExtra("preparing", preparing);
        broadcast.putExtra("trackId", trackId == null ? "" : trackId);
        broadcast.putExtra("cycleCount", Math.max(0, cycleCount));
        broadcast.putExtra("userPaused", userPaused);
        if (error != null && !error.isEmpty()) broadcast.putExtra("error", error);
        if (cycleCount > lastCycleCount) broadcast.putExtra("cycle", true);
        lastCycleCount = Math.max(0, cycleCount);
        sendBroadcast(broadcast);
    }

    private void stopNativePlayback() {
        resumeAfterFocusGain = false;
        if (nativeReady) nativeStop();
        releaseWakeLock();
        abandonAudioFocus();
        activeTrackId = "";
        activeTrackPath = "";
        activeVolume = 68;
        updateStoredState(false, false, "", "", false, 0);
        handler.removeCallbacks(statePoll);
    }

    @Override public void onTaskRemoved(Intent rootIntent) {
        // The foreground service owns playback; removing the task must not tear down the decoder.
        super.onTaskRemoved(rootIntent);
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(statePoll);
        stopNativePlayback();
        running = false;
        try { stopForeground(STOP_FOREGROUND_REMOVE); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) {
        return null;
    }
}
