// Short, deliberately incomplete diagnostics for the visual access trace.
// These labels are fragments, not claims that a network or local operation has completed.
const makeEntry = (text, group, cycles = 0) => Object.freeze({
  text,
  group,
  cycles,
  truncated: true
});

const PLAYER_TRACE = Object.freeze([
  makeEntry("edge rout", "EDGE / ROUTING"),
  makeEntry("DNS resolv", "EDGE / ROUTING", 2),
  makeEntry("TCP sock", "EDGE / ROUTING"),
  makeEntry("server int", "SERVER / TRANSPORT", 3),
  makeEntry("TLS handsh", "SERVER / TRANSPORT", 3),
  makeEntry("cert cha", "SERVER / TRANSPORT", 2),
  makeEntry("SNI rout", "SERVER / TRANSPORT"),
  makeEntry("socket poo", "SERVER / TRANSPORT"),
  makeEntry("HTTP/2 sess", "HTTP / API"),
  makeEntry("API endpoi", "HTTP / API", 3),
  makeEntry("request hea", "HTTP / API"),
  makeEntry("cache poli", "HTTP / API"),
  makeEntry("registry fetc", "UNIVERSE / REGISTRY", 3),
  makeEntry("source pin ver", "UNIVERSE / REGISTRY", 2),
  makeEntry("SHA-256 dig", "UNIVERSE / REGISTRY"),
  makeEntry("manifest ver", "UNIVERSE / REGISTRY"),
  makeEntry("payload strea", "PAYLOAD / INTEGRITY", 3),
  makeEntry("ETag matc", "PAYLOAD / INTEGRITY"),
  makeEntry("response sta", "PAYLOAD / INTEGRITY", 2),
  makeEntry("JSON pars", "PAYLOAD / INTEGRITY"),
  makeEntry("UTF-8 decod", "PAYLOAD / INTEGRITY"),
  makeEntry("Unicode norm", "IDENTITY / MATCH"),
  makeEntry("name canon", "IDENTITY / MATCH"),
  makeEntry("exact matc", "IDENTITY / MATCH", 2),
  makeEntry("player entr", "IDENTITY / MATCH"),
  makeEntry("profile inde", "POCKET / CACHE"),
  makeEntry("local cach", "POCKET / CACHE"),
  makeEntry("save schema ver", "POCKET / CACHE"),
  makeEntry("session tok", "SESSION / SECURITY"),
  makeEntry("nonce chec", "SESSION / SECURITY", 2),
  makeEntry("signature ver", "SESSION / SECURITY", 3),
  makeEntry("integrity chec", "SESSION / SECURITY"),
  makeEntry("role scop", "SESSION / SECURITY"),
  makeEntry("access clai", "SESSION / SECURITY", 2),
  makeEntry("session bin", "SESSION / HANDOFF"),
  makeEntry("clock sk", "SESSION / HANDOFF"),
  makeEntry("retry wind", "SESSION / HANDOFF", 2),
  makeEntry("connection poo", "SESSION / HANDOFF", 3),
  makeEntry("result await", "SESSION / HANDOFF", 2),
  makeEntry("identity hand", "SESSION / HANDOFF")
]);

