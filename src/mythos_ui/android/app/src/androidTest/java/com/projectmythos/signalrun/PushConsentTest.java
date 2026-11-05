package com.projectmythos.signalrun;

import static org.junit.Assert.assertFalse;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Run on a fresh install / cleared QA app, before choosing to enable alerts. No tokens are read or printed. */
@RunWith(AndroidJUnit4.class)
public class PushConsentTest {
    @Test
    public void registrationIsDisabledBeforeConsent() {
        FirebaseApp.initializeApp(InstrumentationRegistry.getInstrumentation().getTargetContext());
        assertFalse("FCM must not automatically register before alert consent", FirebaseMessaging.getInstance().isAutoInitEnabled());
    }
}
