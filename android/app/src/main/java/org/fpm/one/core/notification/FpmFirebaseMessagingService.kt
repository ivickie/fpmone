package org.fpm.one.core.notification

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.fpm.one.core.security.SessionManager
import org.fpm.one.data.repository.NotificationRepository

/**
 * Production Firebase Messaging Service for FPM Global (org.fpm.one).
 *
 * Responsibilities:
 * - Handles FCM token generation and rotation via onNewToken.
 * - Caches device registration tokens locally and synchronizes them with the backend.
 * - Handles incoming foreground and background data/notification messages.
 * - Dispatches rich branded system notifications mapped to FPM notification channels.
 */
class FpmFirebaseMessagingService : FirebaseMessagingService() {

    private val notificationRepository = NotificationRepository()

    /**
     * Called whenever a new FCM registration token is generated or rotated by Google Play Services.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        saveLocalFcmToken(applicationContext, token)

        val user = SessionManager.getUserSession()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                notificationRepository.registerDeviceToken(
                    deviceToken = token,
                    branchId = user?.branchId
                )
            } catch (e: Exception) {
                Log.w("FPM_FCM", "Failed to register new FCM token with backend: ${e.message}")
            }
        }
    }

    /**
     * Called when a message is received from Firebase Cloud Messaging while the app is in the foreground.
     * (When in background/killed, system tray handles notification payloads; data messages still pass here).
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: "Faith Preachers Ministries Int'l"

        val body = remoteMessage.notification?.body
            ?: remoteMessage.data["body"]
            ?: ""

        val channelId = remoteMessage.data["channelId"]
            ?: remoteMessage.notification?.channelId
            ?: NotificationHelper.CHANNEL_ANNOUNCEMENTS

        val actionUrl = remoteMessage.data["actionUrl"]
        val notifId = remoteMessage.data["notificationId"]?.hashCode()
            ?: (System.currentTimeMillis() % 100000).toInt()

        NotificationHelper.showNotification(
            context = applicationContext,
            id = notifId,
            title = title,
            body = body,
            channelId = channelId,
            actionUrl = actionUrl
        )
    }

    companion object {
        private const val PREFS_NAME = "fpm_fcm_token_prefs"
        private const val KEY_FCM_TOKEN = "cached_fcm_token"

        fun saveLocalFcmToken(context: Context, token: String) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_FCM_TOKEN, token.trim())
                .apply()
        }

        fun getLocalFcmToken(context: Context): String? {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_FCM_TOKEN, null)
        }

        fun clearLocalFcmToken(context: Context) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_FCM_TOKEN)
                .apply()
        }

        /**
         * Refreshes and synchronizes FCM token with the backend.
         */
        fun syncTokenWithBackend(context: Context, branchId: String? = null) {
            val token = getLocalFcmToken(context) ?: return
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val repo = NotificationRepository()
                    repo.registerDeviceToken(deviceToken = token, branchId = branchId)
                } catch (e: Exception) {
                    Log.w("FPM_FCM", "Background token sync notice: ${e.message}")
                }
            }
        }
    }
}
