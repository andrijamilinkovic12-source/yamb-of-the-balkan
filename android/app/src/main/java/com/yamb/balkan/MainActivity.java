package com.yamb.balkan;

import android.os.Bundle;
import android.os.Build;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        AnalyticsPrivacyPlugin.suspendAtStartup(this);
        registerPlugin(H2HSharePlugin.class);
        registerPlugin(AdConsentPlugin.class);
        registerPlugin(AnalyticsPrivacyPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.enableEdgeToEdge(getWindow());
        // The game's artwork stays dark independently of the Android device theme.
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(true);
        }
    }

    @Override
    public void onStop() {
        AnalyticsPrivacyPlugin.suspendAtStartup(this);
        super.onStop();
    }
}
