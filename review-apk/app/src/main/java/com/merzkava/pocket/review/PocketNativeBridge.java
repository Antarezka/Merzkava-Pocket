package com.merzkava.pocket.review;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.MessageDigest;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyProperties;

public final class PocketNativeBridge {
    private static final int ITERATIONS = 600000;
    private static final String ID_SALT = "zki1bXl9Kc9FkzTBCvsoSQ==";
    private static final String ID_VERIFIER = "rWliJ21UojOkc2FX4QQXudntYW7NuuKB9kizB4Ih0sA=";
    private static final String PASSWORD_SALT = "0Wnvcfd3cGISdPZSyJfQZQ==";
    private static final String PASSWORD_VERIFIER = "rYGmwsLKK3El0UXvA3vyj+pe7d7uj0xJchixuRgr/IU=";

    private static final String PREFS = "merzkava-pocket-access";
    private static final String KEY_ALIAS = "merzkava-pocket-developer-remember-v1";
    private static final String PREF_CREDENTIALS = "developer_credentials_cipher";
    private static final String PREF_IV = "developer_credentials_iv";
    private static final String PREF_SESSION = "developer_session_authorized";
    private static final String PREF_LOCAL_PLAYERS = "verified_local_player_profiles_v1";
    private static final String PREF_POCKET_PLAYERS = "registered_pocket_player_profiles_v1";
    private static final String PREF_PLAYER_PROFILES = "pocket_player_game_profiles_v1";
    private static final String PREF_PLAYER_PROFILES_IV = "pocket_player_game_profiles_iv_v1";
    private static final String PREF_REGISTRY_SHA = "pocket_latest_registry_sha";
    private static final String PREF_REGISTRY_AT = "pocket_latest_registry_verified_at";
    private static final String PREF_PLAYER_SESSION_NAME = "active_verified_player_name";
    private static final String UNIVERSE = "Antarezka/merzkava-universe";

    private final Activity activity;
    private final WebView webView;
    private final Set<String> cancelledRequests = ConcurrentHashMap.newKeySet();
    private volatile String lastIv = "";

    PocketNativeBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface public boolean isNative() { return true; }

    @JavascriptInterface public String getReadiness() {
        boolean overlay = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(activity);
        NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean notifications = Build.VERSION.SDK_INT < 33 || manager.areNotificationsEnabled();
        PowerManager power = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
        boolean battery = Build.VERSION.SDK_INT < 23 || power.isIgnoringBatteryOptimizations(activity.getPackageName());
        boolean running = PocketFloatingService.isRunning();
        JSONObject state = new JSONObject();
        try {
            state.put("displayOverApps", overlay);
            state.put("notifications", notifications);
            state.put("batteryExemption", battery);
            state.put("serviceRunning", running);
            state.put("bubbleVisible", PocketFloatingService.isBubbleVisible());
            state.put("supported", true);
            return state.toString();
        } catch (Exception ignored) {
            return "{\"displayOverApps\":false,\"notifications\":false,\"batteryExemption\":false,\"serviceRunning\":false,\"bubbleVisible\":false,\"supported\":true}";
        }
    }

