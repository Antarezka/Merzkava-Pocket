import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "takumi-js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(projectRoot, "web/shimaenaga-launcher-preview.html");
const cssPath = resolve(projectRoot, "web/shimaenaga-launcher-preview.css");
const outputDir = resolve(projectRoot, "../dist");

const [htmlSource, cssSource] = await Promise.all([
  readFile(htmlPath, "utf8"),
  readFile(cssPath, "utf8"),
]);

const iconMatch = htmlSource.match(/<div class="icon"[^>]*>[\\s\\S]*?<\\/div>/);
if (!iconMatch) {
  throw new Error("Could not find the primary Shimaenaga CSS icon in the preview HTML.");
}

const iconHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${iconMatch[0]}</body></html>`;
const iconCss = `${cssSource}

html, body {
  width: 256px !important;
  height: 256px !important;
  min-height: 256px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: transparent !important;
}
body { display: grid; place-items: center; }
.icon {
  width: 256px !important;
  height: 256px !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  border-radius: 28% !important;
}
`;

await mkdir(outputDir, { recursive: true });
const [icoBytes, pngBytes] = await Promise.all([
  render(iconHtml, { width: 256, height: 256, format: "ico", css: iconCss }),
  render(iconHtml, { width: 256, height: 256, format: "png", css: iconCss }),
]);

const icoPath = resolve(outputDir, "merzkava-pocket-shimaenaga.ico");
const pngPath = resolve(outputDir, "merzkava-pocket-shimaenaga.png");
await Promise.all([
  writeFile(icoPath, icoBytes),
  writeFile(pngPath, pngBytes),
]);

for (const path of [icoPath, pngPath]) {
  const { size } = await import("node:fs/promises").then(fs => fs.stat(path));
  if (size === 0) throw new Error(`Renderer produced an empty file: ${path}`);
  process.stdout.write(`Rendered ${path} (${size} bytes)\\n`);
}
