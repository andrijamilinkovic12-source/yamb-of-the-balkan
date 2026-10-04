package com.yamb.balkan;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

@CapacitorPlugin(name = "AdConsent")
public class AdConsentPlugin extends Plugin {
    private JSObject consentStatus(ConsentInformation consentInformation) {
        JSObject status = new JSObject();
        status.put("canRequestAds", consentInformation.canRequestAds());
        status.put("privacyOptionsRequired",
                consentInformation.getPrivacyOptionsRequirementStatus()
                        == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED);
        return status;
    }

    @PluginMethod
    public void requestConsent(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ConsentInformation consentInformation = UserMessagingPlatform.getConsentInformation(getActivity());
            ConsentRequestParameters params = new ConsentRequestParameters.Builder()
                    .setTagForUnderAgeOfConsent(false)
                    .build();

            consentInformation.requestConsentInfoUpdate(
                    getActivity(),
                    params,
                    () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                            getActivity(),
                            formError -> call.resolve(consentStatus(consentInformation))),
                    requestError -> call.resolve(consentStatus(consentInformation)));
        });
    }

    @PluginMethod
    public void showPrivacyOptions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ConsentInformation consentInformation = UserMessagingPlatform.getConsentInformation(getActivity());
            if (consentInformation.getPrivacyOptionsRequirementStatus()
                    != ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) {
                call.resolve(consentStatus(consentInformation));
                return;
            }

            UserMessagingPlatform.showPrivacyOptionsForm(getActivity(),
                    formError -> call.resolve(consentStatus(consentInformation)));
        });
    }
}
