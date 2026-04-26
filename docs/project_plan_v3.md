# MedMonitor: ASEAN SaMD Sandbox & MIC@Home Gateway
**Project Plan — Version 3.1**
*Single Source of Truth — April 26, 2026*

---

## 1. Strategic Context (The "Why")

MedMonitor is a pre-compliant, open-source Medical IoT telemetry gateway designed for the ASEAN region.

| Use Case | Market | Description |
| :--- | :--- | :--- |
| **Primary** | Singapore | MIC@Home (Mobile Inpatient Care @ Home) — decanting acute patients to virtual home wards |
| **Secondary** | Malaysia | ED "Yellow Zone" Deterioration Warning — public hospital (KKM) step-down monitoring |
| **Regulatory Goal** | ASEAN | MDA/HSA Class B SaMD certification via Investigational Testing Exemption |

---

## 2. Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + Recharts | Fast HMR, rich charting ecosystem, component-based architecture |
| **Backend** | .NET 8 (C#) Web API | High-performance async processing + SignalR; robust EF Core ORM |
| **Database** | PostgreSQL via Supabase | Managed Postgres; full JSONB/GIN support; port 5432 Session Pooling for RLS |
| **Real-time** | SignalR (WebSocket) | Native to .NET; production-grade for device data streams |
| **DevOps** | Docker + docker-compose + Nginx | Multi-stage builds; reverse proxy for SPA + API |
| **Deployment** | Render / Railway / AWS MY Region | PaaS targets; AWS MY Region for data sovereignty in production |
| **Simulation** | Python + Kaggle ICU CSV | Row-by-row replay of real vitals (HR, SpO2, BP, Temp) |
| **Environment** | DotNetEnv + Python venv | Centralised `.env` management; isolated dependencies |
| **DB Ops** | Supabase CLI + Migrations | Version-controlled schema — the DevOps way |
| **Monitoring** | VictoriaMetrics + Loki + Grafana | Time-series & log observability; 15-day retention; essential for PMS |

---

## 3. Key Features

- **TCP/IP Socket simulation** — Python or C# script mimics a physical device sending byte-streams to validate hardware-software integration. *Cloud caveat: Free-tier PaaS exposes only ports 80/443. Use WebSocket simulation in the cloud; keep raw TCP for local/demo.*
- **Real-time dashboard** — SignalR charts update on every ingested reading. Append-only (no full re-render) for efficient data visualization.
- **REST API** — CRUD + date-range filtering + device-scoped queries on sensor readings and alerts.
- **PostgreSQL JSONB** — Flexible sensor payload; GIN index for sub-millisecond key queries at scale.
- **JWT Authentication** — Role-based access (nurse / doctor / admin) enforced at every endpoint.
- **Patient management** — Admit, assign, and discharge patients; per-patient alert thresholds.
- **Dynamic Permission Engine (NEW):** Transition from hardcoded roles to a 4-layer database-driven model (Permissions → Roles → Groups → Users).
- **Shift Handover PDF:** Auto-generated per-shift summary report (QuestPDF).
- **MEWS Composite Scoring:** Modified Early Warning Score algorithm (Phase 4).
- **Audit Trail:** Immutable append-only log with HMAC-SHA256 chain and actor identity.

---

## 4. Technical Implementation Architecture

### 4.1 Fine-Grained Access Control (Dynamic RBAC)
- **The Model:** Atomic permissions (e.g., `alerts:resolve`) are bundled into Roles. Roles are assigned to Groups (scoped to Departments).
- **Runtime Enforcement:** A custom `.NET Middleware` reads permissions directly from the JWT claims. Access decisions are made at the API boundary before hitting the Service layer.
- **Safety Guard:** `is_system_role` flag prevents accidental deletion of core clinical capabilities (e.g., a "Nurse" role cannot be stripped of "alert:resolve").

### 4.2 Data Isolation Policy (RLS)
- **Permission vs. Scope:** Having the `alerts:resolve` permission allows the capability, but Row-Level Security (RLS) restricts the *data scope* to the user's assigned `department_id`.
- **Current Architecture:** Session Pooling (Port 5432). Claims injected via .NET Middleware using `set_config('app.current_user_id', ..., false)`.
- **Security Logic:** Manual connection management ensures session variables are cleared before returning to the pool, preventing cross-tenant data leakage (connection pool poisoning).
- **Scale Path:** Migration to Transaction Pooling (Port 6543) via EF Core `DbCommandInterceptor` is scheduled for Phase 5 (Enterprise Scale-out). This is a scale optimisation, not a security requirement for Class B sandbox entry.

### 4.3 Supabase Connection Strategy

Supabase is used strictly as a cloud-hosted PostgreSQL instance. The SDK, Auth, and WebSocket layers are deliberately avoided.

1. Connect the .NET 8 backend via `Npgsql.EntityFrameworkCore.PostgreSQL` on **Port 5432** (Session Pooling).
2. All REST APIs are hand-written in C#. All WebSockets use SignalR.
3. All schema changes go through timestamped migration files (Supabase CLI).
4. RLS session variables are set at the application layer, not via Supabase Auth.

*Rationale: Full control over schema, EF Core query optimisation, and SignalR hub logic.*

### 4.3 Clinical Safety Logic

- **Alarm Fatigue:** 5-minute rolling suppression window per IEC 60601-1-8. Clinically validated by Cvach (2012, *Heart & Lung*) — suppression windows increase alarm Positive Predictive Value (PPV) without compromising patient safety in step-down environments.
- **Early Warning:** Modified Early Warning Score (MEWS) composite algorithm to be implemented in `ReadingService.cs` (Phase 4, Sprint 4.2).
- **Safety Standard Alignment:** Joint Commission NPSG.06.01.01 (Improve the safety of clinical alarm systems).

### 4.4 Observability & Retention

| Component | Purpose | Retention |
| :--- | :--- | :--- |
| **VictoriaMetrics** | High-performance time-series metrics from backend + system | 15 days (`--retentionPeriod` flag) |
| **Loki** | Log aggregation from .NET backend and Python simulator | 15 days (Loki compactor) |
| **Grafana** | Unified dashboard for ingestion rate and clinical logs | Permanent (Docker volume) |

*Note: The 15-day observability retention is for system metrics (PMS evidence). Clinical `sensor_readings` are subject to the 30-day PDPA purge policy (see Section 7).*

---

## 5. Data Strategy

- **Source:** Kaggle ICU Vital Signs CSV (383,540 rows × 25 columns). Columns include: `heart_rate`, `spo2`, `respiratory_rate`, `systolic_bp`, `diastolic_bp`, `temperature`, `patient_id`, `diagnosis`, `age`, `gender`.
- **Replay:** `device_simulator.py` reads rows chronologically at configurable speed (`REPLAY_SPEED_SEC`), staggering three concurrent ICU beds with row offsets so each bed streams unique data.
- **Volume:** 383K rows at 3 s/row ≈ 13 days of continuous streaming — within Supabase 500 MB free tier.
- **Patient seeding:** `patients_meta.csv` (500 rows) seeds the `patients` table on first run, linking `patient_id` to `bed_assignments`.
- **Edge Buffering (Phase 4):** Python simulator will be updated to simulate Wi-Fi dropouts and bulk-upload — critical for MIC@Home remote use cases.

---

## 6. Database Schema

### `permissions`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | UUID PK | |
| resource | VARCHAR(50)| e.g., 'alerts', 'patients' |
| action | VARCHAR(50)| e.g., 'resolve', 'view', 'admit' |

### `roles` & `role_permissions`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | UUID PK | |
| name | VARCHAR(100)| e.g., 'Senior Staff Nurse' |
| is_system_role | BOOLEAN | If TRUE, cannot be deleted/modified |

### `groups` & `user_groups`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | UUID PK | |
| name | VARCHAR(100)| e.g., 'ICU Night Shift Team A' |
| department_id | UUID FK | Links to ward isolation |

### `patients`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | UUID PK | `gen_random_uuid()` |
| mrn | VARCHAR(20) | Medical Record Number — UNIQUE, NOT NULL |
| full_name | VARCHAR(100) | NOT NULL |
| date_of_birth | DATE | NOT NULL |
| gender | VARCHAR(20) | |
| blood_type | VARCHAR(5) | |
| allergies | TEXT[] | Array of allergy strings |
| consent | BOOLEAN | PDPA consent flag, default FALSE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `bed_assignments`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | BIGSERIAL PK | |
| patient_id | UUID FK | REFERENCES patients(id) |
| device_id | UUID FK | REFERENCES devices(id) |
| admitted_at | TIMESTAMPTZ | DEFAULT NOW() |
| discharged_at | TIMESTAMPTZ | NULL = currently admitted |
| attending_physician | VARCHAR(100) | |
| diagnosis | TEXT | ICD-10 preferred |
| admission_type | VARCHAR(50) | emergency \| elective \| transfer |

### `patient_thresholds`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | BIGSERIAL PK | |
| patient_id | UUID FK | REFERENCES patients(id) |
| vital_sign | VARCHAR(50) | heart_rate, spo2, temperature, etc. |
| min_value | DECIMAL | NULL = use global default |
| max_value | DECIMAL | NULL = use global default |
| set_by | VARCHAR(100) | Clinician name |
| set_at | TIMESTAMPTZ | DEFAULT NOW() |

### `users`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | UUID PK | `gen_random_uuid()` |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | bcrypt / Argon2 |
| role | VARCHAR(20) | nurse \| doctor \| admin |
| full_name | VARCHAR(100) | |
| department_id | UUID FK | Ward isolation enforcement |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `audit_log`
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | BIGSERIAL PK | Append-only — no UPDATE or DELETE |
| user_id | UUID FK | REFERENCES users(id) ON DELETE SET NULL |
| action | VARCHAR(100) | e.g. RESOLVE_ALERT, ADMIT_PATIENT |
| entity_type | VARCHAR(50) | e.g. alerts, patients |
| entity_id | BIGINT | |
| detail | JSONB | Before/after snapshot or context |
| ip_address | INET | |
| prev_hash | VARCHAR(64) | HMAC-SHA256 of previous row — tamper detection |
| occurred_at | TIMESTAMPTZ | DEFAULT NOW() |

---

## 7. Regulatory & Compliance Framework

### 7.1 IEC 62304 Software Safety Classification

| Class | Definition | This System |
| :--- | :--- | :--- |
| Class A | No injury possible from software failure | — |
| **Class B** | **Possible injury, not death (monitoring aid)** | **MedMonitor** — monitoring aid, not life support |
| Class C | Death or serious injury possible | Pacemaker firmware, infusion pump — not applicable |

**Classification justification:** The system displays and alerts on vital signs but does not control any actuator, infusion, or life-support device. Failure to alert does not directly cause injury — nurse maintains primary observation duty.

**Intended Use Statement (HSA/MDA submission):** *"MedMonitor is a software application intended to acquire, store, and display physiological vital signs (HR, SpO2, Temperature) from connected sensors. It provides visual and auditory notifications when physiological parameters exceed clinician-defined thresholds to aid nursing staff in step-down or MIC@Home environments. It is not intended for active patient monitoring in life-threatening situations where immediate clinical action is required."*

### 7.2 Software Requirements Specification (SRS)

| ID | Requirement | Verification |
| :--- | :--- | :--- |
| **SRS-001** | The system shall generate a CRITICAL alert within 5 seconds of detecting HR > 120 bpm or HR < 40 bpm. | Test: inject reading, verify alert row created within 5 s |
| **SRS-002** | The system shall generate a CRITICAL alert within 5 seconds of detecting SpO2 < 90%. | Test: inject reading, verify alert row created within 5 s |
| **SRS-003** | Alert resolution shall record the resolving user ID and timestamp. | Test: resolve via API with valid JWT, verify `audit_log` entry |
| **SRS-004** | All state-changing endpoints shall require a valid JWT with appropriate role claim. | Test: call without JWT, expect HTTP 401 |
| **SRS-005** | The system shall purge sensor readings older than 30 days automatically once per day. | Verify `sensor_readings` table contains no rows older than 30 days |
| **SRS-006** | Patient data export shall require explicit `consent=true` flag on the patient record. | Test: export with `consent=false`, expect HTTP 403 |
| **SRS-007** | A clinician resolving an alert must belong to the same department (ward) as the device that raised it. | Test: attempt resolve with different department, expect HTTP 403 |
| **SRS-008** | The audit log shall include a hash of the previous entry to detect tampering. | Test: modify a log entry → verification endpoint returns failure |
| **SRS-009** | The system shall enforce a 5-minute alarm suppression window per alert type per patient. | Test: trigger same alert type twice within 5 min, verify second alert suppressed |

### 7.3 RBAC Matrix

| Action | Nurse | Doctor | Admin |
| :--- | :--- | :--- | :--- |
| View vitals / alerts | ✅ | ✅ | ✅ |
| Acknowledge / resolve alert (own ward) | ✅ | ✅ | ❌ |
| Set patient thresholds | ❌ | ✅ | ❌ |
| Admit / discharge patient | ❌ | ✅ | ❌ |
| Download shift report | ✅ | ✅ | ❌ |
| Manage users | ❌ | ❌ | ✅ |
| View audit log | ❌ | ✅ | ✅ |

### 7.4 QMS Documentation Plan (`docs/qms-62304/`)

| Document | Purpose | Status |
| :--- | :--- | :--- |
| `SDP.md` | Software Development Plan — GitHub Actions, CI/CD pipeline | Phase 4 |
| `SRS.md` | Software Requirements Spec — testable statements (see §7.2) | Phase 4 |
| `SAD.md` | Software Architecture Document — safety segregation (backend vs UI) | Phase 4 |
| `SOUP.md` | Software of Unknown Provenance — .NET 8, React, Hangfire, PostgreSQL risk tracking | Phase 4 |
| `ISO14971_Risk_Matrix.md` | Hazard analysis with code-level mitigations | Phase 4 |
| `CER.md` | Clinical Evaluation Report — alarm fatigue PPV justification with citations | Phase 4 |

---

## 8. Gap Analysis vs. Production Standard (IEC 62304 Class B)

**Status:** ✔ Done | ~ Partial | ✘ Missing  
**Priority:** P0 = show-stopper | P1 = clinical completeness | P2 = professional polish | P3 = future work

### 8.1 Data Acquisition

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| CSV replay simulator | ✔ Done | — | `device_simulator.py` with row offsets |
| HL7 / FHIR protocol parsing | ✘ Missing | P3 | Document as future work; add HL7v2 ADT stub |
| Device certificate & pairing | ✘ Missing | P3 | Add `devices.certificate_thumbprint` column + pairing endpoint |
| Sensor calibration log | ✘ Missing | P2 | New table: `calibration_records` (device_id, offset, calibrated_at, technician) |

### 8.2 Clinical Logic & Alerting

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| HR global threshold | ✔ Done | — | `ReadingService` persists alert + broadcasts via SignalR |
| SpO2 alerting (persisted) | ✔ Done | — | Creates DB alert when SpO2 < 90 |
| Trend / rate-of-change alerting | ✔ Done | — | Alerts if HR delta >= 20 bpm between readings |
| Per-patient threshold overrides | ✔ Done | — | Queries `patient_thresholds` table with global fallback |
| Alarm fatigue suppression | ✔ Done | — | 5-minute rolling window per alert type |
| Alert resolution with actor + reason | ✔ Done | — | Immutable `audit_log` entry with `user_id` from JWT |
| Alert resolution ward check | ✔ Done | — | HTTP 403 if clinician department ≠ device department |
| Alert escalation (nurse → doctor) | ✘ Missing | P2 | If alert unacknowledged for N minutes, escalate severity |
| MEWS composite scoring | ✘ Missing | P1 | Sprint 4.2 — `ReadingService.cs` |

### 8.3 Patient & Ward Management

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| Patient profiles (MRN, DOB) | ✔ Done | — | `patients` table seeded with synthetic data |
| Bed assignment flow | ✔ Done | — | `bed_assignments`; `DevicesController` returns current patient |
| Ward / site grouping | ✔ Done | — | Devices grouped by `devices.location` in React sidebar |
| Per-patient medication schedule | ✘ Missing | P3 | Table: `medication_schedules` — future work |
| Clinical notes (SOAP format) | ✘ Missing | P3 | Table: `clinical_notes` — future work |

### 8.4 Authentication & Access Control

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| JWT infrastructure | ✔ Done | — | `[Authorize]` applied to all clinical controllers |
| RBAC (nurse / doctor / admin) | ~ Partial | P1 | Role claim in JWT; granular `[Authorize(Roles=...)]` checks needed |
| Login / logout UI | ✔ Done | — | React login page with session persistence and auto token refresh |
| Audit trail | ✔ Done | — | Immutable `audit_log` table with HMAC chain |
| 2FA / Hospital AD SSO | ✘ Missing | P3 | Out of scope — document as future integration point |

### 8.5 Reporting & Data Export

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| Grafana operations dashboard | ✔ Done | — | Provisioned: Loki log panel + VictoriaMetrics ingestion rate |
| Clinical shift handover (PDF) | ✔ Done | — | QuestPDF: 8-hour window summary per bed |
| Vitals trend chart in PDF | ✘ Missing | P2 | Render Recharts to image server-side or SVG in QuestPDF |
| Data export CSV / FHIR R4 | ✘ Missing | P3 | 3–6 weeks effort — document as future work |

### 8.6 Regulatory & Compliance

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| TLS in transit (HTTPS) | ~ Partial | P1 | Nginx handles TLS termination; enforce HTTPS redirect |
| Data at-rest encryption | ~ Partial | P1 | Supabase TDE enabled; document and verify in SRS |
| PDPA consent model | ✔ Done | — | `consent` flag on `patients` table; export blocked without `consent=true` |
| IEC 62304 SRS / QMS docs | ✘ Missing | P1 | Sprint 4.4 — populate `docs/qms-62304/` |
| Data retention purge (30 days) | ✔ Done | — | Hangfire job; aligns with PDPA Principle 7 |

### 8.7 Operations & Resilience

| Feature | Status | Priority | Notes |
| :--- | :--- | :--- | :--- |
| EF Core retry-on-failure | ✔ Done | — | 3 retries, 5 s delay |
| Supabase keep-alive | ✔ Done | — | GitHub Actions pings `/api/devices` every 3 days |
| Health check endpoint | ✔ Done | — | `/health` (liveness) and `/health/db` (EF Core readiness) |
| Swagger with bearer auth | ✔ Done | — | `AddSecurityDefinition('Bearer')` enabled |
| Offline / edge buffer | ✘ Missing | P2 | Sprint 4.3 — Python sim: queue + retry with backoff |
| Backup / disaster recovery | ✘ Missing | P3 | Supabase PITR; document RPO/RTO in SRS |

---

## 9. Integrated Execution Roadmap

### ✅ Phase 1 & 2: Infrastructure & Clinical Core (S0–S2)
- [x] Multi-stage Docker setup, VictoriaMetrics + Loki + Grafana
- [x] JWT Auth, Patient ADT (Admit/Discharge/Transfer), Multi-vital thresholds
- [x] QuestPDF shift handover report generation
- [x] Health checks (liveness + readiness), Swagger bearer auth

### ✅ Phase 3: Production Security Hardening (S3)
- [x] **RLS Session Isolation:** Manual connection lifecycle on Port 5432 via `set_config()`
- [x] **Data Retention:** Hangfire job for 30-day auto-purge (PDPA Principle 7)
- [x] **Audit Chain:** HMAC-SHA256 cryptography for immutable clinical action logging
- [x] **Ward Isolation:** Alert resolution restricted to clinician's own department

### 🚀 Phase 4: Clinical Sandbox & Investigational Testing (S4–S5)
- [x] **Sprint 4.1 (Engineering):** Refactor `AuditService.cs` — wrap locks in `BeginTransactionAsync()`.
- [x] **Sprint 4.2 (Engineering):** Implement **Dynamic RBAC Schema** and `[RequirePermission]` middleware.
- [x] **Sprint 4.3 (Engineering):** Implement **MEWS scoring algorithm** in `ReadingService.cs`.
- [x] **Sprint 4.4 (Engineering):** Edge buffering in Python simulator for MIC@Home Wi-Fi dropouts.
- [x] **Sprint 4.5 (Regulatory):** Populate `docs/qms-62304/` templates.
- [x] **Sprint 4.6 (Clinical):** Finalize CER with citations (IEC 60601-1-8, Cvach 2012).

### 🟢 Phase 5: Enterprise Scale & Polish (S6)
- [ ] **Sprint 5.1 (Engineering):** Migrate to Transaction Pooler (Port 6543) via EF Core `DbCommandInterceptor`
- [ ] **Sprint 5.2 (Engineering):** mTLS IoT Security — replace static `X-Device-Api-Key` with X.509 client certificates
- [ ] **Sprint 5.3 (DevOps):** Final production deployment (Render / Railway / AWS MY Region); README screenshots + GIF

---

## 10. Project Folder Structure

```
medical-device-monitoring/
├── frontend/                  # React 19 + Vite
│   ├── src/
│   └── Dockerfile
├── backend/                   # .NET 8 Web API (C#)
│   ├── Controllers/
│   ├── Hubs/                  # SignalR hub
│   ├── Services/              # Core business logic (ReadingService, AuditService)
│   ├── Models/
│   └── Dockerfile
├── database/                  # Simulation & Data
│   ├── device_simulator.py    # Python script to replay Kaggle CSV
│   ├── requirements.txt
│   └── venv/
├── supabase/                  # Cloud Infrastructure
│   └── migrations/            # Timestamped .sql files (DevOps way)
├── docker/                    # Infrastructure configurations
│   ├── nginx.conf
│   ├── loki-config.yml
│   └── grafana/               # Dashboards & datasource provisioning
├── docs/
│   └── qms-62304/             # IEC 62304 / ISO 13485 QMS templates
│       ├── SDP.md
│       ├── SRS.md
│       ├── SAD.md
│       ├── SOUP.md
│       ├── ISO14971_Risk_Matrix.md
│       └── CER.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 11. Risk Register

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Connection pool poisoning | High | Session variable clearing in `Program.cs` middleware + Port 5432 |
| Audit chain forking | Medium | Sprint 4.1 — `BeginTransactionAsync()` wrapping in `AuditService.cs` (in progress) |
| Alarm fatigue | High | 5-min suppression window (current); MEWS composite scoring (Sprint 4.2, planned) |
| PDPA non-compliance | Medium | Automated 30-day purge + consent-based export blocking |
| TCP ports blocked on PaaS | Medium | WebSocket fallback in cloud; raw TCP for local testing — documented in README |
| JSONB query slowness | Low | GIN index on payload column; Nth-point decimation in `ReadingService` |
| Supabase auto-pause | Medium | GitHub Actions keepalive every 3 days; manual restore before demonstrations |
| Sensor readings table > 500 MB | High | 30-day Hangfire purge job; daily size monitoring alert |
| FHIR integration not delivered | Medium | De-prioritised to P3; documented as future work (3–6 weeks effort) |
| HSA sandbox requires SG partner | High | Pursue MDA investigational testing first; approach Synapxe/SingHealth with pilot data |
| SRS-005 retention conflict | Resolved | 30-day clinical data purge (PDPA); 15-day system metrics (PMS) — both documented |
| Stale Permissions | Medium | Implement `token_version` on `users` table; increment on role/group change to invalidate JWTs. |
| Permission Over-privilege | High | Atomic permission catalogue ensures users only have access to specific resources (e.g., `audit:view` for Doctors but not Nurses). |

---

## 12. Deployment

| Tier | Service | Notes |
| :--- | :--- | :--- |
| **Database** | Supabase Free | 500 MB storage. Pauses after 7 days inactivity — keepalive workflow active. Enable PITR for backup. |
| **Backend** | Render / Railway / AWS MY | .NET Docker container. Set `SUPABASE_CONN_STRING`, `JWT_SECRET`, `LOKI_URL` as env vars. |
| **Frontend** | Vercel / Netlify | Set `VITE_BACKEND_URL` to live backend URL. |
| **Monitoring** | Docker Compose | VictoriaMetrics + Loki + Grafana run locally or on a small VPS alongside the app. |

*AWS MY Region is the target for production deployment to satisfy Malaysian data residency expectations under PDPA.*

---

## 13. Dependency Rationale

### Backend (.NET 8)
- **DotNetEnv** — loads `.env` at startup; prevents secrets from reaching Git
- **Npgsql.EntityFrameworkCore.PostgreSQL** — supports JSONB type mapping via `HasColumnType("jsonb")`
- **Swashbuckle** — OpenAPI/Swagger UI with bearer security definition
- **QuestPDF** — pure .NET PDF generation; no external runtime dependency
- **Hangfire** — scheduled data retention purge job (30-day `sensor_readings` delete)
- **System.Security.Cryptography** (built-in) — HMAC-SHA256 for audit log integrity

### Simulation (Python)
- **venv** — isolates `requests`, `python-dotenv`, `python-logging-loki` from system Python
- **python-dotenv** — shares root `.env` with backend; single source of truth for `BACKEND_API_URL`

### DevOps
- **Supabase CLI** — migration-based schema management; every change is a timestamped `.sql` file
- **dotenv-cli** — injects env vars into Supabase CLI commands without polluting the shell

### Monitoring
- **VictoriaMetrics** — 10× lower RAM footprint than Prometheus; identical PromQL query language
- **Loki** — label-indexed log aggregation; device-scoped and level-scoped LogQL queries in Grafana
- **Grafana** — pre-provisioned datasources and dashboard JSON for plug-and-play setup

---

## 14. Frontend Rationale

| Factor | React 19 + Vite | Vue 3 + Vite |
| :--- | :--- | :--- |
| Component ecosystem | Extensive | Sufficient |
| State management | Robust (Hooks/Context) | Built-in (Ref/Reactive) |
| Performance | Optimised for Recharts | Slightly smoother |
| Scalability | Industry standard | High |

**Recommended UI stack:** React 19 + Vite + Recharts + Tailwind CSS. shadcn/ui for form components (login, discharge modal, threshold editor).

---

## 15. Documentation & Architecture Strategy

1. **Architecture Diagram** — Mermaid diagram: *Device Simulator → .NET API → Supabase Postgres → SignalR → React UI*
2. **Challenges & Solutions** — document high-frequency data spike handling via server-side decimation in .NET
3. **Tech Choice Justifications** — "Used Supabase strictly as managed Postgres to maintain ownership of custom RDBMS schemas and SignalR hubs"
4. **Safety Standards** — highlight IEC 62304 Class B framing to define safety-critical software boundaries
5. **TCP/Cloud Trade-off** — justify WebSocket simulation in cloud vs. raw TCP in local environments
6. **SYNTHETIC DATA banner** — all patient data is from Kaggle ICU simulation; must be prominent in README

---

*This document is the Single Source of Truth for MedMonitor development. All prior versions (v2, v3.0) are superseded.*