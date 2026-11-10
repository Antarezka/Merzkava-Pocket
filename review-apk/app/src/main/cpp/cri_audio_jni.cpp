#include <jni.h>
#include <android/log.h>
#include <cri_le_atom_android.h>
#include <cri_le_atom_ex.h>

#include <array>
#include <atomic>
#include <chrono>
#include <cstdlib>
#include <cstring>
#include <mutex>
#include <string>
#include <thread>

namespace {
constexpr const char* kTag = "PocketCriAudio";
constexpr int kChannelCount = 6;
constexpr int kFormatAdx = 1;
constexpr int kFormatWave = 2;

std::mutex gMutex;
bool gInitialized = false;
std::atomic<bool> gServerRunning{false};
std::thread gServerThread;
void* gAtomWork = nullptr;
CriAtomExVoicePoolHn gAdxVoicePool = nullptr;
CriAtomExVoicePoolHn gWaveVoicePool = nullptr;
void* gAdxVoicePoolWork = nullptr;
void* gWaveVoicePoolWork = nullptr;
CriAtomExPlayerHn gPlayers[kChannelCount] = {};
CriAtomExTweenHn gVolumeTweens[kChannelCount] = {};
void* gPlayerWork[kChannelCount] = {};
void* gTweenWork[kChannelCount] = {};
bool gLoopEnabled[kChannelCount] = {false, false, false, false, false, false};
CriAtomExPlaybackId gPlaybackIds[kChannelCount] = {
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID
};
CriUint32 gLoopCycleCounts[kChannelCount] = {};

bool validChannel(jint channel) {
    return channel >= 0 && channel < kChannelCount;
}

jstring makeError(JNIEnv* env, const char* message) {
    return env->NewStringUTF(message == nullptr ? "Unknown CRI error" : message);
}
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeInit(JNIEnv* env, jclass) {
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialized) return JNI_TRUE;

    CriAtomExConfig_ANDROID config;
    CriAtomExAdxVoicePoolConfig voicePoolConfig;
    CriAtomExWaveVoicePoolConfig wavePoolConfig;
    CriSint32 adxPoolWorkSize = 0;
    CriSint32 wavePoolWorkSize = 0;
    std::memset(&config, 0, sizeof(config));
    std::memset(&voicePoolConfig, 0, sizeof(voicePoolConfig));
    std::memset(&wavePoolConfig, 0, sizeof(wavePoolConfig));
    criAtomEx_SetDefaultConfig_ANDROID(&config);

    const CriSint32 workSize = criAtomEx_CalculateWorkSize_ANDROID(&config);
    if (workSize <= 0) {
        __android_log_print(ANDROID_LOG_ERROR, kTag, "Invalid CRI work size: %d", workSize);
        return JNI_FALSE;
    }
    gAtomWork = std::calloc(1, static_cast<size_t>(workSize));
    if (gAtomWork == nullptr) {
        __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not allocate CRI work memory");
        return JNI_FALSE;
    }

    criAtomEx_Initialize_ANDROID(&config, gAtomWork, workSize);
    gInitialized = true;

    // SetFile() streams ADX data. A streaming ADX voice pool is mandatory:
    // without it, players can be created and Start() can return an ID while no
    // playback voice is available to render the stream.
    criAtomExVoicePool_SetDefaultConfigForAdxVoicePool(&voicePoolConfig);
    voicePoolConfig.num_voices = kChannelCount;
    voicePoolConfig.player_config.streaming_flag = CRI_TRUE;
    adxPoolWorkSize = criAtomExVoicePool_CalculateWorkSizeForAdxVoicePool(&voicePoolConfig);
    if (adxPoolWorkSize < 0) {
        __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not calculate CRI ADX voice-pool work size: %d", adxPoolWorkSize);
        goto fail;
    }
    if (adxPoolWorkSize > 0) {
        gAdxVoicePoolWork = std::calloc(1, static_cast<size_t>(adxPoolWorkSize));
        if (gAdxVoicePoolWork == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not allocate CRI ADX voice-pool work memory");
            goto fail;
        }
    }
    gAdxVoicePool = criAtomExVoicePool_AllocateAdxVoicePool(&voicePoolConfig, gAdxVoicePoolWork, adxPoolWorkSize);
    if (gAdxVoicePool == nullptr) {
        __android_log_print(ANDROID_LOG_ERROR, kTag,
            "CRI could not allocate the ADX streaming voice pool (%d voices)", kChannelCount);
        goto fail;
    }

