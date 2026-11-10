import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const nodeModulesRoot = join(projectRoot, "node_modules");
const publicRoot = join(projectRoot, "web", "public");
const outputPath = join(publicRoot, "THIRD_PARTY_NOTICES.txt");
const requiredVinylPath = join(publicRoot, "audio", "vinyl-surface-noise.ogg");
const sourceNoticePath = resolve(projectRoot, "..", "docs", "legal", "THIRD_PARTY_NOTICES.md");

try {
  const asset = await stat(requiredVinylPath);
  if (!asset.isFile() || asset.size === 0) throw new Error("The selected vinyl surface-noise OGG is empty.");
} catch {
  throw new Error("Missing packaged vinyl surface-noise asset: " + relative(projectRoot, requiredVinylPath));
}

const packages = new Map();
const moduleDirectorySeen = new Set();
const licenseFilePattern = /^(LICENSE|LICENCE|COPYING|NOTICE)(?:[._-].*)?$/i;
const licenseTextLimit = 512 * 1024;

async function safeEntries(directory) {
  try { return await readdir(directory, { withFileTypes: true }); }
  catch { return []; }
}

async function collectPackage(packageDirectory) {
  const manifestPath = join(packageDirectory, "package.json");
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch { return; }

  if (typeof manifest.name !== "string" || !manifest.name) return;
  const key = manifest.name + "@" + String(manifest.version || "unknown");
  if (!packages.has(key)) {
    const entries = await safeEntries(packageDirectory);
    const candidateFiles = entries
      .filter(entry => entry.isFile() && licenseFilePattern.test(entry.name))
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));
    const files = [];
    for (const name of candidateFiles) {
      const filePath = join(packageDirectory, name);
      try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile() || fileStat.size > licenseTextLimit) continue;
        files.push({ name, text: await readFile(filePath, "utf8") });
      } catch {}
    }
    const declared = manifest.license
      ? (typeof manifest.license === "string" ? manifest.license : JSON.stringify(manifest.license))
      : (Array.isArray(manifest.licenses) ? manifest.licenses.map(item => item?.type || "unknown").join(" OR ") : "NOT DECLARED");
    packages.set(key, {
      name: manifest.name,
      version: String(manifest.version || "unknown"),
      license: declared,
      relativePath: relative(nodeModulesRoot, packageDirectory).replaceAll("\\", "/"),
      files
    });
  }

  await scanModulesDirectory(join(packageDirectory, "node_modules"));
}

async function scanModulesDirectory(directory) {
  if (moduleDirectorySeen.has(directory)) return;
  moduleDirectorySeen.add(directory);
  const entries = await safeEntries(directory);
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name === ".bin") continue;
    const childPath = join(directory, entry.name);
    if (entry.name.startsWith("@")) {
      const scopedEntries = await safeEntries(childPath);
      for (const scopedPackage of scopedEntries) {
        if (scopedPackage.isDirectory() && !scopedPackage.isSymbolicLink()) {
          await collectPackage(join(childPath, scopedPackage.name));
        }
      }
    } else {
      await collectPackage(childPath);
    }
  }
}

await scanModulesDirectory(nodeModulesRoot);

// Some npm packages omit the licence file from their published tarball even though
// the licence expression is present in package.json. Reuse the corresponding project
// licence text for platform binaries, and vendor the upstream dual-licence texts for Takumi.
function inheritLicenseFiles(targetName, sourceName) {
  const target = [...packages.values()].find(item => item.name === targetName);
  const source = [...packages.values()].find(item => item.name === sourceName);
  if (target && source?.files.length && !target.files.length) {
    target.files = source.files.map(file => ({
      name: file.name + " (shared licence from " + source.name + "@" + source.version + ")",
      text: file.text
    }));
  }
}
inheritLicenseFiles("@esbuild/linux-x64", "esbuild");
inheritLicenseFiles("@rollup/rollup-linux-x64-gnu", "rollup");

