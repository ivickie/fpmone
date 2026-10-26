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
    val workerDetails: WorkerDetails? = null,
    val profilePictureUrl: String? = null
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
    val success: Boolean = true,
    val message: String,
    val userId: String? = null,
    val requiresEmailVerification: Boolean = false,
    val email: String? = null
)

@Serializable
data class VerifyEmailRequest(
    val email: String,
    val otp: String
)

@Serializable
data class VerifyEmailResponse(
    val success: Boolean = true,
    val message: String? = null,
    val error: String? = null,
    val email: String? = null
)

@Serializable
data class ResendOtpRequest(
    val email: String
)

@Serializable
data class ResendOtpResponse(
    val success: Boolean = true,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class ForgotPasswordRequest(
    val email: String
)

@Serializable
data class ForgotPasswordResponse(
    val success: Boolean = true,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class VerifyResetOtpRequest(
    val email: String,
    val otp: String
)

@Serializable
data class VerifyResetOtpResponse(
    val success: Boolean = false,
    val valid: Boolean = false,
    val resetAuthToken: String? = null,
    val email: String? = null,
    val message: String? = null,
    val error: String? = null,
    val remainingAttempts: Int? = null
)

@Serializable
data class CompletePasswordResetRequest(
    val email: String,
    val resetAuthToken: String,
    val newPassword: String
)

@Serializable
data class CompletePasswordResetResponse(
    val success: Boolean = false,
    val message: String? = null,
    val error: String? = null
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
    val branchPastorName: String? = null,
    val coverImageUrl: String? = null,
    val imageUrl: String? = null,
    val logoUrl: String? = null
)

@Serializable
data class SundayMomentItem(
    val id: String,
    val branchId: String,
    val uploadedBy: String,
    val uploadedByName: String? = null,
    val uploadedByRole: String? = null,
    val mediaUrl: String,
    val thumbnailUrl: String? = null,
    val caption: String? = null,
    val sundayDate: String,
    val status: String = "approved",
    val publishedAt: String? = null,
    val expiresAt: String? = null,
    val approvedBy: String? = null,
    val rejectedBy: String? = null,
    val rejectionReason: String? = null,
    val creatorSource: String? = null,
    val likesCount: Int = 0,
    val hasLiked: Boolean = false,
    val isExpired: Boolean = false,
    val createdAt: String
)

@Serializable
data class LikeMomentResponse(
    val success: Boolean,
    val likesCount: Int = 0,
    val hasLiked: Boolean = false
)

@Serializable
data class CreateSundayMomentRequest(
    val branchId: String,
    val mediaUrl: String,
    val caption: String? = null,
    val sundayDate: String? = null
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
    val attendanceDurationHours: Double = 4.0,
    val liveStreamUrl: String? = null,
    val imageUrl: String? = null
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
    val allowComments: Boolean = true,
    val createdAt: String
)

@Serializable
data class CommentItem(
    val id: String,
    val postId: String,
    val userId: String,
    val userName: String,
    val content: String,
    val createdAt: String
)

@Serializable
data class CreateCommentRequest(
    val content: String
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
    val quote: String? = null,
    val photos: List<String> = emptyList(),
    val videoUrl: String? = null
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
    val isRead: Boolean = false,
    val actionUrl: String? = null
)

// =============================================================================
// BIBLE CHALLENGE GAME MODELS
// =============================================================================

@Serializable
data class BibleUserStats(
    val userId: String,
    val memberId: String,
    val cumulativeXp: Double = 0.0,
    val level: Int = 1,
    val levelTitle: String = "Scripture Seeker",
    val xpInCurrentLevel: Double = 0.0,
    val xpForNextLevel: Double = 100.0,
    val currentStreak: Int = 0,
    val bestStreak: Int = 0,
    val lastCompletedDate: String? = null,
    val totalChallengesCompleted: Int = 0,
    val perfectScoresCount: Int = 0
)

@Serializable
data class BibleBadgeItem(
    val id: String,
    val name: String,
    val description: String,
    val icon: String,
    val xpReward: Int = 0,
    val displayOrder: Int = 0,
    val earned: Boolean = false,
    val awardedAt: String? = null
)

@Serializable
data class BibleLeaderboardItem(
    val rank: Int,
    val memberId: String,
    val userId: String,
    val displayName: String,
    val profilePictureUrl: String? = null,
    val branchId: String,
    val branchName: String? = null,
    val weeklyXp: Double = 0.0,
    val totalXp: Double = 0.0,
    val totalCorrectAnswers: Int = 0,
    val totalResponseTimeMs: Long = 0L,
    val level: Int = 1,
    val isCurrentUser: Boolean = false
)

@Serializable
data class BibleQuestionTiming(
    val questionIndex: Int,
    val startedAt: String,
    val deadlineAt: String,
    val timeLimitSeconds: Int = 15,
    val serverTime: String? = null
)

@Serializable
data class BibleReviewedQuestion(
    val id: String,
    val questionText: String,
    val options: List<String>,
    val selectedIndex: Int? = null,
    val correctOptionIndex: Int,
    val isCorrect: Boolean,
    val status: String? = null,
    val explanation: String,
    val bibleReference: String,
    val responseTimeMs: Long? = null,
    val remainingTimeMs: Long? = null,
    val questionXp: Double = 0.0,
    val isTimeout: Boolean = false
)

@Serializable
data class BibleTodayOverview(
    val challengeDate: String,
    val challengeId: String,
    val totalQuestions: Int = 5,
    val isCompleted: Boolean = false,
    val score: Int = 0,
    val totalXp: Double = 0.0,
    val currentQuestionIndex: Int = 0,
    val stats: BibleUserStats,
    val badges: List<BibleBadgeItem> = emptyList(),
    val weeklyLeaderboardPreview: List<BibleLeaderboardItem> = emptyList(),
    val reviewedQuestions: List<BibleReviewedQuestion>? = null
)

@Serializable
data class BibleQuestionView(
    val id: String,
    val questionText: String,
    val options: List<String>,
    val category: String,
    val difficulty: String
)

@Serializable
data class BibleAnsweredQuestion(
    val questionId: String,
    val selectedIndex: Int? = null,
    val isCorrect: Boolean,
    val status: String? = null,
    val correctOptionIndex: Int,
    val explanation: String,
    val bibleReference: String,
    val responseTimeMs: Long? = null,
    val remainingTimeMs: Long? = null,
    val questionXp: Double = 0.0,
    val isTimeout: Boolean = false
)

@Serializable
data class BibleGameSession(
    val challengeDate: String,
    val challengeId: String,
    val currentQuestionIndex: Int,
    val totalQuestions: Int = 5,
    val isCompleted: Boolean,
    val score: Int,
    val totalXp: Double = 0.0,
    val currentQuestion: BibleQuestionView? = null,
    val activeQuestionTiming: BibleQuestionTiming? = null,
    val answeredQuestions: List<BibleAnsweredQuestion> = emptyList()
)

@Serializable
data class BibleAnswerFeedback(
    val isCorrect: Boolean,
    val status: String? = null,
    val correctOptionIndex: Int,
    val explanation: String,
    val bibleReference: String,
    val score: Int,
    val currentQuestionIndex: Int,
    val isRoundFinished: Boolean,
    val questionXp: Double = 0.0,
    val responseTimeMs: Long = 0L,
    val remainingTimeMs: Long = 0L,
    val isTimeout: Boolean = false
)

@Serializable
data class BibleChallengeCompletion(
    val challengeDate: String,
    val score: Int,
    val totalQuestions: Int = 5,
    val xpAwarded: Double,
    val totalXpEarned: Double = 0.0,
    val alreadyCompleted: Boolean,
    val stats: BibleUserStats,
    val newlyUnlockedBadges: List<BibleBadgeItem> = emptyList(),
    val reviewedQuestions: List<BibleReviewedQuestion> = emptyList()
)

@Serializable
data class BibleProgressHistory(
    val stats: BibleUserStats,
    val badges: List<BibleBadgeItem> = emptyList(),
    val recentChallenges: List<BibleRecentChallenge> = emptyList()
)

@Serializable
data class BibleRecentChallenge(
    val challengeDate: String,
    val score: Int,
    val xpAwarded: Double,
    val isCompleted: Boolean,
    val completedAt: String? = null
)

@Serializable
data class BibleWeekRange(
    val start: String,
    val end: String
)

@Serializable
data class BibleLeaderboardData(
    val entries: List<BibleLeaderboardItem> = emptyList(),
    val userRank: BibleLeaderboardItem? = null,
    val scope: String = "weekly",
    val weekRange: BibleWeekRange? = null
)
