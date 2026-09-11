package org.fpm.one.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.*
import org.fpm.one.data.repository.ChurchRepository

data class HomeUiState(
  val isLoading: Boolean = false,
  val isOffline: Boolean = false,
  val error: String? = null,
  val posts: List<PostItem> = emptyList(),
  val highlights: List<ServiceHighlightItem> = emptyList(),
  val testimonies: List<TestimonyItem> = emptyList(),
  val nextService: ServiceScheduleItem? = null
)

class HomeViewModel(private val repository: ChurchRepository) : ViewModel() {

  private val _state = MutableStateFlow(HomeUiState())
  val state: StateFlow<HomeUiState> = _state.asStateFlow()

  init {
    loadHomeData()
  }

  fun loadHomeData() {
    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val postsRes = repository.getFeed()
      val highlightsRes = repository.getHighlights()
      val testimoniesRes = repository.getApprovedTestimonies()
      val servicesRes = repository.getServices()

      if (postsRes.isSuccess) {
        _state.value = _state.value.copy(
          isLoading = false,
          posts = postsRes.getOrDefault(emptyList()),
          highlights = highlightsRes.getOrDefault(emptyList()),
          testimonies = testimoniesRes.getOrDefault(emptyList()),
          nextService = servicesRes.getOrNull()?.firstOrNull()
        )
      } else {
        _state.value = _state.value.copy(
          isLoading = false,
          isOffline = true,
          error = postsRes.exceptionOrNull()?.message ?: "Unable to fetch feed"
        )
      }
    }
  }

  fun reactToPost(postId: String, reactionType: String = "amen") {
    viewModelScope.launch {
      repository.reactToPost(postId, reactionType)
      loadHomeData()
    }
  }
}
