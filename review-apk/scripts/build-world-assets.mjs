import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
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

  // The isometric world uses Claude's 24x20 cell grid at its native 32x16 tile size.
  // Character, terrain, facility and scenery coordinates share the same projection.
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview"]);

  // Claude modular PXL base: shared 48x64 human anatomy, ten independent hairstyles,
  // ten outfits with authored silhouettes, twelve accessories and twelve gear layers.
  // The complete eight-direction idle/walk variant library is bundled locally.
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/human-character-base.px.js"),"--out",humanOut,"--no-preview"]);

  for(const folder of ["sprites","anims","share"]){
    const from=resolve(humanOut,folder);
    if(existsSync(from))cpSync(from,resolve(out,folder),{recursive:true,force:true});
  }
  console.log("World Archive and modular 48x64 human character assets built for the Pocket APK.");
}finally{
  rmSync(pxlRoot,{recursive:true,force:true});
  rmSync(humanOut,{recursive:true,force:true});
}
