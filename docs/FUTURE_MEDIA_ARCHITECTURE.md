# FPM ONE — Future Media Architecture: Cloudinary Evaluation & Roadmap

**Ministry:** Faith Preachers Ministry (FPM ONE)  
**Document Class:** Technical Architecture & Decision Record (ADR)  
**Current Media Tier:** Supabase Storage (S3-Compatible Object Store)  
**Evaluation Target:** Cloudinary Media Experience Platform  
**Target Milestone:** Phase 4 (Enterprise Video & Global CDN Expansion)  

---

## 1. Executive Summary

Faith Preachers Ministry currently employs **Supabase Storage** for FPM ONE's media ingestion, storage, and retrieval pipeline. Supabase Storage natively integrates with PostgreSQL Row-Level Security (RLS), uses S3-compatible infrastructure, and delivers low latency across church assets, member profiles, event banners, and testimony media at zero marginal operational complexity.

This document outlines the architectural roadmap for introducing **Cloudinary** as an advanced Media Experience Layer when church media requirements evolve to include **automatic on-the-fly transformations, adaptive bitrate video streaming (HLS/DASH), dynamic sermon transcription/subtitles, and AI-driven content moderation**.

---

## 2. Comparative Analysis: Supabase Storage vs. Cloudinary

| Feature Dimension | Supabase Storage (Current) | Cloudinary (Future Extension) |
| :--- | :--- | :--- |
| **Primary Workload** | Secure binary storage, canonical path partitioning, low-cost asset hosting. | Dynamic media transformation, adaptive video delivery, edge optimization. |
| **Database Coupling** | Native SQL foreign keys, RLS security policies, unified backup snapshots. | Decoupled via webhook listeners, public IDs stored as external references. |
| **Image Manipulation** | Static storage; client-side scaling or pre-upload resizing. | On-the-fly URL-based transformations (`w_800,h_450,c_fill,q_auto,f_auto`). |
| **Video Delivery** | Direct MP4 progressive streaming (acceptable for short clips < 50MB). | HLS / DASH adaptive bitrate streaming with automatic multi-resolution rendition. |
| **Cost Model** | Included in Supabase compute plan ($0.021/GB storage, $0.09/GB egress). | Credit-based model ($99+/month for high transformation/video volume). |
| **Network Proximity** | Global Fastly/Cloudflare CDN edge cache in front of Supabase S3. | Multi-CDN edge architecture (Akamai, CloudFront, Fastly) with geo-steering. |
| **Compliance & Retention** | Strict RLS; files directly tied to user deletion and archival lifecycle. | External cloud repository; requires explicit webhook coordination for GDPR/data deletion. |

---

## 3. The Hybrid Dual-Tier Architecture

To achieve enterprise performance without excessive SaaS billing overhead, FPM ONE will adopt a **Hybrid Media Tier**:

```
+---------------------------------------------------------------------------------+
|                                 CLIENT CLIENTS                                  |
|         Android Mobile App (Jetpack Compose)  |  Web Admin Portal (React/Vite)  |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                       FPM ONE BACKEND API GATEWAY (Node.js)                     |
|                                                                                 |
|   +---------------------------+             +-------------------------------+   |
|   |   Static & Sensitive Tier |             |    High-Volume Public Media   |   |
|   |    (Supabase Storage)     |             |         (Cloudinary)          |   |
|   +---------------------------+             +-------------------------------+   |
|   | • Member profile avatars  |             | • Sermon video recordings     |   |
|   | • Pastoral documents      |             | • Live stream event replays   |   |
|   | • Confidential testimony  |             | • High-res event flyers       |   |
|   |   proof & medical records |             | • Dynamic social share cards  |   |
|   +---------------------------+             +-------------------------------+   |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                           DATABASE METADATA REPOSITORY                          |
|                       PostgreSQL 16 (media_items table)                         |
|   - id: UUID                                                                    |
|   - storage_provider: 'supabase' | 'cloudinary'                                 |
|   - canonical_path / public_id                                                  |
|   - public_url / secure_url                                                     |
|   - mime_type, file_size_bytes, width, height, duration_seconds                 |
+---------------------------------------------------------------------------------+
```

### Key Division of Responsibilities:
1. **Supabase Storage retains:**
   - Confidential pastoral documents and applicant identity verifications.
   - Medical reports and sensitive testimony proofs submitted by members.
   - Profile pictures and church worker credentials governed by strict RLS.
2. **Cloudinary handles:**
   - Full-length Sunday sermon video recordings (30-90 minutes).
   - Dynamic banner generation for church programs (injecting speaker name and date onto event templates).
   - Multi-device adaptive transcoding (delivering 360p for low-bandwidth mobile networks in rural chapters up to 1080p for smart TVs).

---

## 4. Video Streaming: HLS & Adaptive Bitrate Pipeline

When sermon videos are uploaded to Cloudinary:

```
[Camera / Admin Upload]
        |
        v
[Cloudinary Ingestion] ---> Generates Master Playlist (.m3u8)
                                |
                                +---> 1080p Stream (3500 kbps) -> Urban Wi-Fi
                                +---> 720p Stream  (1800 kbps) -> 4G Mobile
                                +---> 480p Stream  (800 kbps)  -> 3G Mobile
                                +---> 360p Stream  (400 kbps)  -> Rural Low-Bandwidth
```

The Android app will leverage Google Media3 / ExoPlayer to seamlessly switch bitrates based on church member network conditions in Nigeria, the UK, and North America.

---

## 5. Migration Strategy & Phased Rollout Plan

### Phase 1: Current Baseline (Implemented)
- Supabase Storage with local mock fallback.
- Validated MIME types (JPEG, PNG, WEBP), max 10MB per file.
- Canonical UUID partitioned folder paths (`events/`, `testimonies/`, `profiles/`, `church-assets/`).
- Database tracking via `media_items` table.

### Phase 2: Signed Upload Direct Ingestion (Q3)
- Generate time-limited pre-signed upload URLs from Supabase Storage.
- Mobile and Web clients upload directly to object storage, bypassing backend server RAM.

### Phase 3: Cloudinary Provisioning & Hybrid Adapter Pattern (Q4)
- Introduce `IMediaStorageProvider` interface in backend:
  ```typescript
  export interface IMediaStorageProvider {
    upload(file: Buffer, metadata: UploadMetadata): Promise<MediaItem>;
    delete(canonicalPath: string): Promise<boolean>;
    getUrl(canonicalPath: string, transformations?: TransformationOptions): string;
  }
  ```
- Implement `SupabaseStorageProvider` and `CloudinaryStorageProvider`.
- Configure routing rules based on `entityType` and MIME format (e.g. `video/*` routes to Cloudinary).

### Phase 4: Full Video On-Demand (VOD) Integration
- Cloudinary Webhook consumer for `eager_transformation_ready` events.
- Update `services_highlights` and `events` with streaming HLS manifests.

---

## 6. Cost Estimation Model

| Tier | Monthly Volume | Storage Provider | Projected Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Startup (1-5 Branches)** | 50 GB Images, 100 GB Egress | Supabase Storage (Included in Pro) | $25/mo (Supabase Pro Base) |
| **Growth (5-20 Branches)** | 250 GB Images, 1 TB Egress | Supabase Storage + Fastly Cache | $45/mo |
| **Enterprise VOD (20+ Branches)** | 500 GB Images + 100 hrs Video HLS | Supabase Storage (Confidential) + Cloudinary Plus | ~$130 - $180/mo |

This phased roadmap ensures Faith Preachers Ministry maintains zero infrastructure bloat while providing an uninterrupted upgrade path for global media distribution.
