package com.merzkava.pocket.review;

import android.content.Context;
import android.database.Cursor;
import android.media.AudioFormat;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Locale;

/** Decodes user-selected sources to private PCM16 WAV files for CRI AtomEx. */
final class PocketAudioImporter {
    static final long MAX_SOURCE_BYTES = 64L * 1024L * 1024L;
    static final long MAX_PCM_BYTES = 256L * 1024L * 1024L;

    static final class Result {
        final boolean ok;
        final String title;
        final String sourceExtension;
        final String message;
        Result(boolean ok, String title, String sourceExtension, String message) {
            this.ok = ok;
            this.title = title;
            this.sourceExtension = sourceExtension;
            this.message = message;
        }
    }

    private PocketAudioImporter() {}

    /**
     * Keep user-supplied CRI ADX intact. It is decoded by PocketAdxDecoder on
     * first playback and then streamed by the same native CRI music player as
     * bundled BGM; Android MediaCodec is deliberately not involved.
     */
    static Result copyAdxSource(Context context, Uri uri, File temporaryAdx) {
        String displayName = queryDisplayName(context, uri);
        if (displayName.isEmpty()) displayName = "Untitled record.adx";
        String extension = extensionOf(displayName);
        String title = titleOf(displayName);
        if (!"adx".equals(extension)) {
            return new Result(false, title, extension, "Choose a CRI ADX music file.");
        }
        try (InputStream input = context.getContentResolver().openInputStream(uri);
             FileOutputStream output = new FileOutputStream(temporaryAdx)) {
            if (input == null) throw new IOException("The selected ADX file could not be opened.");
            byte[] buffer = new byte[32 * 1024];
            long copied = 0L;
            int count;
            while ((count = input.read(buffer)) != -1) {
                copied += count;
                if (copied > MAX_SOURCE_BYTES) {
                    throw new IllegalArgumentException("Source audio exceeds Pocket's 64 MB limit.");
                }
                output.write(buffer, 0, count);
            }
            output.getFD().sync();
        } catch (Exception error) {
            if (temporaryAdx.exists()) temporaryAdx.delete();
            String message = error.getMessage();
            return new Result(false, title, extension, message == null
                ? "Pocket could not copy the selected ADX file." : message);
        }

        try {
            PocketAdxDecoder.Metadata metadata = PocketAdxDecoder.inspect(temporaryAdx);
            if (metadata.channels < 1 || metadata.channels > 2 ||
                metadata.sampleRate < 8000 || metadata.sampleRate > 192000) {
                throw new IOException("Pocket supports mono or stereo ADX between 8 and 192 kHz.");
            }
            return new Result(true, title, "ADX",
                title + " has joined your Pocket record rack.");
        } catch (Exception error) {
            if (temporaryAdx.exists()) temporaryAdx.delete();
            String message = error.getMessage();
            return new Result(false, title, extension, message == null
                ? "The selected file is not a supported CRI ADX stream." : message);
        }
    }

    static Result decodeToWav(Context context, Uri uri, File temporaryWav) {
        MediaExtractor extractor = new MediaExtractor();
        MediaCodec decoder = null;
        RandomAccessFile wav = null;
        try {
            String displayName = queryDisplayName(context, uri);
            if (displayName.isEmpty()) displayName = "Untitled record.audio";
            String extension = extensionOf(displayName);
            String title = titleOf(displayName);
            if (extension.isEmpty()) {
                return new Result(false, title, "", "Choose an audio file with a recognized file extension.");
            }

            extractor.setDataSource(context, uri, null);
            int audioTrack = -1;
            MediaFormat sourceFormat = null;
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat candidate = extractor.getTrackFormat(i);
                String mime = candidate.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.toLowerCase(Locale.ROOT).startsWith("audio/")) {
                    audioTrack = i;
                    sourceFormat = candidate;
                    break;
                }
            }
            if (audioTrack < 0 || sourceFormat == null) {
                return new Result(false, title, extension, "This file does not contain a readable audio stream.");
            }
            String mime = sourceFormat.getString(MediaFormat.KEY_MIME);
            if (mime == null) return new Result(false, title, extension, "The audio codec could not be identified.");

