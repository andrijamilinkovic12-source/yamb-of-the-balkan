package com.yamb.balkan; // <--- PROVERI DA LI JE OVO TVOJ PAKET! Ako nije, promeni u tvoj (npr. com.tvojeime.yamb)

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // --- GDPR / UMP IMPLEMENTACIJA ---

        // 1. Postavljamo parametre (za testiranje mozes ovde dodati .setDebugSettings...)
        ConsentRequestParameters params = new ConsentRequestParameters.Builder()
                .setTagForUnderAgeOfConsent(false)
                .build();

        ConsentInformation consentInformation = UserMessagingPlatform.getConsentInformation(this);

        // 2. Proveravamo da li treba osvežiti status pristanka
        consentInformation.requestConsentInfoUpdate(
                this,
                params,
                (ConsentInformation.OnConsentInfoUpdateSuccessListener) () -> {
                    // Uspeh: Status je ažuriran. Sada učitavamo formu ako je potrebna.
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                            this,
                            (loadAndShowError) -> {
                                if (loadAndShowError != null) {
                                    // Loguj grešku ako se forma nije prikazala (opciono)
                                }

                                // 3. Proveravamo da li smemo da inicijalizujemo reklame
                                if (consentInformation.canRequestAds()) {
                                    initializeMobileAdsSdk();
                                }
                            }
                    );
                },
                (ConsentInformation.OnConsentInfoUpdateFailureListener) requestConsentError -> {
                    // Greška pri proveravanju statusa (npr. nema interneta)
                });

        // 4. Provera da li su reklame već dozvoljene (za korisnike koji su već dali pristanak ranije)
        if (consentInformation.canRequestAds()) {
            initializeMobileAdsSdk();
        }
    }

    private void initializeMobileAdsSdk() {
        // Ovde pokrećemo AdMob samo ako imamo dozvolu
        MobileAds.initialize(this, initializationStatus -> {});
    }
}