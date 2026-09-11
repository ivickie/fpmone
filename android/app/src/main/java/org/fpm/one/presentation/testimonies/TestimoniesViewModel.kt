package org.fpm.one.presentation.testimonies

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.TestimonyItem
import org.fpm.one.data.repository.ChurchRepository

data class TestimoniesUiState(
  val isLoading: Boolean = false,
  val testimonies: List<TestimonyItem> = emptyList(),
  val error: String? = null,
  val submitSuccessMessage: String? = null
)

class TestimoniesViewModel(private val repository: ChurchRepository) : ViewModel() {

  private val _state = MutableStateFlow(TestimoniesUiState())
  val state: StateFlow<TestimoniesUiState> = _state.asStateFlow()

  init {
    loadTestimonies()
  }

  fun loadTestimonies() {
    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val result = repository.getApprovedTestimonies()
      result.fold(
        onSuccess = { list ->
          _state.value = _state.value.copy(isLoading = false, testimonies = list)
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message)
        }
      )
    }
  }

  fun submitTestimony(
    title: String,
    content: String,
    category: String,
    photoUrl: String? = null,
    allowPublish: Boolean,
    onSuccess: () -> Unit
  ) {
    if (title.isBlank() || content.isBlank()) {
      _state.value = _state.value.copy(error = "Please enter both title and testimony description.")
      return
    }

    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val result = repository.submitTestimony(title, content, category, photoUrl, allowPublish)
      result.fold(
        onSuccess = {
          _state.value = _state.value.copy(
            isLoading = false,
            submitSuccessMessage = "Your testimony has been submitted and is currently Pending Pastoral Review!"
          )
          onSuccess()
          loadTestimonies()
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message)
        }
      )
    }
  }

  suspend fun uploadTestimonyPhoto(
    bytes: ByteArray,
    filename: String,
    mimeType: String
  ): Result<String> {
    return repository.uploadMedia(bytes, filename, mimeType, "testimony")
  }

  fun clearSuccessMessage() {
    _state.value = _state.value.copy(submitSuccessMessage = null)
  }
}
