Medical Device Data Acquisition & Monitoring System

Project Plan — Version 2.0
Objective: Develop a production-grade medical device monitoring system following high-reliability architecture and clinical data standards.

Status: Infrastructure foundation complete. Current development targets patient identity, clinical logic, RBAC, and IEC 62304 regulatory framing.

1. Tech Stack

The full-stack architecture is designed for high-availability data ingestion and real-time observability in safety-critical environments.

| Layer           | Technology                       | Rationale                                                             |
| :-------------- | :------------------------------- | :-------------------------------------------------------------------- |
| **Frontend**    | React 19 + Vite + Recharts       | Fast HMR, rich charting ecosystem, component-based architecture      |
| **Backend**     | .NET 8 (C\#) Web API             | High-performance asynchronous processing + SignalR                    |
| **Database**    | PostgreSQL via Supabase          | 500 MB free managed Postgres; full JSONB/GIN support                  |
| **Real-time**   | SignalR (WebSocket)              | Native to .NET; production-grade for device data streams              |
| **DevOps**      | Docker + docker-compose + Nginx  | Multi-stage builds; reverse proxy for SPA + API                       |
| **Deployment**  | Railway / Render + Supabase      | Free-tier PaaS; zero infrastructure overhead                          |
| **Simulation**  | Python + Kaggle ICU CSV          | Row-by-row replay of real vitals (HR, SpO2, BP, Temp)                 |
| **Environment** | DotNetEnv + Python venv          | Centralised .env management; isolated dependencies                    |
| **DB Ops**      | Supabase CLI + Migrations        | Version-controlled schema — the DevOps way                            |
| **Monitoring**  | VictoriaMetrics + Loki + Grafana | Time-series & log observability; 15-day retention                     |

2. Key Features

  - TCP/IP Socket simulation — Python or C# script mimics a physical device sending
    byte-streams to validate hardware-software integration.
    Cloud caveat: Free-tier PaaS exposes only ports 80/443. Use WebSocket
    simulation in the cloud; keep raw TCP for local/demo. Documented in README.
  - Real-time dashboard — SignalR charts update on every ingested reading.
    Append-only (no full re-render) for efficient data visualization.
  - REST API — CRUD + date-range filtering + device-scoped queries on sensor
    readings and alerts.
  - PostgreSQL JSONB — Flexible sensor payload; GIN index for sub-millisecond
    key queries at scale.
  - JWT Authentication — Role-based access (nurse / doctor / admin) enforced at
    every endpoint.
  - Patient management — Admit, assign, and discharge patients; per-patient
    alert thresholds.
  - Audit trail — Immutable append-only log of every clinical action with actor
    identity.
  - Shift handover PDF — Auto-generated per-shift summary report (QuestPDF).

3. Data Strategy

  - Source: Kaggle ICU Vital Signs CSV (383,540 rows × 25 columns). Columns:
    heart_rate, spo2, respiratory_rate, systolic_bp, diastolic_bp, temperature,
    patient_id, diagnosis, age, gender, etc.
  - Replay: device_simulator.py reads rows chronologically at configurable speed
    (REPLAY_SPEED_SEC), staggering three concurrent ICU beds with row offsets so
    each bed streams unique data.
  - Volume: 383K rows at 3 s/row ≈ 13 days of continuous streaming — well within
    Supabase 500 MB free tier.
  - NEW — Patient seeding: patients_meta.csv (500 rows) seeds the patients table
    on first run, linking patient_id to bed_assignments.

3.1 Observability & Retention

| Component           | Purpose                                                    | Retention                          |
| :------------------ | :--------------------------------------------------------- | :--------------------------------- |
| **VictoriaMetrics** | High-performance time-series metrics from backend + system | 15 days (`--retentionPeriod` flag) |
| **Loki**            | Log aggregation from .NET backend and Python simulator     | 15 days (Loki compactor)           |
| **Grafana**         | Unified dashboard for ingestion rate and clinical logs     | Permanent (Docker volume)          |

4. Supabase Strategy

Supabase is a Backend-as-a-Service. We deliberately avoid its SDK, Auth, and
WebSocket layers — using it strictly as a cloud-hosted PostgreSQL instance.

1.  Create a Supabase project. Copy the Transaction Mode connection string
    (port 6543).
2.  Connect the .NET 8 backend via Npgsql.EntityFrameworkCore.PostgreSQL.
3.  All REST APIs are hand-written in C#. All WebSockets use SignalR.
4.  All schema changes go through timestamped migration files (Supabase CLI).

Why: This approach ensures full control over the database schema, EF Core query optimization, and SignalR hub logic, rather than abstracting core infrastructure behind a BaaS SDK.

5. Gap Analysis vs. Production Standard

This analysis references IEC 62304 Class B software lifecycle expectations.

Status Legend:
✔ Done | **~ Partial** | ✘ Missing
Priority:
P1 = show-stopper | P2 = clinical completeness | P3 = professional polish

5.1 Data Acquisition

| Feature                      | Status    | Priority | Action / Notes                                                                    |
| :--------------------------- | :-------- | :------- | :-------------------------------------------------------------------------------- |
| CSV replay simulator         | ✔ Done    | —        | Implemented in `device_simulator.py` with row offsets                             |
| HL7 / FHIR protocol parsing  | ✘ Missing | P3       | Document as 'future work'. Add HL7v2 ADT message stub to show awareness           |
| Device certificate & pairing | ✘ Missing | P3       | Add `devices.certificate_thumbprint` column + pairing endpoint                    |
| Sensor calibration log       | ✘ Missing | P2       | New table: `calibration_records` (device\_id, offset, calibrated\_at, technician) |

5.2 Clinical Logic & Alerting

| Feature                              | Status     | Priority | Action / Notes                                                                       |
| :----------------------------------- | :--------- | :------- | :----------------------------------------------------------------------------------- |
| HR global threshold                  | ✔ Done     | —        | `ReadingService` persists alert + broadcasts via SignalR                             |
| SpO2 alerting (persisted)            | \~ Partial | P1       | Frontend-only check. Mirror into `ReadingService` — create DB alert when SpO2 \< 90  |
| Trend / rate-of-change alerting      | ✘ Missing  | P2       | Rolling 5-reading window. Alert if delta \> 20 bpm / 60 s                            |
| Per-patient threshold overrides      | ✘ Missing  | P1       | New table: `patient_thresholds`. `ReadingService` queries per-patient bounds first   |
| Alert escalation (nurse → doctor)    | ✘ Missing  | P2       | If alert unacknowledged for N minutes, escalate severity & notify physician          |
| Alarm fatigue management             | ✘ Missing  | P2       | Don't re-fire same alert type for same device within configurable suppression window |
| Alert resolution with actor + reason | \~ Partial | P1       | Endpoint exists but missing `resolved_by_user_id` and `resolution_note` fields       |

5.3 Patient & Ward Management

| Feature                         | Status    | Priority | Action / Notes                                                                       |
| :------------------------------ | :-------- | :------- | :----------------------------------------------------------------------------------- |
| Patient profiles (MRN, DOB)     | ✘ Missing | P1       | New table: `patients`. Seed from `patients_meta.csv` on simulator start              |
| Bed assignment flow             | ✘ Missing | P1       | New table: `bed_assignments` (patient\_id, device\_id, admitted\_at, discharged\_at) |
| Ward / site grouping            | ✔ Done    | —        | Devices grouped by `devices.location` in the React sidebar                           |
| Per-patient medication schedule | ✘ Missing | P3       | Table: `medication_schedules`. Out of scope for v2 — document as future work         |
| Clinical notes (SOAP format)    | ✘ Missing | P3       | Table: `clinical_notes`. Rich text per patient per shift                             |

5.4 Authentication & Access Control

| Feature                       | Status     | Priority | Action / Notes                                                                       |
| :---------------------------- | :--------- | :------- | :----------------------------------------------------------------------------------- |
| JWT infrastructure            | \~ Partial | P1       | Packages added. No `[Authorize]` on any controller. Add users table + login endpoint |
| RBAC (nurse / doctor / admin) | ✘ Missing  | P1       | Encode role claim in JWT. Add `[Authorize(Roles=...)]` to controllers                |
| Login / logout UI             | ✘ Missing  | P1       | React login page, token stored in memory (not localStorage)                          |
| Audit trail                   | ✘ Missing  | P1       | Append-only `audit_log` table. Written by middleware on every state-change endpoint  |
| 2FA / Hospital AD SSO         | ✘ Missing  | P3       | Out of scope. Document as future integration point                                   |

5.5 Reporting & Data Export

| Feature                       | Status    | Priority | Action / Notes                                                                          |
| :---------------------------- | :-------- | :------- | :-------------------------------------------------------------------------------------- |
| Grafana operations dashboard  | ✔ Done    | —        | Provisioned: Loki log panel + VictoriaMetrics ingestion rate                            |
| Clinical shift handover (PDF) | ✘ Missing | P2       | QuestPDF: 8-hour window summary per bed. Shows vitals stats + alerts fired + resolution |
| Data export CSV / FHIR R4     | ✘ Missing | P3       | \`GET /api/readings/{device}/export?format=csv                                          |
| Vitals trend chart in PDF     | ✘ Missing | P2       | Render Recharts to image server-side or generate SVG in QuestPDF                        |

5.6 Regulatory & Compliance Framing

| Feature                       | Status     | Priority | Action / Notes                                                                          |
| :---------------------------- | :--------- | :------- | :-------------------------------------------------------------------------------------- |
| TLS in transit (HTTPS)        | \~ Partial | —        | Nginx handles TLS termination in production. Enforce HTTPS redirect                     |
| Data at-rest encryption       | ✘ Missing  | P2       | Supabase enables PG encryption at rest. Document and verify in SRS                      |
| PDPA (Malaysia) consent model | ✘ Missing  | P2       | Add patient consent flag to patients table. Block export without consent=true           |
| IEC 62304 SRS / SDS docs      | ✘ Missing  | P2       | Add `docs/srs.md`: Class B classification, functional requirements with IDs, risk table |
| Data retention policy         | \~ Partial | P2       | Loki: 15 days. Supabase: no retention. Add scheduled purge job or policy                |

5.7 Operations & Resilience

| Feature                    | Status     | Priority | Action / Notes                                                                   |
| :------------------------- | :--------- | :------- | :------------------------------------------------------------------------------- |
| EF Core retry-on-failure   | ✔ Done     | —        | 3 retries, 5 s delay — handles Supabase transient failures                       |
| Supabase keep-alive        | ✔ Done     | —        | Pings `/api/devices` every 3 days via GitHub Actions                             |
| Health check endpoint      | \~ Partial | P2       | Add `app.MapHealthChecks` with DB readiness probe. Update keepalive to `/health` |
| Swagger with bearer auth   | \~ Partial | P2       | `AddSecurityDefinition('Bearer')` + padlock button in UI                         |
| Offline / local buffer     | ✘ Missing  | P3       | Python sim: queue readings locally, retry with backoff                           |
| Backup / disaster recovery | ✘ Missing  | P3       | Supabase: enable PITR. Document RPO/RTO in SRS                                   |

6. Schema Upgrade — v2 Migration

File: supabase/migrations/20260423000000_v2_clinical_schema.sql

### 6.1 New Tables

### patients
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

### bed_assignments
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

### patient_thresholds
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | BIGSERIAL PK | |
| patient_id | UUID FK | REFERENCES patients(id) |
| vital_sign | VARCHAR(50) | heart_rate, spo2, temperature, etc. |
| min_value | DECIMAL | NULL = use global default |
| max_value | DECIMAL | NULL = use global default |
| set_by | VARCHAR(100) | Clinician name |
| set_at | TIMESTAMPTZ | DEFAULT NOW() |

### users
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | UUID PK | `gen_random_uuid()` |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | bcrypt / Argon2 |
| role | VARCHAR(20) | nurse \| doctor \| admin |
| full_name | VARCHAR(100) | |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### audit_log
| Column | Type | Notes |
| :--- | :--- | :--- |
| id | BIGSERIAL PK | Append-only — no UPDATE or DELETE |
| user_id | UUID FK | REFERENCES users(id) ON DELETE SET NULL |
| action | VARCHAR(100) | e.g. RESOLVE_ALERT, ADMIT_PATIENT |
| entity_type | VARCHAR(50) | e.g. alerts, patients |
| entity_id | BIGINT | |
| detail | JSONB | Before/after snapshot or context |
| ip_address | INET | |
| occurred_at | TIMESTAMPTZ | DEFAULT NOW() |

7. Execution Plan — v2 Sprints

| Sprint              | Deliverable                                                                                                                                | Key Files                                             |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| **S1 — Foundation** | Run migration. Seed patients from CSV. Add users table + bcrypt login endpoint. Wire `[Authorize]` on all controllers.                     | `migration SQL`, `AuthController.cs`, `LoginPage.jsx` |
| **S2 — Clinical**   | Patient thresholds table + `ReadingService` lookup. SpO2 backend alert. Trend rate-of-change alert. Alert suppression window.              | `ReadingService.cs`, `patient_thresholds migration`   |
| **S3 — Dashboard**  | React: patient name + diagnosis in sidebar. Multi-vital chart (HR, SpO2, Resp, BP, Temp). Alert acknowledge button (logged to audit\_log). | `App.jsx`, `PatientDetail.jsx`, `useVitals.js`        |
| **S4 — Reporting**  | QuestPDF shift handover report endpoint. Health check endpoint. Swagger bearer auth. IEC 62304 SRS markdown doc.                           | `ShiftReportController.cs`, `srs.md`                  |
| **S5 — Polish**     | PDPA consent flag. Sensor calibration table. README screenshots + GIF. Deploy to Render + verify keepalive.                                | `README.md`, `docker-compose.yml`                     |

8. Project Folder Structure

```
medical-device-monitoring/
├── frontend/                  # React 19 + Vite
│   ├── src/
│   ├── Dockerfile
├── backend/                   # .NET 8 Web API (C#)
│   ├── Controllers/
│   ├── Hubs/                  # SignalR hub
│   ├── Services/              # Core business logic
│   ├── Models/
│   └── Dockerfile
├── database/                  # Simulation & Data
│   ├── device_simulator.py    # Python script to replay Kaggle CSV
│   ├── requirements.txt       # Simulator dependencies
│   └── venv/                  # Isolated Python environment
├── supabase/                  # Cloud Infrastructure
│   └── migrations/            # Version-controlled schema (DevOps way)
├── docker/                    # Infrastructure configurations
│   ├── nginx.conf             # Reverse proxy config
│   ├── loki-config.yml        # Log retention rules
│   └── grafana/               # Dashboards & Datasource provisioning
├── docker-compose.yml         # Full stack orchestration
├── .env.example               # Template for secrets
└── README.md                  # Portfolio centerpiece
```

9. Implementation Status Tracker

### ✅ Phase 1: Infrastructure (Complete)
- [x] Initial Git version control & `.gitignore`
- [x] Multi-stage **Docker** setup for Backend/Frontend
- [x] Monitoring stack: **VictoriaMetrics + Loki + Grafana**
- [x] Python simulation environment (venv + CSV reader)
- [x] Supabase project linking & initial migrations

### 🚀 Phase 2: v2 Clinical Core (In Progress)
- [ ] **Auth:** JWT infrastructure & Role-Based Access Control
- [ ] **Identity:** Patient management & Bed assignment logic
- [ ] **Alerting:** Multi-vital thresholds (HR, SpO2) & suppression windows
- [ ] **Audit:** Immutable audit log middleware
- [ ] **Reporting:** QuestPDF shift handover report generation

### 🏁 Phase 3: Final Polish
- [ ] Real-time chart decimation logic (performance optimization)
- [ ] PDPA compliance (consent flags)
- [ ] Production deployment (Render/Railway)
- [ ] Portfolio Documentation (Architecture diagrams + GIF)


10. Deployment Notes

| Tier           | Service          | Notes                                                                                               |
| :------------- | :--------------- | :-------------------------------------------------------------------------------------------------- |
| **Database**   | Supabase Free    | 500 MB storage. Pauses after 1 week inactivity — restore via Supabase dashboard if paused. Enable PITR for backup. |
| **Backend**    | Render / Railway | .NET Docker container. Set `SUPABASE_CONN_STRING`, `JWT_SECRET`, `LOKI_URL` as env variables.       |
| **Frontend**   | Vercel / Netlify | Set `VITE_BACKEND_URL` to the Render backend URL.                                                   |
| **Monitoring** | Docker Compose   | VictoriaMetrics + Loki + Grafana run locally or on a small VPS alongside the app.                   |

Supabase pause caveat: Free projects pause after 7 days of inactivity. Log into
keepalive workflow pings /api/devices every 3 days to mitigate this — update the
URL to your live deployment URL.

11. Risk Register

| Risk                       | Severity | Mitigation                                                                                             |
| :------------------------- | :------- | :----------------------------------------------------------------------------------------------------- |
| TCP ports blocked on PaaS  | Medium   | WebSocket fallback in cloud; raw TCP for local testing. Documented in README.                          |
| JSONB query slowness       | Low      | GIN index on payload column. Nth-point decimation in `ReadingService`.                                 |
| Supabase auto-pause        | Medium   | GitHub Actions keepalive every 3 days. Manual restore before demonstrations.                           |
| Project Scope Creep        | Medium   | Multi-phase implementation; focus on core clinical requirements first.                                 |
| EF Core JSONB complexity   | Low      | Dapper raw SQL available as fallback for complex JSONB projections.                                    |
| Connection pool exhaustion | Low      | `REPLAY_SPEED_SEC=3` + EF Core retry logic. `No Reset On Close=true` in conn string.                    |
| Patient data privacy       | High     | All patient data is synthetic (Kaggle simulated dataset). Add **SYNTHETIC DATA** banner to README.     |

12. Documentation & Technical Strategy

The README and technical documentation follow rigorous architectural standards:

1.  **Architecture Diagram**: A clear Mermaid or Draw.io diagram showing the flow: *Device Simulator → .NET API → Supabase Postgres → SignalR → React UI*.
2.  **Challenges & Solutions**: Documentation of technical hurdles such as handling high-frequency data spikes via server-side decimation in .NET.
3.  **Tech Choice Justifications**:
    *   "Used .NET 8 for robust enterprise-grade asynchronous processing."
    *   "Used Supabase strictly as a managed Postgres instance to maintain ownership of custom RDBMS schemas and SignalR hubs."
4.  **Safety Standards**: Highlight the **IEC 62304 Class B** framing to define the safety-critical boundaries of the software.
5.  **TCP/Cloud Trade-off**: Justification for WebSocket simulation in cloud environments vs. raw TCP in local environments.


13. Frontend Framework: React + Vite

React is the chosen framework for building a responsive, high-performance monitoring interface.

| Factor                 | React + Vite         | Vue 3 + Vite        |
| :--------------------- | :------------------- | :------------------ |
| Component Ecosystem    | Extensive            | Sufficient          |
| State Management       | Robust (Hooks/Context)| Built-in (Ref/Rect) |
| Performance            | Optimized for Recharts| Slightly smoother   |
| Scalability            | Industry Standard    | High                |


Recommended UI stack: React 19 + Vite + Recharts + Tailwind CSS. shadcn/ui for
form components (login, discharge modal, threshold editor).

14. Regulatory Framing — IEC 62304

While full certification is out of scope for this implementation, documenting the system against IEC 62304 principles ensures alignment with medical software safety standards.

14.1 Software Safety Classification

| Class   | Definition                                  | This System                                        |
| :------ | :------------------------------------------ | :------------------------------------------------- |
| Class A | No injury possible from software failure    | —                                                  |
| Class B | Possible injury, not death (monitoring aid) | **This system** — monitoring aid, not life support |
| Class C | Death or serious injury possible            | Pacemaker firmware, infusion pump — not applicable |

Classification: Class B. Justification: The system displays and alerts on vital
signs but does not control any actuator, infusion, or life-support device.
Failure to alert does not directly cause injury (nurse maintains primary
observation duty).

14.2 Sample Software Requirements (SRS-xxx format)

| ID          | Requirement                                                                                             | Verification                                                   |
| :---------- | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------- |
| **SRS-001** | The system shall generate a CRITICAL alert within 5 seconds of detecting HR \> 120 bpm or HR \< 40 bpm. | Test: inject reading, verify alert row created within 5 s      |
| **SRS-002** | The system shall generate a CRITICAL alert within 5 seconds of detecting SpO2 \< 90%.                   | Test: inject reading, verify alert row created within 5 s      |
| **SRS-003** | Alert resolution shall record the resolving user ID and timestamp.                                      | Test: resolve via API with valid JWT, verify `audit_log` entry |
| **SRS-004** | All state-changing endpoints shall require a valid JWT with appropriate role claim.                     | Test: call without JWT, expect HTTP 401                        |
| **SRS-005** | The system shall retain sensor readings for a minimum of 15 days before purging.                        | Config review: verify retention policy applied                 |
| **SRS-006** | Patient data export shall require explicit `consent=true` flag on the patient record.                   | Test: export with `consent=false`, expect HTTP 403             |

15. Dependency & Environment Rationale

15.1 Backend (.NET 8)

  - DotNetEnv: Loads .env files at startup. Prevents secrets from reaching Git.
    Critical for free-tier cloud deployment.
  - Npgsql.EntityFrameworkCore.PostgreSQL: Standard C# PostgreSQL provider.
    Supports JSONB type mapping via HasColumnType("jsonb").
  - Swashbuckle: Auto-generates OpenAPI/Swagger UI. v2 adds bearer security
    definition so interviewers can test auth-protected endpoints.
  - QuestPDF (new in v2): Pure .NET PDF generation library. Used for shift
    handover reports. No external process or runtime dependency.
  - Microsoft.AspNetCore.Authentication.JwtBearer: JWT middleware. Validates
    tokens, extracts role claims for RBAC.

15.2 Simulation (Python)

  - venv: Isolates requests, python-dotenv, python-logging-loki from system
    Python. Reproducible across machines.
  - python-dotenv: Shares the root .env with the backend — single source of
    truth for BACKEND_API_URL and REPLAY_SPEED_SEC.

15.3 DevOps

  - Supabase CLI: Migration-based schema management. Every change is a
    timestamped .sql file in supabase/migrations/.
  - dotenv-cli: Injects env vars into Supabase CLI commands without polluting
    the shell environment.

15.4 Monitoring & Observability

  - VictoriaMetrics: Chosen over Prometheus for 10x lower RAM footprint.
    Identical PromQL query language. Ideal for demo environments.
  - Loki: Label-indexed log aggregation. Keeps storage minimal while supporting
    device-scoped, level-scoped LogQL queries in Grafana.
  - Grafana: Pre-provisioned datasources and dashboard JSON ensure plug-and-play
    setup for any reviewer cloning the repo.

---
*This document serves as the Single Source of Truth for the Medical Monitoring System v2 development cycle.*
