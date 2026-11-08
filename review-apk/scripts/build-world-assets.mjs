import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const humanOut=mkdtempSync(resolve(tmpdir(),"merzkava-human-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
mkdirSync(out,{recursive:true});
const run=(command,args)=>{const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});if(result.error)throw result.error;if(result.status!==0)throw new Error(command+" exited with status "+result.status);};
try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);

  // World geometry remains authored on its original grid. Phaser applies the
  // shared 1.5x world scale so map, facilities and scenery follow the new human base.
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview"]);

  // Human chibi base: one 48x64 anatomy, five hairstyles x five outfits,
  // eight directions, and named idle/walk frame sets. Only the selected
  // variants are loaded by the runtime; the complete variant library is bundled.
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"check",resolve(root,"art/human-character-base.px.js")]);
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/human-character-base.px.js"),"--out",humanOut,"--no-preview"]);

  for(const folder of ["sprites","anims","share"]){
    cpSync(resolve(humanOut,folder),resolve(out,folder),{recursive:true,force:true});
  }
  console.log("World Archive and modular 48x64 human character assets built for the Pocket APK.");
}finally{
  rmSync(pxlRoot,{recursive:true,force:true});
  rmSync(humanOut,{recursive:true,force:true});
}
