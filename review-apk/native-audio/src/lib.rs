use jni::objects::{GlobalRef, JClass, JObject, JString};
use jni::sys::{jboolean, jint, jstring, JNI_FALSE, JNI_TRUE};
use jni::JNIEnv;
use oxiaudio::{decode_stream_with_block_size, AudioBuffer, OxiAudioError};
use oxisound::{AudioDevice, CpalCallbackOutputStream, CpalDevice, SampleFormat, StreamConfig};
use ringbuf::{traits::{Consumer, Producer, Split}, HeapRb};
use serde_json::json;
use std::fs::File;
use std::io::BufReader;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

const DECODE_BLOCK_FRAMES: usize = 2048;
const RING_CAPACITY_SAMPLES: usize = 262_144;
const FADE_IN_SECONDS: f32 = 2.2;

static ANDROID_CONTEXT: OnceLock<GlobalRef> = OnceLock::new();
static COMMAND_TX: OnceLock<mpsc::Sender<Command>> = OnceLock::new();
static PLAYER_STATE: OnceLock<Arc<Mutex<PlayerSnapshot>>> = OnceLock::new();
static CYCLE_COUNT: AtomicU32 = AtomicU32::new(0);
static NEXT_GENERATION: AtomicU64 = AtomicU64::new(0);

#[derive(Clone)]
struct PlayerSnapshot {
    playing: bool,
    preparing: bool,
    error: String,
    track_id: String,
    user_paused: bool,
    volume: u8,
    generation: u64,
}

impl Default for PlayerSnapshot {
    fn default() -> Self {
        Self {
            playing: false,
            preparing: false,
            error: String::new(),
            track_id: String::new(),
            user_paused: false,
            volume: 68,
            generation: 0,
        }
    }
}

enum Command {
    Play { generation: u64, track_id: String, path: String, volume: u8 },
    Pause { generation: u64, user_pause: bool },
    Stop { generation: u64 },
    Volume(u8),
}

struct ActivePlayback {
    generation: u64,
    track_id: String,
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    volume_bits: Arc<AtomicU32>,
    stream: CpalCallbackOutputStream,
}

fn state() -> Arc<Mutex<PlayerSnapshot>> {
    Arc::clone(PLAYER_STATE.get_or_init(|| Arc::new(Mutex::new(PlayerSnapshot::default()))))
}

fn set_state(update: impl FnOnce(&mut PlayerSnapshot)) {
    if let Ok(mut snapshot) = state().lock() {
        update(&mut snapshot);
    }
}

fn is_current_generation(state_ref: &Arc<Mutex<PlayerSnapshot>>, generation: u64) -> bool {
    state_ref.lock().map(|snapshot| snapshot.generation == generation).unwrap_or(false)
}

fn set_decoder_error(
    state_ref: &Arc<Mutex<PlayerSnapshot>>,
    generation: u64,
    track_id: &str,
    message: String,
) {
    if let Ok(mut snapshot) = state_ref.lock() {
        if snapshot.generation == generation && snapshot.track_id == track_id {
            snapshot.playing = false;
            snapshot.preparing = false;
            snapshot.error = message;
        }
    }
}

fn command_sender() -> Option<mpsc::Sender<Command>> {
    COMMAND_TX.get().cloned()
}

fn start_manager() {
    COMMAND_TX.get_or_init(|| {
        let (tx, rx) = mpsc::channel::<Command>();
        let shared_state = state();
        let _ = thread::Builder::new()
            .name("pocket-oxi-audio-manager".into())
            .spawn(move || manager_loop(rx, shared_state));
        tx
    });
}

fn send_command(command: Command) -> bool {
    command_sender().map(|tx| tx.send(command).is_ok()).unwrap_or(false)
}

fn open_stream(path: &str) -> Result<impl Iterator<Item = Result<AudioBuffer<f32>, OxiAudioError>>, String> {
    let file = File::open(path).map_err(|error| format!("Cannot open audio file: {error}"))?;
    Ok(decode_stream_with_block_size(BufReader::new(file), DECODE_BLOCK_FRAMES))
}

