import { mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = name => new URL("../../docs/game/catalogs/" + name, import.meta.url);
const targetDir = new URL("../web/public/data/", import.meta.url);
const files = ["POCKET_ECONOMY_ITEMS_001_500.json","POCKET_ECONOMY_ITEMS_501_1000.json","POCKET_FACILITIES_200.json","POCKET_PRODUCTION_RECIPES.json"];
await mkdir(targetDir,{recursive:true});
for (const name of files) {
  const target = new URL(name,targetDir);
  await copyFile(source(name),target);
  process.stdout.write("Pocket catalogue asset copied: "+fileURLToPath(target)+"\n");
}