const takumiLicenseRoot = resolve(projectRoot, "..", "docs", "legal", "licenses");
const nativeAudioLicenseTexts = [
  { name: "OxiAudio 0.2.1 — Apache License 2.0", text: await readFile(join(takumiLicenseRoot, "oxiaudio-LICENSE-APACHE.txt"), "utf8") },
  { name: "OxiSound 0.2.1 — Apache License 2.0", text: await readFile(join(takumiLicenseRoot, "oxisound-LICENSE-APACHE.txt"), "utf8") }
];
const takumiLicenseTexts = [
  { name: "LICENSE-MIT (Takumi upstream)", text: await readFile(join(takumiLicenseRoot, "takumi-LICENSE-MIT.txt"), "utf8") },
  { name: "LICENSE-APACHE (Takumi upstream)", text: await readFile(join(takumiLicenseRoot, "takumi-LICENSE-APACHE.txt"), "utf8") }
];
for (const item of packages.values()) {
  if ((item.name === "takumi-js" || item.name.startsWith("@takumi-rs/")) &&
      item.license.includes("MIT") && item.license.includes("Apache-2.0") && !item.files.length) {
    item.files = takumiLicenseTexts;
  }
}

const sortedPackages = [...packages.values()].sort((a, b) =>
  a.name.localeCompare(b.name) || a.version.localeCompare(b.version)
);

const groupedTexts = new Map();
for (const item of sortedPackages) {
  for (const file of item.files) {
    const digest = createHash("sha256").update(file.text).digest("hex");
    if (!groupedTexts.has(digest)) groupedTexts.set(digest, { text: file.text, labels: [] });
    groupedTexts.get(digest).labels.push(item.name + "@" + item.version + " — " + file.name);
  }
}

const notDeclared = sortedPackages.filter(item => item.license === "NOT DECLARED");
const noText = sortedPackages.filter(item => item.files.length === 0);
let notice = "MERZKAVA POCKET — THIRD-PARTY NOTICES\n";
notice += "Generated from the installed npm dependency tree during the APK build.\n";
notice += "Includes runtime and build-time packages, including transitive dependencies.\n";
notice += "It does not assign a licence to Merzkava Pocket's own source code.\n\n";
notice += "INVENTORY SUMMARY\n";
notice += "Packages inventoried: " + sortedPackages.length + "\n";
notice += "Packages without declared licence metadata: " + notDeclared.length + "\n";
notice += "Packages without a root licence/notice text file: " + noText.length + "\n\n";
notice += "PACKAGE INVENTORY\n";
for (const item of sortedPackages) {
  notice += "- " + item.name + "@" + item.version + " | " + item.license +
    " | " + item.relativePath + (item.files.length ? "" : " | LICENCE TEXT NOT FOUND IN PACKAGE ROOT") + "\n";
}
if (notDeclared.length) {
  notice += "\nREQUIRES LICENCE REVIEW — METADATA NOT DECLARED\n";
  for (const item of notDeclared) notice += "- " + item.name + "@" + item.version + "\n";
}
if (noText.length) {
  notice += "\nREQUIRES TEXT REVIEW — NO ROOT LICENCE/NOTICE FILE FOUND\n";
  for (const item of noText) notice += "- " + item.name + "@" + item.version + " | " + item.license + "\n";
}
notice += "\nFULL LICENCE AND NOTICE TEXTS (identical texts are included once)\n";
let textIndex = 0;
for (const [digest, entry] of groupedTexts) {
  textIndex += 1;
  notice += "\n" + "=".repeat(76) + "\n";
  notice += "LICENCE TEXT " + textIndex + " | SHA-256 " + digest + "\n";
  notice += "APPLIES TO:\n" + entry.labels.map(label => "- " + label).join("\n") + "\n";
  notice += "=".repeat(76) + "\n";
  notice += entry.text.trimEnd() + "\n";
}
notice += "\nNATIVE ANDROID AUDIO ENGINE LICENCE TEXTS\n";
for (const licence of nativeAudioLicenseTexts) {
  notice += "\n" + "=".repeat(76) + "\n";
  notice += licence.name + "\n";
  notice += "=".repeat(76) + "\n";
  notice += licence.text.trimEnd() + "\n";
}
notice += "\nPROJECT ASSET, BUILD-TOOL AND PROVENANCE NOTES\n";
notice += await readFile(sourceNoticePath, "utf8");
await writeFile(outputPath, notice, "utf8");
process.stdout.write(
  "Generated " + relative(projectRoot, outputPath) + " for " + sortedPackages.length +
  " npm packages (" + groupedTexts.size + " distinct licence/notice texts).\n"
);
if (notDeclared.length || noText.length) {
  process.stdout.write("NOTICE: inspect flagged packages before making a complete licence-compliance claim.\n");
}
