package com.merzkava.pocket.review;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;

/**
 * Small streaming CRI ADX (encoding type 3) decoder.
 *
 * Converts the ADPCM stream to a canonical PCM16 RIFF/WAVE file before Pocket
 * hands it to CRI AtomEx. The implementation follows the public ADX block
 * layout: 18 bytes per channel block, 32 samples per block, high nibble first,
 * and a two-sample fixed-point predictor with 12 fractional bits.
 *
 * This class is intentionally independent of Android APIs so it can be
 * compiled and exercised by the repair-test workflow on a plain JDK.
 */
public final class PocketAdxDecoder {
    private static final int BLOCK_BYTES = 18;
    private static final int BLOCK_SAMPLES = 32;
    private static final long MAX_PCM_BYTES = 256L * 1024L * 1024L;
    private static final String COPYRIGHT_TAG = "(c)CRI";

    public static final class Metadata {
        public final int sampleRate;
        public final int channels;
        public final long sampleCount;

        Metadata(int sampleRate, int channels, long sampleCount) {
            this.sampleRate = sampleRate;
            this.channels = channels;
            this.sampleCount = sampleCount;
        }

        public double durationSeconds() {
            return sampleRate <= 0 ? 0.0 : sampleCount / (double) sampleRate;
        }
    }

    private static final class Header {
        final int sampleRate;
        final int channels;
        final long sampleCount;
        final int cutoff;
        final int dataStart;

        Header(int sampleRate, int channels, long sampleCount, int cutoff, int dataStart) {
            this.sampleRate = sampleRate;
            this.channels = channels;
            this.sampleCount = sampleCount;
            this.cutoff = cutoff;
            this.dataStart = dataStart;
        }
    }

    private PocketAdxDecoder() {}

    public static Metadata inspect(File source) throws IOException {
        if (source == null || !source.isFile()) {
            throw new IOException("The ADX source file is missing.");
        }
        try (RandomAccessFile input = new RandomAccessFile(source, "r")) {
            Header header = readHeader(input);
            return new Metadata(header.sampleRate, header.channels, header.sampleCount);
        }
    }

    /**
     * Decode one ADX file to a 16-bit signed PCM WAV, preserving its native
     * sample rate and channel count. A temporary file is used so a failed
     * decode never leaves a partial cache file behind.
     */
    public static Metadata decodeToWav(File source, File destination) throws IOException {
        if (source == null || !source.isFile()) {
            throw new IOException("The ADX source file is missing.");
        }
        if (destination == null) {
            throw new IOException("The PCM WAV destination is missing.");
        }
        File parent = destination.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
            throw new IOException("Could not create the decoded-audio cache directory.");
        }

        File temporary = new File(destination.getAbsolutePath() + ".tmp");
        if (temporary.exists() && !temporary.delete()) {
            throw new IOException("Could not clear the previous temporary WAV.");
        }

