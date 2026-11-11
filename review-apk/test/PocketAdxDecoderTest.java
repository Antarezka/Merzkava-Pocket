package com.merzkava.pocket.review;

import java.io.File;
import java.io.RandomAccessFile;
import java.nio.charset.StandardCharsets;

/** Plain-JDK verification for PocketAdxDecoder; run against the bundled chill-1a reference file. */
public final class PocketAdxDecoderTest {
    private PocketAdxDecoderTest() {}

    public static void main(String[] args) throws Exception {
        File syntheticAdx = File.createTempFile("pocket-adx-synthetic-", ".adx");
        File syntheticWav = File.createTempFile("pocket-adx-synthetic-", ".wav");
        File actualWav = null;
        try {
            writeSyntheticAdx(syntheticAdx);
            PocketAdxDecoder.Metadata synthetic = PocketAdxDecoder.decodeToWav(syntheticAdx, syntheticWav);
            verifyWav(syntheticWav, 44100, 2, 64);
            require(synthetic.sampleRate == 44100 && synthetic.channels == 2 && synthetic.sampleCount == 64,
                "Synthetic ADX metadata was not preserved.");

            if (args.length >= 2) {
                File source = new File(args[0]);
                actualWav = new File(args[1]);
                PocketAdxDecoder.Metadata header = PocketAdxDecoder.inspect(source);
                require(header.sampleRate == 44100, "chill-1a must retain 44.1 kHz; got " + header.sampleRate);
                require(header.channels == 2, "chill-1a must remain stereo; got " + header.channels);

                PocketAdxDecoder.Metadata decoded = PocketAdxDecoder.decodeToWav(source, actualWav);
                require(decoded.sampleRate == 44100, "Decoded chill-1a WAV rate changed.");
                require(decoded.channels == 2, "Decoded chill-1a WAV is not stereo.");
                double duration = decoded.durationSeconds();
                require(duration >= 214.0 && duration <= 216.0,
                    "Decoded chill-1a duration is outside the Toolster 3:35 reference: " + duration);
                verifyWav(actualWav, 44100, 2, decoded.sampleCount);
                verifyAudibleStereoContent(actualWav, decoded.sampleCount);
                System.out.println("PASS chill-1a: " + decoded.sampleRate + " Hz, " +
                    decoded.channels + " channels, " + duration + " s, " + actualWav.length() + " bytes WAV");
            } else {
                System.out.println("PASS synthetic ADX: 44.1 kHz stereo PCM16 WAV");
            }
        } finally {
            syntheticAdx.delete();
            syntheticWav.delete();
        }
    }

    private static void verifyWav(File file, int sampleRate, int channels, long samples) throws Exception {
        require(file.isFile() && file.length() >= 44L, "Decoded WAV is missing or truncated.");
        try (RandomAccessFile wav = new RandomAccessFile(file, "r")) {
            require("RIFF".equals(readAscii(wav, 4)), "WAV RIFF marker is missing.");
            long riffSize = readUInt32LE(wav);
            require("WAVE".equals(readAscii(wav, 4)), "WAV WAVE marker is missing.");
            require("fmt ".equals(readAscii(wav, 4)), "WAV fmt chunk is missing.");
            require(readUInt32LE(wav) == 16L, "WAV fmt chunk must be PCM16's 16-byte layout.");
            require(readUInt16LE(wav) == 1, "WAV format must be uncompressed PCM.");
            require(readUInt16LE(wav) == channels, "WAV channel count is incorrect.");
            require(readUInt32LE(wav) == sampleRate, "WAV sample rate is incorrect.");
            require(readUInt32LE(wav) == (long) sampleRate * channels * 2L, "WAV byte rate is incorrect.");
            require(readUInt16LE(wav) == channels * 2, "WAV block alignment is incorrect.");
            require(readUInt16LE(wav) == 16, "WAV must contain signed 16-bit PCM.");
            require("data".equals(readAscii(wav, 4)), "WAV data chunk is missing.");
            long dataSize = readUInt32LE(wav);
            long expectedDataSize = samples * channels * 2L;
            require(dataSize == expectedDataSize, "WAV PCM data length is incorrect.");
            require(riffSize == 36L + dataSize, "WAV RIFF size does not match its PCM data.");
            require(file.length() == 44L + dataSize, "WAV contains unexpected trailing or missing bytes.");
        }
    }

    private static void verifyAudibleStereoContent(File wavFile, long sampleCount) throws Exception {
        long nonZero = 0L;
        long differing = 0L;
        try (RandomAccessFile wav = new RandomAccessFile(wavFile, "r")) {
            wav.seek(44L);
            for (long i = 0; i < sampleCount; i++) {
                int left = readInt16LE(wav);
                int right = readInt16LE(wav);
                if (left != 0 || right != 0) nonZero++;
                if (left != right) differing++;
            }
        }
        require(nonZero > sampleCount / 2L, "Decoded PCM is unexpectedly silent.");
        require(differing > sampleCount / 100L, "Decoded stereo channels appear incorrectly duplicated.");
    }

    private static void writeSyntheticAdx(File file) throws Exception {
        try (RandomAccessFile out = new RandomAccessFile(file, "rw")) {
            out.setLength(0L);
            out.writeShort(0x8000);
            out.writeShort(0x0020); // Data begins at offset 0x24.
            out.writeByte(3);       // Standard CRI ADX ADPCM.
            out.writeByte(18);      // 18-byte block.
            out.writeByte(4);       // 4-bit ADPCM.
            out.writeByte(2);       // Stereo.
            writeUInt32BE(out, 44100);
            writeUInt32BE(out, 64);
            out.writeShort(500);
            out.writeByte(3);
            out.writeByte(0);
            out.write(new byte[0x24 - 0x14 - 6]);
            out.write(COPYRIGHT);
            for (int group = 0; group < 2; group++) {
                for (int channel = 0; channel < 2; channel++) {
                    out.writeShort(0); // scale = 1
                    for (int n = 0; n < 16; n++) {
                        int high = ((n + channel * 3) & 0x0f);
                        int low = ((n + channel * 3 + 1) & 0x0f);
                        out.writeByte((high << 4) | low);
                    }
                }
            }
        }
    }

    private static final byte[] COPYRIGHT = "(c)CRI".getBytes(StandardCharsets.US_ASCII);

    private static String readAscii(RandomAccessFile in, int length) throws Exception {
        byte[] bytes = new byte[length];
        in.readFully(bytes);
        return new String(bytes, StandardCharsets.US_ASCII);
    }

    private static int readInt16LE(RandomAccessFile in) throws Exception {
        int value = readUInt16LE(in);
        return (short) value;
    }

    private static int readUInt16LE(RandomAccessFile in) throws Exception {
        return in.readUnsignedByte() | (in.readUnsignedByte() << 8);
    }

    private static long readUInt32LE(RandomAccessFile in) throws Exception {
        return (long) readUInt16LE(in) | ((long) readUInt16LE(in) << 16);
    }

    private static void writeUInt32BE(RandomAccessFile out, long value) throws Exception {
        out.writeByte((int) ((value >>> 24) & 0xff));
        out.writeByte((int) ((value >>> 16) & 0xff));
        out.writeByte((int) ((value >>> 8) & 0xff));
        out.writeByte((int) (value & 0xff));
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
