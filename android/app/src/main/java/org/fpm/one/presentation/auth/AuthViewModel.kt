package org.fpm.one.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.UserSession
import org.fpm.one.data.repository.AuthRepository
import org.fpm.one.data.repository.UnverifiedEmailException

enum class ForgotPasswordStep {
  ENTER_EMAIL,
  ENTER_OTP,
  SET_NEW_PASSWORD,
  SUCCESS
}

data class AuthUiState(
  val isLoading: Boolean = false,
  val error: String? = null,
  val isPendingApproval: Boolean = false,
  val user: UserSession? = null,
  // Brevo email verification state
  val isVerifyingEmail: Boolean = false,
  val verifySuccessMessage: String? = null,
  val verifyErrorMessage: String? = null,
  val isResendingOtp: Boolean = false,
  val resendSuccessMessage: String? = null,
  // Brevo forgot password state (6-digit OTP & new password flow)
  val isForgotPasswordLoading: Boolean = false,
  val forgotPasswordSuccess: String? = null,
  val forgotPasswordError: String? = null,
  val forgotPasswordStep: ForgotPasswordStep = ForgotPasswordStep.ENTER_EMAIL,
  val forgotPasswordEmail: String? = null,
  val resetAuthToken: String? = null,
  val isVerifyingResetOtp: Boolean = false,
  val resetOtpError: String? = null,
  val isResendingResetOtp: Boolean = false,
  val resendResetSuccess: String? = null,
  val isResettingPassword: Boolean = false,
  val resetPasswordSuccess: String? = null,
  val resetPasswordError: String? = null
)

class AuthViewModel(private val repository: AuthRepository) : ViewModel() {

  private val _uiState = MutableStateFlow(AuthUiState())
  val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