const DEVELOPER_TRACE = Object.freeze([
  makeEntry("credential inp", "CREDENTIAL / INPUT"),
  makeEntry("salt retr", "CREDENTIAL / DERIVATION"),
  makeEntry("PBKDF2 deriv", "CREDENTIAL / DERIVATION", 3),
  makeEntry("HMAC-SHA256 dig", "CREDENTIAL / DERIVATION"),
  makeEntry("iteration cou", "CREDENTIAL / DERIVATION"),
  makeEntry("hash compar", "CREDENTIAL / DERIVATION", 2),
  makeEntry("constant tim", "CREDENTIAL / DERIVATION"),
  makeEntry("device key rea", "ANDROID / KEYSTORE"),
  makeEntry("Keystore rea", "ANDROID / KEYSTORE", 2),
  makeEntry("AES-GCM enc", "ANDROID / KEYSTORE", 3),
  makeEntry("nonce alloc", "ANDROID / KEYSTORE"),
  makeEntry("cipher tex", "ANDROID / KEYSTORE"),
  makeEntry("auth tag ver", "ANDROID / KEYSTORE", 2),
  makeEntry("key alias loo", "ANDROID / KEYSTORE"),
  makeEntry("key attest", "ANDROID / KEYSTORE"),
  makeEntry("credential enc", "ANDROID / KEYSTORE"),
  makeEntry("remember fla", "DEVICE / PREFERENCES"),
  makeEntry("secure pref", "DEVICE / PREFERENCES", 2),
  makeEntry("local verif", "LOCAL / ACCESS"),
  makeEntry("role clai", "LOCAL / ACCESS"),
  makeEntry("privilege bi", "LOCAL / ACCESS", 2),
  makeEntry("session bind", "LOCAL / ACCESS"),
  makeEntry("token cach", "LOCAL / ACCESS"),
  makeEntry("memory clea", "LOCAL / ACCESS"),
  makeEntry("account map", "LOCAL / ACCESS"),
  makeEntry("access scop", "LOCAL / ACCESS", 2),
  makeEntry("permission bo", "LOCAL / ACCESS"),
  makeEntry("session init", "SESSION / HANDOFF"),
  makeEntry("developer fla", "SESSION / HANDOFF"),
  makeEntry("credential mat", "SESSION / HANDOFF", 2),
  makeEntry("verifier res", "SESSION / HANDOFF"),
  makeEntry("session hand", "SESSION / HANDOFF")
]);

const TRANSITION_TRACE = Object.freeze([
  makeEntry("session cach", "LOCAL / SESSION"),
  makeEntry("theme pref", "LOCAL / SESSION", 2),
  makeEntry("local stor", "LOCAL / SESSION"),
  makeEntry("Android stat", "DEVICE / STATUS", 2),
  makeEntry("overlay rea", "DEVICE / STATUS"),
  makeEntry("service fla", "DEVICE / STATUS"),
  makeEntry("resource inde", "ASSET / RUNTIME"),
  makeEntry("asset manif", "ASSET / RUNTIME", 2),
  makeEntry("font cach", "ASSET / RUNTIME"),
  makeEntry("icon res", "ASSET / RUNTIME"),
  makeEntry("sprite atl", "ASSET / RUNTIME", 2),
  makeEntry("scene bundl", "ASSET / RUNTIME"),
  makeEntry("route tabl", "NAVIGATION / ROUTE"),
  makeEntry("home sta", "NAVIGATION / ROUTE"),
  makeEntry("player sav", "LOCAL / PLAYER STATE"),
  makeEntry("profile snap", "LOCAL / PLAYER STATE", 2),
  makeEntry("wallet ledg", "LOCAL / PLAYER STATE"),
  makeEntry("inventory inde", "LOCAL / PLAYER STATE"),
  makeEntry("economy cat", "LOCAL / PLAYER STATE", 2),
  makeEntry("daily log", "LOCAL / PLAYER STATE"),
  makeEntry("weather cach", "WORLD / CLOCK"),
  makeEntry("simulation cloc", "WORLD / CLOCK", 2),
  makeEntry("map til", "WORLD / CLOCK"),
  makeEntry("facility inde", "WORLD / CLOCK"),
  makeEntry("NPC schedu", "WORLD / CLOCK", 2),
  makeEntry("quest sta", "WORLD / CLOCK"),
  makeEntry("save flus", "PERSISTENCE / WRITE"),
  makeEntry("storage tran", "PERSISTENCE / WRITE", 2),
  makeEntry("theme appl", "PERSISTENCE / WRITE"),
  makeEntry("scene hand", "PERSISTENCE / WRITE", 2)
]);

export function getAccessDiagnostics(role) {
  if (role === "player") return Object.freeze({
    heading: "PLAYER NETWORK TRACE",
    entries: PLAYER_TRACE
  });
  if (role === "developer") return Object.freeze({
    heading: "LOCAL CREDENTIAL TRACE",
    entries: DEVELOPER_TRACE
  });
  return Object.freeze({
    heading: "POCKET INITIALIZATION TRACE",
    entries: TRANSITION_TRACE
  });
}

export function getDiagnosticWordFrames(value) {
  const words = String(value ?? "").trim().split(/\\s+/).filter(Boolean);
  return words.map((_, index) => words.slice(0, index + 1).join(" "));
}

export function formatDiagnosticFrame(value, dots = 0) {
  const count = Math.max(0, Math.min(3, Math.trunc(Number(dots) || 0)));
  return (count ? ".".repeat(count) + " " : "") + String(value ?? "");
}
