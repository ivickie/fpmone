package org.fpm.one.presentation.registration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
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

  // Step 2: Church Info
  val branchId: String = "",
  val ministryRoleId: String = "",
  val isWorker: Boolean = false,
  val departmentId: String = "",
  val positionName: String = "",
  val dateStartedServing: String = "2026-01-01",

  // Step 3: Personal Info
  val gender: String = "Male",
  val dateOfBirth: String = "1998-05-12",
  val residentialAddress: String = "",
  val profilePictureUrl: String = "",
  val emergencyContactName: String = "",
  val emergencyContactPhone: String = ""
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
      val roles = rolesRes.getOrDefault(emptyList())
      val depts = deptsRes.getOrDefault(emptyList())

      _state.value = _state.value.copy(
        branches = branches,
        roles = roles,
        departments = depts,
        branchId = branches.firstOrNull()?.id ?: "",
        ministryRoleId = roles.firstOrNull { it.code == "WORKER" }?.id ?: roles.firstOrNull()?.id ?: "",
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
      error = null
    )
  }

  fun updateStep2(branchId: String, roleId: String, isWorker: Boolean, deptId: String, pos: String) {
    _state.value = _state.value.copy(
      branchId = branchId,
      ministryRoleId = roleId,
      isWorker = isWorker,
      departmentId = deptId,
      positionName = pos,
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
      error = null
    )
  }

  fun nextStep(): Boolean {
    val s = _state.value
    when (s.currentStep) {
      1 -> {
        if (s.firstName.isBlank() || s.lastName.isBlank() || s.phone.isBlank() || s.email.isBlank() || s.password.isBlank()) {
          _state.value = s.copy(error = "Please fill in all required account fields.")
          return false
        }
      }
      2 -> {
        if (s.branchId.isBlank() || s.ministryRoleId.isBlank()) {
          _state.value = s.copy(error = "Please select a branch and ministry role.")
          return false
        }
      }
      3 -> {
        // Step 3 validated
      }
    }

    _state.value = s.copy(currentStep = s.currentStep + 1, error = null)
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
