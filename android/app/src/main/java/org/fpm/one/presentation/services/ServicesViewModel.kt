package org.fpm.one.presentation.services

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.ServiceHighlightItem
import org.fpm.one.data.model.ServiceScheduleItem
import org.fpm.one.data.repository.ChurchRepository

data class ServicesUiState(
  val isLoading: Boolean = false,
  val services: List<ServiceScheduleItem> = emptyList(),
  val highlights: List<ServiceHighlightItem> = emptyList(),
  val error: String? = null
)

class ServicesViewModel(private val repository: ChurchRepository) : ViewModel() {

  private val _state = MutableStateFlow(ServicesUiState())
  val state: StateFlow<ServicesUiState> = _state.asStateFlow()

  init {
    loadServices()
  }

  fun loadServices() {
    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val servicesRes = repository.getServices()
      val highlightsRes = repository.getHighlights()

      _state.value = _state.value.copy(
        isLoading = false,
        services = servicesRes.getOrDefault(emptyList()),
        highlights = highlightsRes.getOrDefault(emptyList())
      )
    }
  }
}