        Metadata result;
        try (RandomAccessFile input = new RandomAccessFile(source, "r");
             RandomAccessFile output = new RandomAccessFile(temporary, "rw")) {
            Header header = readHeader(input);
            long expectedPcmBytes = header.sampleCount * header.channels * 2L;
            if (expectedPcmBytes <= 0L || expectedPcmBytes > MAX_PCM_BYTES ||
                expectedPcmBytes + 44L > 0xffffffffL) {
                throw new IOException("The decoded PCM audio exceeds Pocket's 256 MB cache limit.");
            }

            output.setLength(0L);
            output.write(new byte[44]);

            final int[] coefficient = calculateCoefficients(header.cutoff, header.sampleRate);
            final int[] history1 = new int[header.channels];
            final int[] history2 = new int[header.channels];
            final int[][] decodedBlock = new int[header.channels][BLOCK_SAMPLES];
            final byte[] compressedBlock = new byte[BLOCK_BYTES - 2];
            final byte[] pcmChunk = new byte[BLOCK_SAMPLES * header.channels * 2];

            long decodedSamples = 0L;
            long groups = (header.sampleCount + BLOCK_SAMPLES - 1L) / BLOCK_SAMPLES;
            boolean endMarker = false;

            for (long group = 0L; group < groups; group++) {
                int samplesThisGroup = (int) Math.min(
                    BLOCK_SAMPLES, header.sampleCount - group * BLOCK_SAMPLES);
                if (samplesThisGroup <= 0) break;

                for (int channel = 0; channel < header.channels; channel++) {
                    if (input.getFilePointer() + BLOCK_BYTES > input.length()) {
                        throw new IOException("The ADX audio data is truncated.");
                    }
                    int scaleWord = input.readUnsignedShort();
                    if ((scaleWord & 0x8000) != 0) {
                        if (group == 0L) {
                            throw new IOException("The ADX stream ends before its first audio block.");
                        }
                        endMarker = true;
                        break;
                    }

                    int scale = (scaleWord & 0x1fff) + 1;
                    input.readFully(compressedBlock);
                    int h1 = history1[channel];
                    int h2 = history2[channel];

                    for (int sampleIndex = 0; sampleIndex < samplesThisGroup; sampleIndex++) {
                        int packed = compressedBlock[sampleIndex >>> 1] & 0xff;
                        int nibble = (sampleIndex & 1) == 0 ? (packed >>> 4) : (packed & 0x0f);
                        if (nibble >= 8) nibble -= 16;

                        int prediction = (coefficient[0] * h1 + coefficient[1] * h2) >> 12;
                        int sample = clamp16(nibble * scale + prediction);
                        decodedBlock[channel][sampleIndex] = sample;
                        h2 = h1;
                        h1 = sample;
                    }
                    history1[channel] = h1;
                    history2[channel] = h2;
                }

                if (endMarker) break;

                int writePosition = 0;
                for (int sampleIndex = 0; sampleIndex < samplesThisGroup; sampleIndex++) {
                    for (int channel = 0; channel < header.channels; channel++) {
                        int sample = decodedBlock[channel][sampleIndex];
                        // Match the conventional Float32-to-PCM16 WAV conversion:
                        // negative samples use 32768; non-negative samples use 32767.
                        int wavSample = sample < 0
                            ? sample
                            : (int) Math.floor((sample * 32767.0 / 32768.0) + 0.5);
                        pcmChunk[writePosition++] = (byte) (wavSample & 0xff);
                        pcmChunk[writePosition++] = (byte) ((wavSample >>> 8) & 0xff);
                    }
                }
                output.write(pcmChunk, 0, writePosition);
                decodedSamples += samplesThisGroup;
            }

            if (decodedSamples <= 0L) {
                throw new IOException("The ADX decoder did not produce PCM samples.");
            }

            long dataBytes = decodedSamples * header.channels * 2L;
            writeWavHeader(output, header.sampleRate, header.channels, dataBytes);
            output.getFD().sync();
            result = new Metadata(header.sampleRate, header.channels, decodedSamples);
        } catch (IOException | RuntimeException error) {
            temporary.delete();
            if (error instanceof IOException) throw (IOException) error;
            throw new IOException("The ADX stream could not be decoded safely.", error);
        }

