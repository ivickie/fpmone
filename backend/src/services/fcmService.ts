import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, SendResponse } from 'firebase-admin/messaging';
import { query } from '../db/index';
import { NotificationItem } from '../types';

/**
 * Production Firebase Cloud Messaging (FCM) Service for FPM Global.
 *
 * Responsibilities:
 * - Reads and validates server-only Vercel environment variable `FIREBASE_SERVICE_ACCOUNT_JSON`.
 * - Singleton initialization of Firebase Admin SDK with graceful fallback when unconfigured.
 * - Resolves target device tokens respecting church hierarchy, branch scoping, and user targeting.
 * - Dispatches multicast FCM payloads mapped to Android notification channels and deep links.
 * - Prunes invalidated, unregistered, or expired device tokens automatically.
 * - Enforces idempotency to prevent duplicate notification delivery.
 * - Strictly protects credentials: never logs private keys or device secrets.
 */
export class FcmService {
  private static isInitialized = false;
  private static initializationError: string | null = null;
  private static dispatchedNotificationIds = new Set<string>();

  /**
   * Initializes Firebase Admin SDK safely from FIREBASE_SERVICE_ACCOUNT_JSON.
   */
  public static init(): boolean {
    if (this.isInitialized && getApps().length > 0) {
      return true;
    }

    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!rawJson || !rawJson.trim()) {
      this.initializationError = 'FIREBASE_SERVICE_ACCOUNT_JSON is not configured in environment variables.';
      return false;
    }

    try {
      const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        this.initializationError = 'FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields (project_id, client_email, or private_key).';
        console.warn(`[FCM INIT] ${this.initializationError}`);
        return false;
      }

