import { Router } from 'express';
import multer from 'multer';
import {
  loginHandler, registerHandler, getProfileHandler, updateProfileHandler,
  getBranchesHandler, createBranchHandler, updateBranchHandler, deleteBranchHandler,
  getDepartmentsHandler, createDepartmentHandler, updateDepartmentHandler, deleteDepartmentHandler,
  getDepartmentPositionsHandler, createPositionHandler, deletePositionHandler,
  getRolesHandler, createRoleHandler, updateRoleHandler, deleteRoleHandler,
  getPendingApprovalsHandler, approveMemberHandler, rejectMemberHandler, requestChangesHandler,
  listMembersHandler, getMemberByIdHandler, createMemberHandler, updateMemberHandler, updateMemberStatusHandler, updateMemberAssignmentHandler,
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
  getAuditLogsHandler, getSettingsHandler, updateSettingsHandler,
  uploadMediaHandler, deleteMediaHandler, listMediaHandler,
  getDbStatusHandler
} from '../controllers/apiControllers';
import { requireAuth, requireAdmin, requireCronAuth } from '../middleware/authMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = Router();

// --- AUTH ---
router.post('/auth/login', loginHandler);
router.post('/auth/register', registerHandler);
router.get('/auth/profile', requireAuth, getProfileHandler);
router.put('/auth/profile', requireAuth, updateProfileHandler);

// --- BRANCHES ---
router.get('/branches', getBranchesHandler);
router.post('/branches', requireAuth, requireAdmin, createBranchHandler);
router.put('/branches/:id', requireAuth, requireAdmin, updateBranchHandler);
router.delete('/branches/:id', requireAuth, requireAdmin, deleteBranchHandler);

// --- DEPARTMENTS, POSITIONS & ROLES ---
router.get('/departments', getDepartmentsHandler);
router.post('/departments', requireAuth, requireAdmin, createDepartmentHandler);
router.put('/departments/:id', requireAuth, requireAdmin, updateDepartmentHandler);
router.delete('/departments/:id', requireAuth, requireAdmin, deleteDepartmentHandler);
router.get('/departments/:id/positions', getDepartmentPositionsHandler);
router.post('/departments/:id/positions', requireAuth, requireAdmin, createPositionHandler);
router.delete('/departments/:id/positions/:positionId', requireAuth, requireAdmin, deletePositionHandler);

router.get('/roles', getRolesHandler);
router.post('/roles', requireAuth, requireAdmin, createRoleHandler);
router.put('/roles/:id', requireAuth, requireAdmin, updateRoleHandler);
router.delete('/roles/:id', requireAuth, requireAdmin, deleteRoleHandler);

// --- APPROVALS, MEMBERS & WORKERS ---
router.get('/approvals', requireAuth, requireAdmin, getPendingApprovalsHandler);
router.post('/approvals/:userId/approve', requireAuth, requireAdmin, approveMemberHandler);
router.post('/approvals/:userId/reject', requireAuth, requireAdmin, rejectMemberHandler);
router.post('/approvals/:userId/request-changes', requireAuth, requireAdmin, requestChangesHandler);

router.get('/members', requireAuth, requireAdmin, listMembersHandler);
router.post('/members', requireAuth, requireAdmin, createMemberHandler);
router.get('/members/:id', requireAuth, requireAdmin, getMemberByIdHandler);
router.put('/members/:id', requireAuth, requireAdmin, updateMemberHandler);
router.put('/members/:id/status', requireAuth, requireAdmin, updateMemberStatusHandler);
router.put('/members/:id/assignment', requireAuth, requireAdmin, updateMemberAssignmentHandler);

router.get('/workers', requireAuth, requireAdmin, listWorkersHandler);
router.get('/workers/:id', requireAuth, requireAdmin, getWorkerByIdHandler);
router.put('/workers/:id', requireAuth, requireAdmin, updateWorkerHandler);

// --- ATTENDANCE ---
router.post('/attendance/clock-in', requireAuth, clockInHandler);
router.post('/attendance/clock-out', requireAuth, clockOutHandler);
router.post('/attendance/auto-clock-out', requireCronAuth, triggerAutoClockOutHandler); // Secured Cron / Scheduled task
router.post('/attendance/mark-absences', requireAuth, requireAdmin, markAbsencesHandler);
router.post('/attendance/excuse', requireAuth, requireAdmin, excuseAbsenceHandler);
router.get('/attendance/dashboard', requireAuth, requireAdmin, getAttendanceDashboardHandler);
router.get('/attendance/matrix', requireAuth, requireAdmin, getAttendanceMatrixHandler);
router.get('/attendance/export', requireAuth, requireAdmin, exportAttendanceCsvHandler);
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
router.post('/notifications/broadcast', requireAuth, requireAdmin, broadcastNotificationHandler);
router.put('/notifications/:id/read', requireAuth, markNotificationReadHandler);
router.delete('/notifications/:id', requireAuth, requireAdmin, deleteNotificationHandler);

// --- MEDIA MANAGEMENT (SUPABASE STORAGE) ---
router.post('/media/upload', requireAuth, upload.single('file'), uploadMediaHandler);
router.delete('/media/:id', requireAuth, deleteMediaHandler);
router.get('/media', listMediaHandler);

// --- AUDIT LOGS ---
router.get('/audit-logs', requireAuth, requireAdmin, getAuditLogsHandler);

// --- SETTINGS ---
router.get('/settings', requireAuth, requireAdmin, getSettingsHandler);
router.put('/settings', requireAuth, requireAdmin, updateSettingsHandler);

// --- DATABASE HEALTH & STATUS ---
router.get('/db/status', getDbStatusHandler);

export default router;
