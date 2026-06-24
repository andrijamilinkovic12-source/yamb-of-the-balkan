package com.yamb.balkan;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.List;

@CapacitorPlugin(name = "H2HShare")
public class H2HSharePlugin extends Plugin {

    @PluginMethod
    public void shareImage(PluginCall call) {
        String dataUrl = call.getString("dataUrl", "");
        String filename = sanitizeFilename(call.getString("filename", "yamb-h2h-card.png"));
        String title = call.getString("title", "Yamb H2H statistika");
        String text = call.getString("text", "");
        String dialogTitle = call.getString("dialogTitle", title);

        if (dataUrl == null || dataUrl.trim().isEmpty()) {
            call.reject("Nedostaje slika za deljenje.");
            return;
        }

        try {
            String base64 = dataUrl;
            int commaIndex = dataUrl.indexOf(',');
            if (commaIndex >= 0) {
                base64 = dataUrl.substring(commaIndex + 1);
            }

            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            File shareDir = new File(getContext().getCacheDir(), "h2h-share");
            if (!shareDir.exists() && !shareDir.mkdirs()) {
                call.reject("Nije moguće pripremiti folder za deljenje.");
                return;
            }

            File imageFile = new File(shareDir, filename);
            try (FileOutputStream output = new FileOutputStream(imageFile)) {
                output.write(bytes);
            }

            Uri imageUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                imageFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("image/png");
            shareIntent.putExtra(Intent.EXTRA_STREAM, imageUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
            if (text != null && !text.trim().isEmpty()) {
                shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            }
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            PackageManager packageManager = getContext().getPackageManager();
            List<ResolveInfo> targets = packageManager.queryIntentActivities(shareIntent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo target : targets) {
                getContext().grantUriPermission(
                    target.activityInfo.packageName,
                    imageUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
            }

            Intent chooser = Intent.createChooser(shareIntent, dialogTitle);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("shared", true);
            call.resolve(result);
        } catch (IllegalArgumentException e) {
            call.reject("Slika za deljenje nije validna.", e);
        } catch (ActivityNotFoundException e) {
            call.reject("Nema aplikacije za deljenje slike.", e);
        } catch (Exception e) {
            call.reject("Deljenje slike nije uspelo.", e);
        }
    }

    private String sanitizeFilename(String value) {
        String clean = value == null ? "yamb-h2h-card.png" : value.replaceAll("[^a-zA-Z0-9._-]", "-");
        if (!clean.toLowerCase().endsWith(".png")) {
            clean = clean + ".png";
        }
        return clean;
    }
}