      // Format private key properly for multi-line PEM format
      const formattedPrivateKey = parsed.private_key.replace(/\\n/g, '\n');

      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: formattedPrivateKey
          })
        });
      }

      this.isInitialized = true;
      this.initializationError = null;
      console.log(`[FCM INIT] Firebase Admin SDK initialized successfully for project: ${parsed.project_id}`);
      return true;
    } catch (err: any) {
      this.initializationError = `Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`;
      console.warn(`[FCM INIT ERROR] ${this.initializationError}`);
      return false;
    }
  }

  /**
   * Returns whether FCM is initialized and ready to dispatch notifications.
   */
  public static isConfigured(): boolean {
    if (!this.isInitialized) {
      return this.init();
    }
    return getApps().length > 0;
  }

  /**
   * Returns diagnostic status safe to display to administrators (without credentials).
   */
  public static getStatus(): { configured: boolean; projectId?: string; error?: string } {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        configured: false,
        error: this.initializationError || 'FIREBASE_SERVICE_ACCOUNT_JSON is missing'
      };
    }
    const apps = getApps();
    const app: App | undefined = apps[0];
    return {
      configured: true,
      projectId: app?.options.credential ? (app.options as any).projectId : undefined
    };
  }

  /**
   * Maps notification types to Android notification channels.
   */
  public static resolveChannelId(notificationType: string): string {
    switch ((notificationType || '').toLowerCase()) {
      case 'upcoming_service':
      case 'service':
      case 'service_reminder':
        return 'fpm_services';
      case 'upcoming_event':
      case 'event':
      case 'event_reminder':
        return 'fpm_events';
      case 'announcement':
      case 'broadcast':
        return 'fpm_announcements';
      default:
        return 'fpm_general';
    }
  }

  /**
   * Resolves target device tokens from PostgreSQL according to notification scope.
   */
  public static async resolveTargetTokens(notif: NotificationItem): Promise<string[]> {
    if (!process.env.DATABASE_URL || process.env.IS_TEST_RUN === 'true') {
      try {
        const { db } = await import('../data/mockDb');
        const inMemoryTokens = db.deviceTokens || [];
        if (notif.targetScope === 'branch' && notif.targetId) {
          return inMemoryTokens.filter(d => !d.branchId || d.branchId === notif.targetId).map(d => d.deviceToken);
        }
        if (notif.targetScope === 'specific_member' && notif.targetId) {
          return inMemoryTokens.filter(d => d.userId === notif.targetId).map(d => d.deviceToken);
        }
        return inMemoryTokens.map(d => d.deviceToken);
      } catch {
        return [];
      }
    }

    try {
      let sql = 'SELECT DISTINCT device_token FROM device_tokens WHERE 1=1';
      const params: any[] = [];

      switch (notif.targetScope) {
        case 'branch':
          if (notif.targetId) {
            params.push(notif.targetId);
            sql += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
          }
          break;

        case 'specific_member':
          if (notif.targetId) {
            params.push(notif.targetId);
            sql += ` AND (
              user_id = $${params.length}
              OR user_id IN (SELECT user_id FROM members WHERE id = $${params.length})
            )`;
          }
          break;

        case 'department':
          if (notif.targetId) {
            params.push(notif.targetId);
            sql += ` AND user_id IN (
              SELECT m.user_id FROM members m
              JOIN workers w ON w.member_id = m.id
              WHERE w.department_id = $${params.length}
            )`;
          }
          break;

        case 'workers':
          sql += ` AND user_id IN (
            SELECT user_id FROM members WHERE is_worker = true
            UNION
            SELECT m.user_id FROM members m JOIN workers w ON w.member_id = m.id
          )`;
          break;

        case 'ministry_role':
          if (notif.targetId) {
            params.push(notif.targetId);
            sql += ` AND user_id IN (
              SELECT user_id FROM members WHERE primary_role_id = $${params.length}
            )`;
          }
          break;

        case 'all':
        case 'entire_church':
        default:
          // Target all registered devices across branches
          break;
      }

      const res = await query(sql, params);
      return res.rows.map((r: any) => r.device_token).filter(Boolean);
    } catch (err: any) {
      console.warn(`[FCM RESOLVE TOKENS ERROR] ${err.message}`);
      return [];
    }
  }

  /**
   * Dispatches a notification to target devices via Firebase Cloud Messaging.
   * Enforces idempotency, handles batching (up to 500 per multicast), and prunes bad tokens.
   */
  public static async dispatchNotification(notif: NotificationItem): Promise<{
    sent: number;
    failed: number;
    pruned: number;
    skippedReason?: string;
  }> {
    // 1. Check idempotency
    if (this.dispatchedNotificationIds.has(notif.id)) {
      return { sent: 0, failed: 0, pruned: 0, skippedReason: 'duplicate_suppressed' };
    }

    // Mark in-flight / dispatched to prevent duplicate processing
    this.dispatchedNotificationIds.add(notif.id);

    // Keep set bounded to last 1000 items
    if (this.dispatchedNotificationIds.size > 1000) {
      const first = this.dispatchedNotificationIds.values().next().value;
      if (first) this.dispatchedNotificationIds.delete(first);
    }

    // 2. Verify FCM configuration
    if (!this.isConfigured()) {
      return {
        sent: 0,
        failed: 0,
        pruned: 0,
        skippedReason: this.initializationError || 'unconfigured'
      };
    }

    // 3. Resolve target device tokens

    // 4. Resolve target device tokens
    const tokens = await this.resolveTargetTokens(notif);
    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0, pruned: 0, skippedReason: 'no_target_tokens' };
    }

    const channelId = this.resolveChannelId(notif.notificationType);
    const actionUrl = notif.actionUrl || '/notifications';

    let totalSent = 0;
    let totalFailed = 0;
    const tokensToPrune: string[] = [];

    // 5. Send in chunks of 500 (FCM multicast limit)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const batchTokens = tokens.slice(i, i + CHUNK_SIZE);

      const message: MulticastMessage = {
        tokens: batchTokens,
        notification: {
          title: notif.title,
          body: notif.body
        },
        data: {
          notificationId: notif.id,
          notificationType: notif.notificationType,
          actionUrl: actionUrl,
          channelId: channelId,
          createdAt: notif.createdAt
        },
        android: {
          priority: 'high',
          notification: {
            channelId: channelId,
            icon: 'church_logo',
            color: '#D4AF37', // FPM Gold
            sound: 'default'
          }
        }
      };

      try {
        const response = await getMessaging().sendEachForMulticast(message);
        totalSent += response.successCount;
        totalFailed += response.failureCount;

        // Inspect failure reasons to prune dead tokens
        response.responses.forEach((resp: SendResponse, idx: number) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/mismatched-credential'
            ) {
              tokensToPrune.push(batchTokens[idx]);
            }
          }
        });
      } catch (err: any) {
        console.warn(`[FCM BATCH SEND ERROR] ${err.message}`);
        totalFailed += batchTokens.length;
      }
    }

    // 6. Prune invalid tokens safely from database
    let prunedCount = 0;
    if (tokensToPrune.length > 0 && process.env.DATABASE_URL && process.env.IS_TEST_RUN !== 'true') {
      try {
        const pruneRes = await query(
          'DELETE FROM device_tokens WHERE device_token = ANY($1)',
          [tokensToPrune]
        );
        prunedCount = pruneRes.rowCount || tokensToPrune.length;
      } catch (err: any) {
        console.warn(`[FCM PRUNE TOKENS ERROR] ${err.message}`);
      }
    }

    console.log(
      `[FCM DISPATCH] Notification ${notif.id} (${notif.notificationType}): ` +
      `${totalSent} sent, ${totalFailed} failed, ${prunedCount} invalid tokens pruned.`
    );

    return {
      sent: totalSent,
      failed: totalFailed,
      pruned: prunedCount
    };
  }
}
