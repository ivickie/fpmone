package org.fpm.one.data.model

import kotlinx.serialization.Serializable

@Serializable
data class WorkerDetails(
    val workerId: String,
    val workerCode: String,
    val departmentId: String,
    val departmentName: String,
    val positionName: String,
    val qrCodeToken: String
)

@Serializable
data class UserSession(
    val userId: String,
    val email: String,
    val phone: String,
    val accountStatus: String,
    val isAdmin: Boolean = false,
    val adminLevel: String = "none",
    val memberId: String,
    val firstName: String,
    val lastName: String,
    val fullName: String,
    val branchId: String,
    val branchName: String,
    val roleId: String,
    val roleName: String,
    val roleCode: String,
    val isWorker: Boolean,
    val workerDetails: WorkerDetails? = null
)

@Serializable
data class LoginResponse(
    val token: String? = null,
    val user: UserSession? = null,
    val status: String? = null,
    val error: String? = null
)

@Serializable
data class RegistrationRequest(
    val firstName: String,
    val middleName: String? = null,
    val lastName: String,
    val phone: String,
    val email: String,
    val password: String,
    val branchId: String,
    val ministryRoleId: String,
    val isWorker: Boolean,
    val departmentId: String? = null,
    val positionName: String? = null,
    val dateStartedServing: String? = null,
    val gender: String,
    val dateOfBirth: String? = null,
    val residentialAddress: String? = null,
    val profilePictureUrl: String? = null,
    val emergencyContactName: String? = null,
    val emergencyContactPhone: String? = null
)

@Serializable
data class RegistrationResponse(
    val success: Boolean,
    val message: String,
    val userId: String? = null
)

@Serializable
data class BranchItem(
    val id: String,
    val name: String,
    val branchCode: String,
    val address: String,
    val city: String,
    val country: String = "Nigeria",
    val phone: String? = null,
    val email: String? = null,
    val branchPastorName: String? = null
)

@Serializable
data class DepartmentItem(
    val id: String,
    val name: String,
    val code: String,
    val description: String? = null,
    val hodName: String? = null,
    val branchId: String? = null
)

@Serializable
data class MinistryRoleItem(
    val id: String,
    val name: String,
    val code: String,
    val description: String? = null
)

@Serializable
data class ServiceScheduleItem(
    val id: String,
    val branchId: String,
    val name: String,
    val dayOfWeek: String,
    val startTime: String,
    val expectedEndTime: String,
    val gracePeriodMinutes: Int = 15,
    val attendanceDurationHours: Double = 4.0
)

@Serializable
data class AttendanceRecordItem(
    val id: String,
    val workerId: String,
    val serviceId: String,
    val branchId: String,
    val serviceDate: String,
    val clockInTime: String? = null,
    val clockOutTime: String? = null,
    val durationMinutes: Int? = null,
    val clockInMethod: String? = null,
    val status: String,
    val isAutoClockOut: Boolean = false,
    val serviceName: String? = null
)

@Serializable
data class AttendanceHistoryResponse(
    val workerCode: String? = null,
    val records: List<AttendanceRecordItem> = emptyList(),
    val summary: AttendanceSummary = AttendanceSummary()
)

@Serializable
data class AttendanceSummary(
    val total: Int = 0,
    val present: Int = 0,
    val late: Int = 0,
    val rate: Int = 0
)

@Serializable
data class ClockInResponse(
    val success: Boolean,
    val record: AttendanceRecordItem
)

@Serializable
data class PostItem(
    val id: String,
    val authorName: String,
    val title: String? = null,
    val content: String,
    val scriptureReference: String? = null,
    val postType: String = "post",
    val isPinned: Boolean = false,
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val mediaUrls: List<String> = emptyList(),
    val userReaction: String? = null,
    val createdAt: String
)

@Serializable
data class EventItem(
    val id: String,
    val title: String,
    val description: String,
    val bannerUrl: String? = null,
    val startDatetime: String,
    val endDatetime: String,
    val location: String,
    val speaker: String? = null,
    val category: String,
    val registrationRequired: Boolean = false,
    val currentRegistrationsCount: Int = 0,
    val isUserRegistered: Boolean = false
)

@Serializable
data class ServiceHighlightItem(
    val id: String,
    val highlightDate: String,
    val title: String,
    val speaker: String,
    val summary: String,
    val scripture: String? = null,
    val keyPoints: List<String> = emptyList(),
    val quote: String? = null
)

@Serializable
data class TestimonyItem(
    val id: String,
    val authorName: String,
    val branchName: String,
    val title: String,
    val content: String,
    val category: String,
    val photoUrl: String? = null,
    val videoUrl: String? = null,
    val allowPublish: Boolean = true,
    val status: String,
    val createdAt: String
)

@Serializable
data class NotificationItem(
    val id: String,
    val title: String,
    val body: String,
    val notificationType: String,
    val createdAt: String,
    val isRead: Boolean = false
)
