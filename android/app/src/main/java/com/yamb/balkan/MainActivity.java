package com.yamb.balkan;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(H2HSharePlugin.class);
        registerPlugin(AdConsentPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
