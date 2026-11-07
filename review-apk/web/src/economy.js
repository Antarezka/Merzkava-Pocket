import "./economy.css";

const CLOCK_RATE=48, STATE_VERSION=1;
const CATALOG_FILES=["POCKET_ECONOMY_ITEMS_001_500.json","POCKET_ECONOMY_ITEMS_501_1000.json","POCKET_FACILITIES_200.json","POCKET_PRODUCTION_RECIPES.json"];
let cataloguePromise=null, runtimeData=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const tidy=v=>Number.isInteger(num(v))?String(num(v)):num(v).toFixed(2).replace(/\.?0+$/,"");
const uid=()=>globalThis.crypto?.randomUUID?.()||("pocket-"+Date.now()+"-"+Math.random().toString(36).slice(2));

async function readJson(name){
  const response=await fetch(new URL("../data/"+name,import.meta.url).toString(),{cache:"no-cache"});
  if(!response.ok)throw new Error("Economy asset unavailable: "+name+" ("+response.status+")");
  return response.json();
}
export function loadPocketEconomy(){
  if(!cataloguePromise)cataloguePromise=Promise.all(CATALOG_FILES.map(readJson)).then(([a,b,f,r])=>{
    const items=[...a.items,...b.items],byId=new Map(items.map(x=>[x.item_id,x]));
    const facilitiesById=new Map(f.facilities.map(x=>[x.facility_id,x]));
    const recipesById=new Map(r.recipes.map(x=>[x.recipe_id,x]));
    if(items.length!==1000||byId.size!==1000||f.facilities.length!==200||recipesById.size!==20)throw new Error("Pocket economy catalogue integrity check failed.");
    for(const recipe of r.recipes)if(!facilitiesById.has(recipe.facility_id)||[...recipe.inputs,...recipe.outputs].some(x=>!byId.has(x.item_id)))throw new Error("Recipe links unknown data: "+recipe.recipe_id);
    return {items,byId,facilities:f.facilities,facilitiesById,recipes:r.recipes,recipesById};
  });
  return cataloguePromise;
}
function currency(xc,explicit=""){
  if(explicit)return explicit;
  const v=num(xc);if(v<=0)return "0 xc";
  const units=[[100000000,"az"],[10000000,"zj"],[10000,"xg"],[100,"xs"],[1,"xc"]];
  const unit=units.find(x=>v>=x[0])||units.at(-1);
  return tidy(v/unit[0])+" "+unit[1];
}
function duration(simMinutes){
  const seconds=Math.max(0,num(simMinutes))*60/CLOCK_RATE;
  if(seconds<60)return tidy(seconds)+" sec real";
  if(seconds<3600)return tidy(seconds/60)+" min real";
  if(seconds<86400)return tidy(seconds/3600)+" hr real";
  return tidy(seconds/86400)+" days real";
}
const qty=(state,id)=>num(state.inventory[id]);
function itemByName(data,name){
  const target=String(name??"").trim().toLowerCase();
  return data.items.find(x=>x.name.toLowerCase()===target)||data.items.find(x=>x.name.toLowerCase().includes(target))||null;
}
function hasNamedItem(data,state,name){const item=itemByName(data,name);return !!item&&qty(state,item.item_id)>=1;}
function hasAnyTool(data,state,requirements){
  if(!requirements?.length)return true;
  return requirements.every(requirement=>{
    const alternatives=String(requirement).split(/\s*\|\s*|\s+or\s+/i);
    return alternatives.some(alternative=>{
      const words=alternative.toLowerCase().replace(/\b(suitable|appropriate|for loose deposits|for hard rock)\b/g,"").split(/[,/ ]+/).filter(x=>x.length>2&&x!=="or"&&x!=="and");
      return words.length>0&&data.items.some(item=>words.some(word=>item.name.toLowerCase().includes(word))&&qty(state,item.item_id)>=1);
    });
  });
}
function hasToolGroup(data,state,alternatives){
  return alternatives.some(term=>data.items.some(item=>item.name.toLowerCase().includes(term)&&qty(state,item.item_id)>=1));
}
function gatheringToolsReady(data,state,item,site){
  const method=item.acquisition?.method;
  if(method==="tree_felling")return hasToolGroup(data,state,["axe"]);
  if(method==="woodland_collection_or_cut")return hasToolGroup(data,state,["basket"])&&hasToolGroup(data,state,["bucket"])&&hasToolGroup(data,state,["axe","saw"]);
  if(method==="quarrying_or_digging"){
    const soft=/riverbank|field|clay bank/i.test(site);
    return hasToolGroup(data,state,soft?["shovel"]:["pickaxe"]);
  }
  if(method==="underground_mining")return hasToolGroup(data,state,["pickaxe"])&&hasToolGroup(data,state,["mining lamp"]);
  if(method==="foraging_or_hand_harvest"||method==="herb_foraging")return hasToolGroup(data,state,["basket","shears"]);
  if(method==="fishing")return hasToolGroup(data,state,["fishing rod","fishing net","cast net"]);
  if(method==="water_drawing")return hasToolGroup(data,state,["wooden bucket","iron bucket"]);
  return hasAnyTool(data,state,item.acquisition?.tool_requirements||[]);
}
function materialCost(data,materials){return (materials||[]).reduce((sum,row)=>sum+num(data.byId.get(row.item_id)?.market?.base_price_xc)*num(row.quantity),0);}
function addLedger(state,row){state.ledger.unshift({transaction_id:uid(),at:Date.now(),...row});state.ledger=state.ledger.slice(0,250);}
function saveState(state,key){try{localStorage.setItem(key,JSON.stringify(state));return true;}catch{return false;}}
function createState(){return {version:STATE_VERSION,wallet_xc:0,inventory:{},facilities:{},processes:[],ledger:[],item_site_access:{},facility_site_access:{},builder_records:{},qa_grant_used:false};}
function readPinnedProfileWallet(identity){
  if(identity?.role!=="player"||!identity?.displayName||!identity?.identityRef||!window.PocketNative?.getLocalPlayerProfiles)return null;
  try{
    const sourceSha=String(identity.identityRef).replace(/^universe:/,"");
    const profiles=JSON.parse(window.PocketNative.getLocalPlayerProfiles()||"[]");
    const profile=profiles.find(x=>x?.name===identity.displayName&&x?.sourceSha===sourceSha&&typeof x?.profileMarkdown==="string"&&x.profileMarkdown.length>0);
    if(!profile)return null;
    const match=profile.profileMarkdown.match(/^\\s*-\\s*\\*\\*Wallet(?:\\s*\\(wealth\\))?\\*\\*:\\s*([0-9]+(?:[.,][0-9]+)?)\\s*xc\\s*\\|\\s*([0-9]+(?:[.,][0-9]+)?)\\s*xs\\s*\\|\\s*([0-9]+(?:[.,][0-9]+)?)\\s*xg\\s*\\|\\s*([0-9]+(?:[.,][0-9]+)?)\\s*zj\\s*\\|\\s*([0-9]+(?:[.,][0-9]+)?)\\s*az/i);
    if(!match)return null;
    const [xc,xs,xg,zj,az]=match.slice(1).map(x=>Number(x.replace(",",".")));
    if([xc,xs,xg,zj,az].some(x=>!Number.isFinite(x)||x<0))return null;
    return {amount_xc:xc+xs*100+xg*10000+zj*10000000+az*100000000,sourceSha:profile.sourceSha};
  }catch{return null;}
}
function openState(identity){
  const owner=identity?.role==="player"
    ? ["player",identity.displayName||"unverified-character"].join(":")
    : ["developer",identity?.identityRef||identity?.displayName||"local-developer"].join(":");
  const key="mp-economy-v1:"+encodeURIComponent(owner);
  let state=null;
  try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved?.version===STATE_VERSION)state={...createState(),...saved};}catch{}
  if(!state)state=createState();
  if(identity?.role==="player"&&!state.wallet_seeded_from_profile){
    const opening=readPinnedProfileWallet(identity);
    if(opening){
      state.wallet_xc=opening.amount_xc;
      state.wallet_seeded_from_profile=true;
      state.wallet_source_sha=opening.sourceSha;
      addLedger(state,{type:"profile_wallet_import",label:"Opening Wallet from pinned Universe profile",quantity:1,amount_xc:opening.amount_xc,source_sha:opening.sourceSha});
    }
  }
  return {key,state};
}
function addItems(state,rows){for(const row of rows||[]){const n=num(row.quantity);if(row.item_id&&n>0)state.inventory[row.item_id]=Math.round((qty(state,row.item_id)+n)*100)/100;}}
function itemPrice(item,field){const value=item.market?.[field];return value===null||value===undefined||value===""?null:(Number.isFinite(Number(value))?num(value):null);}
function itemPriceLabel(item,field){
  if(item.market?.price_lot?.price)return item.market.price_lot.price+" / lot";
  return itemPrice(item,field)===null?"Not priced":currency(itemPrice(item,field));
}
function canBuy(item){
  const method=String(item.acquisition?.method||""),locations=item.acquisition?.locations||[];
  return itemPrice(item,"typical_shop_price_xc")!==null&&(locations.some(x=>/market|toolsmith|seed shop|livestock market|herb shop|apothecary/i.test(x))||/market|purchase/i.test(method));
}
function canGather(item){return ["tree_felling","woodland_collection_or_cut","quarrying_or_digging","underground_mining","foraging_or_hand_harvest","herb_foraging","fishing","water_drawing"].includes(item.acquisition?.method);}
function processRealMs(simMinutes){return num(simMinutes)*60000/CLOCK_RATE;}
function startProcess(state,record){
  const now=Date.now(),process={process_id:uid(),status:"running",started_at:now,finish_at:now+Math.max(1000,processRealMs(record.sim_minutes)),duration_sim_minutes:num(record.sim_minutes),...record};
  state.processes.unshift(process);return process;
}
function reconcile(data,state){
  const now=Date.now();let changed=false;
  for(const p of state.processes){
    if(p.status!=="running"||now<p.finish_at)continue;
    p.status="completed";p.completed_at=now;changed=true;
    if(p.type==="production"||p.type==="gathering"){
      addItems(state,p.outputs);
      for(const out of p.outputs||[])addLedger(state,{type:"process_output",label:data.byId.get(out.item_id)?.name||out.item_id,quantity:out.quantity,amount_xc:0,reference:p.process_id});
    }else if(p.type==="construction"||p.type==="upgrade"){
      state.facilities[p.facility_id]={level:p.target_level,operational:true,built_at:now,last_process_id:p.process_id};
      const f=data.facilitiesById.get(p.facility_id);
      addLedger(state,{type:p.type,label:(f?.name||p.facility_id)+" · L"+p.target_level,quantity:1,amount_xc:0,reference:p.process_id});
    }
  }
  return changed;
}
function facilityRequirementMet(data,state,requirement){
  const text=String(requirement||"").toLowerCase();
  const match=data.facilities.find(f=>text.includes(f.name.toLowerCase()));
  if(!match)return false;
  const level=Number((text.match(/l(\d+)/)||[])[1]||1),owned=state.facilities[match.facility_id];
  return !!owned?.operational&&num(owned.level)>=level;
}
function facilityRequirementsMet(data,state,requirements){return !requirements?.length||requirements.every(x=>facilityRequirementMet(data,state,x));}
function buildRecord(data,state,facility){
  const b=facility.build_requirements||{},materials=b.materials||[],fee=num(b.cash_fee_xc);
  const cost=materialCost(data,materials)+fee;
  const missingMaterials=materials.filter(x=>qty(state,x.item_id)<num(x.quantity));
  const missingTools=(b.builder_tools||[]).filter(x=>!hasNamedItem(data,state,x));
  const constructionRunning=state.processes.some(x=>x.status==="running"&&x.facility_id===facility.facility_id&&(x.type==="construction"||x.type==="upgrade"));
  const predecessors=(b.predecessor||[]).filter(id=>!state.facilities[id]?.operational);
  const builders=num(state.builder_records[facility.facility_id]),requiredBuilders=num(b.builders_required),access=!!state.facility_site_access[facility.facility_id];
  const enoughCash=num(state.wallet_xc)>=cost;
  return {cost,fee,materials,missingMaterials,missingTools,predecessors,builders,requiredBuilders,access,enoughCash,constructionRunning,ready:!state.facilities[facility.facility_id]&&!constructionRunning&&access&&builders>=requiredBuilders&&!missingMaterials.length&&!missingTools.length&&!predecessors.length&&enoughCash};
}
function upgradeRecord(data,state,facility){
  const owned=state.facilities[facility.facility_id],nextLevel=num(owned?.level)+1,level=facility.levels?.[nextLevel-1],upgrade=level?.upgrade;
  if(!owned?.operational||!upgrade)return {available:false,nextLevel,upgrade:null,ready:false,cost:0,missingMaterials:[]};
  const missingMaterials=(upgrade.materials||[]).filter(x=>qty(state,x.item_id)<num(x.quantity)),cost=num(upgrade.cash_fee_xc)+materialCost(data,upgrade.materials);
  return {available:true,nextLevel,upgrade,missingMaterials,cost,ready:!missingMaterials.length&&num(state.wallet_xc)>=cost};
}
function recipeRecord(data,state,recipe){
  const facility=data.facilitiesById.get(recipe.facility_id),owned=state.facilities[recipe.facility_id];
  const missingInputs=(recipe.inputs||[]).filter(x=>qty(state,x.item_id)<num(x.quantity));
  const missingTools=(recipe.tool_requirements||[]).filter(x=>!hasNamedItem(data,state,x));
  const livestockCatalyst=(recipe.inputs||[]).some(x=>data.byId.get(x.item_id)?.category==="livestock");
  const staff=num(facility?.operation_requirements?.staff_count||1),operational=!!owned?.operational&&num(owned.level)>=1;
  return {facility,owned,missingInputs,missingTools,livestockCatalyst,staff,operational,ready:operational&&!missingInputs.length&&!missingTools.length&&staff<=1&&!livestockCatalyst};
}
function gatherRecord(data,state,item){
  const acq=item.acquisition||{},rate=num(acq.output_per_active_sim_minute?.quantity),method=acq.method,site=state.item_site_access[item.item_id]||"";
  const locationReady=!!site&&(acq.locations||[]).includes(site),toolsReady=hasAnyTool(data,state,acq.tool_requirements||[]);
  const facilityReady=facilityRequirementsMet(data,state,acq.facility_requirements||[]),methodReady=canGather(item)&&rate>0;
  const excluded=method==="ordinary_hunting_or_skinning"||method==="plant_grow_harvest";
  const resolvedTools=gatheringToolsReady(data,state,item,site);
  return {selectedSite:site,locationReady,toolsReady:resolvedTools,facilityReady,methodReady,excluded,rate,ready:methodReady&&!excluded&&locationReady&&resolvedTools&&facilityReady};
}
function spend(state,cost){state.wallet_xc=Math.round((num(state.wallet_xc)-num(cost))*100)/100;}
function takeItems(state,rows){for(const row of rows||[])state.inventory[row.item_id]=Math.round((qty(state,row.item_id)-num(row.quantity))*100)/100;}
function formatList(values){
  if(!values?.length)return "<span class='econ-muted'>None listed</span>";
  return "<ul class='econ-requirements'>"+values.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>";
}
function itemCard(item,state){
  return "<button type='button' class='econ-row' data-econ-open-item='"+esc(item.item_id)+"'><span class='econ-row-head'><b>"+esc(item.name)+"</b><small>"+esc(item.item_id)+"</small></span><span class='econ-row-meta'><i>"+esc(item.category)+"</i><i>"+esc(item.unit)+"</i><i>"+esc(itemPriceLabel(item,"typical_shop_price_xc"))+"</i><i>Owned "+esc(tidy(qty(state,item.item_id)))+"</i></span></button>";
}
function facilityCard(facility,state,data){
  const owned=state.facilities[facility.facility_id],cost=materialCost(data,facility.build_requirements?.materials)+num(facility.build_requirements?.cash_fee_xc);
  return "<button type='button' class='econ-row' data-econ-open-facility='"+esc(facility.facility_id)+"'><span class='econ-row-head'><b>"+esc(facility.name)+"</b><small>"+esc(facility.facility_id)+"</small></span><span class='econ-row-meta'><i>"+esc(facility.family)+"</i><i>"+(owned?"BUILT · L"+esc(owned.level):"NOT BUILT")+"</i><i>"+esc(currency(cost))+" build</i></span></button>";
}
function inventoryRows(data,state){return Object.entries(state.inventory).filter(([,n])=>num(n)>0).map(([id,n])=>({item:data.byId.get(id),quantity:n})).filter(x=>x.item).sort((a,b)=>a.item.name.localeCompare(b.item.name));}

