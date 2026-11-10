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
CriAtomExPlayerHn gPlayers[kChannelCount] = {nullptr, nullptr, nullptr, nullptr};
void* gPlayerWork[kChannelCount] = {nullptr, nullptr, nullptr, nullptr};
CriAtomExPlaybackId gPlaybackIds[kChannelCount] = {
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID,
    CRIATOMEX_INVALID_PLAYBACK_ID
};

void CRIAPI repeatPreviousData(void*, CriAtomExPlaybackId, CriAtomPlayerHn player) {
    if (player != nullptr) {
        criAtomPlayer_SetPreviousDataAgain(player);
    }
}

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
    std::memset(&config, 0, sizeof(config));
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
        gPlayerWork[index] = std::calloc(1, static_cast<size_t>(playerWorkSize));
        if (gPlayerWork[index] == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not allocate player work (%d)", index);
            goto fail;
        }
        gPlayers[index] = criAtomExPlayer_Create(&playerConfig, gPlayerWork[index], playerWorkSize);
        if (gPlayers[index] == nullptr) {
            __android_log_print(ANDROID_LOG_ERROR, kTag, "Could not create CRI player (%d)", index);
            goto fail;
        }
    }

    // CRI's default Android thread model is timer-driven MULTI. Even in that
    // mode ExecuteMain must be called periodically to advance server-side
    // bookkeeping (including player status and file-system completion).
    gServerRunning.store(true, std::memory_order_release);
    gServerThread = std::thread([]() {
        while (gServerRunning.load(std::memory_order_acquire)) {
            {
                std::lock_guard<std::mutex> serverLock(gMutex);
                if (gInitialized) {
                    criAtomEx_ExecuteMain();
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    });

    __android_log_print(ANDROID_LOG_INFO, kTag, "CRI ADX LE initialized with four isolated players and a 10 Hz server pump");
    return JNI_TRUE;

fail:
    for (int index = 0; index < kChannelCount; ++index) {
        if (gPlayers[index] != nullptr) {
            criAtomExPlayer_Destroy(gPlayers[index]);
            gPlayers[index] = nullptr;
        }
        std::free(gPlayerWork[index]);
        gPlayerWork[index] = nullptr;
    }
    criAtomEx_Finalize_ANDROID();
    std::free(gAtomWork);
    gAtomWork = nullptr;
    gInitialized = false;
    return JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeShutdown(JNIEnv*, jclass) {
    std::unique_lock<std::mutex> lock(gMutex);
    if (!gInitialized) return;

    // Stop and join the server pump outside the CRI mutex so it can finish
    // an in-flight ExecuteMain call before players and AtomEx are destroyed.
    gServerRunning.store(false, std::memory_order_release);
    lock.unlock();
    if (gServerThread.joinable()) gServerThread.join();
    lock.lock();

    for (int index = 0; index < kChannelCount; ++index) {
        if (gPlayers[index] != nullptr) {
            criAtomExPlayer_Stop(gPlayers[index]);
            criAtomExPlayer_Destroy(gPlayers[index]);
            gPlayers[index] = nullptr;
        }
        std::free(gPlayerWork[index]);
        gPlayerWork[index] = nullptr;
        gPlaybackIds[index] = CRIATOMEX_INVALID_PLAYBACK_ID;
    }
    criAtomEx_Finalize_ANDROID();
    std::free(gAtomWork);
    gAtomWork = nullptr;
    gInitialized = false;
    __android_log_print(ANDROID_LOG_INFO, kTag, "CRI ADX LE finalized");
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativePlayFile(
        JNIEnv* env, jclass, jint channel, jstring pathValue, jint format, jfloat volume, jboolean loop) {
    if (!validChannel(channel) || pathValue == nullptr) return JNI_FALSE;
    const char* pathChars = env->GetStringUTFChars(pathValue, nullptr);
    if (pathChars == nullptr) return JNI_FALSE;
    const std::string path(pathChars);
    env->ReleaseStringUTFChars(pathValue, pathChars);

    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized || gPlayers[channel] == nullptr) return JNI_FALSE;
    if (format != kFormatAdx && format != kFormatWave) return JNI_FALSE;

    CriAtomExPlayerHn player = gPlayers[channel];
    criAtomExPlayer_Stop(player);
    criAtomExPlayer_SetDataRequestCallback(player, loop == JNI_TRUE ? repeatPreviousData : nullptr, nullptr);
    criAtomExPlayer_SetFormat(player, format == kFormatAdx ? CRIATOMEX_FORMAT_ADX : CRIATOMEX_FORMAT_WAVE);
    criAtomExPlayer_SetVolume(player, volume < 0.0f ? 0.0f : (volume > 1.0f ? 1.0f : volume));
    criAtomExPlayer_SetFile(player, nullptr, path.c_str());
    gPlaybackIds[channel] = criAtomExPlayer_Start(player);
    return gPlaybackIds[channel] != CRIATOMEX_INVALID_PLAYBACK_ID ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeStop(JNIEnv*, jclass, jint channel) {
    if (!validChannel(channel)) return;
    std::lock_guard<std::mutex> lock(gMutex);
    if (gInitialized && gPlayers[channel] != nullptr) {
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

extern "C" JNIEXPORT jint JNICALL
Java_com_merzkava_pocket_review_PocketCriAudioRuntime_nativeGetStatus(JNIEnv*, jclass, jint channel) {
    if (!validChannel(channel)) return 4;
    std::lock_guard<std::mutex> lock(gMutex);
    if (!gInitialized || gPlayers[channel] == nullptr) return 0;
    return static_cast<jint>(criAtomExPlayer_GetStatus(gPlayers[channel]));
}
