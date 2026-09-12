package org.fpm.one.presentation.events

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.EventItem
import org.fpm.one.data.repository.ChurchRepository

data class EventsUiState(
  val isLoading: Boolean = false,
  val events: List<EventItem> = emptyList(),
  val error: String? = null,
  val selectedCategory: String = "All"
)

class EventsViewModel(private val repository: ChurchRepository) : ViewModel() {

  private val _state = MutableStateFlow(EventsUiState())
  val state: StateFlow<EventsUiState> = _state.asStateFlow()

  init {
    loadEvents()
  }

  fun loadEvents(category: String = "All") {
    _state.value = _state.value.copy(isLoading = true, selectedCategory = category, error = null)
    viewModelScope.launch {
      val result = repository.getEvents()
      result.fold(
        onSuccess = { list ->
          val filtered = if (category == "All") list else list.filter { it.category.equals(category, ignoreCase = true) }
          _state.value = _state.value.copy(isLoading = false, events = filtered)
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message)
        }
      )
    }
  }

  fun registerForEvent(eventId: String, onSuccess: () -> Unit) {
    viewModelScope.launch {
      val res = repository.registerForEvent(eventId)
      if (res.isSuccess) {
        val updated = _state.value.events.map { ev ->
          if (ev.id == eventId) {
            ev.copy(
              isUserRegistered = true,
              currentRegistrationsCount = ev.currentRegistrationsCount + 1
            )
          } else {
            ev
          }
        }
        _state.value = _state.value.copy(events = updated)
        onSuccess()
      }
    }
  }
}
