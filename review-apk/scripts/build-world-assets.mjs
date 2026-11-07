import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
const helper=resolve(root,"art/characters/_pxl-dress.px.js");

const run=(command,args)=>{
  const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(command+" exited with status "+result.status);
};

try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);
  // PXL's dress() helper is staged beside the authored .px.js file so include() resolves
  // through the same relative-path rule as PXL's own character library.
  copyFileSync(resolve(pxlRoot,"lib/characters/dress.px.js"),helper);
  mkdirSync(out,{recursive:true});
  const pxlCli=resolve(pxlRoot,"bin/pxl.js");
  const source=resolve(root,"art/world-archive.px.js");
  run(process.execPath,[pxlCli,"check",source]);
  run(process.execPath,[pxlCli,"build",source,"--out",out,"--no-preview"]);
  console.log("World Archive PXL pixel assets built for Merzkava Pocket.");
}finally{
  rmSync(helper,{force:true});
  rmSync(pxlRoot,{recursive:true,force:true});
}
