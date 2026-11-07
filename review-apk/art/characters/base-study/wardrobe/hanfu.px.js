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
    arm:[2.35,2.1,1.45], body:[4.4,4.65],
    sleeve:"nNcC", fore:"cC", farSleeve:"NNn", farFore:"vvw",
    inner:"vW", outer:"nNcC", belt:"gG", skirt:"nNc",
    drape:{ length:13.3, out:"nNcC", lining:"Nn", hem:"N", trail:2.0, push:1.4, radius:5.35, flare:2.45, folds:5, phase:0.35 },
    over:[{ length:8.0, out:"vwwW", lining:"v", hem:"v", trail:1.2, push:0.9, radius:4.85, flare:1.15, folds:4, phase:1.1 }]
  },
  bottom: {
    leg:[1.82,1.65,1.42], tr:"RPp", farTr:"RRP", shin:"DDd", foot:"Ddl", cuff:0.52,
    drape:{ length:12.8, out:"vwwW", lining:"v", hem:"v", trail:2.25, push:1.6, radius:5.0, flare:4.0, folds:7, phase:0.6 }
  },
  back:{ type:"ribbons", material:"vW" }
}