    // Imported user tracks are decoded to PCM16 WAV, not ADX. They need their
    // own streaming Wave voice pool; an ADX pool cannot render WAV streams.
    criAtomExVoicePool_SetDefaultConfigForWaveVoicePool(&wavePoolConfig);
    wavePoolConfig.num_voices = 1;
    wavePoolConfig.player_config.streaming_flag = CRI_TRUE;
    wavePoolConfig.player_config.max_channels = 2;
    wavePoolConfig.player_config.max_sampling_rate = 192000;
    wavePoolWorkSize = criAtomExVoicePool_CalculateWorkSizeForWaveVoicePool(&wavePoolConfig);
    if (wavePoolWorkSize < 0) {
        __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not calculate CRI Wave voice-pool work size: %d", wavePoolWorkSize);
        goto fail;
    }
    if (wavePoolWorkSize > 0) {
        gWaveVoicePoolWork = std::calloc(1, static_cast<size_t>(wavePoolWorkSize));
        if (gWaveVoicePoolWork == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not allocate CRI Wave voice-pool work memory");
            goto fail;
        }
    }
    gWaveVoicePool = criAtomExVoicePool_AllocateWaveVoicePool(&wavePoolConfig, gWaveVoicePoolWork, wavePoolWorkSize);
    if (gWaveVoicePool == nullptr) {
        __android_log_print(ANDROID_LOG_ERROR, kTag,
            "CRI could not allocate the imported-WAV streaming voice pool");
        goto fail;
    }

    for (int index = 0; index < kChannelCount; ++index) {
        CriAtomExPlayerConfig playerConfig;
        std::memset(&playerConfig, 0, sizeof(playerConfig));
        criAtomExPlayer_SetDefaultConfig(&playerConfig);
        playerConfig.max_path = 4096;
        playerConfig.max_path_strings = 1;

        const CriSint32 playerWorkSize = criAtomExPlayer_CalculateWorkSize(&playerConfig);
        if (playerWorkSize < 0) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not calculate player work size (%d)", index);
            goto fail;
        }
        gPlayerWork[index] = playerWorkSize > 0
            ? std::calloc(1, static_cast<size_t>(playerWorkSize)) : nullptr;
        if (playerWorkSize > 0 && gPlayerWork[index] == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not allocate player work (%d)", index);
            goto fail;
        }
        gPlayers[index] = criAtomExPlayer_Create(&playerConfig, gPlayerWork[index], playerWorkSize);
        if (gPlayers[index] == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not create CRI player (%d)", index);
            goto fail;
        }

        // CRI Tween owns the fade ramp. Its work memory must remain alive until
        // the Tween is destroyed.
        CriAtomExTweenConfig tweenConfig;
        std::memset(&tweenConfig, 0, sizeof(tweenConfig));
        criAtomExTween_SetDefaultConfig(&tweenConfig);
        tweenConfig.parameter_type = CRIATOMEX_PARAMETER_TYPE_BASIC;
        tweenConfig.id.parameter_id = CRIATOMEX_PARAMETER_ID_VOLUME;
        const CriSint32 tweenWorkSize = criAtomExTween_CalculateWorkSize(&tweenConfig);
        if (tweenWorkSize < 0) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not calculate CRI Tween work size (%d)", index);
            goto fail;
        }
        gTweenWork[index] = tweenWorkSize > 0
            ? std::calloc(1, static_cast<size_t>(tweenWorkSize)) : nullptr;
        if (tweenWorkSize > 0 && gTweenWork[index] == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not allocate CRI Tween work (%d)", index);
            goto fail;
        }
        gVolumeTweens[index] = criAtomExTween_Create(&tweenConfig, gTweenWork[index], tweenWorkSize);
        if (gVolumeTweens[index] == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not create CRI volume Tween (%d)", index);
            goto fail;
        }
        criAtomExPlayer_AttachTween(gPlayers[index], gVolumeTweens[index]);
    }

    // Android uses CRI's timer-driven MULTI model. CRI owns its worker threads,
    // while the application services ExecuteMain at a frame-rate cadence.
    gServerRunning.store(true, std::memory_order_release);
    gServerThread = std::thread([]() {
        auto nextTick = std::chrono::steady_clock::now();
        while (gServerRunning.load(std::memory_order_acquire)) {
            nextTick += std::chrono::milliseconds(16);
            {
                std::lock_guard<std::mutex> serverLock(gMutex);
                if (gInitialized) criAtomEx_ExecuteMain();
            }
            const auto now = std::chrono::steady_clock::now();
            if (now > nextTick + std::chrono::milliseconds(32)) nextTick = now;
            std::this_thread::sleep_until(nextTick);
        }
    });

    __android_log_print(ANDROID_LOG_INFO, kTag, "CRI ADX LE initialized with six isolated players and a 60 Hz server pump");
    return JNI_TRUE;

