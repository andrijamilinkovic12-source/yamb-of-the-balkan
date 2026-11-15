package com.yamb.balkan;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FacebookAuthProvider;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthUserCollisionException;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import java.util.Arrays;

@CapacitorPlugin(name = "AccountIdentity")
public class AccountIdentityPlugin extends Plugin {
    private boolean facebookAvailable() {
        String[] providers = getBridge().getConfig().getPluginConfiguration("FirebaseAuthentication")
                .getArray("providers", new String[0]);
        return BuildConfig.YAMB_FACEBOOK_ENABLED && Arrays.asList(providers).contains("facebook.com");
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject result = new JSObject();
        result.put("facebook", facebookAvailable());
        call.resolve(result);
    }

    @PluginMethod
    public void shareReferral(PluginCall call) {
        String url = call.getString("url", "");
        Uri uri = Uri.parse(url);
        String origin = getBridge().getConfig().getServerUrl();
        String expectedHost = origin == null ? null : Uri.parse(origin).getHost();
        if (!"https".equals(uri.getScheme()) || expectedHost == null || !expectedHost.equals(uri.getHost())
                || !"/referral.html".equals(uri.getPath())) {
            call.reject("invalid_referral_url");
            return;
        }
        String title = call.getString("title", "Yamb of the Balkan");
        Intent intent = new Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, url);
        getActivity().startActivity(Intent.createChooser(intent, title));
        call.resolve();
    }

    @PluginMethod
    public void linkProvider(PluginCall call) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        String provider = call.getString("provider");
        String token = call.getString("token");
        if (!facebookAvailable() || user == null || !user.getUid().equals(call.getString("uid"))
                || provider == null || token == null || token.isEmpty()) {
            call.reject("identity_changed");
            return;
        }
        AuthCredential credential = credentialFor(provider, token);
        if (credential == null) { call.reject("unsupported_provider"); return; }
        user.linkWithCredential(credential).addOnCompleteListener(task -> {
            if (task.isSuccessful()) call.resolve();
            else if (task.getException() instanceof FirebaseAuthUserCollisionException) {
                call.reject("credential-already-in-use");
            } else call.reject("provider_link_failed");
        });
    }

    private AuthCredential credentialFor(String provider, String token) {
        if ("google.com".equals(provider)) return GoogleAuthProvider.getCredential(token, null);
        if ("facebook.com".equals(provider) && facebookAvailable()) return FacebookAuthProvider.getCredential(token);
        return null;
    }

    @PluginMethod
    public void reauthenticate(PluginCall call) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        String provider = call.getString("provider");
        String uid = call.getString("uid");
        String token = call.getString("token");
        if (user == null || !user.getUid().equals(uid) || provider == null || token == null || token.isEmpty()
                || user.getProviderData().stream().noneMatch(item -> provider.equals(item.getProviderId()))) {
            call.reject("identity_changed");
            return;
        }
        AuthCredential credential = credentialFor(provider, token);
        if (credential == null) { call.reject("unsupported_provider"); return; }
        user.reauthenticate(credential).addOnCompleteListener(task -> {
            if (task.isSuccessful()) call.resolve();
            else call.reject("reauthentication_failed");
        });
    }
}
