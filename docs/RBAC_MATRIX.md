# FPM ONE — Role-Based Access Control (RBAC) Matrix

**Platform:** Faith Preachers Ministry (FPM ONE)  
**Security Level:** Production Hardened  
**Author:** Principal Application Security Engineer  

---

## 1. Ministry Hierarchy & Role Definitions

The platform enforces a hierarchical role structure. Permissions are evaluated based on role code, hierarchy level, administrative level, and branch scoping.

| Role Name | Code | Level | Admin Level | Scope | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Super Administrator** | `SUPER_ADMIN` | 1 | `super_admin` | Global (All Branches) | General Overseer, Executive Pastoral Council, Global System Administrators. |
| **Branch Pastor** | `BRANCH_PASTOR` | 2 | `branch_admin` | Assigned Branch | Resident pastor in charge of a specific branch/chapter. |
| **Associate Pastor** | `ASSOCIATE_PASTOR` | 3 | `branch_admin` | Assigned Branch | Assisting ministers with departmental and service oversight. |
| **Pastor** | `PASTOR` | 4 | `none` | Assigned Branch | Ordained pastoral staff. |
| **Head of Department (HOD)** | `HOD` | 5 | `none` | Department | Leads a ministry unit (e.g. Choir, Media, Protocol, Ushering). |
| **Church Worker** | `WORKER` | 6 | `none` | Self / Department | Approved ministering worker with assigned Worker ID and PIN. |
| **Church Member** | `MEMBER` | 7 | `none` | Self | Active congregant with profile, feed, testimony, and event access. |
| **Pending Applicant** | `APPLICANT` | 10 | `none` | Self (Restricted) | Unapproved registration awaiting pastoral review. |

---

## 2. Comprehensive Capability Matrix

