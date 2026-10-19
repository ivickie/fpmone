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
  // Brevo forgot password state
  val isForgotPasswordLoading: Boolean = false,
  val forgotPasswordSuccess: String? = null,
  val forgotPasswordError: String? = null
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

  fun forgotPassword(email: String) {
    if (email.isBlank() || !email.contains("@")) {
      _uiState.value = _uiState.value.copy(forgotPasswordError = "Please enter a valid email address.")
      return
    }
    _uiState.value = _uiState.value.copy(isForgotPasswordLoading = true, forgotPasswordError = null, forgotPasswordSuccess = null)
    viewModelScope.launch {
      val result = repository.forgotPassword(email.trim())
      result.fold(
        onSuccess = { res ->
          _uiState.value = _uiState.value.copy(
            isForgotPasswordLoading = false,
            forgotPasswordSuccess = res.message ?: "If an account exists with this email, password reset instructions have been dispatched."
          )
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

  fun clearError() {
    _uiState.value = _uiState.value.copy(
      error = null,
      verifyErrorMessage = null,
      forgotPasswordError = null
    )
  }

  fun clearForgotPasswordState() {
    _uiState.value = _uiState.value.copy(
      forgotPasswordError = null,
      forgotPasswordSuccess = null,
      isForgotPasswordLoading = false
    )
  }
}
