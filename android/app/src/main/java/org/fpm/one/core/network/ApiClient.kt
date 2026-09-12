package org.fpm.one.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

object ApiClient {
  // Host PC LAN IPv4 for physical device and emulator network access
  var baseUrl: String = "http://192.168.1.234:5000/api"
  var authToken: String? = null

  val json = Json {
    ignoreUnknownKeys = true
    isLenient = true
    encodeDefaults = true
  }

  private val client: OkHttpClient by lazy {
    val logging = HttpLoggingInterceptor().apply {
      level = HttpLoggingInterceptor.Level.BODY
    }
    OkHttpClient.Builder()
      .connectTimeout(15, TimeUnit.SECONDS)
      .readTimeout(15, TimeUnit.SECONDS)
      .addInterceptor { chain ->
        val original = chain.request()
        val requestBuilder = original.newBuilder()
        if (original.header("Content-Type") == null) {
          requestBuilder.header("Content-Type", "application/json")
        }
        authToken?.let { token ->
          requestBuilder.header("Authorization", "Bearer $token")
        }
        chain.proceed(requestBuilder.build())
      }
      .addInterceptor(logging)
      .build()
  }

  suspend fun get(endpoint: String): String = withContext(Dispatchers.IO) {
    val request = Request.Builder()
      .url("$baseUrl$endpoint")
      .get()
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        val errorBody = response.body?.string() ?: "Network request failed"
        throw Exception(errorBody)
      }
      response.body?.string() ?: ""
    }
  }

  suspend fun post(endpoint: String, jsonBody: String): String = withContext(Dispatchers.IO) {
    val mediaType = "application/json; charset=utf-8".toMediaType()
    val requestBody = jsonBody.toRequestBody(mediaType)
    val request = Request.Builder()
      .url("$baseUrl$endpoint")
      .post(requestBody)
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        val errorBody = response.body?.string() ?: "Network request failed"
        throw Exception(errorBody)
      }
      response.body?.string() ?: ""
    }
  }

  suspend fun put(endpoint: String, jsonBody: String): String = withContext(Dispatchers.IO) {
    val mediaType = "application/json; charset=utf-8".toMediaType()
    val requestBody = jsonBody.toRequestBody(mediaType)
    val request = Request.Builder()
      .url("$baseUrl$endpoint")
      .put(requestBody)
      .build()

    client.newCall(request).execute().use { response ->
      if (!response.isSuccessful) {
        val errorBody = response.body?.string() ?: "Network request failed"
        throw Exception(errorBody)
      }
      response.body?.string() ?: ""
    }
  }

  suspend fun uploadMedia(
    bytes: ByteArray,
    filename: String,
    mimeType: String,
    entityType: String,
    branchId: String? = null,
    entityId: String? = null
  ): String = withContext(Dispatchers.IO) {
    val requestBodyBuilder = okhttp3.MultipartBody.Builder()
      .setType(okhttp3.MultipartBody.FORM)
      .addFormDataPart("entityType", entityType)

    branchId?.let { requestBodyBuilder.addFormDataPart("branchId", it) }
    entityId?.let { requestBodyBuilder.addFormDataPart("entityId", it) }

    requestBodyBuilder.addFormDataPart(
      "file",
      filename,
      bytes.toRequestBody(mimeType.toMediaType())
    )

    val request = Request.Builder()
      .url("$baseUrl/media/upload")
      .post(requestBodyBuilder.build())
      .build()

    client.newCall(request).execute().use { response ->
      val body = response.body?.string() ?: ""
      if (!response.isSuccessful) {
        throw Exception(body.ifBlank { "Media upload failed with HTTP ${response.code}" })
      }
      body
    }
  }

  suspend fun uploadAvatar(
    bytes: ByteArray,
    filename: String,
    mimeType: String
  ): String = withContext(Dispatchers.IO) {
    val requestBodyBuilder = okhttp3.MultipartBody.Builder()
      .setType(okhttp3.MultipartBody.FORM)
      .addFormDataPart(
        "file",
        filename,
        bytes.toRequestBody(mimeType.toMediaType())
      )

    val request = Request.Builder()
      .url("$baseUrl/media/upload-avatar")
      .post(requestBodyBuilder.build())
      .build()

    client.newCall(request).execute().use { response ->
      val body = response.body?.string() ?: ""
      if (!response.isSuccessful) {
        throw Exception(body.ifBlank { "Avatar upload failed with HTTP ${response.code}" })
      }
      body
    }
  }
}
