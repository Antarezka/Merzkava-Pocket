const STUDY_ASSASSIN = {
  id: "assassin", label: "Assassin",
  hair: "hood", headAccessory: "dark-mask",
  palette: {
    k:"#171922", z:"#8e5c4b", s:"#ca9274", S:"#efc4a5", L:"#ffe4c9",
    J:"#11151d", j:"#202a35", h:"#354657", H:"#5a7082",
    E:"#1a2736", e:"#a58c54", G:"#e8e0c8",
    n:"#283a46", N:"#172732", c:"#405867", C:"#758e9a",
    v:"#444c5a", w:"#737e89", W:"#abb4b8", p:"#3c4655",
    P:"#2a3341", R:"#1c2733", d:"#534337", D:"#302923", l:"#79634c",
    g:"#ad925b", B:"#7b5250", T:"#4d343a"
  },
  top: {
    arm:[1.95,1.75,1.35], body:[4.3,4.5],
    sleeve:"nNc", fore:"vww", farSleeve:"NNn", farFore:"vvw",
    inner:"vW", outer:"nNc", belt:"gG", skirt:"vW",
    drape:{ length:9.8, out:"nNc", lining:"N", hem:"N", trail:1.9, push:1.0, radius:4.9, flare:1.8, folds:5, phase:0.9, openFront:0.65 },
    over:[{ length:7.5, out:"vwwW", lining:"v", hem:"v", trail:1.8, push:0.7, radius:4.65, flare:1.2, folds:4, phase:0.2 }]
  },
  bottom: {
    leg:[1.82,1.68,1.46], tr:"RPP", farTr:"RRP", shin:"DDd", foot:"Ddl", cuff:0.55,
    drape:{ length:8.3, out:"nNc", lining:"N", hem:"N", trail:1.9, push:1.15, radius:4.7, flare:2.0, folds:5, phase:0.6, openFront:0.35 }
  },
  back:{ type:"twin-blades", blade:"wW" }
}
