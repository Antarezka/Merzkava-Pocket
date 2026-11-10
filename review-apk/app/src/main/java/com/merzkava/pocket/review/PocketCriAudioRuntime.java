package com.merzkava.pocket.review;

import android.app.Activity;
import android.content.Context;
import android.content.res.AssetManager;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

import org.json.JSONObject;

/**
 * One CRI AtomEx runtime owns every sound emitted by Pocket.
 * All commands are serialized before entering JNI; channels are isolated players
 * inside the same CRI mixer, not independent Android/WebView audio engines.
 */
public final class PocketCriAudioRuntime {
    private static final String TAG = "PocketCriAudio";
    private static final int CHANNEL_MUSIC = 0;
    private static final int CHANNEL_AMBIENCE = 1;
    private static final int CHANNEL_NEEDLE = 2;
    private static final int CHANNEL_EFFECTS = 3;
    private static final int FORMAT_ADX = 1;
    private static final int FORMAT_WAVE = 2;

    private static final Map<String, String> BUILT_IN = new HashMap<>();
    static {
        BUILT_IN.put("happy", "Happy-1a.adx");
        BUILT_IN.put("chill", "chill-1a.adx");
        BUILT_IN.put("retroatrical1", "Retroatrical-1.adx");
        BUILT_IN.put("retroatrical2", "Retroatrical-2.adx");
        BUILT_IN.put("vinyl-surface-noise", "vinyl-surface-noise.adx");
        BUILT_IN.put("needle", "needle-drop.adx");
        BUILT_IN.put("placement", "record-placement.adx");
    }

    private static final String[] CHANNEL_NAMES = {"music", "ambience", "needle", "effects"};
    private static final int[] CHANNELS = {CHANNEL_MUSIC, CHANNEL_AMBIENCE, CHANNEL_NEEDLE, CHANNEL_EFFECTS};

    static {
        System.loadLibrary("pocket_cri_audio");
    }

    private static native boolean nativeInit();
    private static native void nativeShutdown();
    private static native boolean nativePlayFile(int channel, String absolutePath, int format, float volume, boolean loop);
    private static native void nativeStop(int channel);
    private static native void nativePause(int channel, boolean paused);
    private static native void nativeSetVolume(int channel, float volume);
    private static native int nativeGetStatus(int channel);

    private final Activity activity;
    private final WebView webView;
    private final ExecutorService commands = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicLong[] generations = {
        new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong()
    };
    private final int[] lastStatuses = {-1, -1, -1, -1};
    private final AudioManager audioManager;
    private final AudioManager.OnAudioFocusChangeListener focusListener = this::onAudioFocusChanged;

    private AudioFocusRequest focusRequest;
    private boolean initialized;
    private boolean disposed;
    private boolean resumeAfterFocusLoss;
    private boolean focusHeld;
    private volatile boolean polling;
    private int musicVolume = 68;
    private int effectsVolume = 76;

    public PocketCriAudioRuntime(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.audioManager = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
    }

    public synchronized boolean initialize() {
        if (disposed) return false;
        if (initialized) return true;
        try {
            copyBundledAudio();
            boolean ready = nativeInit();
            initialized = ready;
            if (ready) {
                nativeSetVolume(CHANNEL_MUSIC, volume(musicVolume));
                nativeSetVolume(CHANNEL_AMBIENCE, volume(effectsVolume));
                nativeSetVolume(CHANNEL_NEEDLE, volume(effectsVolume));
                nativeSetVolume(CHANNEL_EFFECTS, volume(effectsVolume));
            }
            if (!ready) {
                publish("music", "error", "CRI ADX LE could not initialize.");
                return false;
            }
            Log.i(TAG, "CRI ADX LE initialized; Pocket audio is routed through one native runtime.");
            return true;
        } catch (Exception error) {
            Log.e(TAG, "CRI initialization failed", error);
            publish("music", "error", "CRI audio initialization failed: " + safeMessage(error));
            return false;
        }
    }

    private void copyBundledAudio() throws Exception {
        AssetManager assets = activity.getAssets();
        String[] names = assets.list("cri-audio");
        if (names == null || names.length == 0) throw new IllegalStateException("Built-in CRI audio assets are missing.");
        File directory = new File(activity.getFilesDir(), "cri-audio");
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IllegalStateException("Could not create the private CRI audio directory.");
        for (String name : names) {
            if (!name.toLowerCase(java.util.Locale.ROOT).endsWith(".adx")) continue;
            if (!name.matches("[A-Za-z0-9._-]+")) throw new IllegalStateException("Unsafe CRI audio asset name.");
            File target = new File(directory, name);
            File temporary = new File(directory, name + ".tmp");
            try (InputStream input = assets.open("cri-audio/" + name);
                 FileOutputStream output = new FileOutputStream(temporary)) {
                byte[] buffer = new byte[32 * 1024];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                output.getFD().sync();
            }
            if (temporary.length() < 32) {
                temporary.delete();
                throw new IllegalStateException("CRI audio asset is unexpectedly small: " + name);
            }
            if (target.exists() && !target.delete()) {
                temporary.delete();
                throw new IllegalStateException("Could not replace the previous CRI audio asset: " + name);
            }
            if (!temporary.renameTo(target)) {
                temporary.delete();
                throw new IllegalStateException("Could not install CRI audio asset: " + name);
            }
        }
    }

