package org.fpm.one.core.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.fpm.one.MainActivity
import org.fpm.one.R
import org.fpm.one.data.model.NotificationItem

/**
 * Production notification helper for FPM Global.
 * Manages notification channels, POST_NOTIFICATIONS permission checks,
 * and Android system status bar notification posting with official branding.
 */
object NotificationHelper {

    const val CHANNEL_ANNOUNCEMENTS = "fpm_announcements"
    const val CHANNEL_SERVICES = "fpm_services"
    const val CHANNEL_EVENTS = "fpm_events"
    const val CHANNEL_GENERAL = "fpm_general"

    private const val PREFS_NAME = "fpm_notifications_prefs"
    private const val KEY_NOTIFIED_IDS = "notified_ids"

    /**
     * Initializes Android 8.0+ (API 26+) notification channels with high-priority audio & vibration.
     */
    fun init(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            val channels = listOf(
                NotificationChannel(
                    CHANNEL_ANNOUNCEMENTS,
                    "Announcements & Declarations",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Urgent church announcements, pastoral messages, and weekly declarations"
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_SERVICES,
                    "Services & Live Streams",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Service reminders, live stream links, and special worship notifications"
                    enableVibration(true)
                },
                NotificationChannel(
                    CHANNEL_EVENTS,
                    "Events & Programs",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Church conferences, special events, and ministry programs"
                },
                NotificationChannel(
                    CHANNEL_GENERAL,
                    "General Church Updates",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Testimonies, moments, and general ministry updates"
                }
            )

            channels.forEach { channel ->
                notificationManager.createNotificationChannel(channel)
            }
        }
    }

    /**
     * Checks if the app has runtime notification permission on Android 13+ (API 33+).
     */
    fun hasPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    /**
     * Posts a notification to the Android status bar tray.
     */
    fun showNotification(
        context: Context,
        id: Int,
        title: String,
        body: String,
        channelId: String = CHANNEL_ANNOUNCEMENTS,
        actionUrl: String? = null
    ) {
        if (!hasPermission(context)) return

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!actionUrl.isNullOrBlank()) {
                putExtra("actionUrl", actionUrl)
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.church_logo)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setColor(0xFFD4AF37.toInt()) // FPM Gold
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        try {
            NotificationManagerCompat.from(context).notify(id, builder.build())
        } catch (_: SecurityException) {
            // Permission was revoked at runtime
        }
    }

    /**
     * Synchronizes in-app notifications with the Android system notification tray.
     * Prevents duplicate alerts by tracking notified IDs in SharedPreferences.
     */
    fun syncSystemTray(context: Context, notifications: List<NotificationItem>) {
        if (!hasPermission(context)) return

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val notifiedSet = prefs.getStringSet(KEY_NOTIFIED_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
        var hasNew = false

        notifications.forEach { item ->
            if (!item.isRead && !notifiedSet.contains(item.id)) {
                val channel = when (item.notificationType.lowercase()) {
                    "service", "service_reminder" -> CHANNEL_SERVICES
                    "event", "event_reminder" -> CHANNEL_EVENTS
                    "announcement", "broadcast" -> CHANNEL_ANNOUNCEMENTS
                    else -> CHANNEL_GENERAL
                }
                showNotification(
                    context = context,
                    id = item.id.hashCode(),
                    title = item.title,
                    body = item.body,
                    channelId = channel,
                    actionUrl = item.actionUrl
                )
                notifiedSet.add(item.id)
                hasNew = true
            }
        }

        if (hasNew) {
            prefs.edit().putStringSet(KEY_NOTIFIED_IDS, notifiedSet).apply()
        }
    }
}
