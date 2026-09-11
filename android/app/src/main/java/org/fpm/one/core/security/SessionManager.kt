package org.fpm.one.core.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import org.fpm.one.core.network.ApiClient
import org.fpm.one.data.model.UserSession

class SessionManager(context: Context) {
  private val prefs: SharedPreferences = createEncryptedPreferences(context)

  private val _currentUser = MutableStateFlow<UserSession?>(null)
  val currentUser: StateFlow<UserSession?> = _currentUser.asStateFlow()

  init {
    instance = this
    val token = prefs.getString("auth_token", null)
    if (token != null) {
      ApiClient.authToken = token
      val userJson = prefs.getString("cached_user", null)
      if (userJson != null) {
        try {
          val user = ApiClient.json.decodeFromString<UserSession>(userJson)
          _currentUser.value = user
        } catch (_: Exception) {
          clearSession()
        }
      }
    }
  }

  fun saveSession(token: String, user: UserSession) {
    ApiClient.authToken = token
    _currentUser.value = user
    val userJson = ApiClient.json.encodeToString(user)
    prefs.edit()
      .putString("auth_token", token)
      .putString("cached_user", userJson)
      .apply()
  }

  fun updateCachedUser(user: UserSession) {
    _currentUser.value = user
    val userJson = ApiClient.json.encodeToString(user)
    prefs.edit().putString("cached_user", userJson).apply()
  }

  fun clearSession() {
    ApiClient.authToken = null
    _currentUser.value = null
    prefs.edit().clear().apply()
  }

  fun isLoggedIn(): Boolean = _currentUser.value != null && ApiClient.authToken != null

  companion object {
    private const val TAG = "SessionManager"
    private const val PREFS_FILE = "fpm_one_secure_session_prefs"
    private const val LEGACY_PREFS_FILE = "fpm_one_session_prefs"

    @Volatile
    private var instance: SessionManager? = null

    private fun createEncryptedPreferences(context: Context): SharedPreferences {
      val appContext = context.applicationContext
      return try {
        val masterKey = MasterKey.Builder(appContext)
          .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
          .build()

        EncryptedSharedPreferences.create(
          appContext,
          PREFS_FILE,
          masterKey,
          EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
          EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ).also { securePrefs ->
          // Migrate legacy unencrypted preferences if present
          val legacyPrefs = appContext.getSharedPreferences(LEGACY_PREFS_FILE, Context.MODE_PRIVATE)
          val legacyToken = legacyPrefs.getString("auth_token", null)
          if (legacyToken != null && !securePrefs.contains("auth_token")) {
            val legacyUser = legacyPrefs.getString("cached_user", null)
            securePrefs.edit()
              .putString("auth_token", legacyToken)
              .putString("cached_user", legacyUser)
              .apply()
            legacyPrefs.edit().clear().apply()
            Log.i(TAG, "Successfully migrated session from legacy SharedPreferences to EncryptedSharedPreferences")
          }
        }
      } catch (e: Exception) {
        Log.w(TAG, "EncryptedSharedPreferences creation failed, falling back to private prefs: ${e.message}")
        appContext.getSharedPreferences(LEGACY_PREFS_FILE, Context.MODE_PRIVATE)
      }
    }

    fun init(context: Context): SessionManager {
      return instance ?: synchronized(this) {
        instance ?: SessionManager(context).also { instance = it }
      }
    }

    fun getInstance(): SessionManager {
      return instance ?: throw IllegalStateException("SessionManager not initialized. Call init(context) first.")
    }

    fun getUserSession(): UserSession? {
      return instance?._currentUser?.value
    }

    fun clearSession() {
      instance?.clearSession()
    }

    fun isLoggedIn(): Boolean {
      return instance?.isLoggedIn() ?: false
    }
  }
}

