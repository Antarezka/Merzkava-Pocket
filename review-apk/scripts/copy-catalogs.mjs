import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const sourceDir = new URL("../../docs/game/catalogs/", import.meta.url);
const targetDir = new URL("../web/public/data/", import.meta.url);
const files = [
  "POCKET_ECONOMY_ITEMS_001_500.json",
  "POCKET_ECONOMY_ITEMS_501_1000.json",
  "POCKET_FACILITIES_200.json",
  "POCKET_PRODUCTION_RECIPES.json"
];

const parseJson = async name => JSON.parse(await readFile(new URL(name, sourceDir), "utf8"));
const sha256 = value => createHash("sha256").update(value).digest("hex");
const [itemsA, itemsB, facilityData, recipeData] = await Promise.all([
  parseJson(files[0]), parseJson(files[1]), parseJson(files[2]), parseJson(files[3])
]);

const items = [...(itemsA.items || []), ...(itemsB.items || [])];
const facilities = facilityData.facilities || [];
const recipes = recipeData.recipes || [];
const unique = (rows, key) => new Set(rows.map(row => row?.[key])).size === rows.length;

if (items.length !== 1000 || !unique(items, "item_id")) {
  throw new Error("Economy build validation failed: expected 1,000 uniquely identified item records.");
}
if (facilities.length !== 200 || !unique(facilities, "facility_id")) {
  throw new Error("Economy build validation failed: expected 200 uniquely identified facilities.");
}
if (recipes.length !== 20 || !unique(recipes, "recipe_id")) {
  throw new Error("Economy build validation failed: expected 20 uniquely identified production recipes.");
}

const itemIds = new Set(items.map(row => row.item_id));
const facilityIds = new Set(facilities.map(row => row.facility_id));
for (const recipe of recipes) {
  if (!facilityIds.has(recipe.facility_id)) {
    throw new Error("Recipe " + recipe.recipe_id + " references an unknown facility.");
  }
  for (const row of [...(recipe.inputs || []), ...(recipe.outputs || [])]) {
    if (!itemIds.has(row.item_id)) {
      throw new Error("Recipe " + recipe.recipe_id + " references unknown item " + row.item_id + ".");
    }
  }
}

const specText = await readFile(new URL("POCKET_ECONOMY_CATALOG.md", sourceDir), "utf8");
const versionMatch = specText.match(/Pocket baseline\s+v([0-9]+\.[0-9]+\.[0-9]+)/i);
const catalogueVersion = versionMatch?.[1] || "unversioned";
await mkdir(targetDir, { recursive: true });

const hashes = {};
for (const name of files) {
  const source = new URL(name, sourceDir);
  const bytes = await readFile(source);
  hashes[name] = sha256(bytes);
  const target = new URL(name, targetDir);
  await copyFile(source, target);
  process.stdout.write("Validated and copied " + name + " (" + bytes.length + " bytes)\n");
}

const manifest = {
  schema_version: 1,
  catalogue_version: catalogueVersion,
  source_commit: (process.env.GITHUB_SHA || "local").slice(0, 7),
  counts: { items: items.length, facilities: facilities.length, recipes: recipes.length },
  hashes_sha256: hashes,
  economy_spec_sha256: sha256(specText)
};
const manifestPath = new URL("POCKET_CATALOGUE_MANIFEST.json", targetDir);
const manifestText = JSON.stringify(manifest, null, 2) + "\n";
await writeFile(manifestPath, manifestText, "utf8");
const verifiedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (verifiedManifest.counts.items !== 1000 || verifiedManifest.counts.facilities !== 200 || verifiedManifest.counts.recipes !== 20) {
  throw new Error("Pocket catalogue manifest verification failed.");
}
process.stdout.write("Wrote " + fileURLToPath(manifestPath) + " for catalogue v" + catalogueVersion + "\n");