        if (destination.exists() && !destination.delete()) {
            temporary.delete();
            throw new IOException("Could not replace the previous decoded WAV.");
        }
        if (!temporary.renameTo(destination)) {
            temporary.delete();
            throw new IOException("Could not finalize the decoded PCM WAV.");
        }
        return result;
    }

    private static Header readHeader(RandomAccessFile input) throws IOException {
        long fileLength = input.length();
        if (fileLength < 32L) throw new IOException("The ADX file header is incomplete.");

        input.seek(0L);
        if (input.readUnsignedShort() != 0x8000) {
            throw new IOException("The ADX signature is invalid.");
        }
        int dataStart = input.readUnsignedShort() + 4;
        input.seek(4L);
        int encoding = input.readUnsignedByte();
        int blockSize = input.readUnsignedByte();
        int bitsPerSample = input.readUnsignedByte();
        int channels = input.readUnsignedByte();
        long sampleRateLong = readUInt32BE(input);
        long sampleCount = readUInt32BE(input);
        int cutoff = input.readUnsignedShort();
        int version = input.readUnsignedByte();
        int flags = input.readUnsignedByte();

        if (encoding != 3 || blockSize != BLOCK_BYTES || bitsPerSample != 4) {
            throw new IOException("Pocket supports standard CRI ADX ADPCM type 3 only.");
        }
        if (channels < 1 || channels > 2) {
            throw new IOException("Pocket supports mono or stereo ADX files only.");
        }
        if (sampleRateLong < 8000L || sampleRateLong > 192000L) {
            throw new IOException("The ADX sample rate is outside Pocket's supported range.");
        }
        if (sampleCount <= 0L || sampleCount > 0xffffffffL) {
            throw new IOException("The ADX sample count is invalid.");
        }
        if (version != 3 && version != 4) {
            throw new IOException("The ADX version is not supported.");
        }
        if ((flags & 0x08) != 0) {
            throw new IOException("Encrypted ADX files are not supported by this decoder.");
        }
        if (cutoff <= 0 || cutoff >= sampleRateLong / 2L) {
            throw new IOException("The ADX predictor cutoff frequency is invalid.");
        }
        if (dataStart < 0x18 || dataStart > fileLength) {
            throw new IOException("The ADX audio-data offset is invalid.");
        }

        byte[] tag = new byte[COPYRIGHT_TAG.length()];
        input.seek(dataStart - tag.length);
        input.readFully(tag);
        if (!COPYRIGHT_TAG.equals(new String(tag, StandardCharsets.US_ASCII))) {
            throw new IOException("The ADX CRI copyright marker is missing.");
        }

        long requiredPcmBytes = sampleCount * channels * 2L;
        if (requiredPcmBytes > MAX_PCM_BYTES) {
            throw new IOException("The decoded PCM audio exceeds Pocket's 256 MB cache limit.");
        }
        input.seek(dataStart);
        return new Header((int) sampleRateLong, channels, sampleCount, cutoff, dataStart);
    }

    private static int[] calculateCoefficients(int cutoff, int sampleRate) throws IOException {
        double a = Math.sqrt(2.0) - Math.cos(2.0 * Math.PI * cutoff / sampleRate);
        double b = Math.sqrt(2.0) - 1.0;
        double product = (a + b) * (a - b);
        if (!Double.isFinite(product) || product < 0.0) {
            throw new IOException("The ADX predictor coefficients are invalid.");
        }
        double c = (a - Math.sqrt(product)) / b;
        // C-style truncation toward zero is important for matching ADX decoders.
        return new int[]{(int) (c * 8192.0), (int) (c * c * -4096.0)};
    }

    private static int clamp16(int sample) {
        return sample > 32767 ? 32767 : sample < -32768 ? -32768 : sample;
    }

    private static long readUInt32BE(RandomAccessFile input) throws IOException {
        return ((long) input.readUnsignedByte() << 24)
            | ((long) input.readUnsignedByte() << 16)
            | ((long) input.readUnsignedByte() << 8)
            | (long) input.readUnsignedByte();
    }

    private static void writeWavHeader(
            RandomAccessFile output, int sampleRate, int channels, long dataBytes) throws IOException {
        long byteRate = (long) sampleRate * channels * 2L;
        long riffSize = 36L + dataBytes;
        if (riffSize > 0xffffffffL || dataBytes > 0xffffffffL || byteRate > 0xffffffffL) {
            throw new IOException("The decoded audio is too large for a standard RIFF/WAVE file.");
        }

        output.seek(0L);
        output.writeBytes("RIFF");
        writeUInt32LE(output, riffSize);
        output.writeBytes("WAVE");
        output.writeBytes("fmt ");
        writeUInt32LE(output, 16L);
        writeUInt16LE(output, 1);
        writeUInt16LE(output, channels);
        writeUInt32LE(output, sampleRate);
        writeUInt32LE(output, byteRate);
        writeUInt16LE(output, channels * 2);
        writeUInt16LE(output, 16);
        output.writeBytes("data");
        writeUInt32LE(output, dataBytes);
    }

    private static void writeUInt16LE(RandomAccessFile output, int value) throws IOException {
        output.write(value & 0xff);
        output.write((value >>> 8) & 0xff);
    }

    private static void writeUInt32LE(RandomAccessFile output, long value) throws IOException {
        output.write((int) (value & 0xff));
        output.write((int) ((value >>> 8) & 0xff));
        output.write((int) ((value >>> 16) & 0xff));
        output.write((int) ((value >>> 24) & 0xff));
    }
}
