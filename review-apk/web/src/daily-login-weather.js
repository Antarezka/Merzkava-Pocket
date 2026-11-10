export const DAILY_LOGIN_WEATHER_TABLES = Object.freeze({
 day:Object.freeze([
  Object.freeze({id:"clear",weight:16}),Object.freeze({id:"cloudy",weight:22}),Object.freeze({id:"overcast",weight:14}),
  Object.freeze({id:"thunder",weight:8}),Object.freeze({id:"drizzle",weight:18}),Object.freeze({id:"storm",weight:10}),Object.freeze({id:"rainbow",weight:12})
 ]),
 night:Object.freeze([
  Object.freeze({id:"starfield",weight:24}),Object.freeze({id:"moon-cloud",weight:20}),Object.freeze({id:"night-rain",weight:10}),
  Object.freeze({id:"cloudy",weight:12}),Object.freeze({id:"overcast",weight:8}),Object.freeze({id:"thunder",weight:5}),
  Object.freeze({id:"drizzle",weight:8}),Object.freeze({id:"storm",weight:6}),Object.freeze({id:"rainbow",weight:2}),Object.freeze({id:"clear",weight:5})
 ])
});
const RAINY_WEATHER=new Set(["drizzle","storm","night-rain"]);
function randomUnit(random){const value=Number(random());return Number.isFinite(value)?Math.min(.999999999,Math.max(0,value)):0;}
function weightedWeather(entries,random){
 const total=entries.reduce((sum,entry)=>sum+entry.weight,0),target=randomUnit(random)*total;
 let cursor=0;for(const entry of entries){cursor+=entry.weight;if(target<cursor)return entry.id;}
 return entries[entries.length-1].id;
}
export function createDailyLoginWeatherProfile({hour=new Date().getHours(),season=null,random=Math.random}={}){
 const numericHour=Number(hour),night=Number.isFinite(numericHour)&&(numericHour<5||numericHour>=18.5);
 const weather=weightedWeather(night?DAILY_LOGIN_WEATHER_TABLES.night:DAILY_LOGIN_WEATHER_TABLES.day,random);
 const validSeason=season==="winter"||season==="autumn"||season==="none",roll=validSeason?null:randomUnit(random);
 const selectedSeason=validSeason?season:roll<.1?"winter":roll<.22?"autumn":"none";
 const raining=RAINY_WEATHER.has(weather),precipitation=selectedSeason==="winter"?(raining?"sleet":"snow"):(raining?"rain":"none");
 return Object.freeze({weather,season:selectedSeason,raining,precipitation,night});
}