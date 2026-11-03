package com.yamb.balkan;

import android.os.Bundle;
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
    }

    @Override
    public void onStop() {
        AnalyticsPrivacyPlugin.suspendAtStartup(this);
        super.onStop();
    }
}