            extractor.selectTrack(audioTrack);
            decoder = MediaCodec.createDecoderByType(mime);
            decoder.configure(sourceFormat, null, null, 0);
            decoder.start();

            wav = new RandomAccessFile(temporaryWav, "rw");
            wav.setLength(0);
            wav.write(new byte[44]);

            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            boolean inputDone = false;
            boolean outputDone = false;
            boolean outputFormatReady = false;
            int sampleRate = 0;
            int channels = 0;
            int pcmEncoding = AudioFormat.ENCODING_PCM_16BIT;
            long pcmBytes = 0;
            long sourceBytes = 0;

            while (!outputDone) {
                if (!inputDone) {
                    int inputIndex = decoder.dequeueInputBuffer(10_000);
                    if (inputIndex >= 0) {
                        ByteBuffer input = decoder.getInputBuffer(inputIndex);
                        if (input == null) throw new IllegalStateException("Audio decoder returned an empty input buffer.");
                        input.clear();
                        int size = extractor.readSampleData(input, 0);
                        if (size < 0) {
                            decoder.queueInputBuffer(inputIndex, 0, 0, 0,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM);
                            inputDone = true;
                        } else {
                            sourceBytes += size;
                            if (sourceBytes > MAX_SOURCE_BYTES) {
                                throw new IllegalArgumentException("Source audio exceeds Pocket's 64 MB limit.");
                            }
                            long pts = Math.max(0L, extractor.getSampleTime());
                            decoder.queueInputBuffer(inputIndex, 0, size, pts, 0);
                            extractor.advance();
                        }
                    }
                }

                int outputIndex = decoder.dequeueOutputBuffer(info, 10_000);
                if (outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    MediaFormat outputFormat = decoder.getOutputFormat();
                    sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                    channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                    if (Build.VERSION.SDK_INT >= 24 && outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                        pcmEncoding = outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
                    }
                    if (sampleRate < 8000 || sampleRate > 192000 || channels < 1 || channels > 2) {
                        throw new IllegalArgumentException("Pocket supports mono or stereo audio between 8 and 192 kHz.");
                    }
                    if (pcmEncoding != AudioFormat.ENCODING_PCM_16BIT &&
                        (Build.VERSION.SDK_INT < 24 || pcmEncoding != AudioFormat.ENCODING_PCM_FLOAT)) {
                        throw new IllegalArgumentException("This device decoded the file to an unsupported PCM format.");
                    }
                    outputFormatReady = true;
                } else if (outputIndex >= 0) {
                    ByteBuffer output = decoder.getOutputBuffer(outputIndex);
                    if (output != null && info.size > 0 &&
                        (info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
                        if (!outputFormatReady) {
                            MediaFormat outputFormat = decoder.getOutputFormat();
                            sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                            channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                            if (Build.VERSION.SDK_INT >= 24 && outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                                pcmEncoding = outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING);
                            }
                            if (sampleRate < 8000 || sampleRate > 192000 || channels < 1 || channels > 2) {
                                throw new IllegalArgumentException("Pocket supports mono or stereo audio between 8 and 192 kHz.");
                            }
                            outputFormatReady = true;
                        }
                        output.position(info.offset);
                        output.limit(info.offset + info.size);
                        ByteBuffer pcm = output.slice().order(ByteOrder.LITTLE_ENDIAN);
                        if (pcmEncoding == AudioFormat.ENCODING_PCM_16BIT) {
                            int byteCount = pcm.remaining();
                            pcmBytes += byteCount;
                            if (pcmBytes > MAX_PCM_BYTES) throw new IllegalArgumentException("Decoded music exceeds Pocket's 256 MB limit.");
                            byte[] chunk = new byte[byteCount];
                            pcm.get(chunk);
                            wav.write(chunk);
                        } else {
                            int sampleCount = pcm.remaining() / 4;
                            long byteCount = (long) sampleCount * 2L;
                            pcmBytes += byteCount;
                            if (pcmBytes > MAX_PCM_BYTES) throw new IllegalArgumentException("Decoded music exceeds Pocket's 256 MB limit.");
                            for (int i = 0; i < sampleCount; i++) {
                                float sample = pcm.getFloat();
                                if (Float.isNaN(sample) || Float.isInfinite(sample)) sample = 0f;
                                int value = Math.round(Math.max(-1f, Math.min(1f, sample)) * 32767f);
                                wav.write(value & 0xff);
                                wav.write((value >>> 8) & 0xff);
                            }
                        }
                    }
                    if ((info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) outputDone = true;
                    decoder.releaseOutputBuffer(outputIndex, false);
                }
            }

            if (pcmBytes < 64 || sampleRate <= 0 || channels <= 0) {
                throw new IllegalArgumentException("The selected file did not produce a valid PCM audio stream.");
            }
            writeWavHeader(wav, sampleRate, channels, pcmBytes);
            wav.getFD().sync();
            return new Result(true, title, extension, title + " has joined your Pocket record rack.");
        } catch (Exception error) {
            if (temporaryWav.exists()) temporaryWav.delete();
            String message = error.getMessage();
            return new Result(false, "Untitled record", "", message == null
                ? "Pocket could not decode this audio file on the current device."
                : message);
        } finally {
            if (decoder != null) {
                try { decoder.stop(); } catch (Exception ignored) {}
                try { decoder.release(); } catch (Exception ignored) {}
            }
            try { extractor.release(); } catch (Exception ignored) {}
            if (wav != null) {
                try { wav.close(); } catch (Exception ignored) {}
            }
        }
    }

    private static void writeWavHeader(RandomAccessFile file, int sampleRate, int channels, long dataBytes) throws Exception {
        long byteRate = (long) sampleRate * channels * 2L;
        long riffSize = 36L + dataBytes;
        if (riffSize > 0xffffffffL || dataBytes > 0xffffffffL || byteRate > 0xffffffffL) {
            throw new IllegalArgumentException("The decoded audio is too large for a standard WAV record.");
        }
        file.seek(0);
        file.writeBytes("RIFF");
        writeLe32(file, riffSize);
        file.writeBytes("WAVE");
        file.writeBytes("fmt ");
        writeLe32(file, 16);
        writeLe16(file, 1);
        writeLe16(file, channels);
        writeLe32(file, sampleRate);
        writeLe32(file, byteRate);
        writeLe16(file, channels * 2);
        writeLe16(file, 16);
        file.writeBytes("data");
        writeLe32(file, dataBytes);
    }

    private static void writeLe16(RandomAccessFile file, long value) throws Exception {
        file.write((int) (value & 0xff));
        file.write((int) ((value >>> 8) & 0xff));
    }

    private static void writeLe32(RandomAccessFile file, long value) throws Exception {
        file.write((int) (value & 0xff));
        file.write((int) ((value >>> 8) & 0xff));
        file.write((int) ((value >>> 16) & 0xff));
        file.write((int) ((value >>> 24) & 0xff));
    }

    static String queryDisplayName(Context context, Uri uri) {
        try (Cursor cursor = context.getContentResolver().query(uri,
                new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (column >= 0) {
                    String name = cursor.getString(column);
                    if (name != null && !name.trim().isEmpty()) return name.trim();
                }
            }
        } catch (Exception ignored) {}
        String segment = uri == null ? "" : uri.getLastPathSegment();
        return segment == null ? "" : segment;
    }

    private static String extensionOf(String name) {
        int dot = name == null ? -1 : name.lastIndexOf('.');
        return dot <= 0 || dot >= name.length() - 1 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String titleOf(String name) {
        int dot = name == null ? -1 : name.lastIndexOf('.');
        String raw = dot > 0 ? name.substring(0, dot) : (name == null ? "" : name);
        StringBuilder safe = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char ch = raw.charAt(i);
            if (ch == '/' || ch == 92 || ch == ':' || ch == '*' || ch == '?' ||
                ch == '"' || ch == '<' || ch == '>' || ch == '|' || Character.isISOControl(ch)) {
                safe.append(' ');
            } else safe.append(ch);
        }
        String value = safe.toString().trim();
        return value.isEmpty() ? "Untitled record" : value.substring(0, Math.min(80, value.length()));
    }
}
