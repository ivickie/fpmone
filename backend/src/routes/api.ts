import { Router } from 'express';
import multer from 'multer';
import {
  loginHandler, registerHandler, getProfileHandler, updateProfileHandler,
  changePasswordHandler, lookupMemberProfileHandler, deleteAccountRequestHandler,
  verifyEmailHandler, resendVerificationOtpHandler, forgotPasswordHandler,
  verifyResetTokenHandler, verifyResetOtpHandler, resendResetOtpHandler, resetPasswordHandler, getBrevoStatusHandler, testSendEmailHandler,
  getBranchesHandler, createBranchHandler, updateBranchHandler, deleteBranchHandler,
  getDepartmentsHandler, createDepartmentHandler, updateDepartmentHandler, deleteDepartmentHandler,
  lookupHodHandler, getEligibleHodsHandler,
  getDepartmentPositionsHandler, createPositionHandler, deletePositionHandler,
  getRolesHandler, createRoleHandler, updateRoleHandler, deleteRoleHandler,
  getPendingApprovalsHandler, approveMemberHandler, rejectMemberHandler, requestChangesHandler,
  listMembersHandler, getMemberByIdHandler, createMemberHandler, updateMemberHandler, deleteMemberHandler, updateMemberStatusHandler, updateMemberAssignmentHandler, resetMemberPasswordHandler,
  listWorkersHandler, getWorkerByIdHandler, updateWorkerHandler,
  clockInHandler, clockOutHandler, triggerAutoClockOutHandler, markAbsencesHandler, excuseAbsenceHandler,
  getAttendanceDashboardHandler, getAttendanceMatrixHandler, exportAttendanceCsvHandler, getMyAttendanceHistoryHandler,
  getServicesHandler, createServiceHandler, updateServiceHandler, deleteServiceHandler,
  getEventsHandler, getEventByIdHandler, createEventHandler, updateEventHandler, deleteEventHandler,
  registerForEventHandler, cancelEventRegistrationHandler, getEventRegistrationsHandler,
  getFeedHandler, createPostHandler, updatePostHandler, deletePostHandler, reactToPostHandler, commentOnPostHandler,
  getHighlightsHandler, createHighlightHandler, updateHighlightHandler, deleteHighlightHandler,
  getApprovedTestimoniesHandler, getTestimoniesQueueHandler, submitTestimonyHandler, reviewTestimonyHandler, deleteTestimonyHandler,
  getNotificationsHandler, broadcastNotificationHandler, markNotificationReadHandler, deleteNotificationHandler,
  registerDeviceTokenHandler, unregisterDeviceTokenHandler,
  getAuditLogsHandler, getSettingsHandler, updateSettingsHandler, getSystemHealthHandler,
  uploadMediaHandler, uploadAvatarHandler, deleteMediaHandler, listMediaHandler,
  getDbStatusHandler,
  getDepartmentReportsHandler, getDepartmentReportByIdHandler,
  createDepartmentReportHandler, reviewDepartmentReportHandler, deleteDepartmentReportHandler,
  getSundayMomentsHandler, createSundayMomentHandler, deleteSundayMomentHandler,
  approveSundayMomentHandler, rejectSundayMomentHandler, likeSundayMomentHandler, unlikeSundayMomentHandler,
  getFinanceCategoriesHandler, getFinanceDashboardHandler, getFinanceTransactionsHandler,
  getFinanceTransactionByIdHandler, createFinanceTransactionHandler, updateFinanceTransactionHandler,
  voidFinanceTransactionHandler, getFinanceOpeningBalanceHandler, setFinanceOpeningBalanceHandler,
  getFinanceMonthlyStatementHandler, getFinanceAnnualStatementHandler, getFinanceCategoryAnalysisHandler,
  exportFinanceReportHandler, exportMembersHandler
} from '../controllers/apiControllers';
import {
  getTodayChallengeHandler,
  startOrResumeSessionHandler,
  startQuestionHandler,
  submitAnswerHandler,
  completeChallengeHandler,
  getProgressHandler,
  getLeaderboardHandler,
  listAdminQuestionsHandler,
  getAdminQuestionByIdHandler,
  createAdminQuestionHandler,
  updateAdminQuestionHandler,
  archiveAdminQuestionHandler,
  getAdminDailyChallengeHandler,
  getAdminStatsHandler,
  getAdminSettingsHandler,
  updateAdminSettingsHandler,
  generateAiQuestionHandler
} from '../controllers/bibleGameController';
import { requireAuth, requireAdmin, requireSuperAdmin, requireCronAuth, optionalAuth } from '../middleware/authMiddleware';
import {
  loginRateLimiter,
  registrationRateLimiter,
  uploadRateLimiter,
  exportRateLimiter,
  broadcastRateLimiter,
  clockInRateLimiter,
  verifyEmailRateLimiter,
  resendOtpRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  aiQuestionGenerateRateLimiter
} from '../middleware/rateLimitMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = Router();

