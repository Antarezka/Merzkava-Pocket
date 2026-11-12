import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const [sourcePath, actualWavPath, referencePath] = process.argv.slice(2);
assert.ok(sourcePath && actualWavPath && referencePath, "Usage: node adx-reference-compare.mjs source.adx actual.wav gamedac.js");

const require = createRequire(import.meta.url);
const gamedac = require(referencePath);
const source = new Uint8Array(await readFile(sourcePath));
const actual = await readFile(actualWavPath);
const decoded = gamedac.decode(source);
const reference = Buffer.from(gamedac.toWav(decoded));

assert.equal(decoded.format, "adx", "Independent decoder did not detect standard CRI ADX.");
assert.equal(decoded.sampleRate, 44100, "Independent decoder expected 44.1 kHz.");
assert.equal(decoded.channels, 2, "Independent decoder expected stereo.");
assert.equal(actual.length, reference.length, "Pocket PCM WAV size differs from the independent decoder.");

let mismatch = -1;
for (let i = 0; i < actual.length; i++) {
  if (actual[i] !== reference[i]) { mismatch = i; break; }
}
assert.equal(mismatch, -1, mismatch < 0 ? "" : `PCM WAV differs from the independent decoder at byte ${mismatch} (expected ${reference[mismatch]}, got ${actual[mismatch]}).`);
console.log(`PASS independent ADX decode comparison: bit-identical PCM WAV, ${decoded.sampleRate} Hz stereo, ${decoded.channelData[0].length} samples/channel.`);
