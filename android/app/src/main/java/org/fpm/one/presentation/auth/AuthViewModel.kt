package org.fpm.one.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.UserSession
import org.fpm.one.data.repository.AuthRepository

data class AuthUiState(
  val isLoading: Boolean = false,
  val error: String? = null,
  val isPendingApproval: Boolean = false,
  val user: UserSession? = null
)

class AuthViewModel(private val repository: AuthRepository) : ViewModel() {

  private val _uiState = MutableStateFlow(AuthUiState())
  val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

  fun login(emailOrPhone: String, pass: String, onSuccess: () -> Unit, onPending: () -> Unit) {
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

  fun clearError() {
    _uiState.value = _uiState.value.copy(error = null)
  }
}