    public boolean playTrack(String trackId) {
        if (!initialize()) return false;
        final String id = trackId == null ? "" : trackId.trim().toLowerCase(java.util.Locale.ROOT);
        final File file;
        final int format;
        if (id.startsWith("custom:")) {
            String customId = id.substring("custom:".length());
            if (!customId.matches("[a-f0-9-]{36}")) return false;
            file = new File(new File(activity.getFilesDir(), "music"), customId + ".wav");
            format = FORMAT_WAVE;
        } else {
            String asset = BUILT_IN.get(id);
            if (asset == null || id.equals("vinyl-surface-noise") || id.equals("needle") || id.equals("placement")) return false;
            file = new File(new File(activity.getFilesDir(), "cri-audio"), asset);
            format = FORMAT_ADX;
        }
        if (!file.isFile() || file.length() < 32) {
            publish("music", "error", "The selected record is not available on this device.");
            return false;
        }
        requestMusicFocus();
        enqueuePlay(CHANNEL_MUSIC, file, format, volume(musicVolume), true, "preparing");
        return true;
    }

    public boolean playAmbience() {
        if (!initialize()) return false;
        File file = new File(new File(activity.getFilesDir(), "cri-audio"), BUILT_IN.get("vinyl-surface-noise"));
        if (!file.isFile()) {
            publish("ambience", "error", "Vinyl surface noise is missing.");
            return false;
        }
        enqueuePlay(CHANNEL_AMBIENCE, file, FORMAT_ADX, volume(effectsVolume), true, "preparing");
        return true;
    }

    public boolean playEffect(String effectId) {
        if (!initialize()) return false;
        String key = effectId == null ? "" : effectId.trim().toLowerCase(java.util.Locale.ROOT);
        int channel;
        String asset;
        if ("needle".equals(key)) {
            channel = CHANNEL_NEEDLE;
            asset = BUILT_IN.get("needle");
        } else if ("placement".equals(key)) {
            channel = CHANNEL_EFFECTS;
            asset = BUILT_IN.get("placement");
        } else {
            return false;
        }
        File file = new File(new File(activity.getFilesDir(), "cri-audio"), asset);
        if (!file.isFile()) return false;
        enqueuePlay(channel, file, FORMAT_ADX, volume(effectsVolume), false, "preparing");
        return true;
    }

    private void enqueuePlay(int channel, File file, int format, float volume, boolean loop, String initialState) {
        long token = generations[channel].incrementAndGet();
        publish(CHANNEL_NAMES[channel], initialState, "");
        commands.execute(() -> {
            if (disposed || token != generations[channel].get()) return;
            boolean started = nativePlayFile(channel, file.getAbsolutePath(), format, volume, loop);
            if (!started) {
                publish(CHANNEL_NAMES[channel], "error", "CRI could not start this audio stream.");
                return;
            }
            lastStatuses[channel] = -1;
            startPolling();
        });
    }

    public void pauseMusic(boolean paused) {
        if (!initialized || disposed) return;
        commands.execute(() -> {
            if (disposed) return;
            nativePause(CHANNEL_MUSIC, paused);
            nativePause(CHANNEL_AMBIENCE, paused);
            publish("music", paused ? "paused" : "playing", "");
            if (!paused) startPolling();
        });
    }

    public void stopMusic() {
        stopChannel(CHANNEL_MUSIC, "idle");
        stopChannel(CHANNEL_AMBIENCE, "idle");
        abandonMusicFocus();
    }

    public void setMusicVolume(int value) {
        musicVolume = clampPercent(value);
        setChannelVolume(CHANNEL_MUSIC, volume(musicVolume));
    }

    public void setEffectsVolume(int value) {
        effectsVolume = clampPercent(value);
        setChannelVolume(CHANNEL_AMBIENCE, volume(effectsVolume));
        setChannelVolume(CHANNEL_NEEDLE, volume(effectsVolume));
        setChannelVolume(CHANNEL_EFFECTS, volume(effectsVolume));
    }

    private void setChannelVolume(int channel, float value) {
        if (!initialized || disposed) return;
        commands.execute(() -> {
            if (!disposed) nativeSetVolume(channel, value);
        });
    }

    private void stopChannel(int channel, String state) {
        generations[channel].incrementAndGet();
        if (!initialized || disposed) return;
        commands.execute(() -> {
            if (disposed) return;
            nativeStop(channel);
            lastStatuses[channel] = 0;
            publish(CHANNEL_NAMES[channel], state, "");
        });
    }

    private synchronized void startPolling() {
        if (polling || disposed) return;
        polling = true;
        mainHandler.post(pollStatus);
    }