  fun login(
    emailOrPhone: String,
    pass: String,
    onSuccess: () -> Unit,
    onPending: () -> Unit,
    onUnverified: (String) -> Unit = {}
  ) {
    if (emailOrPhone.isBlank() || pass.isBlank()) {
      _uiState.value = _uiState.value.copy(error = "Please enter both email/phone and password.")
      return
    }

    _uiState.value = _uiState.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val result = repository.login(emailOrPhone.trim(), pass)
      result.fold(
        onSuccess = { user ->
          _uiState.value = _uiState.value.copy(isLoading = false, user = user)
          onSuccess()
        },
        onFailure = { ex ->
          if (ex is UnverifiedEmailException) {
            _uiState.value = _uiState.value.copy(isLoading = false, error = ex.message)
            onUnverified(ex.email)
            return@fold
          }
          val msg = ex.message ?: "Authentication failed"
          if (msg.contains("awaiting administrative approval") || msg.contains("pending")) {
            _uiState.value = _uiState.value.copy(isLoading = false, isPendingApproval = true, error = msg)
            onPending()
          } else {
            _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
          }
        }
      )
    }
  }

  fun verifyEmail(email: String, otp: String, onVerified: () -> Unit) {
    if (otp.isBlank() || otp.trim().length != 6) {
      _uiState.value = _uiState.value.copy(verifyErrorMessage = "Please enter the 6-digit verification code.")
      return
    }
    _uiState.value = _uiState.value.copy(isVerifyingEmail = true, verifyErrorMessage = null, verifySuccessMessage = null)
    viewModelScope.launch {
      val result = repository.verifyEmail(email.trim(), otp.trim())
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isVerifyingEmail = false,
            verifySuccessMessage = res.message ?: "Email verified successfully!"
          )
          onVerified()
        },
        onFailure = { ex ->
          _uiState.value = _uiState.value.copy(
            isVerifyingEmail = false,
            verifyErrorMessage = ex.message ?: "Verification failed. Please check your code."
          )
        }
      )
    }
  }

  fun resendOtp(email: String) {
    _uiState.value = _uiState.value.copy(isResendingOtp = true, verifyErrorMessage = null, resendSuccessMessage = null)
    viewModelScope.launch {
      val result = repository.resendOtp(email.trim())
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isResendingOtp = false,
            resendSuccessMessage = res.message ?: "A fresh 6-digit code has been sent."
          )
        },
        onFailure = { ex ->
          _uiState.value = _uiState.value.copy(
            isResendingOtp = false,
            verifyErrorMessage = ex.message ?: "Failed to resend code."
          )
        }
      )
    }
  }

  fun forgotPassword(email: String, onSuccess: () -> Unit = {}) {
    if (email.isBlank() || !email.contains("@")) {
      _uiState.value = _uiState.value.copy(forgotPasswordError = "Please enter a valid email address.")
      return
    }
    _uiState.value = _uiState.value.copy(
      isForgotPasswordLoading = true,
      forgotPasswordError = null,
      forgotPasswordSuccess = null
    )
    viewModelScope.launch {
      val cleanEmail = email.trim()
      val result = repository.forgotPassword(cleanEmail)
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isForgotPasswordLoading = false,
            forgotPasswordSuccess = res.message ?: "If an account exists with this email, password reset instructions have been dispatched.",
            forgotPasswordEmail = cleanEmail,
            forgotPasswordStep = ForgotPasswordStep.ENTER_OTP
          )
          onSuccess()
        },
        onFailure = { ex ->
          _uiState.value = _uiState.value.copy(
            isForgotPasswordLoading = false,
            forgotPasswordError = ex.message ?: "Failed to request password reset."
          )
        }
      )
    }
  }

  fun verifyResetOtp(email: String, otp: String, onSuccess: () -> Unit = {}) {
    if (otp.isBlank() || otp.trim().length != 6) {
      _uiState.value = _uiState.value.copy(resetOtpError = "Please enter the 6-digit verification code.")
      return
    }
    _uiState.value = _uiState.value.copy(
      isVerifyingResetOtp = true,
      resetOtpError = null
    )
    viewModelScope.launch {
      val result = repository.verifyResetOtp(email.trim(), otp.trim())
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isVerifyingResetOtp = false,
            resetAuthToken = res.resetAuthToken,
            forgotPasswordEmail = email.trim(),
            forgotPasswordStep = ForgotPasswordStep.SET_NEW_PASSWORD
          )
          onSuccess()
        },
        onFailure = { ex ->
          _uiState.value = _uiState.value.copy(
            isVerifyingResetOtp = false,
            resetOtpError = ex.message ?: "Invalid verification code. Please try again."
          )
        }
      )
    }
  }

  fun resendResetOtp(email: String) {
    _uiState.value = _uiState.value.copy(
      isResendingResetOtp = true,
      resetOtpError = null,
      resendResetSuccess = null
    )
    viewModelScope.launch {
      val result = repository.resendResetOtp(email.trim())
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isResendingResetOtp = false,
            resendResetSuccess = res.message ?: "A fresh 6-digit code has been dispatched."
          )
        },
        onFailure = { ex ->
          _uiState.value = _uiState.value.copy(
            isResendingResetOtp = false,
            resetOtpError = ex.message ?: "Failed to resend code."
          )
        }
      )
    }
  }

  fun completePasswordReset(email: String, resetAuthToken: String, newPassword: String, onSuccess: () -> Unit = {}) {
    if (newPassword.isBlank() || newPassword.length < 6) {
      _uiState.value = _uiState.value.copy(resetPasswordError = "New password must be at least 6 characters.")
      return
    }
    _uiState.value = _uiState.value.copy(
      isResettingPassword = true,
      resetPasswordError = null,
      resetPasswordSuccess = null
    )
    viewModelScope.launch {
      val result = repository.completePasswordReset(email.trim(), resetAuthToken, newPassword)
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isResettingPassword = false,
            resetPasswordSuccess = res.message ?: "Password successfully updated.",
            forgotPasswordStep = ForgotPasswordStep.SUCCESS
          )
          onSuccess()
        },
        onFailure = { ex ->
          _uiState.value = _uiState.value.copy(
            isResettingPassword = false,
            resetPasswordError = ex.message ?: "Failed to reset password."
          )
        }
      )
    }
  }

  fun setForgotPasswordStep(step: ForgotPasswordStep) {
    _uiState.value = _uiState.value.copy(forgotPasswordStep = step)
  }

  fun clearError() {
    _uiState.value = _uiState.value.copy(
      error = null,
      verifyErrorMessage = null,
      forgotPasswordError = null,
      resetOtpError = null,
      resetPasswordError = null
    )
  }

  fun clearForgotPasswordState() {
    _uiState.value = _uiState.value.copy(
      forgotPasswordError = null,
      forgotPasswordSuccess = null,
      isForgotPasswordLoading = false,
      forgotPasswordStep = ForgotPasswordStep.ENTER_EMAIL,
      forgotPasswordEmail = null,
      resetAuthToken = null,
      isVerifyingResetOtp = false,
      resetOtpError = null,
      isResendingResetOtp = false,
      resendResetSuccess = null,
      isResettingPassword = false,
      resetPasswordSuccess = null,
      resetPasswordError = null
    )
  }
}
