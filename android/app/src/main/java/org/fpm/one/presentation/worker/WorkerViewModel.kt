package org.fpm.one.presentation.worker

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.fpm.one.core.security.SessionManager
import org.fpm.one.data.model.AttendanceRecordItem
import org.fpm.one.data.model.AttendanceSummary
import org.fpm.one.data.model.ServiceScheduleItem
import org.fpm.one.data.model.UserSession
import org.fpm.one.data.repository.AttendanceRepository
import org.fpm.one.data.repository.ChurchRepository

data class WorkerHubUiState(
  val isLoading: Boolean = false,
  val user: UserSession? = null,
  val services: List<ServiceScheduleItem> = emptyList(),
  val selectedService: ServiceScheduleItem? = null,
  val activeRecord: AttendanceRecordItem? = null,
  val records: List<AttendanceRecordItem> = emptyList(),
  val summary: AttendanceSummary = AttendanceSummary(),
  val successMessage: String? = null,
  val error: String? = null
)

class WorkerViewModel(
  private val attendanceRepository: AttendanceRepository,
  private val churchRepository: ChurchRepository
) : ViewModel() {

  private val _state = MutableStateFlow(WorkerHubUiState())
  val state: StateFlow<WorkerHubUiState> = _state.asStateFlow()

  init {
    loadWorkerHub()
  }

  fun loadWorkerHub() {
    val user = SessionManager.getUserSession()
    _state.value = _state.value.copy(user = user, isLoading = true, error = null)

    viewModelScope.launch {
      // 1. Fetch branch services
      val branchId = user?.branchId
      val servicesResult = churchRepository.getServices(branchId)
      val services = servicesResult.getOrDefault(emptyList())

      // 2. Fetch attendance history
      val historyResult = attendanceRepository.getMyAttendanceHistory()
      historyResult.fold(
        onSuccess = { history ->
          // Find if there is an active (clocked in, not yet clocked out) record
          val active = history.records.firstOrNull { it.clockInTime != null && it.clockOutTime == null }
          _state.value = _state.value.copy(
            isLoading = false,
            services = services,
            selectedService = services.firstOrNull(),
            records = history.records,
            summary = history.summary,
            activeRecord = active
          )
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(
            isLoading = false,
            services = services,
            selectedService = services.firstOrNull(),
            error = ex.message
          )
        }
      )
    }
  }

  fun selectService(service: ServiceScheduleItem) {
    _state.value = _state.value.copy(selectedService = service)
  }

  fun clockIn(
    method: String,
    pin: String? = null,
    onSuccess: () -> Unit = {}
  ) {
    val user = _state.value.user
    val service = _state.value.selectedService

    val workerIdentifier = user?.workerDetails?.workerCode ?: user?.email ?: ""
    if (workerIdentifier.isBlank()) {
      _state.value = _state.value.copy(error = "Worker profile identifier missing.")
      return
    }

    val serviceId = service?.id ?: "srv-001"

    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val result = attendanceRepository.clockIn(
        workerIdentifier = workerIdentifier,
        serviceId = serviceId,
        method = method,
        pin = pin
      )
      result.fold(
        onSuccess = { record ->
          _state.value = _state.value.copy(
            isLoading = false,
            activeRecord = record,
            successMessage = "Clock-in confirmed! Status: ${record.status.replaceFirstChar { it.uppercase() }}"
          )
          loadWorkerHub()
          onSuccess()
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message)
        }
      )
    }
  }

  fun clockOut(onSuccess: () -> Unit = {}) {
    val active = _state.value.activeRecord
    if (active == null) {
      _state.value = _state.value.copy(error = "No active clock-in session found to clock out from.")
      return
    }

    _state.value = _state.value.copy(isLoading = true, error = null)
    viewModelScope.launch {
      val result = attendanceRepository.clockOut(active.id)
      result.fold(
        onSuccess = { record ->
          val duration = record.durationMinutes ?: 0
          _state.value = _state.value.copy(
            isLoading = false,
            activeRecord = null,
            successMessage = "Clock-out completed! Active duration: $duration minutes."
          )
          loadWorkerHub()
          onSuccess()
        },
        onFailure = { ex ->
          _state.value = _state.value.copy(isLoading = false, error = ex.message)
        }
      )
    }
  }

  fun clearMessages() {
    _state.value = _state.value.copy(error = null, successMessage = null)
  }
}
