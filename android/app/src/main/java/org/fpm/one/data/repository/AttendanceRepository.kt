package org.fpm.one.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.fpm.one.core.network.ApiClient
import org.fpm.one.data.model.*

class AttendanceRepository {

  suspend fun clockIn(
    workerIdentifier: String,
    serviceId: String,
    method: String,
    pin: String? = null
  ): Result<AttendanceRecordItem> = withContext(Dispatchers.IO) {
    try {
      val payload = buildString {
        append("{")
        append("\"workerIdentifier\":\"$workerIdentifier\",")
        append("\"serviceId\":\"$serviceId\",")
        append("\"method\":\"$method\"")
        if (pin != null) {
          append(",\"pin\":\"$pin\"")
        }
        append("}")
      }

      val responseText = ApiClient.post("/attendance/clock-in", payload)
      val response = ApiClient.json.decodeFromString<ClockInResponse>(responseText)
      Result.success(response.record)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun clockOut(attendanceId: String): Result<AttendanceRecordItem> = withContext(Dispatchers.IO) {
    try {
      val payload = """{"attendanceId":"$attendanceId","source":"manual"}"""
      val responseText = ApiClient.post("/attendance/clock-out", payload)
      val response = ApiClient.json.decodeFromString<ClockInResponse>(responseText)
      Result.success(response.record)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getMyAttendanceHistory(): Result<AttendanceHistoryResponse> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/attendance/my-history")
      val history = ApiClient.json.decodeFromString<AttendanceHistoryResponse>(responseText)
      Result.success(history)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }
}
