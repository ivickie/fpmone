package org.fpm.one.data.repository

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.fpm.one.core.network.ApiClient
import org.fpm.one.data.model.*

class ChurchRepository {

  suspend fun getBranches(): Result<List<BranchItem>> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/branches")
      val list = ApiClient.json.decodeFromString<List<BranchItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getDepartments(branchId: String? = null): Result<List<DepartmentItem>> = withContext(Dispatchers.IO) {
    try {
      val endpoint = if (branchId != null) "/departments?branchId=$branchId" else "/departments"
      val responseText = ApiClient.get(endpoint)
      val list = ApiClient.json.decodeFromString<List<DepartmentItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getRoles(): Result<List<MinistryRoleItem>> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/roles")
      val list = ApiClient.json.decodeFromString<List<MinistryRoleItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getServices(branchId: String? = null): Result<List<ServiceScheduleItem>> = withContext(Dispatchers.IO) {
    try {
      val endpoint = if (branchId != null) "/services?branchId=$branchId" else "/services"
      val responseText = ApiClient.get(endpoint)
      val list = ApiClient.json.decodeFromString<List<ServiceScheduleItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getEvents(branchId: String? = null): Result<List<EventItem>> = withContext(Dispatchers.IO) {
    try {
      val endpoint = if (branchId != null) "/events?branchId=$branchId" else "/events"
      val responseText = ApiClient.get(endpoint)
      val list = ApiClient.json.decodeFromString<List<EventItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun registerForEvent(eventId: String): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      ApiClient.post("/events/$eventId/register", "{}")
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getFeed(): Result<List<PostItem>> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/feed")
      val list = ApiClient.json.decodeFromString<List<PostItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun reactToPost(postId: String, reactionType: String): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      val payload = """{"reactionType":"$reactionType"}"""
      ApiClient.post("/feed/$postId/react", payload)
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun commentOnPost(postId: String, content: String): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      val payload = """{"content":"$content"}"""
      ApiClient.post("/feed/$postId/comment", payload)
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getHighlights(): Result<List<ServiceHighlightItem>> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/highlights")
      val list = ApiClient.json.decodeFromString<List<ServiceHighlightItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun getApprovedTestimonies(): Result<List<TestimonyItem>> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.get("/testimonies")
      val list = ApiClient.json.decodeFromString<List<TestimonyItem>>(responseText)
      Result.success(list)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun uploadMedia(
    bytes: ByteArray,
    filename: String,
    mimeType: String,
    entityType: String,
    branchId: String? = null,
    entityId: String? = null
  ): Result<String> = withContext(Dispatchers.IO) {
    try {
      val responseText = ApiClient.uploadMedia(bytes, filename, mimeType, entityType, branchId, entityId)
      Result.success(responseText)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }

  suspend fun submitTestimony(
    title: String,
    content: String,
    category: String,
    photoUrl: String? = null,
    allowPublish: Boolean
  ): Result<Boolean> = withContext(Dispatchers.IO) {
    try {
      val payload = if (photoUrl != null) {
        """{"title":"$title","content":"$content","category":"$category","photoUrl":"$photoUrl","allowPublish":$allowPublish}"""
      } else {
        """{"title":"$title","content":"$content","category":"$category","allowPublish":$allowPublish}"""
      }
      ApiClient.post("/testimonies", payload)
      Result.success(true)
    } catch (e: Exception) {
      Result.failure(e)
    }
  }
}