    @JavascriptInterface public void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(activity)) {
            activity.startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + activity.getPackageName())));
        }
    }

    @JavascriptInterface public void requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 &&
            activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7401);
        }
    }

    @JavascriptInterface public void requestBatteryExemption() {
        if (Build.VERSION.SDK_INT >= 23) {
            try {
                activity.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + activity.getPackageName())));
            } catch (Exception ignored) {
                activity.startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        }
    }

    @JavascriptInterface public boolean startBubbleMode() {
        if (!overlayGranted() || !notificationsGranted() || !batteryExempt()) return false;
        try {
            if (activity instanceof MainActivity && ((MainActivity) activity).isFloatingMiniWindowOpen()) {
                activity.runOnUiThread(() -> ((MainActivity) activity).minimizeFloatingMiniWindowToBubble());
            } else {
                Intent intent = new Intent(activity, PocketFloatingService.class);
                intent.setAction(PocketFloatingService.ACTION_BUBBLE);
                startPocketService(intent);
            }
            return true;
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not request the floating bubble", error);
            return false;
        }
    }

    @JavascriptInterface public boolean openMiniWindow() {
        if (!overlayGranted()) return false;
        try {
            Intent intent = new Intent(activity, PocketFloatingService.class);
            intent.setAction(PocketFloatingService.ACTION_HIDE_BUBBLE);
            startPocketService(intent);
            activity.runOnUiThread(() -> {
                if (activity instanceof MainActivity) ((MainActivity) activity).openFloatingMiniWindow();
            });
            return true;
        } catch (Exception error) {
            android.util.Log.e("PocketFloating", "Could not open the floating mini window", error);
            return false;
        }
    }

    @JavascriptInterface public void stopFloatingMode() {
        activity.runOnUiThread(() -> {
            if (activity instanceof MainActivity) ((MainActivity) activity).restoreFloatingToActivity();
            else activity.stopService(new Intent(activity, PocketFloatingService.class));
        });
    }

    @JavascriptInterface public void movePocketToBackground() {
        activity.runOnUiThread(() -> {
            if (!activity.isFinishing()) activity.moveTaskToBack(true);
        });
    }

    private void startPocketService(Intent intent) {
        if (Build.VERSION.SDK_INT >= 26) activity.startForegroundService(intent);
        else activity.startService(intent);
    }

    private boolean overlayGranted() {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(activity);
    }

    private boolean notificationsGranted() {
        if (Build.VERSION.SDK_INT < 33) return true;
        NotificationManager manager = (NotificationManager) activity.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager.areNotificationsEnabled();
    }

    private boolean batteryExempt() {
        if (Build.VERSION.SDK_INT < 23) return true;
        PowerManager power = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
        return power.isIgnoringBatteryOptimizations(activity.getPackageName());
    }

    // Uses the same Merzkava APK PBKDF2-SHA-256 verifier contract. Raw credentials are never returned to JS.
    @JavascriptInterface public void authenticateDeveloper(String identifier, String password, boolean remember, String requestId) {
        if (requestId == null || identifier == null || password == null) {
            completeDeveloper(requestId, false, "", "", "Enter the Developer ID and password.");
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                boolean valid = verifyDeveloperCredentials(identifier, password);
                if (!valid) {
                    prefs().edit().putBoolean(PREF_SESSION, false).apply();
                    completeDeveloper(requestId, false, "", "", "Developer ID or password is incorrect.");
                    return;
                }
                if (!saveDeveloperSession(remember, identifier, password)) {
                    prefs().edit().putBoolean(PREF_SESSION, false).apply();
                    completeDeveloper(requestId, false, "", "", "Could not securely apply the Developer session on this device.");
                    return;
                }
                completeDeveloper(requestId, true, identifier.trim(), "developer-verifier-v1", "");
            } catch (Exception ignored) {
                prefs().edit().putBoolean(PREF_SESSION, false).apply();
                completeDeveloper(requestId, false, "", "", "Developer verification is unavailable on this device.");
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Developer-Verify");
        thread.setDaemon(true);
        thread.start();
    }

    private boolean verifyDeveloperCredentials(String identifier, String password) throws Exception {
        byte[] idCandidate = pbkdf2(identifier.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
            Base64.decode(ID_SALT, Base64.DEFAULT));
        byte[] passwordCandidate = pbkdf2(password.getBytes(StandardCharsets.UTF_8),
            Base64.decode(PASSWORD_SALT, Base64.DEFAULT));
        return MessageDigest.isEqual(idCandidate, Base64.decode(ID_VERIFIER, Base64.DEFAULT)) &&
            MessageDigest.isEqual(passwordCandidate, Base64.decode(PASSWORD_VERIFIER, Base64.DEFAULT));
    }

    private byte[] pbkdf2(byte[] password, byte[] salt) throws Exception {
        return pbkdf2(password, salt, ITERATIONS);
    }

    private byte[] pbkdf2(byte[] password, byte[] salt, int rounds) throws Exception {
        if (rounds < 100000 || rounds > 1000000) throw new IllegalArgumentException("Invalid password work factor.");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(password, "HmacSHA256"));
        byte[] block = new byte[salt.length + 4];
        System.arraycopy(salt, 0, block, 0, salt.length);
        block[block.length - 1] = 1;
        byte[] u = mac.doFinal(block);
        byte[] result = u.clone();
        for (int round = 1; round < rounds; round++) {
            u = mac.doFinal(u);
            for (int i = 0; i < result.length; i++) result[i] ^= u[i];
        }
        return result;
    }

    private boolean saveDeveloperSession(boolean remember, String identifier, String password) {
        try {
            SharedPreferences.Editor editor = prefs().edit();
            if (remember) {
                JSONObject credentials = new JSONObject();
                credentials.put("version", 1);
                credentials.put("identifier", identifier.trim().toLowerCase(Locale.ROOT));
                credentials.put("password", password);
                byte[] encrypted = encrypt(credentials.toString().getBytes(StandardCharsets.UTF_8));
                editor.putString(PREF_CREDENTIALS, Base64.encodeToString(encrypted, Base64.NO_WRAP));
                editor.putString(PREF_IV, lastIv);
            } else {
                editor.remove(PREF_CREDENTIALS);
                editor.remove(PREF_IV);
            }
            // This is an active marker only. Pocket still presents Login Gate at cold start.
            editor.putString(PREF_PLAYER_SESSION_NAME, "");
            editor.putBoolean(PREF_SESSION, true);
            return editor.commit();
        } catch (Exception ignored) {
            return false;
        }
    }

    private byte[] encrypt(byte[] plain) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        lastIv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
        return cipher.doFinal(plain);
    }

    private byte[] decrypt(byte[] cipherText, String iv) throws Exception {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Base64.decode(iv, Base64.DEFAULT)));
        return cipher.doFinal(cipherText);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }

    @JavascriptInterface public String getRememberedDeveloperCredentials() {
        try {
            String stored = prefs().getString(PREF_CREDENTIALS, null);
            String iv = prefs().getString(PREF_IV, null);
            if (stored == null || iv == null) return "";
            byte[] plain = decrypt(Base64.decode(stored, Base64.DEFAULT), iv);
            JSONObject object = new JSONObject(new String(plain, StandardCharsets.UTF_8));
            if (object.optInt("version") != 1) return "";
            return object.toString();
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface public boolean isDeveloperSessionAuthorized() {
        return prefs().getBoolean(PREF_SESSION, false);
    }

    @JavascriptInterface public void lockDeveloperSession() {
        prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
    }

    @JavascriptInterface public void lockPlayerSession() {
        prefs().edit().putString(PREF_PLAYER_SESSION_NAME, "").apply();
    }

    @JavascriptInterface public boolean isPlayerSessionAuthorized() {
        String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
        if (name.isEmpty() || prefs().getBoolean(PREF_SESSION, false)) return false;
        try { return hasMatchingPocketDeviceBinding(name); }
        catch (Exception ignored) { return false; }
    }

    @JavascriptInterface public String getActivePlayerSessionName() {
        return isPlayerSessionAuthorized() ? prefs().getString(PREF_PLAYER_SESSION_NAME, "") : "";
    }

    @JavascriptInterface public void clearRememberedDeveloperCredentials() {
        prefs().edit().remove(PREF_CREDENTIALS).remove(PREF_IV).putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
    }

    // Pocket stores the Universe character-name index locally; gameplay status is Pocket-owned.
    private JSONArray readCachedPlayerNames() throws Exception {
        JSONArray previous = new JSONArray(prefs().getString(PREF_LOCAL_PLAYERS, "[]"));
        JSONArray names = new JSONArray();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject record = previous.optJSONObject(i);
            String name = record != null ? record.optString("name", "") : previous.optString(i, "");
            name = name.trim();
            if (!name.isEmpty() && seen.add(name)) names.put(name);
        }
        return names;
    }

    private JSONArray readPocketRegisteredPlayerNames() throws Exception {
        JSONArray previous = new JSONArray(prefs().getString(PREF_POCKET_PLAYERS, "[]"));
        JSONArray names = new JSONArray();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < previous.length(); i++) {
            String name = previous.optString(i, "").trim();
            if (!name.isEmpty() && seen.add(name)) names.put(name);
        }
        return names;
    }

    private boolean containsExactName(JSONArray names, String candidate) {
        for (int i = 0; i < names.length(); i++) {
            if (candidate.equals(names.optString(i, ""))) return true;
        }
        return false;
    }

    private JSONArray combinePlayerNames(JSONArray first, JSONArray second) {
        JSONArray combined = new JSONArray();
        Set<String> seen = ConcurrentHashMap.newKeySet();
        for (int i = 0; i < first.length(); i++) {
            String name = first.optString(i, "").trim();
            if (!name.isEmpty() && seen.add(name)) combined.put(name);
        }
        for (int i = 0; i < second.length(); i++) {
            String name = second.optString(i, "").trim();
            if (!name.isEmpty() && seen.add(name)) combined.put(name);
        }
        return combined;
    }

    private void rememberPocketPlayerName(String name) {
        try {
            JSONArray previous = readPocketRegisteredPlayerNames();
            if (containsExactName(previous, name)) return;
            previous.put(name);
            prefs().edit().putString(PREF_POCKET_PLAYERS, previous.toString()).apply();
        } catch (Exception ignored) {
            // The current verified session remains valid if the local index cannot be written.
        }
    }


    private String pocketPlayerKey(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    private JSONObject readPocketPlayerProfileStore() {
        try {
            String encrypted = prefs().getString(PREF_PLAYER_PROFILES, null);
            String iv = prefs().getString(PREF_PLAYER_PROFILES_IV, null);
            if (encrypted != null && iv != null) {
                byte[] plain = decrypt(Base64.decode(encrypted, Base64.DEFAULT), iv);
                return new JSONObject(new String(plain, StandardCharsets.UTF_8));
            }
            return new JSONObject(prefs().getString(PREF_PLAYER_PROFILES, "{}"));
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    // Internal profile key: never displayed as the Player's save/session code.
    private String createPocketPlayerId() {
        byte[] random = new byte[16];
        new java.security.SecureRandom().nextBytes(random);
        StringBuilder code = new StringBuilder("profile-");
        for (byte value : random) code.append(String.format(Locale.ROOT, "%02X", value & 0xff));
        return code.toString();
    }

    private String createPocketSessionSaveCode() {
        byte[] random = new byte[16];
        new java.security.SecureRandom().nextBytes(random);
        StringBuilder code = new StringBuilder("MZK-S-");
        for (byte value : random) code.append(String.format(Locale.ROOT, "%02X", value & 0xff));
        return code.toString();
    }

    private String rotatePocketSessionSaveCode(String name) throws Exception {
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, name);
        if (record == null) throw new Exception("Player profile not found for this login.");
        String profileKey = ensurePocketPlayerId(record);
        int generation = record.optInt("sessionSaveGeneration", 0) + 1;
        String code = createPocketSessionSaveCode();
        record.put("sessionSaveCode", code);
        record.put("sessionSaveGeneration", generation);
        record.put("sessionSaveCodeIssuedAt", System.currentTimeMillis());
        store.remove(pocketPlayerKey(name));
        store.put(profileKey, record);
        persistPocketPlayerProfileStore(store);
        return code;
    }

    private String ensurePocketPlayerId(JSONObject record) throws Exception {
        String code = record.optString("playerId", "").trim().toUpperCase(Locale.ROOT);
        if (!code.matches("profile-[A-F0-9]{32}")) code = createPocketPlayerId();
        record.put("playerId", code);
        return code;
    }

    private JSONObject findPocketPlayerProfile(JSONObject store, String name) {
        if (store == null || name == null) return null;
        String expected = name.trim();
        Iterator<String> keys = store.keys();
        while (keys.hasNext()) {
            JSONObject record = store.optJSONObject(keys.next());
            if (record != null && expected.equalsIgnoreCase(record.optString("name", "").trim())) return record;
        }
        return store.optJSONObject(pocketPlayerKey(name));
    }

    private JSONObject persistPocketPlayerProfileStore(JSONObject store) throws Exception {
        JSONObject normalized = new JSONObject();
        Iterator<String> keys = store.keys();
        while (keys.hasNext()) {
            JSONObject record = store.optJSONObject(keys.next());
            if (record == null) continue;
            String playerId = ensurePocketPlayerId(record);
            normalized.put(playerId, record);
        }
        byte[] encrypted = encrypt(normalized.toString().getBytes(StandardCharsets.UTF_8));
        boolean saved = prefs().edit().putString(PREF_PLAYER_PROFILES, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .putString(PREF_PLAYER_PROFILES_IV, lastIv).commit();
        if (!saved) throw new Exception("Could not persist the encrypted local Player profile store.");
        return normalized;
    }

    private JSONObject createPocketOwnerCredential(String password) throws Exception {
        byte[] salt = new byte[16];
        new java.security.SecureRandom().nextBytes(salt);
        byte[] hash = pbkdf2(password.getBytes(StandardCharsets.UTF_8), salt, ITERATIONS);
        JSONObject credential = new JSONObject();
        credential.put("version", 1);
        credential.put("algorithm", "PBKDF2-HMAC-SHA256");
        credential.put("iterations", ITERATIONS);
        credential.put("salt", Base64.encodeToString(salt, Base64.NO_WRAP));
        credential.put("hash", Base64.encodeToString(hash, Base64.NO_WRAP));
        credential.put("createdAt", System.currentTimeMillis());
        credential.put("storage", "Android Keystore encrypted profile store");
        return credential;
    }

    private JSONObject createEmptyPocketPlayerProfile(String name) throws Exception {
        JSONObject profile = new JSONObject();
        profile.put("schemaVersion", 1);
        profile.put("name", name);
        profile.put("source", "Pocket local registration");
        profile.put("profileStatus", "registered");
        profile.put("lastSeenAt", JSONObject.NULL);
        JSONObject character = new JSONObject();
        character.put("age", JSONObject.NULL);
        character.put("origin", JSONObject.NULL);
        character.put("background", JSONObject.NULL);
        character.put("realm", JSONObject.NULL);
        character.put("cultivationLevel", JSONObject.NULL);
        character.put("awakened", JSONObject.NULL);
        profile.put("character", character);
        JSONObject assets = new JSONObject();
        assets.put("buildings", new JSONArray());
        profile.put("assets", assets);
        JSONObject relationships = new JSONObject();
        relationships.put("entries", new JSONArray());
        relationships.put("disposition", JSONObject.NULL);
        profile.put("relationships", relationships);
        profile.put("inventory", new JSONArray());
        JSONObject wealth = new JSONObject();
        wealth.put("xc", JSONObject.NULL);
        wealth.put("xs", JSONObject.NULL);
        wealth.put("xg", JSONObject.NULL);
        wealth.put("zj", JSONObject.NULL);
        wealth.put("az", JSONObject.NULL);
        wealth.put("total", JSONObject.NULL);
        profile.put("wealth", wealth);
        JSONObject achievements = new JSONObject();
        achievements.put("items", new JSONArray());
        JSONObject daily = new JSONObject();
        daily.put("currentStreak", 0);
        daily.put("longestStreak", 0);
        daily.put("totalClaims", 0);
        daily.put("lastClaimDate", JSONObject.NULL);
        daily.put("longestStreakDate", JSONObject.NULL);
        achievements.put("dailyLogin", daily);
        profile.put("achievements", achievements);
        JSONObject gameplay = new JSONObject();
        gameplay.put("status", "not-started");
        profile.put("gameplay", gameplay);
        return profile;
    }

    private String pocketPlayerDeviceAlias(String playerId) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(playerId.trim().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder("mp-player-");
        for (byte item : digest) out.append(String.format(Locale.ROOT, "%02x", item & 0xff));
        return out.toString();
    }

    private KeyStore pocketKeyStore() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        return store;
    }

    private KeyPair getOrCreatePocketDeviceKey(String playerId) throws Exception {
        String alias = pocketPlayerDeviceAlias(playerId);
        KeyStore store = pocketKeyStore();
        if (store.containsAlias(alias)) {
            PrivateKey privateKey = (PrivateKey) store.getKey(alias, null);
            PublicKey publicKey = store.getCertificate(alias).getPublicKey();
            return new KeyPair(publicKey, privateKey);
        }
        KeyPairGenerator generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore");
        KeyGenParameterSpec specification = new KeyGenParameterSpec.Builder(alias,
            KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
            .build();
        generator.initialize(specification);
        return generator.generateKeyPair();
    }

    private String pocketDeviceFingerprint(PublicKey key) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getEncoded());
        StringBuilder out = new StringBuilder();
        for (byte item : digest) out.append(String.format(Locale.ROOT, "%02x", item & 0xff));
        return out.toString();
    }

    private String pocketDeviceSecurityLevel(PrivateKey key) {
        try {
            KeyInfo info = KeyFactory.getInstance(key.getAlgorithm(), "AndroidKeyStore").getKeySpec(key, KeyInfo.class);
            return info.isInsideSecureHardware() ? "hardware-backed" : "Android Keystore";
        } catch (Exception ignored) {
            return "Android Keystore";
        }
    }

    private boolean hasMatchingPocketDeviceBinding(String name) throws Exception {
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, name);
        if (record == null) return false;
        String playerId = record.optString("playerId", "");
        if (!playerId.matches("profile-[A-Fa-f0-9]{32}")) return false;
        JSONObject binding = record.optJSONObject("deviceBinding");
        String expected = binding == null ? "" : binding.optString("publicKeySha256", "");
        if (expected.isEmpty()) return false;
        KeyStore keyStore = pocketKeyStore();
        String alias = pocketPlayerDeviceAlias(playerId);
        if (!keyStore.containsAlias(alias)) return false;
        KeyPair pair = getOrCreatePocketDeviceKey(playerId);
        return expected.equals(pocketDeviceFingerprint(pair.getPublic()));
    }

    private boolean verifyImportedOwnerPassword(String name, String password) throws Exception {
        JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), name);
        JSONObject credential = record == null ? null : record.optJSONObject("ownerCredential");
        if (credential == null || credential.optInt("version", 0) != 1) return false;
        int rounds = credential.optInt("iterations", 0);
        String saltText = credential.optString("salt", "");
        String hashText = credential.optString("hash", "");
        if ((rounds != 310000 && rounds != ITERATIONS) || saltText.isEmpty() || hashText.isEmpty()) return false;
        byte[] salt = Base64.decode(saltText, Base64.DEFAULT);
        byte[] expected = Base64.decode(hashText, Base64.DEFAULT);
        byte[] actual = pbkdf2(password.getBytes(StandardCharsets.UTF_8), salt, rounds);
        return MessageDigest.isEqual(actual, expected);
    }

    private String enrollOrVerifyPocketDevice(String name) throws Exception {
        JSONObject store = readPocketPlayerProfileStore();
        JSONObject record = findPocketPlayerProfile(store, name);
        if (record == null) throw new Exception("This player profile has not been imported from Merzkava APK.");
        String playerId = ensurePocketPlayerId(record);
        JSONObject binding = record.optJSONObject("deviceBinding");
        String expected = binding == null ? "" : binding.optString("publicKeySha256", "");
        String alias = pocketPlayerDeviceAlias(playerId);
        KeyStore keyStore = pocketKeyStore();
        if (!expected.isEmpty() && !keyStore.containsAlias(alias)) {
            throw new Exception("This account is already paired to another device. Ask the Developer to verify ownership and authorize a device transfer.");
        }
        KeyPair pair = getOrCreatePocketDeviceKey(playerId);
        String fingerprint = pocketDeviceFingerprint(pair.getPublic());
        if (!expected.isEmpty() && !expected.equals(fingerprint)) {
            throw new Exception("The device key does not match this account's registered owner device.");
        }

        // Prove that Android Keystore can still use the non-exportable private key.
        byte[] nonce = new byte[32];
        new java.security.SecureRandom().nextBytes(nonce);
        Signature signer = Signature.getInstance("SHA256withECDSA");
        signer.initSign(pair.getPrivate());
        signer.update(nonce);
        byte[] signed = signer.sign();
        Signature verifier = Signature.getInstance("SHA256withECDSA");
        verifier.initVerify(pair.getPublic());
        verifier.update(nonce);
        if (!verifier.verify(signed)) throw new Exception("The Pocket device-key proof could not be verified.");

        if (expected.isEmpty()) {
            JSONObject nextBinding = new JSONObject();
            nextBinding.put("publicKeySha256", fingerprint);
            nextBinding.put("enrolledAt", System.currentTimeMillis());
            nextBinding.put("securityLevel", pocketDeviceSecurityLevel(pair.getPrivate()));
            record.put("deviceBinding", nextBinding);
            store.put(playerId, record);
            persistPocketPlayerProfileStore(store);
        }
        return fingerprint;
    }


    @JavascriptInterface public String exportPocketPlayerProfiles() {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "";
        try {
            JSONObject bundle = new JSONObject();
            bundle.put("format", "MERZKAVA_PLAYER_DATA_V1");
            bundle.put("version", 1);
            bundle.put("createdAt", System.currentTimeMillis());
            bundle.put("players", new JSONArray(getPocketPlayerProfiles()));
            bundle.put("passwordNote", "ownerCredential contains salted PBKDF2-HMAC-SHA256 verifiers only. No plaintext passwords are stored or exported.");
            return bundle.toString();
        } catch (Exception ignored) { return ""; }
    }

    @JavascriptInterface public void registerPocketPlayerAccount(String characterName, String password, String requestId) {
        prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
        if (requestId == null || characterName == null || characterName.trim().isEmpty() ||
            password == null || password.isEmpty()) {
            completePlayer(requestId, false, "", "", "Enter the exact character name and a new Player password.");
            return;
        }
        String name = characterName.trim();
        if (name.length() > 80) {
            completePlayer(requestId, false, "", "", "The character name is too long.");
            return;
        }
        if (password.length() < 8 || password.length() > 128 ||
            !password.matches("(?s).*[A-Z].*") || !password.matches("(?s).*[a-z].*") ||
            !password.matches("(?s).*[0-9].*") || !password.matches("(?s).*[^A-Za-z0-9\\s].*")) {
            completePlayer(requestId, false, "", "", "Password needs 8–128 characters with uppercase, lowercase, number and symbol.");
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                long verifiedAt = prefs().getLong(PREF_REGISTRY_AT, 0L);
                String verifiedSha = prefs().getString(PREF_REGISTRY_SHA, "");
                if (!verifiedSha.matches("[a-fA-F0-9]{40}") ||
                    System.currentTimeMillis() - verifiedAt > 120000L || verifiedAt <= 0L) {
                    throw new Exception("Refresh the online Universe player registry, then try registration again.");
                }
                boolean official = containsExactName(readCachedPlayerNames(), name);
                boolean pocketLocal = containsExactName(readPocketRegisteredPlayerNames(), name);
                if (!official && !pocketLocal) {
                    throw new Exception("The exact name was not found in the current pinned Universe list or Pocket local registry.");
                }

                JSONObject store = readPocketPlayerProfileStore();
                JSONObject record = findPocketPlayerProfile(store, name);
                if (record == null) {
                    throw new Exception("This Player has not been provisioned by Developer yet. Ask Developer to add the character to Pocket's local Player directory.");
                }
                String profileKey = ensurePocketPlayerId(record);
                if (record.optJSONObject("ownerCredential") != null) {
                    throw new Exception("This player account already has a password. Use PLAYER LOGIN instead.");
                }

                record.put("name", name);
                record.put("ownerCredential", createPocketOwnerCredential(password));
                record.put("source", record.optString("source", "Pocket local registration"));
                record.put("profileStatus", "registered");
                record.put("registeredAt", System.currentTimeMillis());
                record.put("lastSeenAt", System.currentTimeMillis());
                store.remove(pocketPlayerKey(name));
                store.put(profileKey, record);
                persistPocketPlayerProfileStore(store);
                String fingerprint = enrollOrVerifyPocketDevice(name);
                String sessionSaveCode = rotatePocketSessionSaveCode(name);
                rememberPocketPlayerName(name);
                prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, name).apply();
                completePlayer(requestId, true, name,
                    "pocket-registration:" + verifiedSha + ":device:" + fingerprint + ":save-code-issued", "");
            } catch (Exception error) {
                if (!cancelledRequests.contains(requestId)) {
                    completePlayer(requestId, false, "", "", error.getMessage() == null
                        ? "Pocket account registration failed." : error.getMessage());
                }
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Player-Registration");
        thread.setDaemon(true);
        thread.start();
    }

    @JavascriptInterface public String getPocketPlayerProfiles() {
        try {
            boolean developer = prefs().getBoolean(PREF_SESSION, false);
            String playerName = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            if (!developer && (playerName.isEmpty() || !hasMatchingPocketDeviceBinding(playerName))) return "[]";

            JSONObject store = readPocketPlayerProfileStore();
            JSONArray output = new JSONArray();
            if (!developer) {
                JSONObject own = findPocketPlayerProfile(store, playerName);
                if (own == null) return "[]";
                own = new JSONObject(own.toString());
                own.put("ownerCredentialPresent", own.optJSONObject("ownerCredential") != null);
                own.put("deviceBindingPresent", own.optJSONObject("deviceBinding") != null);
                own.remove("ownerCredential");
                own.remove("deviceBinding");
                own.remove("identityRef");
                own.remove("playerId");
                own.put("name", playerName);
                own.put("sessionSaveCodePresent", !own.optString("sessionSaveCode", "").isEmpty());
                output.put(own);
                return output.toString();
            }

            // Provision one stable Player ID for every known registry name before listing.
            JSONArray names = combinePlayerNames(readPocketRegisteredPlayerNames(), readCachedPlayerNames());
            Set<String> seenNames = ConcurrentHashMap.newKeySet();
            Set<String> emittedProfileKeys = ConcurrentHashMap.newKeySet();
            for (int index = 0; index < names.length(); index++) {
                String name = names.optString(index, "").trim();
                String normalizedName = pocketPlayerKey(name);
                if (name.isEmpty() || !seenNames.add(normalizedName)) continue;
                JSONObject record = findPocketPlayerProfile(store, name);
                if (record == null) record = createEmptyPocketPlayerProfile(name);
                record.put("name", name);
                String profileKey = ensurePocketPlayerId(record);
                JSONObject displayRecord = new JSONObject(record.toString());
                displayRecord.put("sessionSaveCodePresent", !record.optString("sessionSaveCode", "").isEmpty());
                displayRecord.put("sessionSaveCodeGeneration", record.optInt("sessionSaveGeneration", 0));
                displayRecord.remove("sessionSaveCode");
                displayRecord.remove("playerId");
                store.remove(pocketPlayerKey(name));
                store.put(profileKey, record);
                emittedProfileKeys.add(profileKey);
                output.put(displayRecord);
            }

            Iterator<String> keys = store.keys();
            while (keys.hasNext()) {
                JSONObject record = store.optJSONObject(keys.next());
                if (record == null) continue;
                String profileKey = ensurePocketPlayerId(record);
                JSONObject displayRecord = new JSONObject(record.toString());
                displayRecord.put("sessionSaveCodePresent", !record.optString("sessionSaveCode", "").isEmpty());
                displayRecord.put("sessionSaveCodeGeneration", record.optInt("sessionSaveGeneration", 0));
                displayRecord.remove("sessionSaveCode");
                displayRecord.remove("playerId");
                if (emittedProfileKeys.add(profileKey)) output.put(displayRecord);
            }
            persistPocketPlayerProfileStore(store);
            return output.toString();
        } catch (Exception ignored) {
            return "[]";
        }
    }

    @JavascriptInterface public String getCurrentPlayerSessionSaveCode() {
        if (!isPlayerSessionAuthorized()) return "";
        try {
            String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), name);
            if (record == null) return "";
            String code = record.optString("sessionSaveCode", "");
            return code.matches("MZK-S-[A-F0-9]{32}") ? code : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    @JavascriptInterface public long getCurrentPlayerSessionSaveCodeIssuedAt() {
        if (!isPlayerSessionAuthorized()) return 0L;
        try {
            String name = prefs().getString(PREF_PLAYER_SESSION_NAME, "").trim();
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), name);
            return record == null ? 0L : record.optLong("sessionSaveCodeIssuedAt", 0L);
        } catch (Exception ignored) {
            return 0L;
        }
    }

    @JavascriptInterface public boolean isCurrentPlayerSaveCode(String playerName, String suppliedCode) {
        if (playerName == null || suppliedCode == null || !suppliedCode.trim().matches("(?i)MZK-S-[A-F0-9]{32}")) return false;
        try {
            JSONObject record = findPocketPlayerProfile(readPocketPlayerProfileStore(), playerName);
            if (record == null) return false;
            String current = record.optString("sessionSaveCode", "");
            return !current.isEmpty() && MessageDigest.isEqual(
                current.getBytes(StandardCharsets.UTF_8),
                suppliedCode.trim().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception ignored) {
            return false;
        }
    }

    @JavascriptInterface public String lookupPocketPlayerBySessionSaveCode(String suppliedCode) {
        if (!prefs().getBoolean(PREF_SESSION, false)) return "{\"ok\":false,\"error\":\"Developer authorization is required.\"}";
        if (suppliedCode == null || !suppliedCode.trim().matches("(?i)MZK-S-[A-F0-9]{32}")) {
            return "{\"ok\":false,\"error\":\"Invalid save code format.\"}";
        }
        try {
            byte[] provided = suppliedCode.trim().toUpperCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8);
            JSONObject store = readPocketPlayerProfileStore();
            Iterator<String> keys = store.keys();
            while (keys.hasNext()) {
                JSONObject record = store.optJSONObject(keys.next());
                if (record == null) continue;
                String current = record.optString("sessionSaveCode", "");
                if (!current.isEmpty() && MessageDigest.isEqual(current.getBytes(StandardCharsets.UTF_8), provided)) {
                    JSONObject result = new JSONObject();
                    result.put("ok", true);
                    result.put("name", record.optString("name", "Unknown"));
                    result.put("session", record.optInt("sessionSaveGeneration", 0));
                    result.put("issuedAt", record.optLong("sessionSaveCodeIssuedAt", 0L));
                    result.put("profileStatus", record.optString("profileStatus", "registered"));
                    return result.toString();
                }
            }
            return "{\"ok\":false,\"error\":\"This code is expired, replaced, or does not exist in the current Pocket player registry.\"}";
        } catch (Exception ignored) {
            return "{\"ok\":false,\"error\":\"Could not check the current Player save code.\"}";
        }
    }

    @JavascriptInterface public String importPocketPlayerProfiles(String bundleJson) {
        if (!prefs().getBoolean(PREF_SESSION, false)) {
            try { return new JSONObject().put("ok", false).put("error", "Developer authorization is required.").toString(); }
            catch (Exception ignored) { return "{}"; }
        }
        if (bundleJson == null || bundleJson.trim().isEmpty() || bundleJson.length() > 4194304) {
            try { return new JSONObject().put("ok", false).put("error", "Transfer data is empty or exceeds the 4 MB limit.").toString(); }
            catch (Exception ignored) { return "{}"; }
        }
        try {
            JSONObject bundle = new JSONObject(bundleJson);
            if (!"MERZKAVA_PLAYER_DATA_V1".equals(bundle.optString("format", ""))) {
                return new JSONObject().put("ok", false).put("error", "Unsupported transfer format. Export the MERZKAVA_PLAYER_DATA_V1 bundle from Merzkava APK.").toString();
            }
            JSONArray incoming = bundle.optJSONArray("players");
            if (incoming == null || incoming.length() == 0 || incoming.length() > 500) {
                return new JSONObject().put("ok", false).put("error", "The bundle must contain 1–500 player records.").toString();
            }
            JSONObject store = readPocketPlayerProfileStore();
            JSONArray localNames = readPocketRegisteredPlayerNames();
            int imported = 0;
            int skipped = 0;
            for (int index = 0; index < incoming.length(); index++) {
                JSONObject source = incoming.optJSONObject(index);
                if (source == null) { skipped++; continue; }
                String name = source.optString("name", "").trim();
                boolean invalid = name.isEmpty() || name.length() > 80;
                for (int c = 0; !invalid && c < name.length(); c++) {
                    if (Character.isISOControl(name.charAt(c))) invalid = true;
                }
                if (invalid) { skipped++; continue; }

                JSONObject oldRecord = findPocketPlayerProfile(store, name);
                JSONObject record = new JSONObject(source.toString());
                if (oldRecord != null) {
                    if (oldRecord.optJSONObject("deviceBinding") != null && record.optJSONObject("deviceBinding") == null) {
                        record.put("deviceBinding", oldRecord.optJSONObject("deviceBinding"));
                    }
                    if (oldRecord.optJSONObject("ownerCredential") != null && record.optJSONObject("ownerCredential") == null) {
                        record.put("ownerCredential", oldRecord.optJSONObject("ownerCredential"));
                    }
                    String existingId = oldRecord.optString("playerId", "");
                    if (existingId.matches("profile-[A-Fa-f0-9]{32}")) record.put("playerId", existingId);
                }
                record.put("schemaVersion", 1);
                record.put("name", name);
                String playerId = ensurePocketPlayerId(record);
                record.put("source", "Merzkava APK");
                record.put("profileStatus", "imported");
                record.put("importedAt", System.currentTimeMillis());
                store.remove(pocketPlayerKey(name));
                store.put(playerId, record);
                if (!containsExactName(localNames, name)) localNames.put(name);
                imported++;
            }
            if (imported == 0) {
                return new JSONObject().put("ok", false).put("error", "No valid player profile could be imported; existing Pocket records were left unchanged.").toString();
            }
            persistPocketPlayerProfileStore(store);
            prefs().edit().putString(PREF_POCKET_PLAYERS, localNames.toString()).apply();
            JSONObject result = new JSONObject();
            result.put("ok", true);
            result.put("imported", imported);
            result.put("skipped", skipped);
            result.put("format", "MERZKAVA_PLAYER_DATA_V1");
            return result.toString();
        } catch (Exception error) {
            try { return new JSONObject().put("ok", false).put("error", "Could not read transfer data: " + error.getMessage()).toString(); }
            catch (Exception ignored) { return "{}"; }
        }
    }

    @JavascriptInterface public boolean resetPocketPlayerDeviceBinding(String playerName) {
        if (!prefs().getBoolean(PREF_SESSION, false) || playerName == null || playerName.trim().isEmpty()) return false;
        try {
            JSONObject store = readPocketPlayerProfileStore();
            JSONObject record = findPocketPlayerProfile(store, playerName);
            if (record == null) return false;
            String playerId = ensurePocketPlayerId(record);
            pocketKeyStore().deleteEntry(pocketPlayerDeviceAlias(playerId));
            record.remove("deviceBinding");
            store.remove(pocketPlayerKey(playerName));
            store.put(playerId, record);
            persistPocketPlayerProfileStore(store);
            return true;
        } catch (Exception ignored) { return false; }
    }

    @JavascriptInterface public String getPocketRegisteredPlayerNames() {
        try { return readPocketRegisteredPlayerNames().toString(); }
        catch (Exception ignored) { return "[]"; }
    }

    @JavascriptInterface public String getLocalPlayerNames() {
        try {
            return combinePlayerNames(readPocketRegisteredPlayerNames(), readCachedPlayerNames()).toString();
        } catch (Exception ignored) { return "[]"; }
    }

    // Backward-compatible bridge name for older web bundles; the payload is names only.
    @JavascriptInterface public String getLocalPlayerProfiles() {
        return getLocalPlayerNames();
    }

    private void rememberPlayerRegistry(JSONArray names, String sha) {
        try {
            JSONArray next = new JSONArray();
            Set<String> seen = ConcurrentHashMap.newKeySet();
            for (int i = 0; i < names.length(); i++) {
                String name = names.optString(i, "").trim();
                if (name.isEmpty() || !seen.add(name)) continue;
                JSONObject record = new JSONObject();
                record.put("name", name);
                record.put("source", "universe");
                record.put("sourceSha", sha);
                next.put(record);
            }
            prefs().edit().putString(PREF_LOCAL_PLAYERS, next.toString())
                .putString(PREF_REGISTRY_SHA, sha)
                .putLong(PREF_REGISTRY_AT, System.currentTimeMillis()).apply();
        } catch (Exception ignored) {
            // Registry verification still succeeds for this session if local indexing fails.
        }
    }

    @JavascriptInterface public void verifyPlayerIdentity(String characterName, String password, String requestId) {
        // A fresh Player attempt clears both role markers before online owner verification.
        prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, "").apply();
        if (requestId == null || characterName == null || characterName.isEmpty() || password == null || password.isEmpty()) {
            completePlayer(requestId, false, "", "", "Enter the registered character name and its World Atlas account password.");
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                String readme = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/main/README.md");
                String marker = "Latest pinned source:";
                int markerIndex = readme.indexOf(marker);
                if (markerIndex < 0) throw new Exception("The Universe source pin could not be verified.");
                String remainder = readme.substring(markerIndex + marker.length());
                int opening = remainder.indexOf((char)96);
                int closing = opening < 0 ? -1 : remainder.indexOf((char)96, opening + 1);
                if (opening < 0 || closing <= opening + 1) throw new Exception("The Universe source pin could not be verified.");
                String shortSha = remainder.substring(opening + 1, closing).trim();
                if (!shortSha.matches("[a-fA-F0-9]{7,40}")) throw new Exception("The Universe source pin is malformed.");

                String commitJson = fetch("https://api.github.com/repos/" + UNIVERSE + "/commits/" + shortSha);
                String fullSha = new JSONObject(commitJson).getString("sha");
                if (!fullSha.matches("[a-fA-F0-9]{40}")) throw new Exception("The pinned Universe commit could not be verified.");

                String registry = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/" + fullSha + "/players.md");
                if (cancelledRequests.contains(requestId)) return;

                JSONArray registeredNames = new JSONArray();
                boolean exactMatch = false;
                Pattern rowPattern = Pattern.compile("^\\|\\s*([^|]+?)\\s*\\|\\s*\\[[^\\]]+\\]\\(players/[^)]+\\)", Pattern.MULTILINE);
                Matcher rows = rowPattern.matcher(registry);
                while (rows.find()) {
                    String registeredName = rows.group(1).trim();
                    if (registeredName.isEmpty()) continue;
                    registeredNames.put(registeredName);
                    if (characterName.equals(registeredName)) exactMatch = true;
                }
                if (cancelledRequests.contains(requestId)) return;
                boolean localMatch = containsExactName(readPocketRegisteredPlayerNames(), characterName)
                    || containsExactName(readCachedPlayerNames(), characterName);
                rememberPlayerRegistry(registeredNames, fullSha);
                if (!exactMatch && !localMatch) {
                    completePlayer(requestId, false, "", fullSha, "That exact character name is not registered in Pocket or the currently pinned Universe registry.");
                    return;
                }
                rememberPocketPlayerName(characterName);
                if (!verifyImportedOwnerPassword(characterName, password)) {
                    completePlayer(requestId, false, "", fullSha, "The Player account password did not match, or its password verifier has not been imported. Player names alone cannot open an account.");
                    return;
                }
                String deviceFingerprint = enrollOrVerifyPocketDevice(characterName);
                JSONObject profileStore = readPocketPlayerProfileStore();
                JSONObject playerProfile = findPocketPlayerProfile(profileStore, characterName);
                if (playerProfile != null) {
                    playerProfile.put("lastSeenAt", System.currentTimeMillis());
                    String profileKey = ensurePocketPlayerId(playerProfile);
                    profileStore.remove(pocketPlayerKey(characterName));
                    profileStore.put(profileKey, playerProfile);
                    persistPocketPlayerProfileStore(profileStore);
                }
                String sessionSaveCode = rotatePocketSessionSaveCode(characterName);
                String source = exactMatch && localMatch ? "pocket-local+universe"
                    : exactMatch ? "universe" : "pocket-local";
                prefs().edit().putBoolean(PREF_SESSION, false).putString(PREF_PLAYER_SESSION_NAME, characterName).apply();
                completePlayer(requestId, true, characterName,
                    source + ":" + fullSha + ":save-code-issued", "");
            } catch (Exception error) {
                if (!cancelledRequests.contains(requestId)) {
                    completePlayer(requestId, false, "", "", "Could not verify the active Universe pin and player registry. Check the connection and try again.");
                }
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Player-Registry");
        thread.setDaemon(true);
        thread.start();
    }

    @JavascriptInterface public void cancelPlayerIdentity(String requestId) {
        if (requestId != null) cancelledRequests.add(requestId);
    }

    @JavascriptInterface public void refreshPlayerRegistry(String requestId) {
        if (requestId == null) return;
        Thread thread = new Thread(() -> {
            try {
                String readme = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/main/README.md");
                String marker = "Latest pinned source:";
                int markerIndex = readme.indexOf(marker);
                if (markerIndex < 0) throw new Exception("The Universe source pin could not be verified.");
                String remainder = readme.substring(markerIndex + marker.length());
                int opening = remainder.indexOf((char)96);
                int closing = opening < 0 ? -1 : remainder.indexOf((char)96, opening + 1);
                if (opening < 0 || closing <= opening + 1) throw new Exception("The Universe source pin could not be verified.");
                String shortSha = remainder.substring(opening + 1, closing).trim();
                if (!shortSha.matches("[a-fA-F0-9]{7,40}")) throw new Exception("The Universe source pin is malformed.");

                String commitJson = fetch("https://api.github.com/repos/" + UNIVERSE + "/commits/" + shortSha);
                String fullSha = new JSONObject(commitJson).getString("sha");
                if (!fullSha.matches("[a-fA-F0-9]{40}")) throw new Exception("The pinned Universe commit could not be verified.");

                String registry = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/" + fullSha + "/players.md");
                if (cancelledRequests.contains(requestId)) return;

                JSONArray registeredNames = new JSONArray();
                Pattern rowPattern = Pattern.compile("^\\|\\s*([^|]+?)\\s*\\|\\s*\\[[^\\]]+\\]\\(players/[^)]+\\)", Pattern.MULTILINE);
                Matcher rows = rowPattern.matcher(registry);
                while (rows.find()) {
                    String name = rows.group(1).trim();
                    if (!name.isEmpty()) registeredNames.put(name);
                }
                if (registeredNames.length() == 0) throw new Exception("No valid player entries were found in the pinned players.md registry.");
                if (cancelledRequests.contains(requestId)) return;
                rememberPlayerRegistry(registeredNames, fullSha);
                completeRegistry(requestId, true, registeredNames.toString(), "universe:" + fullSha, "");
            } catch (Exception error) {
                if (!cancelledRequests.contains(requestId)) {
                    completeRegistry(requestId, false, "[]", "", "Could not refresh the pinned Universe player registry. Check the connection and try again.");
                }
            } finally {
                cancelledRequests.remove(requestId);
            }
        }, "Pocket-Player-Registry-Refresh");
        thread.setDaemon(true);
        thread.start();
    }

    private String fetch(String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(12000);
        connection.setRequestProperty("User-Agent", "Merzkava-Pocket-Android");
        connection.setRequestProperty("Accept", "text/plain, application/vnd.github+json");
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            return output.toString(StandardCharsets.UTF_8.name());
        } finally {
            connection.disconnect();
        }
    }

    private void completeDeveloper(String requestId, boolean ok, String displayName, String identityRef, String error) {
        if (requestId == null || cancelledRequests.contains(requestId)) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.access("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(displayName) + "," + JSONObject.quote(identityRef) + ","
            + JSONObject.quote(error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null && !cancelledRequests.contains(requestId)) webView.evaluateJavascript(script, null);
        });
    }

    private void completeRegistry(String requestId, boolean ok, String namesJson, String identityRef, String error) {
        if (requestId == null || cancelledRequests.contains(requestId)) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.registry("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(namesJson) + ","
            + JSONObject.quote(identityRef) + ","
            + JSONObject.quote(error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null && !cancelledRequests.contains(requestId)) webView.evaluateJavascript(script, null);
        });
    }

    private void completePlayer(String requestId, boolean ok, String displayName, String identityRef, String error) {
        if (requestId == null || cancelledRequests.contains(requestId)) return;
        String script = "window.PocketNativeCallbacks && window.PocketNativeCallbacks.player("
            + JSONObject.quote(requestId) + "," + ok + ","
            + JSONObject.quote(displayName) + "," + JSONObject.quote(identityRef) + ","
            + JSONObject.quote(error) + ");";
        activity.runOnUiThread(() -> {
            if (webView != null && !cancelledRequests.contains(requestId)) webView.evaluateJavascript(script, null);
        });
    }

    @JavascriptInterface public void exitApp() {
        activity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 21) activity.finishAndRemoveTask();
            else activity.finish();
        });
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
