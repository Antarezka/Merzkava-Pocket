package com.merzkava.pocket.review;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public final class PocketMediaPlaybackService extends MediaSessionService {
    static final String ACTION_PLAY = "com.merzkava.pocket.MEDIA_PLAY";
    static final String ACTION_VOLUME = "com.merzkava.pocket.MEDIA_VOLUME";
    static final String ACTION_STATE = "com.merzkava.pocket.MEDIA_STATE";

    private static final String TAG = "PocketMedia3";
    private static final String PREFS = "merzkava-pocket-access";
    private static final String PREF_PLAYING = "pocket_native_audio_playing";
    private static final String PREF_TRACK = "pocket_native_audio_track";
    private static final String PREF_CYCLES = "pocket_native_audio_cycles";
    private static final String PREF_VOLUME = "pocket_native_audio_volume";
    private static final long FADE_MS = 2200L;
    private static final long FADE_MONITOR_MS = 90L;
    private static final long FADE_TICK_MS = 40L;

    private static volatile boolean running = false;
    private ExoPlayer player;
    private MediaSession mediaSession;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String activeTrackId = "";
    private float musicVolume = 0.68f;
    private float fadeGain = 1f;
    private float fadeFrom = 1f;
    private float fadeTo = 1f;
    private long fadeDurationMs = 0L;
    private long fadeElapsedBeforePauseMs = 0L;
    private long fadeStartedAtMs = 0L;
    private boolean fadeActive = false;
    private boolean endFadeStarted = false;
    private int cycleCount = 0;

    private final Runnable fadeStep = new Runnable() {
        @Override public void run() {
            if (!fadeActive || player == null || !player.isPlaying()) return;
            long elapsed = fadeElapsedBeforePauseMs +
                Math.max(0L, SystemClock.elapsedRealtime() - fadeStartedAtMs);
            float progress = fadeDurationMs <= 0L ? 1f :
                Math.min(1f, elapsed / (float) fadeDurationMs);
            float eased = progress * progress * (3f - 2f * progress);
            fadeGain = fadeFrom + (fadeTo - fadeFrom) * eased;
            applyPlayerVolume();
            if (progress >= 1f) {
                fadeActive = false;
                fadeElapsedBeforePauseMs = 0L;
                handler.removeCallbacks(this);
            } else {
                handler.postDelayed(this, FADE_TICK_MS);
            }
        }
    };

    private final Runnable fadeMonitor = new Runnable() {
        @Override public void run() {
            if (player == null || !player.isPlaying()) return;
            long duration = player.getDuration();
            long position = player.getCurrentPosition();
            if (duration > 0L && duration != C.TIME_UNSET) {
                long remaining = Math.max(0L, duration - position);
                if (!endFadeStarted && remaining <= FADE_MS + 180L) {
                    endFadeStarted = true;
                    long fadeDuration = Math.max(180L, Math.min(FADE_MS, remaining - 120L));
                    beginFadeTo(0f, fadeDuration);
                }
            }
            handler.postDelayed(this, FADE_MONITOR_MS);
        }
    };

    static boolean isRunning() { return running; }

    @Override public void onCreate() {
        super.onCreate();
        running = true;
        SharedPreferences preferences = getPreferences();
        musicVolume = Math.max(0, Math.min(100, preferences.getInt(PREF_VOLUME, 68))) / 100f;
        cycleCount = Math.max(0, preferences.getInt(PREF_CYCLES, 0));

        player = new ExoPlayer.Builder(this)
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(), true)
            .build();
        player.setRepeatMode(Player.REPEAT_MODE_ONE);
        player.addListener(new Player.Listener() {
            @Override public void onIsPlayingChanged(boolean isPlaying) {
                if (isPlaying) {
                    resumeFadeClock();
                    scheduleFadeMonitor();
                } else {
                    pauseFadeClock();
                    handler.removeCallbacks(fadeMonitor);
                }
                publishState(false, null);
            }

            @Override public void onMediaItemTransition(MediaItem mediaItem, int reason) {
                if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) {
                    cycleCount = cycleCount == Integer.MAX_VALUE ? 0 : cycleCount + 1;
                    getPreferences().edit().putInt(PREF_CYCLES, cycleCount).apply();
                    endFadeStarted = false;
                    cancelFade();
                    fadeGain = 0f;
                    applyPlayerVolume();
                    beginFadeTo(1f, FADE_MS);
                    publishState(true, null);
                } else if (mediaItem != null && mediaItem.mediaId != null &&
                        !mediaItem.mediaId.isEmpty()) {
                    activeTrackId = mediaItem.mediaId;
                    publishState(false, null);
                }
            }

            @Override public void onPlayerError(PlaybackException error) {
                Log.e(TAG, "Native BGM playback failed", error);
                publishState(false, error.getErrorCodeName());
            }
        });

        mediaSession = new MediaSession.Builder(this, player)
            .setId("MerzkavaPocketBgm")
            .build();
        publishState(false, null);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_PLAY.equals(action)) {
            startTrack(intent);
        } else if (ACTION_VOLUME.equals(action)) {
            int value = Math.max(0, Math.min(100, intent.getIntExtra("volume", 68)));
            musicVolume = value / 100f;
            getPreferences().edit().putInt(PREF_VOLUME, value).apply();
            applyPlayerVolume();
        }
        return START_NOT_STICKY;
    }

    private void startTrack(Intent intent) {
        String uriValue = intent.getStringExtra("uri");
        String id = intent.getStringExtra("trackId");
        String title = intent.getStringExtra("title");
        if (uriValue == null || uriValue.trim().isEmpty() ||
                id == null || id.trim().isEmpty()) {
            publishState(false, "The selected Pocket record is incomplete.");
            stopSelf();
            return;
        }
        try {
            activeTrackId = id;
            musicVolume = Math.max(0, Math.min(100,
                intent.getIntExtra("volume", 68))) / 100f;
            getPreferences().edit()
                .putInt(PREF_VOLUME, Math.round(musicVolume * 100f))
                .putString(PREF_TRACK, activeTrackId)
                .apply();

            MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(title == null || title.trim().isEmpty() ? "Pocket Record" : title)
                .setArtist("MERZKAVA POCKET")
                .setAlbumTitle("POCKET RECORD RACK")
                .build();
            MediaItem item = new MediaItem.Builder()
                .setMediaId(activeTrackId)
                .setUri(Uri.parse(uriValue))
                .setMediaMetadata(metadata)
                .build();

            player.setRepeatMode(Player.REPEAT_MODE_ONE);
            player.setMediaItem(item);
            player.prepare();
            endFadeStarted = false;
            cancelFade();
            fadeGain = 0f;
            applyPlayerVolume();
            player.play();
            beginFadeTo(1f, FADE_MS);
            scheduleFadeMonitor();
            publishState(false, null);
        } catch (Exception error) {
            Log.e(TAG, "Could not start the selected Pocket record", error);
            publishState(false, error.getMessage());
        }
    }

    private void scheduleFadeMonitor() {
        handler.removeCallbacks(fadeMonitor);
        if (player != null && player.isPlaying()) handler.post(fadeMonitor);
    }

    private void beginFadeTo(float target, long durationMs) {
        handler.removeCallbacks(fadeStep);
        fadeFrom = fadeGain;
        fadeTo = Math.max(0f, Math.min(1f, target));
        fadeDurationMs = Math.max(1L, durationMs);
        fadeElapsedBeforePauseMs = 0L;
        fadeStartedAtMs = SystemClock.elapsedRealtime();
        fadeActive = true;
        if (player != null && player.isPlaying()) handler.post(fadeStep);
    }

    private void pauseFadeClock() {
        if (!fadeActive) return;
        fadeElapsedBeforePauseMs += Math.max(0L,
            SystemClock.elapsedRealtime() - fadeStartedAtMs);
        handler.removeCallbacks(fadeStep);
    }

    private void resumeFadeClock() {
        if (!fadeActive) return;
        fadeStartedAtMs = SystemClock.elapsedRealtime();
        handler.removeCallbacks(fadeStep);
        handler.post(fadeStep);
    }

    private void cancelFade() {
        handler.removeCallbacks(fadeStep);
        fadeActive = false;
        fadeElapsedBeforePauseMs = 0L;
    }

    private void applyPlayerVolume() {
        if (player != null) player.setVolume(
            Math.max(0f, Math.min(1f, musicVolume * fadeGain)));
    }

    private SharedPreferences getPreferences() {
        return getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    private void publishState(boolean completedCycle, String error) {
        boolean playing = player != null && player.isPlaying();
        SharedPreferences.Editor editor = getPreferences().edit()
            .putBoolean(PREF_PLAYING, playing)
            .putString(PREF_TRACK, activeTrackId);
        if (completedCycle) editor.putInt(PREF_CYCLES, cycleCount);
        editor.apply();

        Intent state = new Intent(ACTION_STATE)
            .setPackage(getPackageName())
            .putExtra("playing", playing)
            .putExtra("trackId", activeTrackId)
            .putExtra("cycleCount", cycleCount);
        if (completedCycle) state.putExtra("cycle", true);
        if (error != null && !error.isEmpty()) state.putExtra("error", error);
        sendBroadcast(state);
    }

    @Override public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override public void onTaskRemoved(Intent rootIntent) {
        if (player == null || !player.getPlayWhenReady()) stopSelf();
    }

    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        running = false;
        getPreferences().edit().putBoolean(PREF_PLAYING, false).apply();
        publishState(false, null);
        super.onDestroy();
    }
}
