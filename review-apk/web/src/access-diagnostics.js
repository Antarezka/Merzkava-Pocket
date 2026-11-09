// Short, deliberately incomplete diagnostics for the visual access trace.
// These labels are fragments, not claims that a network or local operation has completed.
const makeEntry = (text, group, cycles = 0) => Object.freeze({
  text,
  group,
  cycles,
  truncated: true
});

const PLAYER_TRACE = Object.freeze([
  makeEntry("edge rout", "EDGE / ROUT"),
  makeEntry("DNS resolv", "EDGE / ROUT", 2),
  makeEntry("TCP sock", "EDGE / ROUT"),
  makeEntry("server int", "SERVER / TRANS", 3),
  makeEntry("TLS handsh", "SERVER / TRANS", 3),
  makeEntry("cert cha", "SERVER / TRANS", 2),
  makeEntry("SNI rout", "SERVER / TRANS"),
  makeEntry("socket poo", "SERVER / TRANS"),
  makeEntry("HTTP/2 sess", "HTTP / API"),
  makeEntry("API endpoi", "HTTP / API", 3),
  makeEntry("request hea", "HTTP / API"),
  makeEntry("cache poli", "HTTP / API"),
  makeEntry("registry fetc", "UNIVERSE / REG", 3),
  makeEntry("source pin ver", "UNIVERSE / REG", 2),
  makeEntry("SHA-256 dig", "UNIVERSE / REG"),
  makeEntry("manifest ver", "UNIVERSE / REG"),
  makeEntry("payload strea", "PAYLOAD / INTEG", 3),
  makeEntry("ETag matc", "PAYLOAD / INTEG"),
  makeEntry("response sta", "PAYLOAD / INTEG", 2),
  makeEntry("JSON pars", "PAYLOAD / INTEG"),
  makeEntry("UTF-8 decod", "PAYLOAD / INTEG"),
  makeEntry("Unicode norm", "IDENT / MATC"),
  makeEntry("name canon", "IDENT / MATC"),
  makeEntry("exact matc", "IDENT / MATC", 2),
  makeEntry("player entr", "IDENT / MATC"),
  makeEntry("profile inde", "POCKET / CACH"),
  makeEntry("local cach", "POCKET / CACH"),
  makeEntry("save schema ver", "POCKET / CACH"),
  makeEntry("session tok", "SESSION / SEC"),
  makeEntry("nonce chec", "SESSION / SEC", 2),
  makeEntry("signature ver", "SESSION / SEC", 3),
  makeEntry("integrity chec", "SESSION / SEC"),
  makeEntry("role scop", "SESSION / SEC"),
  makeEntry("access clai", "SESSION / SEC", 2),
  makeEntry("session bin", "SESSION / HAND"),
  makeEntry("clock sk", "SESSION / HAND"),
  makeEntry("retry wind", "SESSION / HAND", 2),
  makeEntry("connection poo", "SESSION / HAND", 3),
  makeEntry("result await", "SESSION / HAND", 2),
  makeEntry("identity hand", "SESSION / HAND")
]);

