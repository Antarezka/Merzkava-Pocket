export const OPEN_METEO_ATTRIBUTION="Weather data by Open-Meteo";
const OPEN_METEO_URL="https://api.open-meteo.com/v1/forecast";
const TIMEZONE_MAP_URL="/timezone-locations.json";

export function getDeviceTimeZone(){
 try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"Etc/UTC";}
 catch{return "Etc/UTC";}
}

export function resolveTimeZoneReference(timeZone,locations={}){
 if(locations&&locations[timeZone])return {...locations[timeZone]};
 let longitude=0;
 try{
  const parts=new Intl.DateTimeFormat("en",{timeZone,timeZoneName:"longOffset"}).formatToParts(new Date());
  const offset=parts.find(part=>part.type==="timeZoneName")?.value||"GMT";
  const sign=offset.includes("-")?-1:1;
  const value=offset.startsWith("GMT")?offset.slice(3):"";
  const fields=value.replace("+","").replace("-","").split(":");
  longitude=Math.max(-180,Math.min(180,sign*(Number(fields[0]||0)+Number(fields[1]||0)/60)*15));
 }catch{}
 const label=String(timeZone||"Timezone reference").split("/").at(-1)?.replace(/_/g," ")||"Timezone reference";
 return {latitude:0,longitude,label};
}

export function getSeasonForLatitude(latitude,date=new Date()){
 const lat=Number(latitude);
 if(!Number.isFinite(lat)||Math.abs(lat)<23.5)return "tropical";
 const month=date.getMonth();
 if(lat>0){
  if(month>=2&&month<=4)return "spring";
  if(month>=5&&month<=7)return "summer";
  if(month>=8&&month<=10)return "autumn";
  return "winter";
 }
 if(month>=2&&month<=4)return "autumn";
 if(month>=5&&month<=7)return "winter";
 if(month>=8&&month<=10)return "spring";
 return "summer";
}
const RAIN_CODES=new Set([51,53,55,56,57,61,63,65,66,67,80,81,82]);
const SNOW_CODES=new Set([71,73,75,77,85,86]);
const THUNDER_CODES=new Set([95,96,99]);
const HEAVY_RAIN_CODES=new Set([63,65,67,82]);
function hasRecentRain(hourly,currentTime){
 if(!hourly||!Array.isArray(hourly.time))return false;
 const hour=String(currentTime||"").slice(0,13);
 const index=hourly.time.findIndex(value=>String(value).slice(0,13)===hour);
 if(index<0)return false;
 for(let i=Math.max(0,index-3);i<index;i++){
  const rain=Number(hourly.rain?.[i]||0)+Number(hourly.showers?.[i]||0);
  const precipitation=Number(hourly.precipitation?.[i]||0);
  const code=Number(hourly.weather_code?.[i]??-1);
  if(rain>.05||precipitation>.05||RAIN_CODES.has(code))return true;
 }
 return false;
}
export function classifyDailyLoginWeather(current,hourly=null,latitude=0,date=new Date()){
 const codeValue=Number(current?.weather_code),code=Number.isFinite(codeValue)?codeValue:-1;
 const isDay=Number(current?.is_day)===1;
 const cloudCover=Math.max(0,Math.min(100,Number(current?.cloud_cover)||0));
 const totalPrecipitation=Math.max(0,Number(current?.precipitation)||0);
 const rainAmount=Math.max(0,Number(current?.rain)||0,Number(current?.showers)||0);
 const snowfallAmount=Math.max(0,Number(current?.snowfall)||0);
 const thunder=THUNDER_CODES.has(code),snowing=SNOW_CODES.has(code)||snowfallAmount>.01;
 const raining=RAIN_CODES.has(code)||rainAmount>.01||(!snowing&&totalPrecipitation>.05);
 const season=getSeasonForLatitude(latitude,date);
 const recentRain=!raining&&!snowing&&hasRecentRain(hourly,current?.time);
 const heavyRain=HEAVY_RAIN_CODES.has(code)||rainAmount>=2.5;
 let weather="clear";
 if(thunder)weather="thunder";
 else if(raining&&!isDay)weather="night-rain";
 else if(raining&&heavyRain)weather="storm";
 else if(raining)weather="drizzle";
 else if(snowing)weather="overcast";
 else if(recentRain&&isDay&&cloudCover<80)weather="rainbow";
 else if(!isDay){
  if(cloudCover>=84||code===3||code===45||code===48)weather="overcast";
  else if(cloudCover>=22||code===1||code===2)weather="moon-cloud";
  else weather="starfield";
 }else if(cloudCover>=84||code===3||code===45||code===48)weather="overcast";
 else if(cloudCover>=22||code===1||code===2)weather="cloudy";
 let roadPrecipitation="none";
 if(snowing)roadPrecipitation=raining?"sleet":"snow";
 else if(season==="winter")roadPrecipitation=raining?"sleet":"snow";
 else if(raining)roadPrecipitation="rain";
 return Object.freeze({
  weather,season:snowing?"winter":season,precipitation:roadPrecipitation,
  isDay,raining,snowing,recentRain,autumn:season==="autumn"&&!snowing,
  temperatureC:Number.isFinite(Number(current?.temperature_2m))?Number(current.temperature_2m):null,
  windKmh:Number.isFinite(Number(current?.wind_speed_10m))?Number(current.wind_speed_10m):null
 });
}
export async function fetchDailyLoginWeather({fetchImpl=globalThis.fetch,timeZone=getDeviceTimeZone(),signal}={}){
 if(typeof fetchImpl!=="function")throw new Error("Weather network access is unavailable.");
 let locations={};
 try{
  const response=await fetchImpl(TIMEZONE_MAP_URL,{signal,cache:"force-cache"});
  if(response.ok){const table=await response.json();locations=table?.locations||{};}
 }catch{}
 const reference=resolveTimeZoneReference(timeZone,locations);
 const query=new URLSearchParams({
  latitude:String(reference.latitude),longitude:String(reference.longitude),
  current:"temperature_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m",
  hourly:"precipitation,rain,showers,snowfall,weather_code",
  past_days:"1",forecast_days:"1",timezone:timeZone,temperature_unit:"celsius",wind_speed_unit:"kmh"
 });
 const result=await fetchImpl(OPEN_METEO_URL+"?"+query.toString(),{signal,headers:{Accept:"application/json"},cache:"no-store"});
 if(!result.ok)throw new Error("Open-Meteo weather request failed ("+result.status+").");
 const data=await result.json();
 if(!data?.current||!Number.isFinite(Number(data.current.weather_code)))throw new Error("Open-Meteo returned incomplete current weather.");
 return {timeZone,reference,current:data.current,hourly:data.hourly||null,attribution:OPEN_METEO_ATTRIBUTION,fetchedAt:Date.now()};
}