export function economyMarkup(){
  return `
    <main class="page-stage economy-stage" data-economy-root>
      <header class="economy-heading"><span class="eyebrow">GAME / DAILY LIFE / ECONOMY</span><h1>Living <em>Economy.</em></h1><p class="page-lead">Items, gathering, construction, processing and local trade share one saved inventory and wallet.</p></header>
      <section class="econ-summary" data-econ-summary><div class="econ-loading">Opening the local economy archive…</div></section>
      <nav class="econ-tabs" aria-label="Economy sections">
        <button type="button" data-econ-tab="items" class="is-active">ITEMS</button><button type="button" data-econ-tab="facilities">FACILITIES</button><button type="button" data-econ-tab="production">PRODUCTION</button><button type="button" data-econ-tab="inventory">INVENTORY</button><button type="button" data-econ-tab="ledger">LEDGER</button>
      </nav>
      <div class="econ-content" data-econ-content><div class="econ-loading">Loading Pocket catalogues…</div></div>
      <p class="econ-footnote">Pocket clock ×48 · Local catalogue assets · Per-profile inventory, wallet and transaction ledger.</p>
    </main>
  `;
}

export function mountEconomy(root,identity){
  if(!root)return ()=>{};
  const summary=root.querySelector("[data-econ-summary]"),content=root.querySelector("[data-econ-content]");
  let disposed=false,tab="items",query="",category="all",selectedItem="",selectedFacility="",showAll=false,data,state,key,tick=null,feedbackText="",feedbackType="info";
  const feedback=(message,type="info")=>{feedbackText=message;feedbackType=type;const el=root.querySelector("[data-econ-feedback]");if(el){el.textContent=feedbackText;el.dataset.kind=feedbackType;}};
  const persist=()=>saveState(state,key);
  const refreshSummary=()=>{
    const items=inventoryRows(data,state),facilities=Object.values(state.facilities).filter(x=>x?.operational).length,running=state.processes.filter(x=>x.status==="running").length;
    summary.innerHTML="<div class='econ-stat'><small>WALLET</small><strong>"+esc(currency(state.wallet_xc))+"</strong></div><div class='econ-stat'><small>ITEM TYPES</small><strong>"+items.length+" / 1,000</strong></div><div class='econ-stat'><small>FACILITIES</small><strong>"+facilities+" / 200</strong></div><div class='econ-stat'><small>ACTIVE PROCESSES</small><strong>"+running+"</strong></div>";
  };
  const itemDetail=item=>{
    if(!item)return "<aside class='econ-detail'><span class='eyebrow'>ITEM RECORD</span><h2>Select an item.</h2><p>Inspect its source, Requirements, tools, facilities, uses and market price.</p></aside>";
    const acq=item.acquisition||{},g=gatherRecord(data,state,item),options=(acq.locations||[]).map(x=>"<option value='"+esc(x)+"' "+(g.selectedSite===x?"selected":"")+">"+esc(x)+"</option>").join("");
    const output=acq.output_per_active_sim_minute,buy=canBuy(item),sell=qty(state,item.item_id)>=1&&itemPrice(item,"typical_merchant_buyback_price_xc")!==null;
    return "<aside class='econ-detail'><div class='econ-detail-top'><span class='eyebrow'>ITEM / "+esc(item.item_id)+"</span><span class='econ-chip'>"+esc(item.category)+"</span></div><h2>"+esc(item.name)+"</h2><p class='econ-muted'>"+esc(item.unit)+" · Quality tier "+esc(item.quality_tier??"Unknown")+"</p>" +
      "<div class='econ-price-pair'><div><small>SHOP PRICE</small><b>"+esc(itemPriceLabel(item,"typical_shop_price_xc"))+"</b></div><div><small>MERCHANT BUYBACK</small><b>"+esc(itemPriceLabel(item,"typical_merchant_buyback_price_xc"))+"</b></div></div>" +
      (item.market?.price_lot?"<p class='econ-lot-note'>Owner price anchor: "+esc(item.market.price_lot.price||"")+"</p>":"")+
      "<h3>Acquisition</h3><p>"+esc(String(acq.method||"Unknown").replaceAll("_"," "))+"</p><p class='econ-muted'>Locations: "+esc((acq.locations||[]).join(" · ")||"Unknown")+"</p><h3>Requirements</h3>"+formatList(item.requirements)+"<h3>Tool Requirements</h3>"+formatList(acq.tool_requirements)+"<h3>Facility Requirements</h3>"+formatList(acq.facility_requirements)+"<h3>Output rate</h3><p>"+(output?esc(tidy(output.quantity)+" "+output.unit):"No active output rate")+"</p><p class='econ-muted'>Acquisition rates are Pocket simulation minutes, not real-world minutes. The ×48 clock is applied by the process scheduler.</p><h3>Uses</h3>"+formatList(item.uses)+
      "<div class='econ-site-form'><label>RECORD ACCESSIBLE LOCATION<select data-econ-site-select='"+esc(item.item_id)+"'>"+options+"</select></label><button type='button' data-econ-action='record-item-site' data-id='"+esc(item.item_id)+"'>RECORD LOCATION ACCESS</button></div><div class='econ-action-row'>"+
      (buy?"<button type='button' data-econ-action='buy' data-id='"+esc(item.item_id)+"'>BUY 1 · "+esc(itemPriceLabel(item,"typical_shop_price_xc"))+"</button>":"")+
      (sell?"<button type='button' data-econ-action='sell' data-id='"+esc(item.item_id)+"'>SELL 1 · "+esc(itemPriceLabel(item,"typical_merchant_buyback_price_xc"))+"</button>":"")+
      (canGather(item)?"<button type='button' data-econ-action='gather' data-id='"+esc(item.item_id)+"' "+(g.ready?"":"disabled")+">GATHER · 60 SIM MIN</button>":"")+
      "</div><p class='econ-hint'>"+(g.ready?"Requirements are met. Gathering output is an expected rate, not a guaranteed hunting result.":"Gathering remains locked until its listed site, tool and facility Requirements are recorded. Hunting, crop growth and undefined processing are not auto-granted.")+"</p></aside>";
  };
  const facilityDetail=facility=>{
    if(!facility)return "<aside class='econ-detail'><span class='eyebrow'>FACILITY RECORD</span><h2>Select a facility.</h2><p>Inspect site Requirements, construction bill, workforce, tools, duration, outputs and upgrades.</p></aside>";
    const owned=state.facilities[facility.facility_id],r=buildRecord(data,state,facility),b=facility.build_requirements||{},u=upgradeRecord(data,state,facility);
    const site=state.facility_site_access[facility.facility_id]||"",options=(facility.location_requirements||[]).map(x=>"<option value='"+esc(x)+"' "+(site===x?"selected":"")+">"+esc(x)+"</option>").join("");
    const outputs=(facility.outputs||[]).map(x=>"<li>"+esc(x.item_name)+" · "+esc(x.quantity_per_sim_minute)+" / simulation minute</li>").join("");
    let action=owned?(u.available?"<button type='button' data-econ-action='upgrade' data-id='"+esc(facility.facility_id)+"' "+(u.ready?"":"disabled")+">UPGRADE TO LEVEL "+u.nextLevel+"</button>":""):"<button type='button' data-econ-action='build' data-id='"+esc(facility.facility_id)+"' "+(r.ready?"":"disabled")+">BEGIN CONSTRUCTION</button>";
    const missing=[];
    if(r.constructionRunning)missing.push("construction is already running");
    if(!r.access)missing.push("record a secured site");
    if(r.builders<r.requiredBuilders)missing.push(r.requiredBuilders+" builders assigned (currently "+r.builders+")");
    if(r.missingMaterials.length)missing.push(r.missingMaterials.length+" material line(s) short");
    if(r.missingTools.length)missing.push("builder tools: "+r.missingTools.join(", "));
    if(r.predecessors.length)missing.push("predecessor facilities: "+r.predecessors.join(", "));
    if(!r.enoughCash)missing.push("wallet short by "+currency(r.cost-state.wallet_xc));
    if(owned&&!u.available)missing.push("maximum listed level reached or upgrade data unavailable");
    return "<aside class='econ-detail'><div class='econ-detail-top'><span class='eyebrow'>FACILITY / "+esc(facility.facility_id)+"</span><span class='econ-chip'>"+(owned?"BUILT · L"+esc(owned.level):"NOT BUILT")+"</span></div><h2>"+esc(facility.name)+"</h2><p class='econ-muted'>"+esc(facility.family)+"</p><h3>Location Requirements</h3>"+formatList(facility.location_requirements)+
      "<h3>Construction Requirements</h3><p>Cash fee: "+esc(currency(b.cash_fee_xc))+" · Materials: "+esc(currency(materialCost(data,b.materials)))+"</p><p><b>Baseline total: "+esc(currency(r.cost))+"</b></p>"+formatList((b.materials||[]).map(x=>x.quantity+" × "+x.item_name))+
      "<h3>Builder tools</h3>"+formatList(b.builder_tools)+"<h3>Construction time</h3><p>"+esc(duration(facility.construction?.duration_sim_minutes))+" · "+esc(tidy(facility.construction?.duration_sim_minutes))+" simulation minutes at ×48.</p><p class='econ-muted'>Builders required: "+esc(b.builders_required??"Unknown")+" · Complexity ×"+esc(facility.construction?.complexity_factor??"Unknown")+" · Site factor ×"+esc(facility.construction?.site_access_factor??"Unknown")+"</p>"+
      "<div class='econ-site-form'><label>RECORD SECURED SITE<select data-econ-facility-site='"+esc(facility.facility_id)+"'>"+options+"</select></label><button type='button' data-econ-action='record-facility-site' data-id='"+esc(facility.facility_id)+"'>RECORD SITE ACCESS</button></div><label class='econ-builder-input'>BUILDERS ASSIGNED <input type='number' min='0' max='50' step='1' value='"+esc(state.builder_records[facility.facility_id]??0)+"' data-econ-builder-count='"+esc(facility.facility_id)+"'></label>"+
      (owned?"<h3>Operation Requirements</h3>"+formatList(facility.operation_requirements?.tools)+"<h3>Outputs</h3>"+(outputs?"<ul class='econ-requirements'>"+outputs+"</ul>":"<p>No output record.</p>"):"")+
      (action||"")+"<p class='econ-hint'>"+(owned?(u.ready?"Upgrade Requirements are met.":"Upgrade locked: "+(u.missingMaterials?.length?"materials missing; ":"")+(!u.ready&&num(state.wallet_xc)<u.cost?"wallet insufficient.":"check Requirements.")):(r.ready?"All construction Requirements are recorded.":"Locked: "+esc(missing.join(" · ")||"construction data incomplete")+"."))+"</p></aside>";
  };
  const renderItems=()=>{
    const filtered=data.items.filter(x=>(category==="all"||x.category===category)&&(!query||(x.name+" "+x.item_id+" "+x.category+" "+(x.acquisition?.method||"")).toLowerCase().includes(query.toLowerCase())));
    const visible=showAll?filtered:filtered.slice(0,60);
    return "<div class='econ-toolbar'><input type='search' data-econ-search placeholder='Search all 1,000 items…' value='"+esc(query)+"'><select data-econ-category><option value='all'>All categories</option>"+[...new Set(data.items.map(x=>x.category))].sort().map(x=>"<option value='"+esc(x)+"' "+(category===x?"selected":"")+">"+esc(x)+"</option>").join("")+"</select></div><div class='econ-browser'><div class='econ-list'><div class='econ-list-title'><b>ITEM RECORDS</b><small>"+filtered.length+" matched · showing "+visible.length+"</small></div>"+(visible.length?visible.map(x=>itemCard(x,state)).join(""):"<p class='econ-empty'>No matching items.</p>")+(filtered.length>visible.length?"<button type='button' class='econ-more' data-econ-action='show-more'>SHOW MORE RECORDS</button>":"")+"</div>"+itemDetail(data.byId.get(selectedItem))+"</div>";
  };
  const renderFacilities=()=>{
    const filtered=data.facilities.filter(x=>!query||(x.name+" "+x.facility_id+" "+x.family).toLowerCase().includes(query.toLowerCase())),visible=showAll?filtered:filtered.slice(0,45);
    return "<div class='econ-toolbar'><input type='search' data-econ-search placeholder='Search 200 facilities…' value='"+esc(query)+"'></div><div class='econ-browser'><div class='econ-list'><div class='econ-list-title'><b>FACILITY REGISTER</b><small>"+filtered.length+" matched · showing "+visible.length+"</small></div>"+(visible.length?visible.map(x=>facilityCard(x,state,data)).join(""):"<p class='econ-empty'>No matching facilities.</p>")+(filtered.length>visible.length?"<button type='button' class='econ-more' data-econ-action='show-more'>SHOW MORE RECORDS</button>":"")+"</div>"+facilityDetail(data.facilitiesById.get(selectedFacility))+"</div>";
  };
  const renderProduction=()=>{
    const filtered=data.recipes.filter(x=>!query||(x.name+" "+x.recipe_id+" "+x.facility_id).toLowerCase().includes(query.toLowerCase()));
    return "<div class='econ-toolbar'><input type='search' data-econ-search placeholder='Search 20 defined production recipes…' value='"+esc(query)+"'></div><div class='econ-list'><div class='econ-list-title'><b>DEFINED RECIPES</b><small>"+filtered.length+" records · no guessed recipes</small></div>"+filtered.map(recipe=>{
      const r=recipeRecord(data,state,x);
      return "<article class='econ-row econ-recipe-row'><span class='econ-row-head'><b>"+esc(x.name)+"</b><small>"+esc(x.recipe_id)+"</small></span><span class='econ-row-meta'><i>"+esc(r.facility?.name||x.facility_id)+"</i><i>"+esc(duration(x.active_process_sim_minutes))+"</i><i>"+(r.ready?"READY":"REQUIREMENTS NOT MET")+"</i></span><button type='button' class='econ-inline-action' data-econ-action='start-recipe' data-id='"+esc(x.recipe_id)+"' "+(r.ready?"":"disabled")+">START PROCESS</button></article>";
    }).join("")+"<p class='econ-hint'>Recipes run only with a built facility, exact inputs and station tools. Livestock-as-input recipes remain locked until reusable animal-asset handling is defined.</p></div>";
  };
  const renderInventory=()=>{
    const rows=inventoryRows(data,state);
    return "<div class='econ-list'><div class='econ-list-title'><b>LOCAL INVENTORY</b><small>"+rows.length+" item types · profile scoped</small></div>"+(rows.length?rows.map(x=>"<div class='econ-row econ-inventory-row'><span class='econ-row-head'><b>"+esc(x.item.name)+"</b><small>"+esc(x.item.item_id)+"</small></span><span class='econ-row-meta'><i>"+esc(x.item.unit)+"</i><i>Owned "+esc(tidy(x.quantity))+"</i><i>Buyback "+esc(itemPriceLabel(x.item,"typical_merchant_buyback_price_xc"))+"</i></span></div>").join(""):"<p class='econ-empty'>This profile has no recorded inventory yet. Nothing is granted automatically.</p>")+"</div>";
  };
  const renderLedger=()=>{
    return "<div class='econ-list'><div class='econ-list-title'><b>TRANSACTION LEDGER</b><small>Newest first · "+state.ledger.length+" records kept</small></div>"+(state.ledger.length?state.ledger.map(x=>"<div class='econ-row econ-ledger-row'><span class='econ-row-head'><b>"+esc(x.label)+"</b><small>"+esc(new Date(x.at).toLocaleString())+"</small></span><span class='econ-row-meta'><i>"+esc(x.type)+"</i><i>"+(x.amount_xc?esc(currency(Math.abs(x.amount_xc))):x.quantity?"Qty "+esc(tidy(x.quantity)):"")+"</i></span></div>").join(""):"<p class='econ-empty'>No transactions recorded.</p>")+"</div>";
  };
  const render=()=>{
    if(disposed||!data)return;
    const focused=document.activeElement?.matches?.("[data-econ-search]"),cursor=focused?document.activeElement.selectionStart:null;
    refreshSummary();root.querySelectorAll("[data-econ-tab]").forEach(x=>x.classList.toggle("is-active",x.dataset.econTab===tab));
    content.innerHTML=tab==="items"?renderItems():tab==="facilities"?renderFacilities():tab==="production"?renderProduction():tab==="inventory"?renderInventory():renderLedger();
    let feedbackNode=root.querySelector("[data-econ-feedback]");
    if(!feedbackNode){content.insertAdjacentHTML("beforeend","<p class='econ-feedback' data-econ-feedback role='status'></p>");feedbackNode=root.querySelector("[data-econ-feedback]");}
    feedbackNode.textContent=feedbackText;feedbackNode.dataset.kind=feedbackType;
    const oldQa=root.querySelector(".econ-qa-button");oldQa?.remove();
    if(identity?.role==="developer"&&!state.qa_grant_used)feedbackNode.insertAdjacentHTML("beforebegin","<button type='button' class='econ-qa-button' data-econ-action='qa-grant'>LOAD DEVELOPER QA SAMPLE PACK</button>");
    if(focused){const field=root.querySelector("[data-econ-search]");field?.focus();if(cursor!==null)field?.setSelectionRange(cursor,cursor);}
  };
  const startGather=item=>{
    const r=gatherRecord(data,state,item);if(!r.ready){feedback("Gathering Requirements are not complete.","warning");return;}
    const amount=Math.round(r.rate*60*100)/100;
    if(amount<=0){feedback("This record has no positive output rate.","warning");return;}
    startProcess(state,{type:"gathering",label:item.name,item_id:item.item_id,sim_minutes:60,outputs:[{item_id:item.item_id,quantity:amount}],source_location:r.selectedSite});
    addLedger(state,{type:"gathering_started",label:item.name,quantity:amount,amount_xc:0});persist();feedback("Gathering started. Expected output: "+tidy(amount)+" "+item.unit+".");
  };
  const startRecipe=recipe=>{
    const r=recipeRecord(data,state,recipe);
    if(!r.ready){feedback(r.livestockCatalyst?"This recipe treats livestock as a consumable input. It is locked until reusable animal-asset handling is defined.":"Facility, inputs, station tools or operator Requirements are not met.","warning");return;}
    takeItems(state,recipe.inputs);
    startProcess(state,{type:"production",label:recipe.name,recipe_id:recipe.recipe_id,facility_id:recipe.facility_id,sim_minutes:recipe.active_process_sim_minutes,outputs:recipe.outputs.map(x=>({item_id:x.item_id,quantity:x.quantity}))});
    addLedger(state,{type:"production_started",label:recipe.name,quantity:1,amount_xc:0});persist();feedback("Production started. Inputs were reserved once; output will be granted once at completion.");
  };
  const startBuild=(facility,isUpgrade)=>{
    if(!isUpgrade){
      const r=buildRecord(data,state,facility);if(!r.ready){feedback("Construction Requirements are incomplete.","warning");return;}
      takeItems(state,r.materials);spend(state,r.cost);
      startProcess(state,{type:"construction",label:facility.name,facility_id:facility.facility_id,target_level:1,sim_minutes:facility.construction.duration_sim_minutes*r.requiredBuilders/Math.max(1,r.builders)});
      addLedger(state,{type:"construction_started",label:facility.name,quantity:1,amount_xc:-r.cost});
    }else{
      const r=upgradeRecord(data,state,facility);if(!r.ready||!r.upgrade){feedback("Upgrade Requirements are incomplete.","warning");return;}
      takeItems(state,r.upgrade.materials);spend(state,r.cost);
      startProcess(state,{type:"upgrade",label:facility.name+" L"+r.nextLevel,facility_id:facility.facility_id,target_level:r.nextLevel,sim_minutes:r.upgrade.duration_sim_minutes});
      addLedger(state,{type:"upgrade_started",label:facility.name+" L"+r.nextLevel,quantity:1,amount_xc:-r.cost});
    }
    persist();feedback("Construction process started. Its stored finish time survives app restarts.");
  };
  const click=event=>{
    const tabBtn=event.target.closest("[data-econ-tab]");if(tabBtn){tab=tabBtn.dataset.econTab;query="";showAll=false;render();return;}
    const itemBtn=event.target.closest("[data-econ-open-item]");if(itemBtn){selectedItem=itemBtn.dataset.econOpenItem;render();return;}
    const facBtn=event.target.closest("[data-econ-open-facility]");if(facBtn){selectedFacility=facBtn.dataset.econOpenFacility;render();return;}
    const button=event.target.closest("[data-econ-action]");if(!button||button.disabled)return;
    const action=button.dataset.econAction,id=button.dataset.id;
    if(action==="show-more")showAll=true;
    else if(action==="buy"){
      const item=data.byId.get(id),price=itemPrice(item,"typical_shop_price_xc");
      if(!item||!canBuy(item)||price===null||state.wallet_xc<price){feedback("Market purchase Requirements or wallet balance are not met.","warning");return;}
      spend(state,price);addItems(state,[{item_id:id,quantity:1}]);addLedger(state,{type:"market_purchase",label:item.name,quantity:1,amount_xc:-price});feedback("Purchased 1 "+item.name+".");
    }else if(action==="sell"){
      const item=data.byId.get(id),price=itemPrice(item,"typical_merchant_buyback_price_xc");
      if(!item||qty(state,id)<1||price===null){feedback("There is no sellable unit in this inventory.","warning");return;}
      state.inventory[id]=qty(state,id)-1;state.wallet_xc=Math.round((state.wallet_xc+price)*100)/100;addLedger(state,{type:"market_sale",label:item.name,quantity:1,amount_xc:price});feedback("Sold 1 "+item.name+".");
    }else if(action==="record-item-site"){
      const select=root.querySelector("[data-econ-site-select='"+CSS.escape(id)+"']");
      if(!select?.value){feedback("Choose a location listed in this item record.","warning");return;}
      state.item_site_access[id]=select.value;addLedger(state,{type:"site_access_recorded",label:data.byId.get(id)?.name||id,quantity:1,amount_xc:0});feedback("Location access recorded locally. This is a player-entered site record, not a map-discovery claim.");
    }else if(action==="gather"){
      const item=data.byId.get(id);if(item)startGather(item);
    }else if(action==="record-facility-site"){
      const select=root.querySelector("[data-econ-facility-site='"+CSS.escape(id)+"']");
      if(!select?.value){feedback("Choose a location listed in this facility record.","warning");return;}
      state.facility_site_access[id]=select.value;addLedger(state,{type:"facility_site_recorded",label:data.facilitiesById.get(id)?.name||id,quantity:1,amount_xc:0});feedback("Site access recorded locally. Live world-location verification is not yet connected.");
    }else if(action==="build"||action==="upgrade"){
      const facility=data.facilitiesById.get(id);if(facility)startBuild(facility,action==="upgrade");
    }else if(action==="start-recipe"){
      const recipe=data.recipesById.get(id);if(recipe)startRecipe(recipe);
    }else if(action==="qa-grant"){
      if(identity?.role!=="developer"||state.qa_grant_used)return;
      state.wallet_xc=Math.max(state.wallet_xc,70000);
      addItems(state,[{item_id:"itm.0132",quantity:40},{item_id:"itm.0081",quantity:30},{item_id:"itm.0641",quantity:12},{item_id:"itm.0048",quantity:12},{item_id:"itm.0001",quantity:2},{item_id:"itm.0009",quantity:2},{item_id:"itm.0042",quantity:2},{item_id:"itm.0036",quantity:1},{item_id:"itm.0046",quantity:2},{item_id:"itm.0047",quantity:1},{item_id:"itm.0005",quantity:1},{item_id:"itm.0019",quantity:2}]);
      state.builder_records["facility.water.01"]=1;state.qa_grant_used=true;addLedger(state,{type:"developer_qa_grant",label:"Developer QA sample pack · 700 xs",quantity:1,amount_xc:0});feedback("Developer QA pack loaded. Player accounts never receive this test grant.");
    }
    persist();render();
  };
  const input=event=>{
    if(event.target.matches("[data-econ-search]")){query=event.target.value;showAll=false;render();}
    if(event.target.matches("[data-econ-category]")){category=event.target.value;showAll=false;render();}
  };
  const change=event=>{if(event.target.matches("[data-econ-builder-count]")){state.builder_records[event.target.dataset.econBuilderCount]=Math.max(0,Math.min(50,Math.floor(num(event.target.value))));persist();}};
  root.addEventListener("click",click);root.addEventListener("input",input);root.addEventListener("change",change);
  const initialize=async()=>{
    try{
      data=await loadPocketEconomy();runtimeData=data;if(disposed)return;
      ({key,state}=openState(identity));if(reconcile(data,state))persist();render();
      tick=window.setInterval(()=>{if(disposed)return;if(reconcile(data,state))persist();refreshSummary();},1000);
    }catch(error){
      if(disposed)return;
      summary.innerHTML="<div class='econ-error'>ECONOMY DATA UNAVAILABLE</div>";
      content.innerHTML="<p class='econ-empty'>"+esc(error?.message||"Pocket economy assets could not be loaded.")+" Rebuild the APK so catalogues are copied into local data assets.</p>";
    }
  };
  void initialize();
  return ()=>{disposed=true;if(tick!==null)window.clearInterval(tick);root.removeEventListener("click",click);root.removeEventListener("input",input);root.removeEventListener("change",change);};
}
