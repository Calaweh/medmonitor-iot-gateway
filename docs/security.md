# Security & Compliance Architecture

This document details the security posture of the MedMonitor application, focusing on requirements for **IEC 62304 Class B** and general healthcare data compliance (e.g., HIPAA).

## 1. Data At-Rest Encryption (TDE)

**Status:** Enabled (via Cloud Provider)

MedMonitor relies on Supabase as its managed PostgreSQL database provider. Supabase runs on AWS infrastructure, which provides **Transparent Data Encryption (TDE)** at rest by default using AES-256 encryption.

- **Storage Level:** All RDS instances backing Supabase are encrypted at the EBS volume level.
- **Backups:** Automated snapshots and Point-In-Time Recovery (PITR) logs are encrypted at rest.
- **Action Required:** No further application-level implementation is required.

## 2. Hash-Chained Audit Log Integrity

**Status:** Implemented

To ensure non-repudiation and detect tampering by privileged accounts (e.g., direct database modifications), the `audit_log` table employs cryptographic hash chaining.

- **Mechanism:** Each audit log entry calculates an HMAC-SHA256 hash using:
  `Hash(UserId | Action | EntityType | EntityId | Detail | OccurredAt | PreviousHash)`
- **Secret:** The hash uses a server-side secret (`AUDIT_HMAC_SECRET`) that is never exposed to the database.
- **Verification:** An administrative endpoint (`GET /api/audit/verify`) traverses the chain to verify that no records have been altered, deleted, or inserted out of sequence.

## 3. Two-Factor Authentication (2FA) / TOTP

**Status:** Planned 

To secure clinician access, Time-Based One-Time Passwords (TOTP) will be introduced via the `Authenticator` app protocol.

### Implementation Blueprint:
1. Add `totp_secret` (encrypted) and `is_totp_enabled` to the `users` table.
2. Provide `/api/auth/setup-totp` to generate the seed and a QR Code compliant `otpauth://` URI.
3. Update login payload: if `is_totp_enabled` = true, return an intermediate JWT requiring 2FA code validation before providing the fully fledged clinical JWT.

## 4. Ward-Scoped Query Isolation
Implemented via Entity Framework Core Global Query Filters (`WardContext`), mathematically isolating queries at the ORM boundary so that clinicians can only see devices assigned to their exact geographical ward.

### Pitfalls & Verification
1.  **Middleware Ordering:** The isolation middleware is positioned *after* `UseAuthentication()` and `UseAuthorization()`. This ensures `context.User` is populated before ward assignments are loaded.
2.  **AsyncLocal Lifecycle:** `WardContext.AllowedLocations` is wrapped in a `try...finally` block within the middleware to ensure the context is cleared at the end of every HTTP request, preventing cross-request data leakage.
3.  **Administrative Bypass:** Admin users have `AllowedLocations` set to `null`, effectively bypassing the global filter to allow total system oversight.
4.  **Comprehensive Filtering:** Isolation filters are applied not only to the `Device` entity but also to `Alert`, `SensorReading`, and `BedAssignment` via navigation properties, ensuring that guessing a `DeviceCode` does not grant access to sensitive historical data.

## 5. Implementation Status Summary

| Requirement | Status | Verification Method |
| :--- | :--- | :--- |
| Data At-Rest Encryption | ✅ Enabled | Provider documentation (AWS/Supabase) |
| Audit Log Integrity | ✅ Implemented | HMAC-SHA256 Chaining + `/api/audit/verify` |
| Ward Isolation | ✅ Implemented | EF Core Global Query Filters + Middleware |
| 2FA / TOTP | 📅 Planned | Implementation Blueprint defined |
