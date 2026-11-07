import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
const dirs=["n","ne","e","se","s","sw","w","nw"];
const characters=["tr","sai","dkb","cmp","off","crn"];
const selected=[
  ...characters.flatMap(id=>dirs.flatMap(dir=>["idle","walk"].map(move=>"realm_"+id+"_"+move+"_"+dir))),
  ...characters.map(id=>"character_preview_"+id),
  "tile_grass_0","tile_grass_1","tile_grass_2","tile_path","tile_stone",
  "tile_water","tile_water_deep","tile_rock_ground","world_tree","world_rock",
  "facility_starter_hut","facility_starter_foraging","facility_starter_well",
  "facility_farm","facility_workshop","facility_storage","facility_market",
  "home_base_map"
];
const vendor=resolve(root,"art/.pxl-lib/characters");
const PXL_REV="ec66cfc83bc8c608be081aa37410cb4056d866a6";
rmSync(out,{recursive:true,force:true});
mkdirSync(out,{recursive:true});
const run=(command,args)=>{const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});if(result.error)throw result.error;if(result.status!==0)throw new Error(command+" exited with status "+result.status);};
try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);
  run("git",["-C",pxlRoot,"fetch","--depth","1","origin",PXL_REV]);
  run("git",["-C",pxlRoot,"checkout","--detach",PXL_REV]);
  mkdirSync(vendor,{recursive:true});
  for(const name of ["traveler.px.js","crew.px.js","dress.px.js"]){
    copyFileSync(resolve(pxlRoot,"lib/characters",name),resolve(vendor,name));
  }
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview","--only",selected.join(",")]);
  console.log("Pocket PXL character, terrain, map and facility PNG assets built.");
}finally{rmSync(pxlRoot,{recursive:true,force:true});rmSync(resolve(root,"art/.pxl-lib"),{recursive:true,force:true});}
