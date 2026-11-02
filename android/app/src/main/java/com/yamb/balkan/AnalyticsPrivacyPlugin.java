package com.yamb.balkan;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.EnumMap;
import java.util.Map;

@CapacitorPlugin(name = "AnalyticsPrivacy")
public class AnalyticsPrivacyPlugin extends Plugin {
    private static final String PREFS = "yamb_analytics_privacy_v1";
    private String preparedUid;
    private String preparedInstanceId;

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    private FirebaseAnalytics analytics() { return FirebaseAnalytics.getInstance(getContext()); }

    private static void consent(FirebaseAnalytics analytics, boolean allowed) {
        Map<FirebaseAnalytics.ConsentType, FirebaseAnalytics.ConsentStatus> values = new EnumMap<>(FirebaseAnalytics.ConsentType.class);
        values.put(FirebaseAnalytics.ConsentType.ANALYTICS_STORAGE, allowed ? FirebaseAnalytics.ConsentStatus.GRANTED : FirebaseAnalytics.ConsentStatus.DENIED);
        // Analytics is used for game usage measurement only. AdMob continues to
        // use its own UMP choice; Analytics data is not enabled for advertising.
        values.put(FirebaseAnalytics.ConsentType.AD_STORAGE, FirebaseAnalytics.ConsentStatus.DENIED);
        values.put(FirebaseAnalytics.ConsentType.AD_USER_DATA, FirebaseAnalytics.ConsentStatus.DENIED);
        values.put(FirebaseAnalytics.ConsentType.AD_PERSONALIZATION, FirebaseAnalytics.ConsentStatus.DENIED);
        analytics.setConsent(values);
    }

    public static void suspendAtStartup(Context context) {
        FirebaseAnalytics.getInstance(context).setAnalyticsCollectionEnabled(false);
    }

    private String currentUid() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null || user.getProviderData().stream().noneMatch(item -> "google.com".equals(item.getProviderId()))) return null;
        return user.getUid();
    }

    private boolean allowed(String uid) {
        return uid != null && prefs().getBoolean("granted", false) && uid.equals(prefs().getString("consentUid", ""));
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", allowed(currentUid()));
        call.resolve(result);
    }

    @PluginMethod
    public void setChoice(PluginCall call) {
        Boolean granted = call.getBoolean("granted");
        String uid = currentUid();
        if (granted == null || uid == null) { call.reject("sign_in_required"); return; }
        analytics().setAnalyticsCollectionEnabled(false);
        prefs().edit().putBoolean("granted", granted).putString("consentUid", uid).apply();
        if (!granted) {
            consent(analytics(), false);
            analytics().setUserId(null);
            analytics().resetAnalyticsData();
            prefs().edit().remove("boundUid").apply();
        }
        preparedUid = null;
        preparedInstanceId = null;
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        analytics().setAnalyticsCollectionEnabled(false);
        preparedUid = null;
        preparedInstanceId = null;
        call.resolve();
    }

    @PluginMethod
    public void prepareIdentity(PluginCall call) {
        String uid = call.getString("uid");
        analytics().setAnalyticsCollectionEnabled(false);
        if (uid == null || !uid.equals(currentUid()) || !allowed(uid)) { call.reject("analytics_consent_required"); return; }
        if (!uid.equals(prefs().getString("boundUid", ""))) {
            // A fresh ID prevents one person's deletion from removing another
            // person's Analytics history on a shared phone. Legacy IDs are not
            // retroactively attributed to the current Google account.
            analytics().setUserId(null);
            analytics().resetAnalyticsData();
            prefs().edit().putString("boundUid", uid).apply();
        }
        consent(analytics(), true);
        analytics().getAppInstanceId().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null || !uid.equals(currentUid()) || !allowed(uid)) {
                call.reject("analytics_identity_unavailable"); return;
            }
            preparedUid = uid;
            preparedInstanceId = task.getResult();
            JSObject result = new JSObject();
            result.put("appInstanceId", preparedInstanceId);
            call.resolve(result);
        });
    }

    private String analyticsUserId(String uid) throws Exception {
        byte[] bytes = MessageDigest.getInstance("SHA-256").digest(uid.getBytes(StandardCharsets.UTF_8));
        StringBuilder value = new StringBuilder();
        for (byte item : bytes) value.append(String.format("%02x", item & 0xff));
        return value.toString();
    }

    @PluginMethod
    public void enableRegistered(PluginCall call) {
        String uid = call.getString("uid");
        String instanceId = call.getString("appInstanceId");
        if (uid == null || !uid.equals(currentUid()) || !allowed(uid) || !uid.equals(preparedUid)
                || instanceId == null || !instanceId.equals(preparedInstanceId)) { call.reject("analytics_identity_changed"); return; }
        try {
            String userId = analyticsUserId(uid);
            if (!userId.equals(call.getString("analyticsUserId"))) { call.reject("analytics_identity_changed"); return; }
            // The server must have acknowledged the installation before this
            // method is called. No email, Google display name or photo is sent.
            analytics().setUserId(userId);
            analytics().setAnalyticsCollectionEnabled(true);
            call.resolve();
        } catch (Exception ignored) { call.reject("analytics_identity_unavailable"); }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        analytics().setAnalyticsCollectionEnabled(false);
        consent(analytics(), false);
        analytics().setUserId(null);
        analytics().resetAnalyticsData();
        prefs().edit().clear().apply();
        preparedUid = null;
        preparedInstanceId = null;
        call.resolve();
    }
}
