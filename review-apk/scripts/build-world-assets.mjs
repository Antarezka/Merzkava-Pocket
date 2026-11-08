import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const humanOut=mkdtempSync(resolve(tmpdir(),"merzkava-human-pxl-"));
const yumaOut=mkdtempSync(resolve(tmpdir(),"merzkava-yuma-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
mkdirSync(out,{recursive:true});
const run=(command,args)=>{
  const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(command+" exited with status "+result.status);
};
const copyTree=(from,to)=>{
  if(existsSync(from))cpSync(from,to,{recursive:true,force:true});
};

try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);
  const pxl=resolve(pxlRoot,"bin/pxl.js");

  // Existing world and the shared human base retain their approved native grids.
  run(process.execPath,[pxl,resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview"]);
  run(process.execPath,[pxl,resolve(root,"art/human-character-base.px.js"),"--out",humanOut,"--no-preview"]);
  for(const folder of ["sprites","anims","share"])copyTree(resolve(humanOut,folder),resolve(out,folder));

  // Build Yuma's complete eight-perspective rig and every authored animation,
  // including the high-density idle, locomotion, combat, life and expression clips.
  const yuma=resolve(root,"art/characters/yuma-fox-rig3d.px.js");
  run(process.execPath,[pxl,yuma,"--out",yumaOut,"--no-preview"]);
  for(const folder of ["sprites","anims","share"])copyTree(resolve(yumaOut,folder),resolve(out,folder));

  // Keep the turnaround and all review sheets available as game assets.
  const sheetOut=resolve(out,"sheets/yuma");
  mkdirSync(sheetOut,{recursive:true});
  for(const name of readdirSync(yumaOut)){
    if(/^yuma_.*\.(png|json|gif)$/i.test(name)){
      copyFileSync(resolve(yumaOut,name),resolve(sheetOut,name));
    }
  }
  console.log("World Archive, human base, and complete ultra-detailed Yuma PXL library built.");
}finally{
  rmSync(pxlRoot,{recursive:true,force:true});
  rmSync(humanOut,{recursive:true,force:true});
  rmSync(yumaOut,{recursive:true,force:true});
}
