import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pxlRoot=mkdtempSync(resolve(tmpdir(),"merzkava-pxl-"));
const humanOut=mkdtempSync(resolve(tmpdir(),"merzkava-human-pxl-"));
const accessoryOut=mkdtempSync(resolve(tmpdir(),"merzkava-accessory-pxl-"));
const out=resolve(root,"web/public/game-assets/pxl");
mkdirSync(out,{recursive:true});

const run=(command,args)=>{
  const result=spawnSync(command,args,{cwd:root,stdio:"inherit"});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(command+" exited with status "+result.status);
};
const clearGeneratedCharacterFiles=()=>{
  // Remove only prior generated character/wardrobe exports. World maps,
  // buildings, scenery and all non-character art remain untouched.
  for(const folder of ["sprites","anims","share"]){
    const target=resolve(out,folder);
    if(!existsSync(target))continue;
    for(const name of readdirSync(target)){
      if(/^(human_|accessory_|weapon_)/.test(name)){
        const file=resolve(target,name);
        if(existsSync(file))unlinkSync(file);
      }
    }
  }
};
const copyExports=source=>{
  for(const folder of ["sprites","anims","share"]){
    const from=resolve(source,folder);
    if(existsSync(from))cpSync(from,resolve(out,folder),{recursive:true,force:true});
  }
};

try{
  run("git",["clone","--depth","1","https://github.com/augusto-scarvalho/claude-pxl.git",pxlRoot]);
  const pxl=resolve(pxlRoot,"bin/pxl.js");

  // Keep the world archive intact. Only the explicitly generated human art
  // is refreshed below, so map, facilities and scenery are never replaced.
  run(process.execPath,[pxl,"build",resolve(root,"art/world-archive.px.js"),"--out",out,"--no-preview"]);

  // The exact Claude human base is the only source for body, hairstyles and
  // outfits: 5 x 5 combinations, 8 real directions, idle 4 / walk 8.
  run(process.execPath,[pxl,"build",resolve(root,"art/human-character-base.px.js"),"--out",humanOut,"--no-preview"]);

  // Accessories are separate detailed transparent overlays authored for the
  // same 48x64 anchor, palette logic and animation timing.
  run(process.execPath,[pxl,"build",resolve(root,"art/human-appearance-layers.px.js"),"--out",accessoryOut,"--no-preview"]);

  clearGeneratedCharacterFiles();
  copyExports(humanOut);
  copyExports(accessoryOut);

  console.log("Built Claude 48x64 human base (5 hairstyles x 5 outfits) and matching 12-accessory overlays. Existing world art preserved.");
}finally{
  rmSync(pxlRoot,{recursive:true,force:true});
  rmSync(humanOut,{recursive:true,force:true});
  rmSync(accessoryOut,{recursive:true,force:true});
}
