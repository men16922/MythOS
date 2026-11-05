package com.projectmythos.signalrun;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

/** FCM registration consent. Tokens never cross the JavaScript bridge. */
@CapacitorPlugin(name = "PushRegistration")
public class PushRegistrationPlugin extends Plugin {
    private Task<Void> cleanupTask;
    private SharedPreferences preferences() {
        return getContext().getSharedPreferences("mythos_push_registration", Context.MODE_PRIVATE);
    }

    private boolean markCleanupRequired() {
        // Commit before SDK work so process death cannot lose our obligation to finish cleanup.
        return preferences().edit().putBoolean("cleanup_required", true).commit();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("enabled is required");
            return;
        }
        try {
            FirebaseMessaging messaging = FirebaseMessaging.getInstance();
            boolean needsCleanup = preferences().getBoolean("cleanup_required", false)
                || messaging.isAutoInitEnabled(); // Also reconcile previously enabled installations.
            if (!enabled) messaging.setAutoInitEnabled(false);
            if ((enabled || needsCleanup) && !markCleanupRequired()) {
                call.reject("Notification preference could not be saved");
                return;
            }
            messaging.setAutoInitEnabled(enabled);
            if (enabled) {
                call.resolve();
            } else {
                // Pending SDK topic work can create a token even with auto-init off. Drain it by
                // removing both app topics, then delete the token. A fresh never-enabled install
                // skips topic operations (which would themselves request a token).
                cleanup(messaging, needsCleanup).addOnCompleteListener(task -> {
                    if (task.isSuccessful()) call.resolve();
                    else call.reject("Notification registration removal could not finish");
                });
            }
        } catch (RuntimeException error) {
            call.reject("Notification registration is unavailable");
        }
    }

    private Task<Void> cleanup(FirebaseMessaging messaging, boolean needsCleanup) {
        // Off and a stale topic completion can request cleanup together. Share one drain so a
        // second set of unsubscriptions cannot recreate a token after the first deletion.
        if (cleanupTask != null && !cleanupTask.isComplete()) return cleanupTask;
        Task<Void> topics = needsCleanup
            ? Tasks.whenAll(messaging.unsubscribeFromTopic("daily-ko"), messaging.unsubscribeFromTopic("daily-en"))
            : Tasks.forResult(null);
        cleanupTask = topics.onSuccessTask(ignored -> messaging.deleteToken()).onSuccessTask(ignored -> {
            // Failure/process death retains the marker; the next off reconciliation retries.
            // Never delete the Firebase Installation ID shared with other SDKs.
            if (!preferences().edit().putBoolean("cleanup_required", false).commit()) {
                return Tasks.forException(new IllegalStateException("Notification preference could not be saved"));
            }
            return Tasks.forResult(null);
        });
        return cleanupTask;
    }

    @PluginMethod
    public void subscribe(PluginCall call) {
        changeTopic(call, true);
    }

    @PluginMethod
    public void unsubscribe(PluginCall call) {
        changeTopic(call, false);
    }

    private void changeTopic(PluginCall call, boolean subscribe) {
        String topic = call.getString("topic");
        if (!"daily-ko".equals(topic) && !"daily-en".equals(topic)) {
            call.reject("Unknown notification topic");
            return;
        }
        try {
            FirebaseMessaging messaging = FirebaseMessaging.getInstance();
            if (!messaging.isAutoInitEnabled()) {
                call.reject("Notification registration is disabled");
                return;
            }
            if (!markCleanupRequired()) {
                call.reject("Notification preference could not be saved");
                return;
            }
            Task<Void> task = subscribe ? messaging.subscribeToTopic(topic) : messaging.unsubscribeFromTopic(topic);
            // The upstream Capacitor plugin resolves when queued; callers here need server completion.
            task.addOnCompleteListener(result -> {
                if (result.isSuccessful()) call.resolve();
                else call.reject("Notification topic change could not finish");
            });
        } catch (RuntimeException error) {
            call.reject("Notification topic change is unavailable");
        }
    }
}
