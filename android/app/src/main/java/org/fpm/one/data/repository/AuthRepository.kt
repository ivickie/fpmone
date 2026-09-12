package org.fpm.one.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.security.SessionManager
import org.fpm.one.data.model.*
import kotlinx.serialization.encodeToString

class AuthRepository(private val sessionManager: SessionManager) {

  suspend fun login(emailOrPhone: String, pass: String): Result<UserSession> = withContext(Dispatchers.IO) {
    try {
      val payload = """{"emailOrPhone":"$emailOrPhone","password":"$pass"}"""
      val responseText = ApiClient.post("/auth/login", payload)
      val response = ApiClient.json.decodeFromString<LoginResponse>(responseText)

      if (response.token != null && response.user != null) {
        sessionManager.saveSession(response.token, response.user)
        Result.success(response.user)
      } else {
        Result.failure(Exception(response.error ?: "Login failed"))
      }
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun register(request: RegistrationRequest): Result<RegistrationResponse> = withContext(Dispatchers.IO) {
    try {
      val jsonPayload = ApiClient.json.encodeToString(request)
      val responseText = ApiClient.post("/auth/register", jsonPayload)
      val response = ApiClient.json.decodeFromString<RegistrationResponse>(responseText)
      Result.success(response)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun refreshProfile(): Result<UserSession> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/auth/profile")
      val user = ApiClient.json.decodeFromString<UserSession>(responseText)
      sessionManager.updateCachedUser(user)
      Result.success(user)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  fun logout() {
    sessionManager.clearSession()
  }

  fun isUserLoggedIn(): Boolean = sessionManager.isLoggedIn()
  fun getCurrentUser(): UserSession? = sessionManager.currentUser.value

  suspend fun uploadAvatar(bytes: ByteArray, filename: String, mimeType: String): Result<String> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.uploadAvatar(bytes, filename, mimeType)
      Result.success(responseText)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }
}
