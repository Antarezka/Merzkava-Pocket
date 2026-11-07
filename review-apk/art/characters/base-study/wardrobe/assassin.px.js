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
    arm:[1.48,1.34,1.08], body:[3.95,4.1],
    sleeve:"nNc", fore:"vww", farSleeve:"NNn", farFore:"vvw",
    inner:"vW", outer:"nNc", belt:"gG", skirt:"vW",
    drape:{ length:8.6, out:"nNc", lining:"N", hem:"N", trail:1.35, push:0.75, radius:4.35, flare:1.0, folds:5, phase:0.9, openFront:1.2 },
    over:[{ length:7.5, out:"vwwW", lining:"v", hem:"v", trail:1.65, push:0.45, radius:4.1, flare:1.0, folds:4, phase:0.2 }]
  },
  bottom: {
    leg:[1.82,1.68,1.46], tr:"RPP", farTr:"RRP", shin:"DDd", foot:"Ddl", cuff:0.55,
    drape:{ length:7.4, out:"nNc", lining:"N", hem:"N", trail:1.55, push:0.9, radius:4.15, flare:1.25, folds:5, phase:0.6, openFront:0.82 }
  },
  back:{ type:"twin-blades", blade:"wW" }
}
