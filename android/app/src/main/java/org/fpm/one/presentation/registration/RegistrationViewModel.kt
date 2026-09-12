package org.fpm.one.presentation.registration

import android.util.Base64
import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.fpm.one.core.network.ApiClient
import org.fpm.one.data.model.*
import org.fpm.one.data.repository.AuthRepository
import org.fpm.one.data.repository.ChurchRepository

data class RegistrationFormState(
  val currentStep: Int = 1, // 1 to 4
  val isLoading: Boolean = false,
  val error: String? = null,
  val isSubmitted: Boolean = false,

  // Metadata options
  val branches: List<BranchItem> = emptyList(),
  val roles: List<MinistryRoleItem> = emptyList(),
  val departments: List<DepartmentItem> = emptyList(),

  // Step 1: Account
  val firstName: String = "",
  val middleName: String = "",
  val lastName: String = "",
  val phone: String = "",
  val email: String = "",
  val password: String = "",

  // Step 1 Field Errors
  val firstNameError: String? = null,
  val lastNameError: String? = null,
  val phoneError: String? = null,
  val emailError: String? = null,
  val passwordError: String? = null,

  // Step 2: Church Info
  val branchId: String = "",
  val ministryRoleId: String = "",
  val isWorker: Boolean = false,
  val departmentId: String = "",
  val positionName: String = "",
  val dateStartedServing: String = "2026-01-01",

  // Step 2 Field Errors
  val branchError: String? = null,
  val roleError: String? = null,
  val departmentError: String? = null,

  // Step 3: Personal Info
  val gender: String = "Male",
  val dateOfBirth: String = "",
  val residentialAddress: String = "",
  val profilePictureUrl: String = "",
  val emergencyContactName: String = "",
  val emergencyContactPhone: String = "",

  // Step 3 Field Errors & Upload State
  val genderError: String? = null,
  val dobError: String? = null,
  val addressError: String? = null,
  val isAvatarUploading: Boolean = false,
  val avatarUploadError: String? = null
)

