package com.projectmythos.signalrun;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.content.Context;
import android.net.ConnectivityManager;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Opt-in network acceptance on an isolated QA install. Never logs tokens or sends notifications. */
@RunWith(AndroidJUnit4.class)
public class PushRegistrationConnectedTest {
    private static final int TIMEOUT_SECONDS = 90;
    private static final String QA_TOPIC = "mythos-qa-consent-20261105";
    private static final PushRegistrationPlugin PLUGIN = new PushRegistrationPlugin() {
        @Override public Context getContext() {
            return InstrumentationRegistry.getInstrumentation().getTargetContext();
        }
    };

    private static void requireOptIn() {
        assumeTrue("Requires an isolated connected QA device and -e connectedPush true",
            "true".equals(InstrumentationRegistry.getArguments().getString("connectedPush")));
    }

    private static FirebaseMessaging messaging() {
        FirebaseApp.initializeApp(InstrumentationRegistry.getInstrumentation().getTargetContext());
        return FirebaseMessaging.getInstance();
    }

    private static final class BridgeResult {
        final CountDownLatch finished = new CountDownLatch(1);
        boolean succeeded;
        void await() throws Exception {
            assertTrue("Registration bridge timed out", finished.await(TIMEOUT_SECONDS, TimeUnit.SECONDS));
            assertTrue("Registration bridge rejected the operation", succeeded);
        }
    }

    private static BridgeResult requestRegistration(boolean enabled) {
        BridgeResult result = new BridgeResult();
        PluginCall call = new PluginCall(null, "PushRegistration", "qa", "setEnabled",
            new JSObject().put("enabled", enabled)) {
            @Override public void resolve() {
                result.succeeded = true;
                result.finished.countDown();
            }
            @Override public void reject(String message) {
                result.finished.countDown();
            }
        };
        InstrumentationRegistry.getInstrumentation().runOnMainSync(
            () -> PLUGIN.setEnabled(call));
        return result;
    }

    private static void setRegistration(boolean enabled) throws Exception {
        requestRegistration(enabled).await();
    }

    private static String token(FirebaseMessaging messaging) {
        try {
            String token = Tasks.await(messaging.getToken(), TIMEOUT_SECONDS, TimeUnit.SECONDS);
            assertTrue("Expected a nonempty token", token != null && !token.isEmpty());
            return token;
        } catch (Exception failure) {
            // Do not attach SDK exception text or token values to the instrumentation report.
            throw new AssertionError("FCM token acquisition failed: " + failure.getClass().getSimpleName());
        }
    }

    private static boolean hasCachedToken() {
        // Messaging 25.0.1 stores tokens under these keys. Inspect presence only, never serialize values.
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        return context.getSharedPreferences("com.google.android.gms.appid", Context.MODE_PRIVATE)
            .getAll().keySet().stream().anyMatch(key -> key.contains("|T|"));
    }

    @Test
    public void bridgeDeletesExistingTokenAndReenableRenewsIt() throws Exception {
        requireOptIn();
        FirebaseMessaging messaging = messaging();
        assertFalse("Start with alert consent off", messaging.isAutoInitEnabled());
        try {
            setRegistration(true);
            assertTrue("Enable persists auto-init", messaging.isAutoInitEnabled());
            String first = token(messaging);
            assertTrue("Acquired token is cached", hasCachedToken());
            setRegistration(false);
            assertFalse("Disable persists auto-init", messaging.isAutoInitEnabled());
            assertFalse("Successful deletion removes the cached token", hasCachedToken());
            setRegistration(true);
            String renewed = token(messaging);
            assertTrue("Re-enable must obtain a different token", !first.equals(renewed));
        } finally {
            setRegistration(false);
        }
        assertFalse("Finish with auto-init off", messaging.isAutoInitEnabled());
        assertFalse("Finish without a cached token", hasCachedToken());
    }

    /** Run separately after process restart; does not call getToken (which would create one). */
    @Test
    public void disabledRestartHasNoCachedToken() {
        requireOptIn();
        assertFalse("Restart must preserve auto-init off", messaging().isAutoInitEnabled());
        assertFalse("Restart must not restore a cached token", hasCachedToken());
    }

    /** Diagnostic phase 1: run offline, then force-stop before reconnecting. No production topics. */
    @Test
    public void queueOfflineTopicThenDisable() throws Exception {
        requireOptIn();
        assumeTrue("Requires explicit pending-topic probe",
            "true".equals(InstrumentationRegistry.getArguments().getString("pendingTopicProbe")));
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ConnectivityManager network = context.getSystemService(ConnectivityManager.class);
        assertTrue("Run this phase offline", network.getActiveNetwork() == null);
        FirebaseMessaging messaging = messaging();
        assertFalse("Start without a token", hasCachedToken());
        setRegistration(true);
        messaging.subscribeToTopic(QA_TOPIC);
        Thread.sleep(1500); // Allow the SDK to persist the request before process death.
        BridgeResult firstOff = requestRegistration(false);
        BridgeResult duplicateOff = requestRegistration(false);
        assertFalse("Auto-init is off", messaging.isAutoInitEnabled());
        assertFalse("No token was acquired offline", hasCachedToken());
        // Instrumentation can terminate its process before SharedPreferences.apply flushes.
        Thread.sleep(1000);
        if ("true".equals(InstrumentationRegistry.getArguments().getString("sameProcessProbe"))) {
            for (int i = 0; i < 60 && network.getActiveNetwork() == null; i++) Thread.sleep(1000);
            assertTrue("Host must reconnect the QA device", network.getActiveNetwork() != null);
            firstOff.await();
            duplicateOff.await();
            for (int i = 0; i < 30 && !hasCachedToken(); i++) Thread.sleep(1000);
            assertFalse("A token remains after completed off cleanup in the same process", hasCachedToken());
        }
    }

    /** Diagnostic phase 2: reconnect after force-stop, then run in a new app process. */
    @Test
    public void interruptedCleanupFinishesAfterRestart() throws Exception {
        requireOptIn();
        assumeTrue("Requires explicit pending-topic probe",
            "true".equals(InstrumentationRegistry.getArguments().getString("pendingTopicProbe")));
        assertFalse("Consent remains off", messaging().isAutoInitEnabled());
        setRegistration(false); // The same reconciliation that the app performs on an off launch.
        for (int i = 0; i < 30 && !hasCachedToken(); i++) Thread.sleep(1000);
        assertFalse("A token remains after restarted off cleanup", hasCachedToken());
    }

    /** Explicit cleanup only, including after a failed probe. Never sends a message. */
    @Test
    public void cleanupProbeTopic() throws Exception {
        requireOptIn();
        assumeTrue("Requires explicit pending-topic probe",
            "true".equals(InstrumentationRegistry.getArguments().getString("pendingTopicProbe")));
        FirebaseMessaging messaging = messaging();
        try {
            Tasks.await(messaging.unsubscribeFromTopic(QA_TOPIC), TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (Exception failure) {
            throw new AssertionError("QA topic cleanup failed: " + failure.getClass().getSimpleName());
        } finally {
            setRegistration(false);
        }
    }
}
