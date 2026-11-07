const STUDY_LONG_ROBE = {
  id: "long_robe", label: "Long robe",
  hair: "bun", headAccessory: "jade-pin",
  palette: {
    k:"#1b1820", z:"#94604b", s:"#d09a79", S:"#f0c4a2", L:"#ffe5c9",
    J:"#1b171b", j:"#34232b", h:"#5b3747", H:"#936071",
    E:"#27253b", e:"#d4b36c", G:"#fff3d9",
    n:"#644052", N:"#3d293a", c:"#936276", C:"#c8a0a2",
    v:"#665368", w:"#a28da0", W:"#d4c0bd", p:"#57495a",
    P:"#3d3045", R:"#2b2233", d:"#78563c", D:"#4b3427", l:"#9b7955",
    g:"#d0ad67", B:"#a46662", T:"#71434d", t:"#8f5262", b:"#c98891"
  },
  top: {
    arm:[2.45,2.2,1.5], body:[4.45,4.8],
    sleeve:"TtBb", fore:"bB", farSleeve:"TTt", farFore:"TtB",
    inner:"vW", outer:"TtBb", belt:"gG", skirt:"vW",
    drape:{ length:15.2, out:"TtBb", lining:"Tt", hem:"T", trail:2.3, push:1.5, radius:5.5, flare:2.8, folds:7, phase:0.35 },
    over:[{ length:10.5, out:"vwwW", lining:"v", hem:"v", trail:1.6, push:1.0, radius:5.0, flare:1.55, folds:5, phase:1.0 }]
  },
  bottom: {
    leg:[1.9,1.72,1.5], tr:"RPP", farTr:"RRP", shin:"DDd", foot:"Ddl", cuff:0.48,
    drape:{ length:13.8, out:"TtBb", lining:"Tt", hem:"T", trail:2.5, push:1.65, radius:5.0, flare:4.8, folds:8, phase:0.5 }
  },
  back:{ type:"scroll", material:"wW" }
}