class RegistrationViewModel(
  private val authRepository: AuthRepository,
  private val churchRepository: ChurchRepository
) : ViewModel() {

  private val _state = MutableStateFlow(RegistrationFormState())
  val state: StateFlow<RegistrationFormState> = _state.asStateFlow()

  init {
    loadMetadata()
  }

  fun loadMetadata() {
    viewModelScope.launch {
      val branchesRes = churchRepository.getBranches()
      val rolesRes = churchRepository.getRoles()
      val deptsRes = churchRepository.getDepartments()

      val branches = branchesRes.getOrDefault(emptyList())
      // Filter out Super Admin from public mobile registration
      val roles = rolesRes.getOrDefault(emptyList()).filter { it.code != "SUPER_ADMIN" }
      val depts = deptsRes.getOrDefault(emptyList())

      // Default role is strictly MEMBER (not Worker)
      val defaultRole = roles.firstOrNull { it.code == "MEMBER" } ?: roles.firstOrNull()

      _state.value = _state.value.copy(
        branches = branches,
        roles = roles,
        departments = depts,
        branchId = branches.firstOrNull()?.id ?: "",
        ministryRoleId = defaultRole?.id ?: "",
        isWorker = false,
        departmentId = depts.firstOrNull()?.id ?: ""
      )
    }
  }

  fun updateStep1(first: String, middle: String, last: String, ph: String, em: String, pass: String) {
    _state.value = _state.value.copy(
      firstName = first,
      middleName = middle,
      lastName = last,
      phone = ph,
      email = em,
      password = pass,
      firstNameError = null,
      lastNameError = null,
      phoneError = null,
      emailError = null,
      passwordError = null,
      error = null
    )
  }

  fun updateStep2(branchId: String, roleId: String, isWorker: Boolean, deptId: String, pos: String) {
    val selectedRole = _state.value.roles.find { it.id == roleId }
    // If worker role selected, automatically toggle worker to true
    val effectiveIsWorker = if (selectedRole?.code == "WORKER") true else isWorker

    _state.value = _state.value.copy(
      branchId = branchId,
      ministryRoleId = roleId,
      isWorker = effectiveIsWorker,
      departmentId = deptId,
      positionName = pos,
      branchError = null,
      roleError = null,
      departmentError = null,
      error = null
    )
  }

  fun onRoleSelected(roleId: String) {
    val selectedRole = _state.value.roles.find { it.id == roleId }
    val isWorkerRole = selectedRole?.code == "WORKER"
    _state.value = _state.value.copy(
      ministryRoleId = roleId,
      isWorker = if (isWorkerRole) true else _state.value.isWorker,
      roleError = null,
      error = null
    )
  }

  fun onWorkerToggled(enabled: Boolean) {
    val currentRole = _state.value.roles.find { it.id == _state.value.ministryRoleId }
    val newRoleId = if (enabled && currentRole?.code == "MEMBER") {
      // If toggled ON while on Member, switch role to Worker
      _state.value.roles.find { it.code == "WORKER" }?.id ?: _state.value.ministryRoleId
    } else if (!enabled && currentRole?.code == "WORKER") {
      // If toggled OFF while on Worker, switch role back to Member
      _state.value.roles.find { it.code == "MEMBER" }?.id ?: _state.value.ministryRoleId
    } else {
      _state.value.ministryRoleId
    }

    _state.value = _state.value.copy(
      isWorker = enabled,
      ministryRoleId = newRoleId,
      error = null
    )
  }

  fun updateStep3(gender: String, dob: String, address: String, emName: String, emPhone: String) {
    _state.value = _state.value.copy(
      gender = gender,
      dateOfBirth = dob,
      residentialAddress = address,
      emergencyContactName = emName,
      emergencyContactPhone = emPhone,
      genderError = null,
      dobError = null,
      addressError = null,
      error = null
    )
  }

  fun uploadProfilePhoto(bytes: ByteArray, filename: String, mimeType: String) {
    viewModelScope.launch {
      _state.value = _state.value.copy(isAvatarUploading = true, avatarUploadError = null)
      val result = authRepository.uploadAvatar(bytes, filename, mimeType)
      result.fold(
        onSuccess = { resJson ->
          val url = try {
            val parsed = ApiClient.json.parseToJsonElement(resJson)
            parsed.jsonObject["publicUrl"]?.jsonPrimitive?.contentOrNull
              ?: parsed.jsonObject["media"]?.jsonObject?.get("publicUrl")?.jsonPrimitive?.contentOrNull
              ?: ""
          } catch (e: Exception) {
            ""
          }
          if (url.isNotBlank()) {
            _state.value = _state.value.copy(
              profilePictureUrl = url,
              isAvatarUploading = false,
              avatarUploadError = null
            )
          } else {
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            _state.value = _state.value.copy(
              profilePictureUrl = "data:$mimeType;base64,$base64",
              isAvatarUploading = false,
              avatarUploadError = null
            )
          }
        },
        onFailure = {
          // Fallback: encode as Base64 data URL so user can still register smoothly
          val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
          _state.value = _state.value.copy(
            profilePictureUrl = "data:$mimeType;base64,$base64",
            isAvatarUploading = false,
            avatarUploadError = null
          )
        }
      )
    }
  }

  fun clearProfilePhoto() {
    _state.value = _state.value.copy(profilePictureUrl = "")
  }

  fun nextStep(): Boolean {
    val s = _state.value
    when (s.currentStep) {
      1 -> {
        var hasError = false
        var fnErr: String? = null
        var lnErr: String? = null
        var emErr: String? = null
        var phErr: String? = null
        var pwErr: String? = null

        if (s.firstName.trim().length < 2) {
          fnErr = "First name must be at least 2 characters."
          hasError = true
        }
        if (s.lastName.trim().length < 2) {
          lnErr = "Last name must be at least 2 characters."
          hasError = true
        }

        // Email regex / Patterns validation
        val trimmedEmail = s.email.trim()
        if (trimmedEmail.isBlank()) {
          emErr = "Email address is required."
          hasError = true
        } else if (!Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches()) {
          emErr = "Please enter a valid email address (e.g. name@example.com)."
          hasError = true
        }

        // Phone validation (strip spaces, hyphens, brackets; require 8-15 digits)
        val cleanPhone = s.phone.filter { it.isDigit() || it == '+' }
        if (s.phone.isBlank()) {
          phErr = "Phone number is required."
          hasError = true
        } else if (!Regex("^\\+?[0-9]{8,15}$").matches(cleanPhone)) {
          phErr = "Please enter a valid phone number (at least 8 digits)."
          hasError = true
        }

        if (s.password.length < 6) {
          pwErr = "Password must be at least 6 characters."
          hasError = true
        }

        if (hasError) {
          _state.value = s.copy(
            firstNameError = fnErr,
            lastNameError = lnErr,
            emailError = emErr,
            phoneError = phErr,
            passwordError = pwErr,
            error = "Please fix the highlighted account errors before continuing."
          )
          return false
        }
      }
      2 -> {
        var hasError = false
        var bErr: String? = null
        var rErr: String? = null
        var dErr: String? = null

        if (s.branchId.isBlank()) {
          bErr = "Please select your primary branch."
          hasError = true
        }
        if (s.ministryRoleId.isBlank()) {
          rErr = "Please select a ministry role."
          hasError = true
        }
        if (s.isWorker && s.departmentId.isBlank()) {
          dErr = "Please select a department to serve in."
          hasError = true
        }

        if (hasError) {
          _state.value = s.copy(
            branchError = bErr,
            roleError = rErr,
            departmentError = dErr,
            error = "Please complete the required church assignment fields."
          )
          return false
        }
      }
      3 -> {
        var hasError = false
        var gErr: String? = null
        var dobErr: String? = null
        var addrErr: String? = null

        if (s.gender.isBlank()) {
          gErr = "Gender is required."
          hasError = true
        }

        val dobTrimmed = s.dateOfBirth.trim()
        if (dobTrimmed.isBlank()) {
          dobErr = "Date of Birth is required."
          hasError = true
        } else if (!Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(dobTrimmed)) {
          dobErr = "Date of Birth must be in YYYY-MM-DD format."
          hasError = true
        }

        if (s.residentialAddress.trim().length < 5) {
          addrErr = "Residential address is required (at least 5 characters)."
          hasError = true
        }

        if (hasError) {
          _state.value = s.copy(
            genderError = gErr,
            dobError = dobErr,
            addressError = addrErr,
            error = "Please complete all required personal information fields."
          )
          return false
        }
      }
    }

    _state.value = s.copy(
      currentStep = s.currentStep + 1,
      error = null,
      firstNameError = null,
      lastNameError = null,
      emailError = null,
      phoneError = null,
      passwordError = null,
      branchError = null,
      roleError = null,
      departmentError = null,
      genderError = null,
      dobError = null,
      addressError = null
    )
    return true
  }

  fun prevStep() {
    if (_state.value.currentStep > 1) {
      _state.value = _state.value.copy(currentStep = _state.value.currentStep - 1, error = null)
    }
  }

  fun goToStep(step: Int) {
    _state.value = _state.value.copy(currentStep = step, error = null)
  }

  fun submitRegistration(onSuccess: () -> Unit) {
    val s = _state.value
    _state.value = s.copy(isLoading = true, error = null)

    viewModelScope.launch {
      val request = RegistrationRequest(
        firstName = s.firstName.trim(),
        middleName = s.middleName.trim().ifBlank { null },
        lastName = s.lastName.trim(),
        phone = s.phone.trim(),
        email = s.email.trim(),
        password = s.password,
        branchId = s.branchId,
        ministryRoleId = s.ministryRoleId,
        isWorker = s.isWorker,
        departmentId = if (s.isWorker) s.departmentId.ifBlank { null } else null,
        positionName = if (s.isWorker) s.positionName.ifBlank { "Worker" } else null,
        dateStartedServing = if (s.isWorker) s.dateStartedServing else null,
        gender = s.gender,
        dateOfBirth = s.dateOfBirth.ifBlank { null },
        residentialAddress = s.residentialAddress.ifBlank { null },
        profilePictureUrl = s.profilePictureUrl.ifBlank { null },
        emergencyContactName = s.emergencyContactName.ifBlank { null },
        emergencyContactPhone = s.emergencyContactPhone.ifBlank { null }
      )

      val result = authRepository.register(request)
      result.fold(
        onSuccess = {
          _state.value = _state.value.copy(isLoading = false, isSubmitted = true)
          onSuccess()
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message ?: "Submission failed")
        }
      )
    }
  }
}