// --- AUTH ---
router.post('/auth/login', loginRateLimiter, loginHandler);
router.post('/auth/register', registrationRateLimiter, registerHandler);
router.post('/auth/verify-email', verifyEmailRateLimiter, verifyEmailHandler);
router.post('/auth/resend-verification-otp', resendOtpRateLimiter, resendVerificationOtpHandler);
router.post('/auth/forgot-password', forgotPasswordRateLimiter, forgotPasswordHandler);
router.post('/auth/verify-reset-otp', resetPasswordRateLimiter, verifyResetOtpHandler);
router.post('/auth/resend-reset-otp', resendOtpRateLimiter, resendResetOtpHandler);
router.post('/auth/verify-reset-token', verifyResetTokenHandler);
router.post('/auth/reset-password', resetPasswordRateLimiter, resetPasswordHandler);
router.get('/auth/brevo-status', requireAuth, requireSuperAdmin, getBrevoStatusHandler);
router.post('/auth/test-send-email', requireAuth, requireSuperAdmin, testSendEmailHandler);
router.get('/auth/profile', requireAuth, getProfileHandler);
router.put('/auth/profile', requireAuth, updateProfileHandler);
router.post('/auth/change-password', optionalAuth, changePasswordHandler);
router.post('/auth/member-profile', optionalAuth, lookupMemberProfileHandler);
router.post('/auth/delete-account-request', optionalAuth, deleteAccountRequestHandler);

// --- BRANCHES ---
router.get('/branches', getBranchesHandler);
router.post('/branches', requireAuth, requireAdmin, createBranchHandler);
router.put('/branches/:id', requireAuth, requireAdmin, updateBranchHandler);
router.delete('/branches/:id', requireAuth, requireAdmin, deleteBranchHandler);

// --- DEPARTMENTS, POSITIONS & ROLES ---
router.get('/departments', getDepartmentsHandler);
router.get('/departments/eligible-hods', requireAuth, requireAdmin, getEligibleHodsHandler);
router.get('/departments/lookup-hod', requireAuth, requireAdmin, lookupHodHandler);
router.post('/departments', requireAuth, requireAdmin, createDepartmentHandler);
router.put('/departments/:id', requireAuth, requireAdmin, updateDepartmentHandler);
router.delete('/departments/:id', requireAuth, requireAdmin, deleteDepartmentHandler);
router.get('/departments/:id/positions', getDepartmentPositionsHandler);
router.post('/departments/:id/positions', requireAuth, requireAdmin, createPositionHandler);
router.delete('/departments/:id/positions/:positionId', requireAuth, requireAdmin, deletePositionHandler);

router.get('/roles', getRolesHandler);
router.post('/roles', requireAuth, requireSuperAdmin, createRoleHandler);
router.put('/roles/:id', requireAuth, requireSuperAdmin, updateRoleHandler);
router.delete('/roles/:id', requireAuth, requireSuperAdmin, deleteRoleHandler);

// --- APPROVALS, MEMBERS & WORKERS ---
router.get('/approvals', requireAuth, requireAdmin, getPendingApprovalsHandler);
router.post('/approvals/:userId/approve', requireAuth, requireAdmin, approveMemberHandler);
router.post('/approvals/:userId/reject', requireAuth, requireAdmin, rejectMemberHandler);
router.post('/approvals/:userId/request-changes', requireAuth, requireAdmin, requestChangesHandler);

router.get('/members', requireAuth, requireAdmin, listMembersHandler);
router.get('/members/export', requireAuth, requireAdmin, exportRateLimiter, exportMembersHandler);
router.post('/members', requireAuth, requireAdmin, createMemberHandler);
router.get('/members/:id', requireAuth, requireAdmin, getMemberByIdHandler);
router.put('/members/:id', requireAuth, requireAdmin, updateMemberHandler);
router.delete('/members/:id', requireAuth, requireAdmin, deleteMemberHandler);
router.put('/members/:id/status', requireAuth, requireAdmin, updateMemberStatusHandler);
router.put('/members/:id/assignment', requireAuth, requireAdmin, updateMemberAssignmentHandler);
router.post('/members/:id/reset-password', requireAuth, requireSuperAdmin, resetMemberPasswordHandler);

