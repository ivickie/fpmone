package org.fpm.one.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.fpm.one.core.network.ApiClient
import org.fpm.one.data.model.NotificationItem

class NotificationRepository {

  suspend fun getNotifications(): Result<List<NotificationItem>> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/notifications")
      val list = ApiClient.json.decodeFromString<List<NotificationItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun markAsRead(notificationId: String): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      ApiClient.put("/notifications/$notificationId/read", "{}")
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun registerDeviceToken(deviceToken: String, branchId: String? = null): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      val payload = buildString {
        append("{\"deviceToken\":\"")
        append(deviceToken)
        append("\",\"platform\":\"android\"")
        if (!branchId.isNullOrBlank()) {
          append(",\"branchId\":\"")
          append(branchId)
          append("\"")
        }
        append("}")
      }
      ApiClient.post("/notifications/register-token", payload)
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun unregisterDeviceToken(deviceToken: String): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      val payload = "{\"deviceToken\":\"$deviceToken\"}"
      ApiClient.post("/notifications/unregister-token", payload)
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }
}
