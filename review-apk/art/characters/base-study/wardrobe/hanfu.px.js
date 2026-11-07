const STUDY_HANFU = {
  id: "hanfu", label: "Hanfu",
  hair: "long", headAccessory: "jade-pin",
  palette: {
    k:"#1b1720", z:"#95634e", s:"#d2a080", S:"#f1c8a8", L:"#ffe5ca",
    J:"#171521", j:"#292339", h:"#493c5b", H:"#78658d",
    E:"#252b3a", e:"#b89146", G:"#fff2d9",
    n:"#365d64", N:"#213c49", c:"#56858d", C:"#9bbfc0",
    v:"#4e536b", w:"#8093a8", W:"#b9cbd0", p:"#58536d",
    P:"#39384f", R:"#28283b", d:"#70533b", D:"#453324", l:"#96724e",
    g:"#c4a05a", B:"#985e68", T:"#603b52"
  },
  top: {
    arm:[1.72,1.54,1.18], body:[4.0,4.25],
    sleeve:"nNcC", fore:"cC", farSleeve:"NNn", farFore:"vvw",
    inner:"vW", outer:"nNcC", belt:"gG", skirt:"nNc",
    drape:{ length:12.8, out:"nNcC", lining:"Nn", hem:"N", trail:1.35, push:0.9, radius:4.55, flare:1.35, folds:5, phase:0.35, openFront:1.05 },
    over:[{ length:8.0, out:"vwwW", lining:"v", hem:"v", trail:0.9, push:0.65, radius:4.2, flare:0.75, folds:4, phase:1.1 }]
  },
  bottom: {
    leg:[1.82,1.65,1.42], tr:"RPp", farTr:"RRP", shin:"DDd", foot:"Ddl", cuff:0.52,
    drape:{ length:12.0, out:"vwwW", lining:"v", hem:"v", trail:1.55, push:1.05, radius:4.35, flare:2.5, folds:7, phase:0.6 }
  },
  back:{ type:"ribbons", material:"vW" }
}
