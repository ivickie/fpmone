package org.fpm.one.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.fpm.one.core.network.ApiClient
import org.fpm.one.core.network.NoConnectivityException
import org.fpm.one.core.security.SessionManager
import org.fpm.one.data.model.*
import kotlinx.serialization.encodeToString

import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull

class UnverifiedEmailException(val email: String, message: String) : Exception(message)

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
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        val msg = e.message ?: ""
        if (msg.contains("unverified_email") || msg.contains("verify your email", ignoreCase = true)) {
          Result.failure(UnverifiedEmailException(emailOrPhone, "Please verify your email address before logging in."))
        } else {
          val friendlyMsg = ApiClient.formatErrorMessage(e, fallback = "Login failed")
          Result.failure(Exception(friendlyMsg))
        }
      }
    }
  }

  suspend fun register(request: RegistrationRequest): Result<RegistrationResponse> = withContext(Dispatchers.IO) {
    try {
      val jsonPayload = ApiClient.json.encodeToString(request)
      val responseText = ApiClient.post("/auth/register", jsonPayload)
      val response = ApiClient.json.decodeFromString<RegistrationResponse>(responseText)
      Result.success(response)
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Registration failed")))
      }
    }
  }

  suspend fun verifyEmail(email: String, otp: String): Result<VerifyEmailResponse> = withContext(Dispatchers.IO) {
    try {
      val payload = ApiClient.json.encodeToString(VerifyEmailRequest(email, otp))
      val responseText = ApiClient.post("/auth/verify-email", payload)
      val response = ApiClient.json.decodeFromString<VerifyEmailResponse>(responseText)
      if (response.error != null) {
        Result.failure(Exception(response.error))
      } else {
        Result.success(response)
      }
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Verification failed")))
      }
    }
  }

  suspend fun resendOtp(email: String): Result<ResendOtpResponse> = withContext(Dispatchers.IO) {
    try {
      val payload = ApiClient.json.encodeToString(ResendOtpRequest(email))
      val responseText = ApiClient.post("/auth/resend-verification-otp", payload)
      val response = ApiClient.json.decodeFromString<ResendOtpResponse>(responseText)
      if (response.error != null) {
        Result.failure(Exception(response.error))
      } else {
        Result.success(response)
      }
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Failed to resend code")))
      }
    }
  }

  suspend fun forgotPassword(email: String): Result<ForgotPasswordResponse> = withContext(Dispatchers.IO) {
    try {
      val payload = ApiClient.json.encodeToString(ForgotPasswordRequest(email))
      val responseText = ApiClient.post("/auth/forgot-password", payload)
      val response = ApiClient.json.decodeFromString<ForgotPasswordResponse>(responseText)
      if (response.error != null) {
        Result.failure(Exception(response.error))
      } else {
        Result.success(response)
      }
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Failed to request password reset")))
      }
    }
  }

  suspend fun verifyResetOtp(email: String, otp: String): Result<VerifyResetOtpResponse> = withContext(Dispatchers.IO) {
    try {
      val payload = ApiClient.json.encodeToString(VerifyResetOtpRequest(email, otp))
      val responseText = ApiClient.post("/auth/verify-reset-otp", payload)
      val response = ApiClient.json.decodeFromString<VerifyResetOtpResponse>(responseText)
      if (response.error != null && !response.valid) {
        Result.failure(Exception(response.error))
      } else {
        Result.success(response)
      }
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Invalid verification code")))
      }
    }
  }

  suspend fun resendResetOtp(email: String): Result<ResendOtpResponse> = withContext(Dispatchers.IO) {
    try {
      val payload = ApiClient.json.encodeToString(ResendOtpRequest(email))
      val responseText = ApiClient.post("/auth/resend-reset-otp", payload)
      val response = ApiClient.json.decodeFromString<ResendOtpResponse>(responseText)
      if (response.error != null) {
        Result.failure(Exception(response.error))
      } else {
        Result.success(response)
      }
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Failed to resend reset code")))
      }
    }
  }

  suspend fun completePasswordReset(email: String, resetAuthToken: String, newPassword: String): Result<CompletePasswordResetResponse> = withContext(Dispatchers.IO) {
    try {
      val payload = ApiClient.json.encodeToString(CompletePasswordResetRequest(email, resetAuthToken, newPassword))
      val responseText = ApiClient.post("/auth/reset-password", payload)
      val response = ApiClient.json.decodeFromString<CompletePasswordResetResponse>(responseText)
      if (response.error != null && !response.success) {
        Result.failure(Exception(response.error))
      } else {
        Result.success(response)
      }
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(Exception(ApiClient.formatErrorMessage(e, fallback = "Failed to reset password")))
      }
    }
  }

  suspend fun refreshProfile(): Result<UserSession> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/auth/profile")
      val user = ApiClient.json.decodeFromString<UserSession>(responseText)
      sessionManager.updateCachedUser(user)
      Result.success(user)
    } catch (e: Exception) {
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(e)
      }
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
      if (ApiClient.isNetworkOrConnectivityException(e)) {
        Result.failure(NoConnectivityException(cause = e))
      } else {
        Result.failure(e)
      }
    }
  }
}
