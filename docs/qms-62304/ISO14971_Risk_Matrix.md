# ISO 14971 Risk Management Matrix
**Document ID:** MED-RSK-001

| Hazard ID | Potential Hazard | Severity | Probability | Risk Level (Pre) | Mitigation Strategy | Risk Level (Post) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **H-001** | **Alarm Fatigue:** Clinicians ignore valid alerts due to a high volume of transient/nuisance alarms. | High (3) | High (4) | **Unacceptable (12)** | Implementation of 5-minute rolling suppression window per IEC 60601-1-8 (Cvach, 2012). MEWS composite scoring. | **Acceptable (3)** |
| **H-002** | **Cross-Tenant Data Leakage:** A nurse in Ward A accidentally accesses patient data in Ward B. | High (3) | Med (3) | **Unacceptable (9)** | PostgreSQL Row-Level Security (RLS) tied to `DepartmentId` injected directly into the DB session pool. | **Acceptable (1)** |
| **H-003** | **Network Disconnection:** Wi-Fi dropouts in MIC@Home scenarios cause permanent loss of vital signs data. | Med (2) | High (4) | **Unacceptable (8)** | Edge Buffering: Devices queue payloads in local memory and fast-flush to the `api/readings/ingest` endpoint upon reconnection. | **Acceptable (2)** |
| **H-004** | **Audit Trail Tampering:** A rogue actor modifies clinical logs to hide negligence. | High (3) | Low (2) | **Review (6)** | Append-only `audit_log` table with HMAC-SHA256 hash chaining. Validated via `AuditController.VerifyChainAsync`. | **Acceptable (1)** |