fn push_stereo_buffer<P: Producer<Item = f32>>(
    producer: &mut P,
    buffer: &AudioBuffer<f32>,
    stop: &AtomicBool,
    fade_frames: &mut u64,
) -> bool {
    let channel_count = buffer.channels.channel_count();
    if channel_count == 0 || buffer.sample_rate == 0 {
        return false;
    }

    let frame_count = buffer.samples.len() / channel_count;
    let fade_length = (buffer.sample_rate as f32 * FADE_IN_SECONDS).max(1.0) as u64;

    for frame in 0..frame_count {
        if stop.load(Ordering::Relaxed) {
            return false;
        }

        let offset = frame * channel_count;
        let left;
        let right;

        if channel_count == 1 {
            left = buffer.samples[offset];
            right = left;
        } else if channel_count == 2 {
            left = buffer.samples[offset];
            right = buffer.samples[offset + 1];
        } else {
            let center = buffer.samples[offset + 2] * 0.707;
            let surround_left = if channel_count >= 5 { buffer.samples[offset + channel_count - 2] * 0.5 } else { 0.0 };
            let surround_right = if channel_count >= 6 { buffer.samples[offset + channel_count - 1] * 0.5 } else { 0.0 };
            left = (buffer.samples[offset] + center + surround_left) * 0.707;
            right = (buffer.samples[offset + 1] + center + surround_right) * 0.707;
        }

        *fade_frames = (*fade_frames).saturating_add(1);
        let fade = (*fade_frames as f32 / fade_length as f32).min(1.0);
        let stereo = [left * fade, right * fade];

        for sample in stereo {
            let mut pending = sample.clamp(-1.0, 1.0);
            loop {
                if stop.load(Ordering::Relaxed) {
                    return false;
                }
                match producer.try_push(pending) {
                    Ok(()) => break,
                    Err(value) => {
                        pending = value;
                        thread::sleep(Duration::from_millis(2));
                    }
                }
            }
        }
    }
    true
}

fn start_decoder_worker(
    path: String,
    track_id: String,
    generation: u64,
    mut producer: impl Producer<Item = f32> + Send + 'static,
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    state_ref: Arc<Mutex<PlayerSnapshot>>,
) -> Result<u32, String> {
    let (ready_tx, ready_rx) = mpsc::sync_channel::<Result<u32, String>>(1);

    thread::Builder::new()
        .name("pocket-oxi-audio-decoder".into())
        .spawn(move || {
            let mut stream = match open_stream(&path) {
                Ok(stream) => stream,
                Err(error) => {
                    let _ = ready_tx.send(Err(error.clone()));
                    set_decoder_error(&state_ref, generation, &track_id, error);
                    return;
                }
            };

            let first = match stream.next() {
                Some(Ok(buffer)) if !buffer.samples.is_empty() => buffer,
                Some(Ok(_)) | None => {
                    let error = "The selected audio file contains no decodable audio frames.".to_string();
                    let _ = ready_tx.send(Err(error.clone()));
                    set_decoder_error(&state_ref, generation, &track_id, error);
                    return;
                }
                Some(Err(error)) => {
                    let message = format!("OxiAudio could not decode the selected file: {error}");
                    let _ = ready_tx.send(Err(message.clone()));
                    set_decoder_error(&state_ref, generation, &track_id, message);
                    return;
                }
            };

            let sample_rate = first.sample_rate.max(8_000);
            let mut fade_frames = 0_u64;
            if !push_stereo_buffer(&mut producer, &first, &stop, &mut fade_frames) {
                let _ = ready_tx.send(Err("Audio decoder stopped before the first audio block.".into()));
                return;
            }
            let _ = ready_tx.send(Ok(sample_rate));

            loop {
                if stop.load(Ordering::Relaxed) {
                    break;
                }
                if paused.load(Ordering::Relaxed) {
                    thread::sleep(Duration::from_millis(10));
                    continue;
                }

                match stream.next() {
                    Some(Ok(buffer)) => {
                        if !push_stereo_buffer(&mut producer, &buffer, &stop, &mut fade_frames) {
                            break;
                        }
                    }
                    Some(Err(error)) => {
                        let message = format!("OxiAudio decode error: {error}");
                        set_decoder_error(&state_ref, generation, &track_id, message);
                        stop.store(true, Ordering::Relaxed);
                        break;
                    }
                    None => {
                        if stop.load(Ordering::Relaxed) {
                            break;
                        }
                        if !is_current_generation(&state_ref, generation) {
                            break;
                        }
                        CYCLE_COUNT.fetch_add(1, Ordering::Relaxed);
                        fade_frames = 0;
                        stream = match open_stream(&path) {
                            Ok(next) => next,
                            Err(error) => {
                                set_decoder_error(&state_ref, generation, &track_id, error);
                                stop.store(true, Ordering::Relaxed);
                                break;
                            }
                        };
                        match stream.next() {
                            Some(Ok(buffer)) if !buffer.samples.is_empty() => {
                                if !push_stereo_buffer(&mut producer, &buffer, &stop, &mut fade_frames) {
                                    break;
                                }
                            }
                            Some(Err(error)) => {
                                set_decoder_error(&state_ref, generation, &track_id, format!("OxiAudio repeat decode error: {error}"));
                                stop.store(true, Ordering::Relaxed);
                                break;
                            }
                            Some(Ok(_)) | None => {
                                set_decoder_error(&state_ref, generation, &track_id, "The audio file ended without a repeatable audio block.".into());
                                stop.store(true, Ordering::Relaxed);
                                break;
                            }
                        }
                    }
                }
            }
        })
        .map_err(|error| format!("Could not create the OxiAudio decoder thread: {error}"))?;

    ready_rx
        .recv_timeout(Duration::from_secs(12))
        .map_err(|_| "OxiAudio did not produce the first decoded audio block within 12 seconds.".to_string())?
}

