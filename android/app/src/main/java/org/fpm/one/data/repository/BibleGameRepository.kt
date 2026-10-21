package org.fpm.one.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.fpm.one.core.network.ApiClient
import org.fpm.one.data.model.*

@Serializable
data class BibleApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null
)

class BibleGameRepository {

    suspend fun getTodayOverview(date: String? = null): Result<BibleTodayOverview> = withContext(Dispatchers.IO) {
        try {
            val endpoint = if (date != null) "/bible-game/today?date=${date}" else "/bible-game/today"
            val responseText = ApiClient.get(endpoint)
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleTodayOverview>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to retrieve today's Bible challenge."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startOrResumeSession(date: String? = null): Result<BibleGameSession> = withContext(Dispatchers.IO) {
        try {
            val jsonBody = buildJsonObject {
                if (date != null) put("date", date)
            }.toString()
            val responseText = ApiClient.post("/bible-game/start", jsonBody)
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleGameSession>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to start Bible game session."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startQuestion(
        questionIndex: Int,
        date: String? = null
    ): Result<BibleQuestionTiming> = withContext(Dispatchers.IO) {
        try {
            val jsonBody = buildJsonObject {
                put("questionIndex", questionIndex)
                if (date != null) put("date", date)
            }.toString()
            val responseText = ApiClient.post("/bible-game/question/start", jsonBody)
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleQuestionTiming>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to start question timer."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitAnswer(
        questionIndex: Int,
        selectedOptionIndex: Int?,
        isTimeout: Boolean = false,
        date: String? = null
    ): Result<BibleAnswerFeedback> = withContext(Dispatchers.IO) {
        try {
            val jsonBody = buildJsonObject {
                put("questionIndex", questionIndex)
                if (selectedOptionIndex != null) {
                    put("selectedOptionIndex", selectedOptionIndex)
                }
                put("isTimeout", isTimeout)
                if (date != null) put("date", date)
            }.toString()
            val responseText = ApiClient.post("/bible-game/answer", jsonBody)
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleAnswerFeedback>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to submit answer."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun completeChallenge(date: String? = null): Result<BibleChallengeCompletion> = withContext(Dispatchers.IO) {
        try {
            val jsonBody = buildJsonObject {
                if (date != null) put("date", date)
            }.toString()
            val responseText = ApiClient.post("/bible-game/complete", jsonBody)
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleChallengeCompletion>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to complete challenge."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProgressHistory(): Result<BibleProgressHistory> = withContext(Dispatchers.IO) {
        try {
            val responseText = ApiClient.get("/bible-game/progress")
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleProgressHistory>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to retrieve Bible progress history."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getLeaderboard(branchId: String? = null): Result<BibleLeaderboardData> = withContext(Dispatchers.IO) {
        try {
            val endpoint = if (branchId != null) "/bible-game/leaderboard?branchId=$branchId" else "/bible-game/leaderboard"
            val responseText = ApiClient.get(endpoint)
            val parsed = ApiClient.json.decodeFromString<BibleApiResponse<BibleLeaderboardData>>(responseText)
            if (parsed.success && parsed.data != null) {
                Result.success(parsed.data)
            } else {
                Result.failure(Exception(parsed.error ?: "Failed to retrieve leaderboard."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
