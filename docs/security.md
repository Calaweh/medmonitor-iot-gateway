# Security & Regulatory Compliance Architecture

This document details the security posture of the MedMonitor application, mapping specifically to **IEC 62304 Class B**, the **Malaysian PDPA**, and the **Singapore HSA Cybersecurity Labeling Scheme (CLS-MD)**.

## 1. Fine-Grained Access Control (Dynamic RBAC)

**Status:** In Progress (Phase 4)
**Regulatory Map:** HSA CLS-MD (Access Control), IEC 62304 (Segregation of Critical Items)

MedMonitor employs a dynamic, database-driven permission model that separates "Capability" from "Data Scope."

*   **Atomic Permissions:** Actions are granular (e.g., `patients:threshold:write`). This allows hospital admins to create custom clinical roles without modifying application code.
*   **JWT Permission Claims:** At login, the backend resolves the user's effective permissions (calculated from Group and Role memberships) and embeds them as a claim in the JWT.
*   **Middleware Enforcement:** Every API request is intercepted by a `.NET PermissionMiddleware`. If the JWT lacks the specific atomic permission required for the endpoint, an HTTP 403 Forbidden is returned.
*   **System Role Protection:** Critical clinical roles are flagged as `is_system_role`. This prevents administrative users from accidentally removing essential life-safety capabilities (like alert resolution) from clinical staff.

## 2. Hash-Chained Audit Log Integrity

**Status:** Implemented (Session Pooling Mode)
**Regulatory Map:** HSA CLS-MD Level 2 (Data Isolation), HIPAA

While permissions allow a user to *perform* an action, Row-Level Security (RLS) dictates *where* they can perform it.
*   **The Scope Check:** Even if a nurse has the `alerts:resolve` permission, the database RLS policy (on Port 5432) ensures they can only query and update alerts where the `device.department_id` matches the user's assigned department.

## 3. Automated Data Retention & De-identification

**Status:** Implemented (Refactoring for concurrency in Sprint 4.1)
**Regulatory Map:** HSA CLS-MD (Tampering Detection), IEC 62304 (Traceability)

To ensure non-repudiation and detect tampering by privileged accounts, the `audit_log` table employs cryptographic hash chaining (HMAC-SHA256).
*   **Non-Repudiation:** Every action is linked to a `user_id` and a verified `permission` claim, ensuring clinical accountability.
*   **Chain Verification:** Administrative users can trigger a chain verification to prove the log's integrity from the first entry.

## 4. Device Authentication (Edge Security)

**Status:** Implemented (API Key Hashing)
**Regulatory Map:** HSA CLS-MD (Authentication)

Medical devices pushing telemetry must be authenticated. 
* Devices submit an `X-Device-Api-Key` HTTP header. 
* The backend does *not* store this key in plaintext. It is verified against a `BCrypt` hash (`api_key_hash`) stored in the `devices` table, ensuring that a compromised database snapshot cannot be used to spoof device telemetry.
* *Roadmap:* Future enterprise versions will transition to Mutual TLS (mTLS) utilizing X.509 client certificates at the Nginx reverse-proxy layer.

## 5. Data At-Rest Encryption

**Status:** Enabled via Infrastructure
MedMonitor relies on managed PostgreSQL (Supabase/AWS). All underlying RDS instances and automated Point-In-Time Recovery (PITR) backups are encrypted at rest using AES-256 at the EBS volume level. No application-layer cryptography is required for data at rest.