fn stop_active(active: &mut Option<ActivePlayback>) {
    if let Some(current) = active.take() {
        current.stop.store(true, Ordering::Relaxed);
        let _ = current.stream.pause();
    }
}

fn start_playback(
    active: &mut Option<ActivePlayback>,
    generation: u64,
    track_id: String,
    path: String,
    volume: u8,
    state_ref: &Arc<Mutex<PlayerSnapshot>>,
) {
    if !is_current_generation(state_ref, generation) {
        return;
    }
    if let Some(current) = active.as_mut() {
        if current.track_id == track_id && !current.stop.load(Ordering::Relaxed) && !current.stream.is_disconnected() {
            current.generation = generation;
            current.volume_bits.store((volume as f32 / 100.0).to_bits(), Ordering::Relaxed);
            if current.stream.resume().is_ok() {
                current.paused.store(false, Ordering::Relaxed);
                if let Ok(mut snapshot) = state_ref.lock() {
                    if snapshot.generation != generation {
                        current.paused.store(true, Ordering::Relaxed);
                        let _ = current.stream.pause();
                        return;
                    }
                    snapshot.playing = true;
                    snapshot.preparing = false;
                    snapshot.error.clear();
                    snapshot.user_paused = false;
                    snapshot.volume = volume;
                }
                return;
            }
        }
    }

    stop_active(active);
    CYCLE_COUNT.store(0, Ordering::Relaxed);
    if let Ok(mut snapshot) = state_ref.lock() {
        if snapshot.generation != generation {
            return;
        }
        snapshot.playing = false;
        snapshot.preparing = true;
        snapshot.error.clear();
        snapshot.track_id = track_id.clone();
        snapshot.user_paused = false;
        snapshot.volume = volume;
        snapshot.generation = generation;
    }

    let stop = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    let volume_bits = Arc::new(AtomicU32::new((volume as f32 / 100.0).to_bits()));
    let ring = HeapRb::<f32>::new(RING_CAPACITY_SAMPLES);
    let (producer, mut consumer) = ring.split();

    let sample_rate = match start_decoder_worker(
        path,
        track_id.clone(),
        generation,
        producer,
        Arc::clone(&stop),
        Arc::clone(&paused),
        Arc::clone(state_ref),
    ) {
        Ok(rate) => rate,
        Err(error) => {
            if let Ok(mut snapshot) = state_ref.lock() {
                if snapshot.generation == generation {
                snapshot.playing = false;
                snapshot.preparing = false;
                snapshot.error = error;
                }
            }
            stop.store(true, Ordering::Relaxed);
            return;
        }
    };

    if !is_current_generation(state_ref, generation) || stop.load(Ordering::Relaxed) {
        stop.store(true, Ordering::Relaxed);
        return;
    }

    let callback_volume = Arc::clone(&volume_bits);
    let callback_paused = Arc::clone(&paused);
    let output_config = StreamConfig::builder()
        .sample_rate(sample_rate)
        .channels(2)
        .sample_format(SampleFormat::F32)
        .buffer_capacity_secs(1.5)
        .build();

    let mut smoothed_gain = 0.0_f32;
    let stream = match CpalDevice::default_output()
        .and_then(|device| device.open_output_callback(output_config, move |output| {
            for sample in output.iter_mut() {
                if callback_paused.load(Ordering::Relaxed) {
                    *sample = 0.0;
                    continue;
                }
                let target = f32::from_bits(callback_volume.load(Ordering::Relaxed));
                smoothed_gain += (target - smoothed_gain) * 0.0008;
                *sample = consumer.try_pop().unwrap_or(0.0) * smoothed_gain;
            }
        })) {
        Ok(stream) => stream,
        Err(error) => {
            stop.store(true, Ordering::Relaxed);
            if let Ok(mut snapshot) = state_ref.lock() {
                if snapshot.generation == generation {
                    snapshot.playing = false;
                    snapshot.preparing = false;
                    snapshot.error = format!("OxiSound could not open the Android audio output: {error}");
                }
            }
            return;
        }
    };

    if stop.load(Ordering::Relaxed) || !is_current_generation(state_ref, generation) {
        stop.store(true, Ordering::Relaxed);
        let _ = stream.pause();
        if let Ok(mut snapshot) = state_ref.lock() {
            if snapshot.generation == generation {
                if snapshot.error.is_empty() {
                    snapshot.error = "The audio decoder stopped before playback became ready.".into();
                }
                snapshot.playing = false;
                snapshot.preparing = false;
            }
        }
        return;
    }

    if let Ok(mut snapshot) = state_ref.lock() {
        if snapshot.generation != generation {
            stop.store(true, Ordering::Relaxed);
            let _ = stream.pause();
            return;
        }
        snapshot.playing = true;
        snapshot.preparing = false;
        snapshot.error.clear();
        snapshot.track_id = track_id.clone();
        snapshot.user_paused = false;
        snapshot.volume = volume;
    }

    *active = Some(ActivePlayback {
        generation,
        track_id,
        stop,
        paused,
        volume_bits,
        stream,
    });
}

