const STUDY_SECT_GUARD = {
  id: "sect_guard", label: "Sect guard",
  hair: "braid", headAccessory: "cloth-band",
  palette: {
    k:"#1b1a1a", z:"#91604b", s:"#cd9575", S:"#edc09e", L:"#ffe2c5",
    J:"#17191d", j:"#292d32", h:"#48505a", H:"#727b82",
    E:"#252c34", e:"#c3a15c", G:"#f2e7cb",
    n:"#4a5147", N:"#2d372f", c:"#69775f", C:"#a4ad8b",
    v:"#6b6558", w:"#988d74", W:"#c7b998", p:"#5b5a53",
    P:"#41413b", R:"#2b302b", d:"#70563b", D:"#443326", l:"#98774e",
    g:"#c0a05e", B:"#8c5b48", T:"#624238"
  },
  top: {
    arm:[2.2,2.0,1.5], body:[4.45,4.7],
    sleeve:"nNc", fore:"vww", farSleeve:"NNn", farFore:"vvw",
    inner:"vW", outer:"nNcC", belt:"gG", skirt:"vW",
    drape:{ length:10.8, out:"nNcC", lining:"Nn", hem:"N", trail:1.0, push:1.2, radius:5.2, flare:1.8, folds:5, phase:0.5, openFront:0.4 },
    over:[{ length:6.5, out:"dDl", lining:"D", hem:"D", trail:0.45, push:0.65, radius:5.0, flare:1.1, folds:6, phase:0.9 }]
  },
  bottom: {
    leg:[1.92,1.75,1.52], tr:"RPP", farTr:"RRP", shin:"DDd", foot:"Ddl", cuff:0.46,
    drape:{ length:8.7, out:"dDl", lining:"D", hem:"D", trail:0.8, push:1.35, radius:4.9, flare:2.3, folds:6, phase:0.4 }
  },
  back:{ type:"pack", material:"dDl", strap:"gG" }
}