fail:
    for (int index = 0; index < kChannelCount; ++index) {
        if (gPlayers[index] != nullptr) {
            criAtomExPlayer_Stop(gPlayers[index]);
            criAtomExPlayer_Destroy(gPlayers[index]);
            gPlayers[index] = nullptr;
        }
        if (gVolumeTweens[index] != nullptr) {
            criAtomExTween_Destroy(gVolumeTweens[index]);
            gVolumeTweens[index] = nullptr;
        }
        std::free(gTweenWork[index]);
        gTweenWork[index] = nullptr;
        std::free(gPlayerWork[index]);
        gPlayerWork[index] = nullptr;
    }
    if (gWaveVoicePool != nullptr) {
        criAtomExVoicePool_Free(gWaveVoicePool);
        gWaveVoicePool = nullptr;
    }
    std::free(gWaveVoicePoolWork);
    gWaveVoicePoolWork = nullptr;
    if (gAdxVoicePool != nullptr) {
        criAtomExVoicePool_Free(gAdxVoicePool);
        gAdxVoicePool = nullptr;
    }
    std::free(gAdxVoicePoolWork);
    gAdxVoicePoolWork = nullptr;
    criAtomEx_Finalize_ANDROID();
    std::free(gAtomWork);
    gAtomWork = nullptr;
    gInitialized = false;
    return JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeShutdown(JNIEnv*, jclass) {
    {
        std::lock_guard<std::mutex> lock(gMutex);
        if (!gInitialized) return;
        for (int index = 0; index < kChannelCount; ++index) {
            gLoopEnabled[index] = false;
            if (gPlayers[index] != nullptr) criAtomExPlayer_Stop(gPlayers[index]);
        }
    }
    const auto stopDeadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(1000);
    while (std::chrono::steady_clock::now() < stopDeadline) {
        bool allStopped = true;
        {
            std::lock_guard<std::mutex> lock(gMutex);
            if (!gInitialized) return;
            for (int index = 0; index < kChannelCount; ++index) {
                if (gPlayers[index] != nullptr &&
                    criAtomExPlayer_GetStatus(gPlayers[index]) != CRIATOMEXPLAYER_STATUS_STOP) {
                    allStopped = false;
                    break;
                }
            }
        }
        if (allStopped) break;
        std::this_thread::sleep_for(std::chrono::milliseconds(4));
    }
    gServerRunning.store(false, std::memory_order_release);
    if (gServerThread.joinable()) gServerThread.join();
    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized) return;
    for (int index = 0; index < kChannelCount; ++index) {
        if (gPlayers[index] != nullptr) {
            criAtomExPlayer_Destroy(gPlayers[index]);
            gPlayers[index] = nullptr;
        }
        if (gVolumeTweens[index] != nullptr) {
            criAtomExTween_Destroy(gVolumeTweens[index]);
            gVolumeTweens[index] = nullptr;
        }
        std::free(gTweenWork[index]);
        gTweenWork[index] = nullptr;
        std::free(gPlayerWork[index]);
        gPlayerWork[index] = nullptr;
        gPlaybackIds[index] = CRIATOMEX_INVALID_PLAYBACK_ID;
        gLoopEnabled[index] = false;
    }
    if (gWaveVoicePool != nullptr) {
        criAtomExVoicePool_Free(gWaveVoicePool);
        gWaveVoicePool = nullptr;
    }
    std::free(gWaveVoicePoolWork);
    gWaveVoicePoolWork = nullptr;
    if (gAdxVoicePool != nullptr) {
        criAtomExVoicePool_Free(gAdxVoicePool);
        gAdxVoicePool = nullptr;
    }
    std::free(gAdxVoicePoolWork);
    gAdxVoicePoolWork = nullptr;
    criAtomEx_Finalize_ANDROID();
    std::free(gAtomWork);
    gAtomWork = nullptr;
    gInitialized = false;
    __android_log_print(ANDROID_LOG_INFO, kTag, "CRI ADX LE finalized");
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativePlayFile(
        JNIEnv* env, jclass, jint channel, jstring pathValue, jint format,
        jint numChannels, jint samplingRate, jfloat volume, jfloat fadeMultiplier, jboolean loop) {
    if (!validChannel(channel) || pathValue == nullptr ||
        (format != kFormatAdx && format != kFormatWave) ||
        numChannels < 1 || numChannels > 2 || samplingRate < 8000 || samplingRate > 192000) {
        __android_log_print(ANDROID_LOG_ERROR, kTag,
            "Rejected audio request: channel=%d format=%d channels=%d rate=%d",
            channel, format, numChannels, samplingRate);
        return JNI_FALSE;
    }
    const char* pathChars = env->GetStringUTFChars(pathValue, nullptr);
    if (pathChars == nullptr) return JNI_FALSE;
    const std::string path(pathChars);
    env->ReleaseStringUTFChars(pathValue, pathChars);
    {
        std::lock_guard<std::mutex> lock(gMutex);
        if (!gInitialized || gPlayers[channel] == nullptr) return JNI_FALSE;
        criAtomExPlayer_Stop(gPlayers[channel]);
    }
    bool stopped = false;
    const auto stopDeadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(1500);
    while (std::chrono::steady_clock::now() < stopDeadline) {
        {
            std::lock_guard<std::mutex> lock(gMutex);
            if (!gInitialized || gPlayers[channel] == nullptr) return JNI_FALSE;
            stopped = criAtomExPlayer_GetStatus(gPlayers[channel]) == CRIATOMEXPLAYER_STATUS_STOP;
        }
        if (stopped) break;
        std::this_thread::sleep_for(std::chrono::milliseconds(4));
    }
    if (!stopped) {
        std::lock_guard<std::mutex> lock(gMutex);
        const int status = gInitialized && gPlayers[channel] != nullptr
            ? static_cast<int>(criAtomExPlayer_GetStatus(gPlayers[channel])) : -1;
        __android_log_print(ANDROID_LOG_ERROR, kTag,
            "Timed out waiting for CRI player STOP before replacing stream: channel=%d status=%d path=%s",
            channel, status, path.c_str());
        return JNI_FALSE;
    }
    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized || gPlayers[channel] == nullptr) return JNI_FALSE;
    CriAtomExPlayerHn player = gPlayers[channel];
    criAtomExPlayer_SetFormat(player, format == kFormatAdx ? CRIATOMEX_FORMAT_ADX : CRIATOMEX_FORMAT_WAVE);
    criAtomExPlayer_SetNumChannels(player, numChannels);
    criAtomExPlayer_SetSamplingRate(player, samplingRate);
    const float clampedVolume = volume < 0.0f ? 0.0f : (volume > 1.0f ? 1.0f : volume);
    const float clampedFade = fadeMultiplier < 0.0f ? 0.0f : (fadeMultiplier > 1.0f ? 1.0f : fadeMultiplier);
    criAtomExPlayer_SetVolume(player, clampedVolume);
    // Tween volume multiplies the user's base channel volume.
    // Music and ambience start muted, then fade the Tween up after Start().
    if (gVolumeTweens[channel] != nullptr) {
        criAtomExTween_Stop(gVolumeTweens[channel]);
        criAtomExTween_MoveTo(gVolumeTweens[channel], 0, clampedFade);
    }
    // Data-request callbacks repeat caller-supplied SetData buffers, not SetFile streams.
    criAtomExPlayer_SetDataRequestCallback(player, nullptr, nullptr);
    criAtomExPlayer_SetFile(player, nullptr, path.c_str());
    gLoopEnabled[channel] = loop == JNI_TRUE;
    gLoopCycleCounts[channel] = 0;
    gPlaybackIds[channel] = criAtomExPlayer_Start(player);
    if (gPlaybackIds[channel] == CRIATOMEX_INVALID_PLAYBACK_ID) {
        gLoopEnabled[channel] = false;
        __android_log_print(ANDROID_LOG_ERROR, kTag,
            "CRI Start returned INVALID_PLAYBACK_ID: channel=%d format=%d channels=%d rate=%d path=%s",
            channel, format, numChannels, samplingRate, path.c_str());
        return JNI_FALSE;
    }
    // Apply the Tween's initial multiplier to the just-started PlaybackId.
    criAtomExPlayer_Update(player, gPlaybackIds[channel]);
    __android_log_print(ANDROID_LOG_INFO, kTag,
        "CRI stream started: channel=%d format=%d channels=%d rate=%d fade=%.3f loop=%d path=%s",
        channel, format, numChannels, samplingRate, clampedFade, loop == JNI_TRUE ? 1 : 0, path.c_str());
    return JNI_TRUE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeStop(JNIEnv*, jclass, jint channel) {
    if (!validChannel(channel)) return;
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialized && gPlayers[channel] != nullptr) {
        gLoopEnabled[channel] = false;
        criAtomExPlayer_Stop(gPlayers[channel]);
        gPlaybackIds[channel] = CRIATOMEX_INVALID_PLAYBACK_ID;
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativePause(JNIEnv*, jclass, jint channel, jboolean paused) {
    if (!validChannel(channel)) return;
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialized && gPlayers[channel] != nullptr) {
        criAtomExPlayer_Pause(gPlayers[channel], paused == JNI_TRUE ? CRI_TRUE : CRI_FALSE);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeSetVolume(JNIEnv*, jclass, jint channel, jfloat volume) {
    if (!validChannel(channel)) return;
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialized && gPlayers[channel] != nullptr) {
        const float clamped = volume < 0.0f ? 0.0f : (volume > 1.0f ? 1.0f : volume);
        criAtomExPlayer_SetVolume(gPlayers[channel], clamped);
        if (gPlaybackIds[channel] != CRIATOMEX_INVALID_PLAYBACK_ID) {
            criAtomExPlayer_Update(gPlayers[channel], gPlaybackIds[channel]);
        }
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeFadeVolume(
        JNIEnv*, jclass, jint channel, jint durationMs, jfloat volume) {
    if (!validChannel(channel)) return;
    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized || gPlayers[channel] == nullptr || gVolumeTweens[channel] == nullptr) return;
    const jint safeDuration = durationMs < 0 ? 0 : (durationMs > 65535 ? 65535 : durationMs);
    const float clamped = volume < 0.0f ? 0.0f : (volume > 1.0f ? 1.0f : volume);
    criAtomExTween_MoveTo(gVolumeTweens[channel], static_cast<CriUint16>(safeDuration), clamped);
    // CRI requires Player_Update (or UpdateAll) for Tween changes to affect
    // an already-playing voice; ExecuteMain alone is not this parameter commit.
    if (gPlaybackIds[channel] != CRIATOMEX_INVALID_PLAYBACK_ID) {
        criAtomExPlayer_Update(gPlayers[channel], gPlaybackIds[channel]);
    }
}

extern "C" JNIEXPORT jint JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeTakeLoopCycles(JNIEnv*, jclass, jint channel) {
    if (!validChannel(channel)) return 0;
    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized) return 0;
    const CriUint32 count = gLoopCycleCounts[channel];
    gLoopCycleCounts[channel] = 0;
    return count > 2147483647u ? 2147483647 : static_cast<jint>(count);
}

extern "C" JNIEXPORT jint JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeGetStatus(JNIEnv*, jclass, jint channel) {
    if (!validChannel(channel)) return 4;
    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized || gPlayers[channel] == nullptr) return 0;
    const CriAtomExPlayerStatus status = criAtomExPlayer_GetStatus(gPlayers[channel]);
    if (status == CRIATOMEXPLAYER_STATUS_PLAYEND && gLoopEnabled[channel]) {
        const CriAtomExPlaybackId restarted = criAtomExPlayer_Start(gPlayers[channel]);
        if (restarted != CRIATOMEX_INVALID_PLAYBACK_ID) {
            gPlaybackIds[channel] = restarted;
            ++gLoopCycleCounts[channel];
            return static_cast<jint>(CRIATOMEXPLAYER_STATUS_PREP);
        }
        gLoopEnabled[channel] = false;
        __android_log_print(ANDROID_LOG_ERROR, kTag, "CRI loop restart failed on channel %d", channel);
    } else if (status == CRIATOMEXPLAYER_STATUS_ERROR) {
        gLoopEnabled[channel] = false;
    }
    return static_cast<jint>(status);
}
