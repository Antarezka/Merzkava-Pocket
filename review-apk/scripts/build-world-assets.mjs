import { spawnSync } from "node:child_process";
import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const humanOut=mkdtempSync(resolve(tmpdir(),"merzkava-human-pxl-"));
const foxOut=mkdtempSync(resolve(tmpdir(),"merzkava-yunmiao-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
mkdirSync(out,{recursive:true});
const run=(command,args)=>{const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});if(result.error)throw result.error;if(result.status!==0)throw new Error(command+" exited with status "+result.status);};
try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);

  // World geometry remains on its authored grid. Phaser applies the shared
  // world scale separately; this build never resizes source pixels.
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview"]);

  // Human chibi base: 48x64, eight headings and modular hairstyle/outfit variants.
  // Its output and anatomy are not modified by the separate fox-spirit family.
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/human-character-base.px.js"),"--out",humanOut,"--no-preview"]);
  for(const folder of ["sprites","anims","share"]){
    const from=resolve(humanOut,folder);
    if(existsSync(from))cpSync(from,resolve(out,folder),{recursive:true,force:true});
  }

  // Yunmiao is a separate rig3d character family. Validate the art before
  // rendering its eight-direction movement/combat/social animation library.
  const yunmiao=resolve(root,"art/characters/yunmiao-fox-rig3d.px.js");
  const pxl=resolve(pxlRoot,"bin/pxl.js");
  run(process.execPath,[pxl,"check",yunmiao]);
  run(process.execPath,[pxl,"build",yunmiao,"--out",foxOut,"--no-preview"]);

  // Keep runtime textures in the same PXL namespaces as the existing player.
  for(const folder of ["sprites","anims","share"]){
    const from=resolve(foxOut,folder);
    if(existsSync(from))cpSync(from,resolve(out,folder),{recursive:true,force:true});
  }
  // Directional turnaround and tagged action sheets are also bundled for
  // preview, future UI portraits and animation review.
  const sheetOut=resolve(out,"sheets/yunmiao");
  mkdirSync(sheetOut,{recursive:true});
  for(const name of readdirSync(foxOut)){
    if(/^yunmiao_.*\.(png|json|gif)$/i.test(name)){
      copyFileSync(resolve(foxOut,name),resolve(sheetOut,name));
    }
  }
  console.log("World Archive, human base and Yunmiao 48x64 fox-spirit PXL assets built.");
}finally{
  rmSync(pxlRoot,{recursive:true,force:true});
  rmSync(humanOut,{recursive:true,force:true});
  rmSync(foxOut,{recursive:true,force:true});
}
