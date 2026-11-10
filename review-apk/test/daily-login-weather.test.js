import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDailyLoginWeather,
  fetchDailyLoginWeather,
  getSeasonForLatitude,
  resolveTimeZoneReference
} from "../web/src/daily-login-weather.js";

function monthDate(month){return new Date(2026,month-1,10,12,0,0);}

test("timezone lookup is a representative point, never a GPS read",()=>{
 const map={
  "Asia/Jakarta":{latitude:-6.16667,longitude:106.8,label:"Jakarta"},
  "Asia/Makassar":{latitude:-5.11667,longitude:119.4,label:"Makassar"},
  "Asia/Jayapura":{latitude:-2.53333,longitude:140.7,label:"Jayapura"}
 };
 assert.deepEqual(resolveTimeZoneReference("Asia/Jakarta",map),map["Asia/Jakarta"]);
 assert.equal(resolveTimeZoneReference("Asia/NewZone",{}).latitude,0);
});

test("season selection follows reference-city hemisphere and calendar",()=>{
 assert.equal(getSeasonForLatitude(51.5,monthDate(10)),"autumn");
 assert.equal(getSeasonForLatitude(-33.9,monthDate(10)),"spring");
 assert.equal(getSeasonForLatitude(40.7,monthDate(1)),"winter");
 assert.equal(getSeasonForLatitude(-37.8,monthDate(1)),"summer");
 assert.equal(getSeasonForLatitude(-6.16,monthDate(11)),"tropical");
});

test("clear, starfield, clouds, overcast and moonlit clouds use observed conditions",()=>{
 assert.equal(classifyDailyLoginWeather({weather_code:0,is_day:1,cloud_cover:2},null,35,monthDate(7)).weather,"clear");
 assert.equal(classifyDailyLoginWeather({weather_code:0,is_day:0,cloud_cover:2},null,35,monthDate(7)).weather,"starfield");
 assert.equal(classifyDailyLoginWeather({weather_code:2,is_day:1,cloud_cover:42},null,35,monthDate(7)).weather,"cloudy");
 assert.equal(classifyDailyLoginWeather({weather_code:3,is_day:1,cloud_cover:96},null,35,monthDate(7)).weather,"overcast");
 assert.equal(classifyDailyLoginWeather({weather_code:2,is_day:0,cloud_cover:54},null,35,monthDate(7)).weather,"moon-cloud");
});

test("light rain, heavy rain, thunder and night rain are distinct",()=>{
 assert.equal(classifyDailyLoginWeather({weather_code:51,is_day:1,rain:.1,precipitation:.1},null,5,monthDate(11)).weather,"drizzle");
 assert.equal(classifyDailyLoginWeather({weather_code:65,is_day:1,rain:3,precipitation:3},null,5,monthDate(11)).weather,"storm");
 assert.equal(classifyDailyLoginWeather({weather_code:95,is_day:1,rain:1,precipitation:1},null,5,monthDate(11)).weather,"thunder");
 assert.equal(classifyDailyLoginWeather({weather_code:61,is_day:0,rain:.3,precipitation:.3},null,5,monthDate(11)).weather,"night-rain");
});

test("winter road remains snowy when dry and becomes slush when rain arrives",()=>{
 const dry=classifyDailyLoginWeather({weather_code:0,is_day:1,cloud_cover:0},null,51,monthDate(1));
 const wet=classifyDailyLoginWeather({weather_code:61,is_day:1,rain:.6,precipitation:.6},null,51,monthDate(1));
 const snow=classifyDailyLoginWeather({weather_code:73,is_day:1,snowfall:.4,precipitation:.4},null,51,monthDate(1));
 assert.equal(dry.precipitation,"snow");
 assert.equal(dry.snowing,false);
 assert.equal(wet.precipitation,"sleet");
 assert.equal(snow.precipitation,"snow");
 assert.equal(snow.snowing,true);
});

test("autumn leaves remain while rain wets the road",()=>{
 const dry=classifyDailyLoginWeather({weather_code:2,is_day:1,cloud_cover:42},null,51,monthDate(10));
 const wet=classifyDailyLoginWeather({weather_code:61,is_day:1,rain:.6,precipitation:.6},null,51,monthDate(10));
 assert.equal(dry.autumn,true);
 assert.equal(dry.precipitation,"none");
 assert.equal(wet.autumn,true);
 assert.equal(wet.precipitation,"rain");
});

test("subtle rainbow is reserved for when observed rainfall has stopped",()=>{
 const hourly={
  time:["2026-11-10T12:00","2026-11-10T13:00","2026-11-10T14:00","2026-11-10T15:00"],
  rain:[0,.3,0,0],showers:[0,0,0,0],precipitation:[0,.3,0,0],weather_code:[0,61,1,1]
 };
 const result=classifyDailyLoginWeather({
  time:"2026-11-10T15:20",weather_code:1,is_day:1,cloud_cover:24,rain:0,precipitation:0
 },hourly,5,monthDate(11));
 assert.equal(result.weather,"rainbow");
 assert.equal(result.precipitation,"none");
});

test("Open-Meteo forecast uses the bundled timezone reference point",async()=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url:String(url),options});
  if(String(url)==="/timezone-locations.json")return {
   ok:true,json:async()=>({locations:{"Asia/Jakarta":{latitude:-6.16667,longitude:106.8,label:"Jakarta"}}})
  };
  return {ok:true,json:async()=>({
   current:{time:"2026-11-10T12:00",weather_code:2,is_day:1,cloud_cover:40,temperature_2m:28},
   hourly:{time:[],rain:[],showers:[],precipitation:[],weather_code:[]}
  })};
 };
 const result=await fetchDailyLoginWeather({fetchImpl,timeZone:"Asia/Jakarta"});
 const url=new URL(calls[1].url);
 assert.equal(calls.length,2);
 assert.equal(url.hostname,"api.open-meteo.com");
 assert.equal(url.pathname,"/v1/forecast");
 assert.equal(url.searchParams.get("latitude"),"-6.16667");
 assert.equal(url.searchParams.get("longitude"),"106.8");
 assert.equal(url.searchParams.get("timezone"),"Asia/Jakarta");
 assert.equal(result.reference.label,"Jakarta");
});
