package com.projectmythos.signalrun;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

/** FCM registration consent. Tokens never cross the JavaScript bridge. */
@CapacitorPlugin(name = "PushRegistration")
public class PushRegistrationPlugin extends Plugin {
    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("enabled is required");
            return;
        }
        try {
            FirebaseMessaging messaging = FirebaseMessaging.getInstance();
            messaging.setAutoInitEnabled(enabled);
            if (enabled) {
                call.resolve();
            } else {
                // Auto-init is already off, even if offline deletion fails. The next app launch retries.
                // Do not delete the shared Firebase Installation ID: other SDKs use it independently.
                messaging.deleteToken().addOnCompleteListener(task -> {
                    if (task.isSuccessful()) call.resolve();
                    else call.reject("Notification registration removal could not finish");
                });
            }
        } catch (RuntimeException error) {
            call.reject("Notification registration is unavailable");
        }
    }
}