router.get('/workers', requireAuth, requireAdmin, listWorkersHandler);
router.get('/workers/:id', requireAuth, requireAdmin, getWorkerByIdHandler);
router.put('/workers/:id', requireAuth, requireAdmin, updateWorkerHandler);

// --- ATTENDANCE ---
router.post('/attendance/clock-in', requireAuth, clockInRateLimiter, clockInHandler);
router.post('/attendance/clock-out', requireAuth, clockOutHandler);
router.post('/attendance/auto-clock-out', requireCronAuth, triggerAutoClockOutHandler); // Secured Cron / Scheduled task
router.post('/attendance/mark-absences', requireAuth, requireAdmin, markAbsencesHandler);
router.post('/attendance/excuse', requireAuth, requireAdmin, excuseAbsenceHandler);
router.get('/attendance/dashboard', requireAuth, requireAdmin, getAttendanceDashboardHandler);
router.get('/attendance/matrix', requireAuth, requireAdmin, getAttendanceMatrixHandler);
router.get('/attendance/export', requireAuth, requireAdmin, exportRateLimiter, exportAttendanceCsvHandler);
router.get('/attendance/my-history', requireAuth, getMyAttendanceHistoryHandler);

// --- SERVICES SCHEDULE ---
router.get('/services', getServicesHandler);
router.post('/services', requireAuth, requireAdmin, createServiceHandler);
router.put('/services/:id', requireAuth, requireAdmin, updateServiceHandler);
router.delete('/services/:id', requireAuth, requireAdmin, deleteServiceHandler);

// --- EVENTS ---
router.get('/events', getEventsHandler);
router.get('/events/:id', getEventByIdHandler);
router.post('/events', requireAuth, requireAdmin, createEventHandler);
router.put('/events/:id', requireAuth, requireAdmin, updateEventHandler);
router.delete('/events/:id', requireAuth, requireAdmin, deleteEventHandler);
router.get('/events/:id/registrations', requireAuth, requireAdmin, getEventRegistrationsHandler);
router.post('/events/:id/register', requireAuth, registerForEventHandler);
router.post('/events/:id/cancel', requireAuth, cancelEventRegistrationHandler);

// --- FEED & POSTS ---
router.get('/feed', getFeedHandler);
router.post('/feed', requireAuth, createPostHandler);
router.put('/feed/:id', requireAuth, updatePostHandler);
router.delete('/feed/:id', requireAuth, deletePostHandler);
router.post('/feed/:postId/react', requireAuth, reactToPostHandler);
router.post('/feed/:postId/comment', requireAuth, commentOnPostHandler);

// --- SERVICE HIGHLIGHTS ---
router.get('/highlights', getHighlightsHandler);
router.post('/highlights', requireAuth, requireAdmin, createHighlightHandler);
router.put('/highlights/:id', requireAuth, requireAdmin, updateHighlightHandler);
router.delete('/highlights/:id', requireAuth, requireAdmin, deleteHighlightHandler);

// --- TESTIMONIES ---
router.get('/testimonies', getApprovedTestimoniesHandler);
router.post('/testimonies', requireAuth, submitTestimonyHandler);
router.get('/testimonies/queue', requireAuth, requireAdmin, getTestimoniesQueueHandler);
router.post('/testimonies/:id/review', requireAuth, requireAdmin, reviewTestimonyHandler);
router.delete('/testimonies/:id', requireAuth, deleteTestimonyHandler);

// --- NOTIFICATIONS ---
router.get('/notifications', requireAuth, getNotificationsHandler);
router.post('/notifications/broadcast', requireAuth, requireAdmin, broadcastRateLimiter, broadcastNotificationHandler);
router.put('/notifications/:id/read', requireAuth, markNotificationReadHandler);
router.delete('/notifications/:id', requireAuth, requireAdmin, deleteNotificationHandler);
router.post('/notifications/register-token', optionalAuth, registerDeviceTokenHandler);
router.post('/notifications/unregister-token', optionalAuth, unregisterDeviceTokenHandler);

// --- MEDIA MANAGEMENT (SUPABASE STORAGE) ---
router.post('/media/upload', requireAuth, uploadRateLimiter, upload.single('file'), uploadMediaHandler);
router.post('/media/upload-avatar', uploadRateLimiter, upload.single('file'), uploadAvatarHandler);
router.delete('/media/:id', requireAuth, deleteMediaHandler);
router.get('/media', listMediaHandler);

// --- AUDIT LOGS ---
router.get('/audit-logs', requireAuth, requireAdmin, getAuditLogsHandler);

