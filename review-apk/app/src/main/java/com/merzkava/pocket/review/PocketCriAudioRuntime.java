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
import java.io.RandomAccessFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
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
    private static final int CHANNEL_DOOR_CHIME = 4;
    private static final int CHANNEL_DOOR_RATTLE = 5;
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
        BUILT_IN.put("door-chime", "door-chime.adx");
        BUILT_IN.put("door-rattle", "door-rattle.adx");
    }

    private static final String[] CHANNEL_NAMES = {"music", "ambience", "needle", "effects", "door-chime", "door-rattle"};
    private static final int[] CHANNELS = {CHANNEL_MUSIC, CHANNEL_AMBIENCE, CHANNEL_NEEDLE, CHANNEL_EFFECTS, CHANNEL_DOOR_CHIME, CHANNEL_DOOR_RATTLE};

    static {
        System.loadLibrary("pocket_cri_audio");
    }

    private static native boolean nativeInit();
    private static native void nativeShutdown();
    private static native boolean nativePlayFile(int channel, String absolutePath, int format, int numChannels, int samplingRate, float volume, float fadeMultiplier, boolean loop);
    private static native void nativeFadeVolume(int channel, int durationMs, float volume);
    private static native void nativeStop(int channel);
    private static native void nativePause(int channel, boolean paused);
    private static native void nativeSetVolume(int channel, float volume);
    private static native int nativeGetStatus(int channel);

    private final Activity activity;
    private final WebView webView;
    private final ExecutorService commands = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicLong[] generations = {
        new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong()
    };
    private final AtomicLong[] fadeGenerations = {
        new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong(), new AtomicLong()
    };
    private final Object fadeLock = new Object();
    private final Runnable[] fadeJobs = new Runnable[6];
    private final AtomicLong pauseTransition = new AtomicLong();
    private final int[] lastStatuses = {-1, -1, -1, -1, -1, -1};
    private final AudioManager audioManager;
    private final AudioManager.OnAudioFocusChangeListener focusListener = this::onAudioFocusChanged;

    private AudioFocusRequest focusRequest;
    private boolean initialized;
    private boolean disposed;
    private boolean resumeAfterFocusLoss;
    private boolean focusHeld;
    private volatile boolean polling;
    private volatile boolean musicStreamActive;
    private volatile boolean ambienceStreamActive;
    private volatile boolean pausedByFocusLoss;
    private volatile boolean musicPaused;
    private volatile boolean pauseRequested;
    private volatile int musicVolume = 68;
    private volatile int effectsVolume = 76;

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
                nativeSetVolume(CHANNEL_DOOR_CHIME, volume(effectsVolume));
                nativeSetVolume(CHANNEL_DOOR_RATTLE, volume(effectsVolume));
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


    private static final class AudioMetadata {
        final int channels;
        final int sampleRate;

        AudioMetadata(int channels, int sampleRate) {
            this.channels = channels;
            this.sampleRate = sampleRate;
        }
    }

    /**
     * CRI file playback needs format, channel count and sample rate before Start().
     * Read those values from the actual ADX/WAV headers instead of assuming stereo/44.1 kHz.
     */
    private AudioMetadata readAudioMetadata(File file, int format) throws IOException {
        try (RandomAccessFile input = new RandomAccessFile(file, "r")) {
            if (format == FORMAT_ADX) {
                if (input.length() < 16 || input.readUnsignedShort() != 0x8000) {
                    throw new IOException("The ADX file header is invalid.");
                }
                input.seek(4);
                int encoding = input.readUnsignedByte();
                input.seek(7);
                int channels = input.readUnsignedByte();
                long sampleRate = readUInt32BE(input);
                if (encoding != 3) throw new IOException("The ADX encoding type is not supported.");
                return validateAudioMetadata(channels, sampleRate);
            }

            if (format == FORMAT_WAVE) {
                if (input.length() < 44) throw new IOException("The imported WAV header is incomplete.");
                byte[] riff = new byte[4];
                input.readFully(riff);
                if (!"RIFF".equals(new String(riff, StandardCharsets.US_ASCII))) {
                    throw new IOException("The imported WAV does not have a RIFF header.");
                }
                long riffSize = readUInt32LE(input);
                byte[] wave = new byte[4];
                input.readFully(wave);
                if (!"WAVE".equals(new String(wave, StandardCharsets.US_ASCII))) {
                    throw new IOException("The imported audio is not a WAV file.");
                }
                long riffEnd = riffSize + 8L;
                if (riffEnd < 12L || riffEnd > input.length()) {
                    throw new IOException("The imported WAV file is truncated.");
                }
                while (input.getFilePointer() + 8L <= riffEnd) {
                    byte[] chunkName = new byte[4];
                    input.readFully(chunkName);
                    long chunkSize = readUInt32LE(input);
                    long chunkStart = input.getFilePointer();
                    if (chunkSize > riffEnd - chunkStart) {
                        throw new IOException("The imported WAV contains a truncated chunk.");
                    }
                    String chunk = new String(chunkName, StandardCharsets.US_ASCII);
                    if ("fmt ".equals(chunk)) {
                        if (chunkSize < 16L) throw new IOException("The WAV format chunk is incomplete.");
                        int audioFormat = readUInt16LE(input);
                        int channels = readUInt16LE(input);
                        long sampleRate = readUInt32LE(input);
                        input.seek(chunkStart + 14L);
                        int bitsPerSample = readUInt16LE(input);
                        if (audioFormat != 1 || bitsPerSample != 16) {
                            throw new IOException("Pocket requires imported audio decoded as PCM16 WAV.");
                        }
                        return validateAudioMetadata(channels, sampleRate);
                    }
                    input.seek(chunkStart + chunkSize + (chunkSize & 1L));
                }
                throw new IOException("The WAV format chunk could not be found.");
            }
            throw new IOException("The CRI audio format is not supported.");
        }
    }

    private static AudioMetadata validateAudioMetadata(int channels, long sampleRate) throws IOException {
        if (channels < 1 || channels > 2 || sampleRate < 8000L || sampleRate > 192000L) {
            throw new IOException("CRI audio metadata is outside Pocket's supported mono/stereo 8–192 kHz range.");
        }
        return new AudioMetadata(channels, (int) sampleRate);
    }

    private static long readUInt32BE(RandomAccessFile input) throws IOException {
        return ((long) input.readUnsignedByte() << 24)
            | ((long) input.readUnsignedByte() << 16)
            | ((long) input.readUnsignedByte() << 8)
            | (long) input.readUnsignedByte();
    }

    private static long readUInt32LE(RandomAccessFile input) throws IOException {
        return (long) input.readUnsignedByte()
            | ((long) input.readUnsignedByte() << 8)
            | ((long) input.readUnsignedByte() << 16)
            | ((long) input.readUnsignedByte() << 24);
    }

    private static int readUInt16LE(RandomAccessFile input) throws IOException {
        return input.readUnsignedByte() | (input.readUnsignedByte() << 8);
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
        final AudioMetadata metadata;
        try {
            metadata = readAudioMetadata(file, format);
        } catch (Exception error) {
            Log.e(TAG, "Could not read selected CRI track metadata", error);
            publish("music", "error", safeMessage(error));
            return false;
        }
        requestMusicFocus();
        pausedByFocusLoss = false;
        final boolean keepPaused = pauseRequested || musicPaused;
        final long generation = generations[CHANNEL_MUSIC].incrementAndGet();
        publish("music", "preparing", "");
        Runnable startSelectedTrack = () -> {
            if (disposed || generation != generations[CHANNEL_MUSIC].get()) return;
            startFileAtVolume(CHANNEL_MUSIC, file, format, metadata, volume(musicVolume), 0f, true, generation,
                () -> {
                    if (keepPaused) {
                        commands.execute(() -> {
                            if (disposed || generation != generations[CHANNEL_MUSIC].get()) return;
                            nativePause(CHANNEL_MUSIC, true);
                            musicPaused = true;
                            pauseRequested = true;
                            publish("music", "paused", "");
                        });
                    } else {
                        fadeChannelTo(CHANNEL_MUSIC, 1f, 240L, null);
                        if (!ambienceStreamActive) playAmbience();
                        else fadeChannelTo(CHANNEL_AMBIENCE, 1f, 240L, null);
                    }
                });
        };
        // Fade out only BGM, then replace it even if a volume slider is moved mid-fade.
        // The vinyl ambience channel is independent and never stops during track changes.
        if (musicStreamActive) {
            fadeChannelTo(CHANNEL_MUSIC, 0f, 170L, null);
            mainHandler.postDelayed(startSelectedTrack, 185L);
        } else {
            startSelectedTrack.run();
        }
        return true;
    }

    public boolean playAmbience() {
        if (!initialize()) return false;
        File file = new File(new File(activity.getFilesDir(), "cri-audio"), BUILT_IN.get("vinyl-surface-noise"));
        if (!file.isFile()) {
            publish("ambience", "error", "Vinyl surface noise is missing.");
            return false;
        }
        if (ambienceStreamActive) {
            generations[CHANNEL_AMBIENCE].incrementAndGet(); // invalidate a pending stop transition
            fadeChannelTo(CHANNEL_AMBIENCE, 1f, 240L, null);
            return true;
        }
        final AudioMetadata metadata;
        try {
            metadata = readAudioMetadata(file, FORMAT_ADX);
        } catch (Exception error) {
            Log.e(TAG, "Could not read vinyl ambience metadata", error);
            publish("ambience", "error", safeMessage(error));
            return false;
        }
        final long generation = generations[CHANNEL_AMBIENCE].incrementAndGet();
        publish("ambience", "preparing", "");
        startFileAtVolume(CHANNEL_AMBIENCE, file, FORMAT_ADX, metadata, volume(effectsVolume), 0f, true, generation,
            () -> fadeChannelTo(CHANNEL_AMBIENCE, 1f, 320L, null));
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
            asset = BUILT_IN.get(key);
        } else if ("door-chime".equals(key)) {
            channel = CHANNEL_DOOR_CHIME;
            asset = BUILT_IN.get(key);
        } else if ("door-rattle".equals(key)) {
            channel = CHANNEL_DOOR_RATTLE;
            asset = BUILT_IN.get(key);
        } else {
            return false;
        }
        File file = new File(new File(activity.getFilesDir(), "cri-audio"), asset);
        if (!file.isFile()) return false;
        final AudioMetadata metadata;
        try {
            metadata = readAudioMetadata(file, FORMAT_ADX);
        } catch (Exception error) {
            Log.e(TAG, "Could not read CRI effect metadata", error);
            publish(CHANNEL_NAMES[channel], "error", safeMessage(error));
            return false;
        }
        enqueuePlay(channel, file, FORMAT_ADX, metadata, volume(effectsVolume), false, "preparing");
        return true;
    }

    private void enqueuePlay(int channel, File file, int format, AudioMetadata metadata, float volume, boolean loop, String initialState) {
        long token = generations[channel].incrementAndGet();
        cancelChannelFade(channel);
        publish(CHANNEL_NAMES[channel], initialState, "");
        commands.execute(() -> {
            if (disposed || token != generations[channel].get()) return;
            boolean started = nativePlayFile(channel, file.getAbsolutePath(), format, metadata.channels, metadata.sampleRate, volume, 1f, loop);
            if (!started) {
                publish(CHANNEL_NAMES[channel], "error", "CRI could not start this audio stream.");
                return;
            }
            markChannelActive(channel, true);
            lastStatuses[channel] = -1;
            startPolling();
        });
    }

    private void startFileAtVolume(int channel, File file, int format, AudioMetadata metadata, float masterVolume,
                                   float initialFadeMultiplier, boolean loop, long generation, Runnable onStarted) {
        if (disposed || generation != generations[channel].get()) return;
        cancelChannelFade(channel);
        final float safeMasterVolume = Math.max(0f, Math.min(1f, masterVolume));
        final float safeFadeMultiplier = Math.max(0f, Math.min(1f, initialFadeMultiplier));
        commands.execute(() -> {
            if (disposed || generation != generations[channel].get()) return;
            boolean started = nativePlayFile(channel, file.getAbsolutePath(), format, metadata.channels, metadata.sampleRate, safeMasterVolume, safeFadeMultiplier, loop);
            if (!started) {
                markChannelActive(channel, false);
                publish(CHANNEL_NAMES[channel], "error", "CRI could not start this audio stream.");
                return;
            }
            markChannelActive(channel, true);
            lastStatuses[channel] = -1;
            startPolling();
            if (onStarted != null && !disposed && generation == generations[channel].get()) onStarted.run();
        });
    }

    private void markChannelActive(int channel, boolean active) {
        if (channel == CHANNEL_MUSIC) musicStreamActive = active;
        else if (channel == CHANNEL_AMBIENCE) ambienceStreamActive = active;
    }

    private void cancelChannelFade(int channel) {
        fadeGenerations[channel].incrementAndGet();
        synchronized (fadeLock) {
            Runnable running = fadeJobs[channel];
            if (running != null) mainHandler.removeCallbacks(running);
            fadeJobs[channel] = null;
        }
    }

    /** Delegate the complete fade ramp to CRI Tween; Java only tracks completion/cancellation. */
    private void fadeChannelTo(int channel, float target, long durationMs, Runnable onComplete) {
        if (disposed || channel < 0 || channel >= CHANNELS.length) return;
        final float end = Math.max(0f, Math.min(1f, target));
        final int duration = (int) Math.max(0L, Math.min(65535L, durationMs));
        final long token = fadeGenerations[channel].incrementAndGet();
        final Runnable completion = () -> {
            synchronized (fadeLock) {
                if (token != fadeGenerations[channel].get()) return;
                fadeJobs[channel] = null;
            }
            if (!disposed && onComplete != null) onComplete.run();
        };
        synchronized (fadeLock) {
            Runnable previous = fadeJobs[channel];
            if (previous != null) mainHandler.removeCallbacks(previous);
            fadeJobs[channel] = completion;
        }
        try {
            commands.execute(() -> {
                if (disposed || token != fadeGenerations[channel].get()) return;
                nativeFadeVolume(channel, duration, end);
            });
            mainHandler.postDelayed(completion, duration);
        } catch (RuntimeException error) {
            synchronized (fadeLock) {
                if (token == fadeGenerations[channel].get()) fadeJobs[channel] = null;
            }
            Log.w(TAG, "Could not queue CRI Tween fade for " + CHANNEL_NAMES[channel], error);
        }
    }

    public void pauseMusic(boolean paused) {
        if (!initialized || disposed) return;
        final long transition = pauseTransition.incrementAndGet();
        if (paused) {
            pauseRequested = true;
            fadeChannelTo(CHANNEL_MUSIC, 0f, 170L, null);
            fadeChannelTo(CHANNEL_AMBIENCE, 0f, 170L, null);
            // Pause after the fade window independently of volume-slider events.
            mainHandler.postDelayed(() -> {
                if (disposed || transition != pauseTransition.get()) return;
                commands.execute(() -> {
                    if (disposed || transition != pauseTransition.get()) return;
                    nativePause(CHANNEL_MUSIC, true);
                    nativePause(CHANNEL_AMBIENCE, true);
                    musicPaused = true;
                    publish("music", "paused", "");
                });
            }, 185L);
            return;
        }
        pauseRequested = false;
        musicPaused = false;
        pausedByFocusLoss = false;
        commands.execute(() -> {
            if (disposed || transition != pauseTransition.get()) return;
            nativePause(CHANNEL_MUSIC, false);
            nativePause(CHANNEL_AMBIENCE, false);
            fadeChannelTo(CHANNEL_MUSIC, 1f, 230L, null);
            fadeChannelTo(CHANNEL_AMBIENCE, 1f, 280L, null);
            publish("music", "playing", "");
            startPolling();
        });
    }

    public void stopMusic() {
        if (!initialized || disposed) return;
        pauseRequested = false;
        musicPaused = false;
        final long transition = pauseTransition.incrementAndGet();
        final long musicGeneration = generations[CHANNEL_MUSIC].incrementAndGet();
        final long ambienceGeneration = generations[CHANNEL_AMBIENCE].incrementAndGet();
        fadeChannelTo(CHANNEL_MUSIC, 0f, 150L, null);
        fadeChannelTo(CHANNEL_AMBIENCE, 0f, 150L, null);
        // Stop is not coupled to fade callbacks: changing a slider cannot strand a channel.
        mainHandler.postDelayed(() -> commands.execute(() -> {
            if (disposed || transition != pauseTransition.get() ||
                musicGeneration != generations[CHANNEL_MUSIC].get() ||
                ambienceGeneration != generations[CHANNEL_AMBIENCE].get()) return;
            nativeStop(CHANNEL_MUSIC);
            nativeStop(CHANNEL_AMBIENCE);
            lastStatuses[CHANNEL_MUSIC] = 0;
            lastStatuses[CHANNEL_AMBIENCE] = 0;
            markChannelActive(CHANNEL_MUSIC, false);
            markChannelActive(CHANNEL_AMBIENCE, false);
            publish("music", "idle", "");
            abandonMusicFocus();
        }), 170L);
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
        setChannelVolume(CHANNEL_DOOR_CHIME, volume(effectsVolume));
        setChannelVolume(CHANNEL_DOOR_RATTLE, volume(effectsVolume));
    }

    private void setChannelVolume(int channel, float value) {
        if (!initialized || disposed) return;
        final float clamped = Math.max(0f, Math.min(1f, value));
        commands.execute(() -> {
            if (!disposed) nativeSetVolume(channel, clamped);
        });
    }

    private void stopChannel(int channel, String state) {
        generations[channel].incrementAndGet();
        cancelChannelFade(channel);
        if (!initialized || disposed) return;
        commands.execute(() -> {
            if (disposed) return;
            nativeStop(channel);
            markChannelActive(channel, false);
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
                for (int channel : CHANNELS) {
                    int status = nativeGetStatus(channel);
                    if (status == 1 || status == 2) active = true;
                    if (status != lastStatuses[channel]) {
                        lastStatuses[channel] = status;
                        publish(CHANNEL_NAMES[channel], stateForStatus(channel, status), "");
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
                            for (int channel : CHANNELS) {
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

    private String stateForStatus(int channel, int status) {
        if (channel == CHANNEL_MUSIC && musicPaused) return "paused";
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
            pausedByFocusLoss = true;
            pauseMusic(true);
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            // Restore the complete CRI mix smoothly after ducking or interruption.
            fadeChannelTo(CHANNEL_NEEDLE, 1f, 180L, null);
            fadeChannelTo(CHANNEL_EFFECTS, 1f, 180L, null);
            fadeChannelTo(CHANNEL_DOOR_CHIME, 1f, 180L, null);
            fadeChannelTo(CHANNEL_DOOR_RATTLE, 1f, 180L, null);
            if (resumeAfterFocusLoss) {
                resumeAfterFocusLoss = false;
                pausedByFocusLoss = false;
                pauseMusic(false);
            } else if (!pausedByFocusLoss) {
                fadeChannelTo(CHANNEL_MUSIC, 1f, 180L, null);
                fadeChannelTo(CHANNEL_AMBIENCE, 1f, 180L, null);
            }
        } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            fadeChannelTo(CHANNEL_MUSIC, 0.25f, 150L, null);
            fadeChannelTo(CHANNEL_AMBIENCE, 0.25f, 150L, null);
            fadeChannelTo(CHANNEL_NEEDLE, 0.25f, 150L, null);
            fadeChannelTo(CHANNEL_EFFECTS, 0.25f, 150L, null);
            fadeChannelTo(CHANNEL_DOOR_CHIME, 0.25f, 150L, null);
            fadeChannelTo(CHANNEL_DOOR_RATTLE, 0.25f, 150L, null);
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
        for (int channel = 0; channel < fadeGenerations.length; channel++) cancelChannelFade(channel);
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