    private final Runnable pollStatus = new Runnable() {
        @Override public void run() {
            if (disposed || !initialized) {
                polling = false;
                return;
            }
            commands.execute(() -> {
                if (disposed) return;
                boolean active = false;
                for (int channel : new int[]{CHANNEL_MUSIC, CHANNEL_AMBIENCE, CHANNEL_NEEDLE, CHANNEL_EFFECTS}) {
                    int status = nativeGetStatus(channel);
                    if (status == 1 || status == 2) active = true;
                    if (status != lastStatuses[channel]) {
                        lastStatuses[channel] = status;
                        publish(CHANNEL_NAMES[channel], stateForStatus(status), "");
                    }
                }
                if (!active) {
                    mainHandler.post(() -> {
                        synchronized (PocketCriAudioRuntime.this) {
                            polling = false;
                            mainHandler.removeCallbacks(pollStatus);
                        }
                        // A new play request may have entered the command queue while
                        // this poll was observing the previous channel state. Recheck
                        // after clearing the poll flag so PREP cannot be stranded.
                        commands.execute(() -> {
                            if (disposed) return;
                            boolean activeAgain = false;
                            for (int channel : new int[]{CHANNEL_MUSIC, CHANNEL_AMBIENCE, CHANNEL_NEEDLE, CHANNEL_EFFECTS}) {
                                int status = nativeGetStatus(channel);
                                if (status == 1 || status == 2) activeAgain = true;
                            }
                            if (activeAgain) startPolling();
                        });
                    });
                }
            });
            mainHandler.postDelayed(this, 120);
        }
    };

    private String stateForStatus(int status) {
        switch (status) {
            case 1: return "preparing";
            case 2: return "playing";
            case 3: return "ended";
            case 4: return "error";
            default: return "idle";
        }
    }

    private void requestMusicFocus() {
        if (audioManager == null || focusHeld) return;
        if (Build.VERSION.SDK_INT >= 26) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attributes)
                .setWillPauseWhenDucked(true)
                .setOnAudioFocusChangeListener(focusListener)
                .build();
            int result = audioManager.requestAudioFocus(focusRequest);
            focusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            if (!focusHeld) Log.w(TAG, "Audio focus was not granted; playback will remain under the system mix policy.");
        } else {
            focusHeld = audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
    }

    private void abandonMusicFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
            focusRequest = null;
        } else if (focusHeld) {
            audioManager.abandonAudioFocus(focusListener);
        }
        focusHeld = false;
    }

    private void onAudioFocusChanged(int change) {
        if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT || change == AudioManager.AUDIOFOCUS_LOSS) {
            resumeAfterFocusLoss = change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT;
            pauseMusic(true);
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            // Always restore the user's saved mix after ducking or interruption.
            setChannelVolume(CHANNEL_MUSIC, volume(musicVolume));
            setChannelVolume(CHANNEL_AMBIENCE, volume(effectsVolume));
            setChannelVolume(CHANNEL_NEEDLE, volume(effectsVolume));
            setChannelVolume(CHANNEL_EFFECTS, volume(effectsVolume));
            if (resumeAfterFocusLoss) {
                resumeAfterFocusLoss = false;
                pauseMusic(false);
            }
        } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            setChannelVolume(CHANNEL_MUSIC, volume(musicVolume) * 0.25f);
            setChannelVolume(CHANNEL_AMBIENCE, volume(effectsVolume) * 0.25f);
            setChannelVolume(CHANNEL_NEEDLE, volume(effectsVolume) * 0.25f);
            setChannelVolume(CHANNEL_EFFECTS, volume(effectsVolume) * 0.25f);
        }
    }

    private void publish(String channel, String state, String error) {
        WebView target = webView;
        if (target == null || target.isAttachedToWindow() == false) return;
        final String js = "window.PocketNativeCallbacks?.audioState?.(" +
            JSONObject.quote(channel) + "," + JSONObject.quote(state) + "," + JSONObject.quote(error == null ? "" : error) + ");";
        target.post(() -> {
            if (webView == target && !disposed) target.evaluateJavascript(js, null);
        });
    }

    private static float volume(int percent) {
        return Math.max(0f, Math.min(1f, percent / 100f));
    }

    private static int clampPercent(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private static String safeMessage(Exception error) {
        return error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
    }

    public void dispose() {
        synchronized (this) {
            if (disposed) return;
            disposed = true;
        }
        for (AtomicLong generation : generations) generation.incrementAndGet();
        mainHandler.removeCallbacks(pollStatus);
        polling = false;
        abandonMusicFocus();
        try {
            commands.execute(() -> {
                try {
                    if (initialized) nativeShutdown();
                } catch (Exception error) {
                    Log.e(TAG, "CRI shutdown failed", error);
                } finally {
                    initialized = false;
                    commands.shutdown();
                }
            });
        } catch (Exception ignored) {
            commands.shutdownNow();
        }
    }
}
