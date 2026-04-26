# Software Requirements Specification (SRS)
**Document ID:** MED-SRS-001 | **Classification:** IEC 62304 Class B

## 1. Intended Use
MedMonitor is a software application intended to acquire, store, and display physiological vital signs (HR, SpO2, Temperature) from connected sensors. It provides visual and auditory notifications when physiological parameters exceed clinician-defined thresholds to aid nursing staff in step-down or MIC@Home environments. It is not intended for active patient monitoring in life-threatening situations where immediate clinical action is required.

## 2. Functional Requirements
| ID | Requirement | Verification Method |
| :--- | :--- | :--- |
| **SRS-001** | The system shall generate a CRITICAL alert within 5 seconds of detecting HR > 120 bpm or HR < 40 bpm. | Automated Test / Trace |
| **SRS-002** | The system shall generate a CRITICAL alert within 5 seconds of detecting SpO2 < 90%. | Automated Test |
| **SRS-003** | The system shall calculate a MEWS composite score; if MEWS ≥ 4, a CRITICAL alert shall be generated. | Automated Test |
| **SRS-004** | Alert resolution shall record the resolving user ID, timestamp, and require an active session. | API Test (JWT validation) |
| **SRS-005** | The system shall enforce a 5-minute alarm suppression window per alert type per patient to mitigate alarm fatigue. | Integration Test |
| **SRS-006** | Edge nodes (simulators/devices) shall buffer data locally during network dropouts and sync upon restoration. | Edge Integration Test |

## 3. Security & Privacy Requirements
| ID | Requirement | Verification Method |
| :--- | :--- | :--- |
| **SRS-007** | A clinician resolving an alert must belong to the same department (ward) as the device that raised it. | RLS DB Test |
| **SRS-008** | The audit log shall include a cryptographic hash (HMAC-SHA256) of the previous entry to detect tampering. | Hash Validation Test |
| **SRS-009** | The system shall automatically purge sensor readings older than 30 days to comply with PDPA Principle 7. | Background Job Log |
| **SRS-010** | Patient data export shall require an explicit `consent=true` flag on the patient record. | API Test (403 Forbidden) |