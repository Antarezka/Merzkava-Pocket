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
        boolean running = prefs().getBoolean("floating_service_running", false);
        JSONObject state = new JSONObject();
        try {
            state.put("displayOverApps", overlay);
            state.put("notifications", notifications);
            state.put("batteryExemption", battery);
            state.put("serviceRunning", running);
            state.put("supported", true);
            return state.toString();
        } catch (Exception ignored) {
            return "{\"displayOverApps\":false,\"notifications\":false,\"batteryExemption\":false,\"serviceRunning\":false,\"supported\":true}";
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
        Intent intent = new Intent(activity, PocketFloatingService.class);
        intent.setAction(PocketFloatingService.ACTION_BUBBLE);
        startPocketService(intent);
        return true;
    }

    @JavascriptInterface public boolean openMiniWindow() {
        if (!overlayGranted()) return false;
        Intent intent = new Intent(activity, PocketFloatingService.class);
        intent.setAction(PocketFloatingService.ACTION_MINI);
        startPocketService(intent);
        return true;
    }

    @JavascriptInterface public void stopFloatingMode() {
        activity.stopService(new Intent(activity, PocketFloatingService.class));
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
            completeDeveloper(requestId, false, "", "Enter the Developer ID and password.");
            return;
        }
        Thread thread = new Thread(() -> {
            try {
                boolean valid = verifyDeveloperCredentials(identifier, password);
                if (!valid) {
                    prefs().edit().putBoolean(PREF_SESSION, false).apply();
                    completeDeveloper(requestId, false, "", "Developer ID or password is incorrect.");
                    return;
                }
                if (!saveDeveloperSession(remember, identifier, password)) {
                    prefs().edit().putBoolean(PREF_SESSION, false).apply();
                    completeDeveloper(requestId, false, "", "Could not securely apply the Developer session on this device.");
                    return;
                }
                completeDeveloper(requestId, true, identifier.trim(), "developer-verifier-v1", "");
            } catch (Exception ignored) {
                prefs().edit().putBoolean(PREF_SESSION, false).apply();
                completeDeveloper(requestId, false, "", "Developer verification is unavailable on this device.");
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
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(password, "HmacSHA256"));
        byte[] block = new byte[salt.length + 4];
        System.arraycopy(salt, 0, block, 0, salt.length);
        block[block.length - 1] = 1;
        byte[] u = mac.doFinal(block);
        byte[] result = u.clone();
        for (int round = 1; round < ITERATIONS; round++) {
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

    @JavascriptInterface public void lockDeveloperSession() {
        prefs().edit().putBoolean(PREF_SESSION, false).apply();
    }

    @JavascriptInterface public void clearRememberedDeveloperCredentials() {
        prefs().edit().remove(PREF_CREDENTIALS).remove(PREF_IV).putBoolean(PREF_SESSION, false).apply();
    }

    // Local index contains only identities previously verified against a pinned Universe players.md snapshot.
    @JavascriptInterface public String getLocalPlayerProfiles() {
        return prefs().getString(PREF_LOCAL_PLAYERS, "[]");
    }

    private void rememberVerifiedPlayer(String name, String sha, String profilePath, String profileMarkdown) {
        try {
            JSONArray previous = new JSONArray(prefs().getString(PREF_LOCAL_PLAYERS, "[]"));
            JSONArray next = new JSONArray();
            boolean inserted = false;
            for (int i = 0; i < previous.length(); i++) {
                JSONObject item = previous.optJSONObject(i);
                if (item == null) continue;
                if (name.equals(item.optString("name"))) {
                    if (!inserted) {
                        next.put(localPlayerRecord(name, sha, profilePath, profileMarkdown));
                        inserted = true;
                    }
                } else next.put(item);
            }
            if (!inserted) next.put(localPlayerRecord(name, sha, profilePath, profileMarkdown));
            prefs().edit().putString(PREF_LOCAL_PLAYERS, next.toString()).apply();
        } catch (Exception ignored) {
            // The verified online identity remains valid for this session even if local indexing fails.
        }
    }

    private JSONObject localPlayerRecord(String name, String sha, String path, String markdown) throws Exception {
        JSONObject item = new JSONObject();
        item.put("name", name);
        item.put("source", "universe");
        item.put("sourceSha", sha);
        item.put("profilePath", path);
        item.put("profileMarkdown", markdown);
        item.put("updatedAt", System.currentTimeMillis());
        return item;
    }

    @JavascriptInterface public void verifyPlayerIdentity(String characterName, String requestId) {
        if (requestId == null || characterName == null || characterName.isEmpty()) {
            completePlayer(requestId, false, "", "", "Enter the exact registered character name.");
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

                String profilePath = "";
                Pattern rowPattern = Pattern.compile("^\\|\\s*([^|]+?)\\s*\\|\\s*\\[[^\\]]+\\]\\((players/[^)]+)\\)", Pattern.MULTILINE);
                Matcher rows = rowPattern.matcher(registry);
                while (rows.find()) {
                    String registeredName = rows.group(1);
                    if (characterName.equals(registeredName)) {
                        profilePath = rows.group(2);
                        break;
                    }
                }
                if (profilePath.isEmpty()) {
                    completePlayer(requestId, false, "", fullSha, "That exact character name is not in the currently pinned Universe registry.");
                    return;
                }

                String markdown = "";
                try {
                    String decodedPath = java.net.URLDecoder.decode(profilePath, "UTF-8");
                    markdown = fetch("https://raw.githubusercontent.com/" + UNIVERSE + "/" + fullSha + "/" + encodePath(decodedPath));
                } catch (Exception ignored) {
                    // Identity is proven by players.md. The individual profile cache is optional and never grants access.
                }
                if (cancelledRequests.contains(requestId)) return;
                rememberVerifiedPlayer(characterName, fullSha, profilePath, markdown);
                completePlayer(requestId, true, characterName, "universe:" + fullSha, "");
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

    private String encodePath(String path) throws Exception {
        String[] parts = path.split("/");
        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (result.length() > 0) result.append("/");
            result.append(java.net.URLEncoder.encode(part, "UTF-8").replace("+", "%20"));
        }
        return result.toString();
    }

    @JavascriptInterface public void cancelPlayerIdentity(String requestId) {
        if (requestId != null) cancelledRequests.add(requestId);
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
