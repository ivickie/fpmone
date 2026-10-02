package org.fpm.one.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.data.model.*
import org.fpm.one.data.repository.ChurchRepository
import org.fpm.one.core.network.ApiClient
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class HomeUiState(
  val isLoading: Boolean = false,
  val isOffline: Boolean = false,
  val error: String? = null,
  val posts: List<PostItem> = emptyList(),
  val highlights: List<ServiceHighlightItem> = emptyList(),
  val testimonies: List<TestimonyItem> = emptyList(),
  val nextService: ServiceScheduleItem? = null,
  val branches: List<BranchItem> = emptyList(),
  val sundayMoments: List<SundayMomentItem> = emptyList(),
  val isUploadingMoment: Boolean = false,
  val uploadMomentError: String? = null
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
      val branchesRes = repository.getBranches()
      val momentsRes = repository.getSundayMoments()

      if (postsRes.isSuccess || branchesRes.isSuccess) {
        _state.value = _state.value.copy(
          isLoading = false,
          posts = postsRes.getOrDefault(emptyList()),
          highlights = highlightsRes.getOrDefault(emptyList()),
          testimonies = testimoniesRes.getOrDefault(emptyList()),
          nextService = servicesRes.getOrNull()?.firstOrNull(),
          branches = branchesRes.getOrDefault(emptyList()),
          sundayMoments = momentsRes.getOrDefault(emptyList())
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

  fun uploadSundayMoment(
    branchId: String,
    bytes: ByteArray,
    filename: String,
    mimeType: String,
    caption: String?,
    sundayDate: String? = null,
    onComplete: (Boolean, String?) -> Unit
  ) {
    _state.value = _state.value.copy(isUploadingMoment = true, uploadMomentError = null)
    viewModelScope.launch {
      // 1. Upload binary file via media endpoint
      val mediaUploadRes = repository.uploadMedia(
        bytes = bytes,
        filename = filename,
        mimeType = mimeType,
        entityType = "sunday-moment",
        branchId = branchId
      )

      if (mediaUploadRes.isFailure) {
        val errMsg = mediaUploadRes.exceptionOrNull()?.message ?: "Failed to upload image"
        _state.value = _state.value.copy(isUploadingMoment = false, uploadMomentError = errMsg)
        onComplete(false, errMsg)
        return@launch
      }

      val mediaResponseJson = mediaUploadRes.getOrNull() ?: "{}"
      // Extract publicUrl from json
      val publicUrl = try {
        val element = ApiClient.json.parseToJsonElement(mediaResponseJson)
        element.jsonObject["media"]?.jsonObject?.get("publicUrl")?.jsonPrimitive?.content
          ?: element.jsonObject["publicUrl"]?.jsonPrimitive?.content
          ?: ""
      } catch (e: Exception) {
        ""
      }

      if (publicUrl.isBlank()) {
        val errMsg = "Upload succeeded but server did not return image URL"
        _state.value = _state.value.copy(isUploadingMoment = false, uploadMomentError = errMsg)
        onComplete(false, errMsg)
        return@launch
      }

      // 2. Register Sunday moment in database
      val createMomentRes = repository.createSundayMoment(
        branchId = branchId,
        mediaUrl = publicUrl,
        caption = caption,
        sundayDate = sundayDate
      )

      if (createMomentRes.isSuccess) {
        val newMoment = createMomentRes.getOrNull()
        val updatedList = if (newMoment != null) {
          listOf(newMoment) + _state.value.sundayMoments
        } else {
          _state.value.sundayMoments
        }
        _state.value = _state.value.copy(
          isUploadingMoment = false,
          sundayMoments = updatedList,
          uploadMomentError = null
        )
        onComplete(true, null)
      } else {
        val errMsg = createMomentRes.exceptionOrNull()?.message ?: "Failed to record Sunday moment"
        _state.value = _state.value.copy(isUploadingMoment = false, uploadMomentError = errMsg)
        onComplete(false, errMsg)
      }
    }
  }

  fun deleteSundayMoment(momentId: String, onComplete: (Boolean, String?) -> Unit) {
    viewModelScope.launch {
      val res = repository.deleteSundayMoment(momentId)
      if (res.isSuccess) {
        _state.value = _state.value.copy(
          sundayMoments = _state.value.sundayMoments.filter { it.id != momentId }
        )
        onComplete(true, null)
      } else {
        onComplete(false, res.exceptionOrNull()?.message ?: "Failed to delete moment")
      }
    }
  }

  fun reactToPost(postId: String, reactionType: String = "amen") {
    // Instant optimistic update for immediate heart toggling
    val currentPosts = _state.value.posts
    val targetPost = currentPosts.find { it.id == postId }
    if (targetPost != null) {
      val isLiked = targetPost.userReaction == "amen" || targetPost.userReaction == "like"
      val updatedPost = if (isLiked) {
        targetPost.copy(
          userReaction = null,
          likesCount = maxOf(0, targetPost.likesCount - 1)
        )
      } else {
        targetPost.copy(
          userReaction = "amen",
          likesCount = targetPost.likesCount + 1
        )
      }
      _state.value = _state.value.copy(
        posts = currentPosts.map { if (it.id == postId) updatedPost else it }
      )
    }

    viewModelScope.launch {
      val res = repository.reactToPost(postId, reactionType)
      if (res.isFailure) {
        // Rollback on failure
        _state.value = _state.value.copy(posts = currentPosts)
      } else {
        // Silently synchronize canonical feed from repository
        val feedRes = repository.getFeed()
        if (feedRes.isSuccess) {
          _state.value = _state.value.copy(posts = feedRes.getOrDefault(emptyList()))
        }
      }
    }
  }

  fun submitComment(postId: String, content: String, onComplete: (Boolean, String?) -> Unit) {
    if (content.isBlank()) {
      onComplete(false, "Comment cannot be empty")
      return
    }
    viewModelScope.launch {
      val res = repository.commentOnPost(postId, content.trim())
      if (res.isSuccess) {
        loadHomeData()
        onComplete(true, null)
      } else {
        val errMsg = res.exceptionOrNull()?.message ?: "Failed to post comment"
        onComplete(false, errMsg)
      }
    }
  }
}