### Legend:
- **`G`**: Global access across all branches.
- **`B`**: Scoped access restricted to user's assigned branch.
- **`S`**: Self-only access (restricted to user's own records).
- **`—`**: Access Denied (Forbidden).

| Feature / Capability | Super Admin | Branch Pastor | Associate Pastor | HOD | Church Worker | Member | Pending |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Branch Management** | | | | | | | |
| Create New Branch | **G** | — | — | — | — | — | — |
| Edit Branch Details & Logo | **G** | **B** | — | — | — | — | — |
| Archive / Delete Branch | **G** | — | — | — | — | — | — |
| View All Branches | **G** | **G** | **G** | **G** | **G** | **G** | **G** |
| **Department & Positions Management** | | | | | | | |
| Create Department | **G** | **B** | — | — | — | — | — |
| Edit Department Name / HOD / Description | **G** | **B** | — | — | — | — | — |
| Archive / Delete Department | **G** | **B** | — | — | — | — | — |
| Manage Department Positions (Add/Remove) | **G** | **B** | **B** | **B** | — | — | — |
| View Departments & Positions | **G** | **B** | **B** | **B** | **B** | **B** | **B** |
| **Ministry Roles & Hierarchy** | | | | | | | |
| Create Custom Ministry Role | **G** | — | — | — | — | — | — |
| Edit Ministry Role (Custom Only) | **G** | — | — | — | — | — | — |
| Modify System Role Hierarchy (`isSystemRole`) | — | — | — | — | — | — | — |
| Delete Ministry Role (Unassigned Only) | **G** | — | — | — | — | — | — |
| View Roles Directory | **G** | **G** | **G** | **G** | **G** | **G** | **G** |
| **Member Approvals & Lifecycle** | | | | | | | |
| View Approvals Queue | **G** | **B** | **B** | — | — | — | — |
| Approve Registration | **G** | **B** | **B** | — | — | — | — |
| Reject Registration | **G** | **B** | **B** | — | — | — | — |
| Request Application Changes | **G** | **B** | **B** | — | — | — | — |
| Self-Approve Account | — | — | — | — | — | — | — |
| View Member Dossier | **G** | **B** | **B** | — | — | — | — |
| Edit Member Profile & Contact Details | **G** | **B** | **B** | — | — | **S** | — |
| Suspend / Activate Member | **G** | **B** | — | — | — | — | — |
| Suspend Self | — | — | — | — | — | — | — |
| Reassign Department / Position | **G** | **B** | **B** | — | — | — | — |
| Transfer Member to Another Branch | **G** | — | — | — | — | — | — |
| Elevate User to Super Admin | **G** | — | — | — | — | — | — |
| Elevate User to Branch Pastor | **G** | — | — | — | — | — | — |
| **Worker Registry Operations** | | | | | | | |
| View Worker Registry & Codes | **G** | **B** | **B** | **B** | — | — | — |
| Edit Worker Assignment / Position / Status | **G** | **B** | **B** | — | — | — | — |
| View Personal Worker Details | **S** | **S** | **S** | **S** | **S** | — | — |
| **Attendance Operations** | | | | | | | |
| Clock-In via Biometric / PIN / QR | **S** | **S** | **S** | **S** | **S** | — | — |
| Clock-Out (Own Session) | **S** | **S** | **S** | **S** | **S** | — | — |
| Clock-Out (Other Worker Session) | **G** | **B** | **B** | — | — | — | — |
| Trigger Auto Clock-Out Cron | **G** (or Key) | — | — | — | — | — | — |
| Mark Service Absences | **G** | **B** | **B** | — | — | — | — |
| Excuse Worker Absence | **G** | **B** | **B** | — | — | — | — |
| View Live Attendance Monitor | **G** | **B** | **B** | **B** | — | — | — |
| View Attendance Grid Matrix & Export CSV | **G** | **B** | **B** | — | — | — | — |
| View Personal Attendance History | **S** | **S** | **S** | **S** | **S** | — | — |
| **Services & Schedules** | | | | | | | |
| Create Service Schedule | **G** | **B** | — | — | — | — | — |
| Edit Service Schedule Times & Rules | **G** | **B** | — | — | — | — | — |
| Archive / Delete Service Schedule | **G** | **B** | — | — | — | — | — |
| View Active Services | **G** | **G** | **G** | **G** | **G** | **G** | **G** |
| **Events & Programs** | | | | | | | |
| Create Event (Global Scope) | **G** | — | — | — | — | — | — |
| Create Event (Branch Scope) | **G** | **B** | **B** | — | — | — | — |
| Edit Event Details & Banner | **G** | **B** | **B** | — | — | — | — |
| Archive / Delete Event | **G** | **B** | **B** | — | — | — | — |
| View Event Registrations List | **G** | **B** | **B** | — | — | — | — |
| Register for Event | **S** | **S** | **S** | **S** | **S** | **S** | — |
| Cancel Event Registration | **S** | **S** | **S** | **S** | **S** | **S** | — |
| **Testimonies & Community Feed** | | | | | | | |
| Submit Personal Testimony (with photo) | **S** | **S** | **S** | **S** | **S** | **S** | — |
| Review / Approve Testimonies | **G** | **B** | **B** | — | — | — | — |
| Delete Testimony (Member Withdrawal) | **G** | **B** | **B** | — | — | **S** | — |
| Create Feed Post (with flyer/media) | **G** | **B** | **B** | **B** | **S** | **S** | — |
| Edit Own Post | **S** | **S** | **S** | **S** | **S** | **S** | — |
| Moderate / Delete Any Feed Post | **G** | **B** | **B** | — | — | — | — |
| React & Comment on Feed Post | **S** | **S** | **S** | **S** | **S** | **S** | — |
| **Service Highlights** | | | | | | | |
| Publish Service Highlight (with photo) | **G** | **B** | **B** | — | — | — | — |
| Edit Service Highlight | **G** | **B** | **B** | — | — | — | — |
| Delete Service Highlight | **G** | **B** | **B** | — | — | — | — |
| View Service Highlights | **G** | **G** | **G** | **G** | **G** | **G** | **G** |
| **Media Management (Supabase Storage)** | | | | | | | |
| Upload Profile Photo | **S** | **S** | **S** | **S** | **S** | **S** | — |
| Upload Event Banner / Feed / Highlight | **G** | **B** | **B** | — | — | — | — |
| Upload Testimony Evidence | **S** | **S** | **S** | **S** | **S** | **S** | — |
| List Media Storage Catalog | **G** | **B** | **B** | — | — | — | — |
| Safe Delete Media | **G** | **B** | **B** | — | — | **S** | — |
| **Notifications & System Audit** | | | | | | | |
| Broadcast Church Notification | **G** | **B** | **B** | — | — | — | — |
| Delete Notification Broadcast | **G** | **B** | — | — | — | — | — |
| View Personal Notifications | **S** | **S** | **S** | **S** | **S** | **S** | — |
| View System Audit Trail | **G** | **B** | — | — | — | — | — |
| Manage System General Settings | **G** | — | — | — | — | — | — |

---

## 3. Privilege Escalation Defense Rules

1. **Self-Approval Prohibition:** Under no circumstances may an administrator approve their own registration. Attempting `approveMember(userId, adminId)` where `userId === adminId` immediately throws a `400 Bad Request`.
2. **Registration Role Neutralization:** The public registration endpoint rejects client-requested privileged roles (`SUPER_ADMIN`, `BRANCH_PASTOR`, or any role with `hierarchyLevel <= 2`). Any attempt to self-assign these roles is neutralized server-side to `WORKER` (if `isWorker: true`) or `MEMBER`.
3. **Branch Isolation Ceiling:** Branch administrators (`adminLevel === 'branch_admin'`) are barred from assigning any role with `hierarchyLevel <= 2` or transferring members out of their assigned branch.
4. **BOLA Prevention on Clock-Out:** Non-admin callers can only clock out their own session (`record.worker.member.userId === caller.userId`). Cross-worker clock-out attempts by non-administrators return `403 Forbidden`.
5. **Cron Endpoint Protection:** Direct HTTP invocation of `/api/attendance/auto-clock-out` requires either a valid pre-shared secret in `x-cron-secret` or an authenticated administrator JWT.
6. **System Role Immutability:** Pre-seeded ministry roles (`SUPER_ADMIN`, `BRANCH_PASTOR`, `WORKER`, `MEMBER`, etc.) are protected with `isSystemRole: true`. Deletion is strictly prohibited (`403 Forbidden`), and hierarchy levels cannot be altered.
7. **Relational Integrity Archival Pattern:** Entities with dependent child records (such as branches with active members, departments with assigned workers, or services with historical attendance) cannot be physically wiped from the database. Deletion requests automatically transition these records to `archived` status with an immutable audit log entry.
8. **Media Access Isolation:** Media files are partitioned in Supabase Storage by canonical bucket/folder paths (`events/{branchId}/{eventId}/`, `testimonies/{memberId}/`, `profiles/{userId}/`, `church-assets/`). Users can only delete their own uploaded testimony or profile media, while administrators can moderate branch-scoped media assets.