// --- SETTINGS ---
router.get('/settings', requireAuth, requireAdmin, getSettingsHandler);
router.put('/settings', requireAuth, requireAdmin, updateSettingsHandler);
router.get('/settings/health', requireAuth, requireAdmin, getSystemHealthHandler);

// --- DATABASE HEALTH & STATUS ---
router.get('/db/status', getDbStatusHandler);

// --- DEPARTMENT REPORTS ---
router.get('/department-reports', requireAuth, getDepartmentReportsHandler);
router.post('/department-reports', requireAuth, createDepartmentReportHandler);
router.get('/department-reports/:id', requireAuth, getDepartmentReportByIdHandler);
router.put('/department-reports/:id/review', requireAuth, reviewDepartmentReportHandler);
router.delete('/department-reports/:id', requireAuth, deleteDepartmentReportHandler);

// --- SUNDAY MOMENTS ---
router.get('/sunday-moments', optionalAuth, getSundayMomentsHandler);
router.post('/sunday-moments', requireAuth, createSundayMomentHandler);
router.put('/sunday-moments/:id/approve', requireAuth, requireAdmin, approveSundayMomentHandler);
router.put('/sunday-moments/:id/reject', requireAuth, requireAdmin, rejectSundayMomentHandler);
router.post('/sunday-moments/:id/like', requireAuth, likeSundayMomentHandler);
router.post('/sunday-moments/:id/unlike', requireAuth, unlikeSundayMomentHandler);
router.delete('/sunday-moments/:id', requireAuth, deleteSundayMomentHandler);

// --- FINANCE MODULE ---
router.get('/finance/categories', requireAuth, getFinanceCategoriesHandler);
router.get('/finance/dashboard', requireAuth, getFinanceDashboardHandler);
router.get('/finance/transactions', requireAuth, getFinanceTransactionsHandler);
router.post('/finance/transactions', requireAuth, createFinanceTransactionHandler);
router.get('/finance/transactions/:id', requireAuth, getFinanceTransactionByIdHandler);
router.put('/finance/transactions/:id', requireAuth, updateFinanceTransactionHandler);
router.post('/finance/transactions/:id/void', requireAuth, voidFinanceTransactionHandler);
router.get('/finance/opening-balance', requireAuth, getFinanceOpeningBalanceHandler);
router.post('/finance/opening-balance', requireAuth, setFinanceOpeningBalanceHandler);
router.get('/finance/statements/monthly', requireAuth, getFinanceMonthlyStatementHandler);
router.get('/finance/statements/annual', requireAuth, getFinanceAnnualStatementHandler);
router.get('/finance/analysis', requireAuth, getFinanceCategoryAnalysisHandler);
router.get('/finance/export', requireAuth, exportRateLimiter, exportFinanceReportHandler);

// --- BIBLE CHALLENGE GAME ---
router.get('/bible-game/today', requireAuth, getTodayChallengeHandler);
router.post('/bible-game/start', requireAuth, startOrResumeSessionHandler);
router.post('/bible-game/question/start', requireAuth, startQuestionHandler);
router.post('/bible-game/start-question', requireAuth, startQuestionHandler);
router.post('/bible-game/answer', requireAuth, submitAnswerHandler);
router.post('/bible-game/complete', requireAuth, completeChallengeHandler);
router.get('/bible-game/progress', requireAuth, getProgressHandler);
router.get('/bible-game/leaderboard', optionalAuth, getLeaderboardHandler);

// --- BIBLE CHALLENGE ADMIN PORTAL ---
router.post('/bible-game/admin/questions/generate', requireAuth, requireAdmin, aiQuestionGenerateRateLimiter, generateAiQuestionHandler);
router.get('/bible-game/admin/questions', requireAuth, requireAdmin, listAdminQuestionsHandler);
router.post('/bible-game/admin/questions', requireAuth, requireAdmin, createAdminQuestionHandler);
router.get('/bible-game/admin/questions/:id', requireAuth, requireAdmin, getAdminQuestionByIdHandler);
router.put('/bible-game/admin/questions/:id', requireAuth, requireAdmin, updateAdminQuestionHandler);
router.delete('/bible-game/admin/questions/:id', requireAuth, requireAdmin, archiveAdminQuestionHandler);
router.get('/bible-game/admin/daily-challenge', requireAuth, requireAdmin, getAdminDailyChallengeHandler);
router.get('/bible-game/admin/stats', requireAuth, requireAdmin, getAdminStatsHandler);
router.get('/bible-game/admin/settings', requireAuth, requireAdmin, getAdminSettingsHandler);
router.put('/bible-game/admin/settings', requireAuth, requireAdmin, updateAdminSettingsHandler);

export default router;
