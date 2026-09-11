package org.fpm.one.presentation.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.NotificationItem
import org.fpm.one.data.repository.NotificationRepository

data class NotificationsUiState(
  val isLoading: Boolean = false,
  val notifications: List<NotificationItem> = emptyList(),
  val error: String? = null
)

class NotificationsViewModel(
  private val repository: NotificationRepository
) : ViewModel() {

  private val _state = MutableStateFlow(NotificationsUiState())
  val state: StateFlow<NotificationsUiState> = _state.asStateFlow()

  init {
    loadNotifications()
  }

  fun loadNotifications() {
    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val result = repository.getNotifications()
      result.fold(
        onSuccess = { list ->
          _state.value = _state.value.copy(isLoading = false, notifications = list)
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message)
        }
      )
    }
  }

  fun markAsRead(id: String) {
    viewModelScope.launch {
      repository.markAsRead(id)
      _state.value = _state.value.copy(
        notifications = _state.value.notifications.map {
          if (it.id == id) it.copy(isRead = true) else it
        }
      )
    }
  }
}
