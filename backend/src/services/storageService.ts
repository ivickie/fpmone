import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/mockDb';
import { MediaItem, MediaType } from '../types';
import { AuditService } from './auditService';
import { persistMediaItem } from '../db/sync';

export interface UploadFileOptions {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  entityType: MediaType;
  entityId?: string;
  branchId?: string;
  userId: string;
  userFullName: string;
  userRole: string;
  adminLevel?: string;
  userBranchId?: string;
}

export class StorageService {
  private static bucketName = 'fpm-media';
  private static supabase: SupabaseClient | null = null;
  private static allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private static maxFileSizeBytes = 10 * 1024 * 1024; // 10 MB max ceiling

  private static getClient(): SupabaseClient | null {
    if (this.supabase) return this.supabase;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        this.supabase = createClient(url, key);
      } catch (err) {
        console.warn('[STORAGE] Supabase client initialization fallback:', err);
      }
    }
    return this.supabase;
  }

  /**
   * Validate authorization to upload for target entity and branch
   */
  public static validateUploadAuthorization(options: UploadFileOptions): void {
    const { entityType, branchId, userId, adminLevel, userBranchId } = options;

    if (adminLevel === 'super_admin') {
      return; // Global access
    }

    if (entityType === 'testimony' || entityType === 'profile') {
      // Members and workers can upload for their own testimony and profile
      return;
    }

    // Official church entities require admin role
    if (adminLevel === 'branch_admin') {
      if (branchId && userBranchId && branchId !== userBranchId) {
        throw new Error('Branch isolation violation: You can only upload media for your assigned branch.');
      }
      return;
    }

    throw new Error(`Unauthorized. Only administrators can upload media for ${entityType}.`);
  }

  /**
   * Generate canonical, server-controlled storage folder paths
   */
  public static buildStoragePath(entityType: MediaType, branchId?: string, entityId?: string, filename?: string): string {
    const bId = branchId || 'global';
    const eId = entityId || uuidv4();
    const file = filename || `${uuidv4()}.webp`;

    switch (entityType) {
      case 'event':
        return `events/${bId}/${eId}/${file}`;
      case 'feed':
        return `feed/${bId}/${eId}/${file}`;
      case 'highlight':
        return `service-highlights/${bId}/${eId}/${file}`;
      case 'testimony':
        return `testimonies/${bId}/${eId}/${file}`;
      case 'profile':
        return `profiles/${eId}/${file}`;
      case 'church-asset':
        return `church-assets/${bId}/${file}`;
      default:
        return `general/${bId}/${file}`;
    }
  }

  /**
   * Authoritative File Upload to Supabase Storage with Local Mock Fallback
   */
  public static async uploadImage(options: UploadFileOptions): Promise<MediaItem> {
    // 1. Authorization check
    this.validateUploadAuthorization(options);

    // 2. MIME type validation
    if (!this.allowedMimeTypes.includes(options.mimeType.toLowerCase())) {
      throw new Error(`Invalid file type: ${options.mimeType}. Only JPEG, PNG, and WEBP images are supported.`);
    }

    // 3. File size limit validation
    if (options.size > this.maxFileSizeBytes) {
      throw new Error(`File size (${(options.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB.`);
    }

    if (!options.buffer || options.buffer.length === 0) {
      throw new Error('Upload buffer is empty.');
    }

    // 4. Resolve extension and server-controlled filename
    const ext = options.originalName.includes('.') ? options.originalName.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
    const serverFileName = `${uuidv4()}.${ext}`;
    const storagePath = this.buildStoragePath(options.entityType, options.branchId, options.entityId, serverFileName);

    let publicUrl = '';
    const client = this.getClient();

    if (client) {
      try {
        const { error: uploadError } = await client.storage
          .from(this.bucketName)
          .upload(storagePath, options.buffer, {
            contentType: options.mimeType,
            upsert: false
          });

        if (uploadError) {
          console.warn('[STORAGE] Supabase upload failed, falling back:', uploadError.message);
          publicUrl = `https://storage.faithpreachers.org/${this.bucketName}/${storagePath}`;
        } else {
          const { data } = client.storage.from(this.bucketName).getPublicUrl(storagePath);
          publicUrl = data.publicUrl;
        }
      } catch (err: any) {
        console.warn('[STORAGE] Supabase upload error:', err.message);
        publicUrl = `https://storage.faithpreachers.org/${this.bucketName}/${storagePath}`;
      }
    } else {
      // Deterministic URL for mock/test/local environments
      publicUrl = `https://storage.faithpreachers.org/${this.bucketName}/${storagePath}`;
    }

    // 5. Commit Media Record to Database
    const mediaItem: MediaItem = {
      id: uuidv4(),
      storagePath,
      publicUrl,
      entityType: options.entityType,
      entityId: options.entityId,
      uploadedBy: options.userId,
      branchId: options.branchId,
      mimeType: options.mimeType,
      fileSize: options.size,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.mediaFiles.push(mediaItem);
    persistMediaItem(mediaItem).catch(() => {});

    // 6. Immutable Audit Log
    AuditService.log(
      options.userFullName,
      options.userRole,
      'MEDIA_UPLOADED',
      'media',
      mediaItem.id,
      options.userId,
      null,
      {
        storagePath: mediaItem.storagePath,
        entityType: mediaItem.entityType,
        entityId: mediaItem.entityId,
        fileSize: mediaItem.fileSize,
        mimeType: mediaItem.mimeType
      }
    );

    return mediaItem;
  }

  /**
   * Safe Media Deletion / Archival
   */
  public static async deleteMedia(
    mediaId: string,
    caller: { userId: string; userFullName: string; userRole: string; adminLevel?: string; branchId?: string }
  ): Promise<{ success: boolean; message: string }> {
    const media = db.mediaFiles.find(m => m.id === mediaId);
    if (!media) {
      throw new Error('Media item not found.');
    }

    // Authorization check
    const isSuperAdmin = caller.adminLevel === 'super_admin';
    const isBranchAdmin = caller.adminLevel === 'branch_admin' && caller.branchId === media.branchId;
    const isOwner = media.uploadedBy === caller.userId;

    if (!isSuperAdmin && !isBranchAdmin && !isOwner) {
      throw new Error('Unauthorized. You do not have permission to delete this media asset.');
    }

    // Safe archival / detach
    media.isArchived = true;
    media.updatedAt = new Date().toISOString();
    persistMediaItem(media).catch(() => {});

    const client = this.getClient();
    if (client) {
      try {
        await client.storage.from(this.bucketName).remove([media.storagePath]);
      } catch (err) {
        console.warn('[STORAGE] Storage object removal warning:', err);
      }
    }

    // Audit log
    AuditService.log(
      caller.userFullName,
      caller.userRole,
      'MEDIA_DELETED',
      'media',
      media.id,
      caller.userId,
      { storagePath: media.storagePath, isArchived: false },
      { storagePath: media.storagePath, isArchived: true }
    );

    return { success: true, message: 'Media asset successfully removed and archived.' };
  }

  /**
   * Query Media Records by Entity or Branch
   */
  public static listMedia(params: { entityType?: MediaType; entityId?: string; branchId?: string }): MediaItem[] {
    let result = db.mediaFiles.filter(m => !m.isArchived);
    if (params.entityType) {
      result = result.filter(m => m.entityType === params.entityType);
    }
    if (params.entityId) {
      result = result.filter(m => m.entityId === params.entityId);
    }
    if (params.branchId) {
      result = result.filter(m => !m.branchId || m.branchId === params.branchId);
    }
    return result;
  }
}