fn manager_loop(receiver: mpsc::Receiver<Command>, state_ref: Arc<Mutex<PlayerSnapshot>>) {
    let mut active: Option<ActivePlayback> = None;
    loop {
        match receiver.recv_timeout(Duration::from_millis(250)) {
            Ok(Command::Play { generation, track_id, path, volume }) => {
                start_playback(&mut active, generation, track_id, path, volume, &state_ref);
            }
            Ok(Command::Pause { generation, user_pause }) => {
                if !is_current_generation(&state_ref, generation) {
                    continue;
                }
                if let Some(current) = active.as_mut() {
                    current.generation = generation;
                    current.paused.store(true, Ordering::Relaxed);
                    let _ = current.stream.pause();
                }
                if let Ok(mut snapshot) = state_ref.lock() {
                    snapshot.playing = false;
                    snapshot.preparing = false;
                    snapshot.user_paused = user_pause;
                }
            }
            Ok(Command::Volume(volume)) => {
                if let Some(current) = active.as_ref() {
                    current.volume_bits.store((volume as f32 / 100.0).to_bits(), Ordering::Relaxed);
                }
                if let Ok(mut snapshot) = state_ref.lock() {
                    snapshot.volume = volume;
                }
            }
            Ok(Command::Stop { generation }) => {
                if !is_current_generation(&state_ref, generation) {
                    continue;
                }
                stop_active(&mut active);
                CYCLE_COUNT.store(0, Ordering::Relaxed);
                if let Ok(mut snapshot) = state_ref.lock() {
                    *snapshot = PlayerSnapshot { generation, ..PlayerSnapshot::default() };
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                let active_generation = active.as_ref().map(|current| current.generation);
                let (failed, generation_is_current) = state_ref.lock()
                    .map(|snapshot| {
                        let matches = active_generation == Some(snapshot.generation);
                        (matches && !snapshot.error.is_empty(), matches)
                    })
                    .unwrap_or((false, false));
                let disconnected = active.as_ref()
                    .map(|current| current.stream.is_disconnected())
                    .unwrap_or(false);
                if failed || (disconnected && generation_is_current) {
                    if disconnected && !failed {
                        if let Ok(mut snapshot) = state_ref.lock() {
                            if active_generation == Some(snapshot.generation) {
                                snapshot.playing = false;
                                snapshot.preparing = false;
                                snapshot.error = "The Android audio output disconnected. Restart the selected record.".into();
                            }
                        }
                    }
                    stop_active(&mut active);
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                stop_active(&mut active);
                break;
            }
        }
    }
}

fn initialize_runtime(env: &mut JNIEnv<'_>, context: JObject<'_>) -> bool {
    if ANDROID_CONTEXT.get().is_none() {
        let global = match env.new_global_ref(context) {
            Ok(global) => global,
            Err(_) => return false,
        };
        let vm = match env.get_java_vm() {
            Ok(vm) => vm,
            Err(_) => return false,
        };
        let vm_ptr = vm.get_java_vm_pointer();
        let context_ptr = global.as_obj().as_raw();
        unsafe {
            ndk_context::initialize_android_context(vm_ptr.cast(), context_ptr.cast());
        }
        if ANDROID_CONTEXT.set(global).is_err() {
            return false;
        }
    }
    start_manager();
    true
}

#[no_mangle]
pub extern "system" fn Java_com_merzkava_pocket_review_PocketMediaPlaybackService_nativeInitialize(
    mut env: JNIEnv<'_>,
    _class: JClass<'_>,
    context: JObject<'_>,
) -> jboolean {
    if initialize_runtime(&mut env, context) { JNI_TRUE } else { JNI_FALSE }
}

#[no_mangle]
pub extern "system" fn Java_com_merzkava_pocket_review_PocketMediaPlaybackService_nativeStart(
    mut env: JNIEnv<'_>,
    _class: JClass<'_>,
    track_id: JString<'_>,
    path: JString<'_>,
    volume: jint,
) -> jboolean {
    let track_id: String = match env.get_string(&track_id) {
        Ok(value) => value.into(),
        Err(_) => return JNI_FALSE,
    };
    let path: String = match env.get_string(&path) {
        Ok(value) => value.into(),
        Err(_) => return JNI_FALSE,
    };
    if track_id.is_empty() || path.is_empty() {
        return JNI_FALSE;
    }
    let volume = volume.clamp(0, 100) as u8;
    let generation = NEXT_GENERATION.fetch_add(1, Ordering::Relaxed).saturating_add(1);
    set_state(|snapshot| {
        snapshot.generation = generation;
        snapshot.playing = false;
        snapshot.preparing = true;
        snapshot.error.clear();
        snapshot.track_id = track_id.clone();
        snapshot.user_paused = false;
        snapshot.volume = volume;
    });
    if send_command(Command::Play { generation, track_id, path, volume }) { JNI_TRUE } else { JNI_FALSE }
}

#[no_mangle]
pub extern "system" fn Java_com_merzkava_pocket_review_PocketMediaPlaybackService_nativePause(
    _env: JNIEnv<'_>,
    _class: JClass<'_>,
    user_pause: jboolean,
) {
    let user_pause = user_pause == JNI_TRUE;
    let generation = NEXT_GENERATION.fetch_add(1, Ordering::Relaxed).saturating_add(1);
    set_state(|snapshot| {
        snapshot.generation = generation;
        snapshot.playing = false;
        snapshot.preparing = false;
        snapshot.user_paused = user_pause;
    });
    let _ = send_command(Command::Pause { generation, user_pause });
}

#[no_mangle]
pub extern "system" fn Java_com_merzkava_pocket_review_PocketMediaPlaybackService_nativeStop(
    _env: JNIEnv<'_>,
    _class: JClass<'_>,
) {
    let generation = NEXT_GENERATION.fetch_add(1, Ordering::Relaxed).saturating_add(1);
    set_state(|snapshot| {
        *snapshot = PlayerSnapshot { generation, ..PlayerSnapshot::default() };
    });
    let _ = send_command(Command::Stop { generation });
}

#[no_mangle]
pub extern "system" fn Java_com_merzkava_pocket_review_PocketMediaPlaybackService_nativeSetVolume(
    _env: JNIEnv<'_>,
    _class: JClass<'_>,
    volume: jint,
) {
    let volume = volume.clamp(0, 100) as u8;
    let _ = send_command(Command::Volume(volume));
}

#[no_mangle]
pub extern "system" fn Java_com_merzkava_pocket_review_PocketMediaPlaybackService_nativeGetState(
    mut env: JNIEnv<'_>,
    _class: JClass<'_>,
) -> jstring {
    let snapshot = state();
    let json_text = if let Ok(snapshot) = snapshot.lock() {
        json!({
            "playing": snapshot.playing,
            "preparing": snapshot.preparing,
            "error": snapshot.error,
            "trackId": snapshot.track_id,
            "cycleCount": CYCLE_COUNT.load(Ordering::Relaxed),
            "userPaused": snapshot.user_paused,
            "volume": snapshot.volume,
            "generation": snapshot.generation
        }).to_string()
    } else {
        json!({"playing":false,"preparing":false,"error":"Native audio state is unavailable.","trackId":"","cycleCount":0,"userPaused":false,"volume":68,"generation":0}).to_string()
    };
    env.new_string(json_text).map(|value| value.into_raw()).unwrap_or(std::ptr::null_mut())
}
