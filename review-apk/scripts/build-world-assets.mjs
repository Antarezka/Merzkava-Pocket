import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
mkdirSync(out,{recursive:true});
const run=(command,args)=>{const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});if(result.error)throw result.error;if(result.status!==0)throw new Error(command+" exited with status "+result.status);};
try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);
  run(process.execPath,[resolve(pxlRoot,"bin/pxl.js"),"build",resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview"]);
  console.log("World Archive pixel assets built for the Pocket APK.");
}finally{rmSync(pxlRoot,{recursive:true,force:true});}