const DEVELOPER_TRACE = Object.freeze([
  makeEntry("credential inp", "CRED / INP"),
  makeEntry("salt retr", "CRED / DERIV"),
  makeEntry("PBKDF2 deriv", "CRED / DERIV", 3),
  makeEntry("HMAC-SHA256 dig", "CRED / DERIV"),
  makeEntry("iteration cou", "CRED / DERIV"),
  makeEntry("hash compar", "CRED / DERIV", 2),
  makeEntry("constant tim", "CRED / DERIV"),
  makeEntry("device key rea", "ANDROID / KEYST"),
  makeEntry("Keystore rea", "ANDROID / KEYST", 2),
  makeEntry("AES-GCM enc", "ANDROID / KEYST", 3),
  makeEntry("nonce alloc", "ANDROID / KEYST"),
  makeEntry("cipher tex", "ANDROID / KEYST"),
  makeEntry("auth tag ver", "ANDROID / KEYST", 2),
  makeEntry("key alias loo", "ANDROID / KEYST"),
  makeEntry("key attest", "ANDROID / KEYST"),
  makeEntry("credential enc", "ANDROID / KEYST"),
  makeEntry("remember fla", "DEVICE / PREF"),
  makeEntry("secure pref", "DEVICE / PREF", 2),
  makeEntry("local verif", "LOCAL / ACC"),
  makeEntry("role clai", "LOCAL / ACC"),
  makeEntry("privilege bi", "LOCAL / ACC", 2),
  makeEntry("session bind", "LOCAL / ACC"),
  makeEntry("token cach", "LOCAL / ACC"),
  makeEntry("memory clea", "LOCAL / ACC"),
  makeEntry("account map", "LOCAL / ACC"),
  makeEntry("access scop", "LOCAL / ACC", 2),
  makeEntry("permission bo", "LOCAL / ACC"),
  makeEntry("session init", "SESSION / HAND"),
  makeEntry("developer fla", "SESSION / HAND"),
  makeEntry("credential mat", "SESSION / HAND", 2),
  makeEntry("verifier res", "SESSION / HAND"),
  makeEntry("session hand", "SESSION / HAND")
]);

const TRANSITION_TRACE = Object.freeze([
  makeEntry("session cach", "LOCAL / SESS"),
  makeEntry("theme pref", "LOCAL / SESS", 2),
  makeEntry("local stor", "LOCAL / SESS"),
  makeEntry("Android stat", "DEVICE / STAT", 2),
  makeEntry("overlay rea", "DEVICE / STAT"),
  makeEntry("service fla", "DEVICE / STAT"),
  makeEntry("resource inde", "ASSET / RUNT"),
  makeEntry("asset manif", "ASSET / RUNT", 2),
  makeEntry("font cach", "ASSET / RUNT"),
  makeEntry("icon res", "ASSET / RUNT"),
  makeEntry("sprite atl", "ASSET / RUNT", 2),
  makeEntry("scene bundl", "ASSET / RUNT"),
  makeEntry("route tabl", "NAV / ROUT"),
  makeEntry("home sta", "NAV / ROUT"),
  makeEntry("player sav", "LOCAL / PLAYER ST"),
  makeEntry("profile snap", "LOCAL / PLAYER ST", 2),
  makeEntry("wallet ledg", "LOCAL / PLAYER ST"),
  makeEntry("inventory inde", "LOCAL / PLAYER ST"),
  makeEntry("economy cat", "LOCAL / PLAYER ST", 2),
  makeEntry("daily log", "LOCAL / PLAYER ST"),
  makeEntry("weather cach", "WORLD / CLOC"),
  makeEntry("simulation cloc", "WORLD / CLOC", 2),
  makeEntry("map til", "WORLD / CLOC"),
  makeEntry("facility inde", "WORLD / CLOC"),
  makeEntry("NPC schedu", "WORLD / CLOC", 2),
  makeEntry("quest sta", "WORLD / CLOC"),
  makeEntry("save flus", "PERSIST / WRIT"),
  makeEntry("storage tran", "PERSIST / WRIT", 2),
  makeEntry("theme appl", "PERSIST / WRIT"),
  makeEntry("scene hand", "PERSIST / WRIT", 2)
]);

export function getAccessDiagnostics(role) {
  if (role === "player") return Object.freeze({
    heading: "PLAYER NETWORK TRAC",
    entries: PLAYER_TRACE
  });
  if (role === "developer") return Object.freeze({
    heading: "LOCAL CREDENTIAL TRAC",
    entries: DEVELOPER_TRACE
  });
  return Object.freeze({
    heading: "POCKET INITIALIZATION TRAC",
    entries: TRANSITION_TRACE
  });
}

export function getDiagnosticWordFrames(value) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  return words.map((_, index) => words.slice(0, index + 1).join(" "));
}

export function formatDiagnosticFrame(value, dots = 0) {
  const count = Math.max(0, Math.min(3, Math.trunc(Number(dots) || 0)));
  return String(value ?? "") + (count ? ".".repeat(count) : "");
}
