This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, line numbers have been added.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*
- Files matching these patterns are excluded: *.csv, *.jsonl, database/data/, backend/bin/, backend/obj/, backend/.vs/, backend/*.user, backend/model/, frontend/dist/, frontend/build/, frontend/.vite/, **/*.svg, **/*.ico, **/*.png, **/*.gif, docker-data/, *.bak, docs/project_plan.md, docs/project_plan_v2.md, README.md, docs/troubleshooting_log.md, docker/grafana/, supabase/migrations/
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Line numbers have been added to the beginning of each line
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
.env.example
.github/workflows/keepalive.yml
.gitignore
backend/controllers/alerts_controller.cs
backend/controllers/audit_controller.cs
backend/controllers/auth_controller.cs
backend/controllers/devices_controller.cs
backend/controllers/patients_controller.cs
backend/controllers/readings_controller.cs
backend/controllers/shift_report_controller.cs
backend/data/app_db_context.cs
backend/Dockerfile
backend/hubs/vital_signs_hub.cs
backend/MedicalDeviceMonitor.csproj
backend/Program.cs
backend/services/audit_service.cs
backend/services/medication_service.cs
backend/services/reading_service.cs
backend/services/retention_service.cs
database/database_inventory.md
database/device_simulator.py
database/requirements.txt
docker-compose.yml
docker/loki-config.yml
docker/nginx.conf
docs/project_plan_v3.md
docs/security.md
frontend/Dockerfile
frontend/eslint.config.js
frontend/index.html
frontend/package.json
frontend/src/App.css
frontend/src/App.jsx
frontend/src/hooks/useVitals.js
frontend/src/index.css
frontend/src/Login.jsx
frontend/src/main.jsx
frontend/vite.config.js
package.json
supabase/current_schema.sql
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="backend/controllers/audit_controller.cs">
 1: using MedicalDeviceMonitor.Services;
 2: using Microsoft.AspNetCore.Authorization;
 3: using Microsoft.AspNetCore.Mvc;
 4: namespace MedicalDeviceMonitor.Controllers;
 5: [Authorize(Roles = "admin")]
 6: [ApiController]
 7: [Route("api/[controller]")]
 8: public class AuditController : ControllerBase
 9: {
10:     private readonly AuditService _auditService;
11:     public AuditController(AuditService auditService)
12:     {
13:         _auditService = auditService;
14:     }
15:     [HttpGet("verify")]
16:     public async Task<IActionResult> VerifyAuditChain()
17:     {
18:         bool isValid = await _auditService.VerifyChainAsync();
19:         return Ok(new 
20:         { 
21:             isValid, 
22:             message = isValid ? "Audit chain is intact and verified." : "ALERT: Audit chain integrity compromised!" 
23:         });
24:     }
25: }
</file>

<file path="backend/Dockerfile">
 1: FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
 2: WORKDIR /src
 3: COPY ["MedicalDeviceMonitor.csproj", "./"]
 4: RUN dotnet restore
 5: COPY . .
 6: RUN dotnet publish -c Release -o /app
 7: 
 8: FROM mcr.microsoft.com/dotnet/aspnet:8.0
 9: WORKDIR /app
10: COPY --from=build /app .
11: # Use the port defined in .env or default to 5000
12: ENV ASPNETCORE_URLS=http://+:5000
13: EXPOSE 5000
14: ENTRYPOINT ["dotnet", "MedicalDeviceMonitor.dll"]
</file>

<file path="backend/hubs/vital_signs_hub.cs">
 1: using Microsoft.AspNetCore.SignalR;
 2: namespace MedicalDeviceMonitor.Hubs;
 3: public class VitalSignsHub : Hub
 4: {
 5:     // React clients will connect here. 
 6:     // We don't need methods here yet, because the backend API 
 7:     // will push data directly to clients when it receives a POST.
 8:     public override async Task OnConnectedAsync()
 9:     {
10:         Console.WriteLine($"Client connected to SignalR: {Context.ConnectionId}");
11:         await base.OnConnectedAsync();
12:     }
13: }
</file>

<file path="database/database_inventory.md">
 1: # 📊 Database Data Inventory
 2: 
 3: This report provides a detailed overview of the CSV datasets for AI review and system documentation.
 4: 
 5: ## 📈 Summary Table
 6: 
 7: | File Name | Rows | Cols | Size (MB) |
 8: | :--- | :--- | :--- | :--- |
 9: | `icu_vitals.csv` | 383,540 | 25 | 45.53 |
10: | `patients_meta.csv` | 500 | 13 | 0.05 |
11: 
12: ## 🔍 Detailed File Schemas
13: 
14: ### 📄 `icu_vitals.csv`
15: - **Rows:** 383,540
16: - **Columns (25):**
17:   - `timestamp`
18:   - `patient_id`
19:   - `age`
20:   - `age_group`
21:   - `gender`
22:   - `diagnosis`
23:   - `icu_unit`
24:   - `admission_type`
25:   - `comorbidity_count`
26:   - `bmi_category`
27:   - `icu_day`
28:   - `icu_hour`
29:   - `hour_of_day`
30:   - `day_of_week`
31:   - `is_night`
32:   - `scheduled_med`
33:   - `time_idx`
34:   - `heart_rate`
35:   - `spo2`
36:   - `respiratory_rate`
37:   - `systolic_bp`
38:   - `diastolic_bp`
39:   - `temperature`
40:   - `overall_risk`
41:   - `event_label`
42: 
43: ### 📄 `patients_meta.csv`
44: - **Rows:** 500
45: - **Columns (13):**
46:   - `patient_id`
47:   - `age`
48:   - `age_group`
49:   - `gender`
50:   - `diagnosis`
51:   - `icu_unit`
52:   - `admission_type`
53:   - `comorbidity_count`
54:   - `bmi_category`
55:   - `icu_stay_days`
56:   - `admission_time`
57:   - `discharge_time`
58:   - `scenario`
59: 
60: 
61: ---
62: *Last updated: 2026-04-22 23:40:43*
</file>

<file path="docker/nginx.conf">
 1: # ============================================================
 2: # Nginx Reverse Proxy Config — Local Docker Dev
 3: # ============================================================
 4: # Routes:
 5: #   /api/*  → .NET backend  (container: medmon_backend:5000)
 6: #   /*      → React frontend (container: medmon_frontend:80)
 7: #
 8: # This mirrors the pattern you'll use in production on Render/Railway.
 9: # ============================================================
10: 
11: server {
12:     listen 80;
13:     server_name localhost;
14: 
15:     # ─── Frontend (React SPA) ──────────────────────────────
16:     location / {
17:         proxy_pass         http://frontend:80;
18:         proxy_http_version 1.1;
19:         proxy_set_header   Host              $host;
20:         proxy_set_header   X-Real-IP         $remote_addr;
21:         proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
22:     }
23: 
24:     # ─── Backend REST API ──────────────────────────────────
25:     location /api/ {
26:         proxy_pass         http://backend:5000;
27:         proxy_http_version 1.1;
28:         proxy_set_header   Host              $host;
29:         proxy_set_header   X-Real-IP         $remote_addr;
30:         proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
31: 
32:         # CORS headers (dev only — tighten in production)
33:         add_header Access-Control-Allow-Origin  "*" always;
34:         add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
35:         add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
36: 
37:         if ($request_method = OPTIONS) {
38:             return 204;
39:         }
40:     }
41: 
42:     # ─── SignalR WebSocket Hub ─────────────────────────────
43:     location /hubs/ {
44:         proxy_pass             http://backend:5000;
45:         proxy_http_version     1.1;
46:         proxy_set_header       Upgrade    $http_upgrade;
47:         proxy_set_header       Connection "Upgrade";
48:         proxy_set_header       Host       $host;
49:         proxy_read_timeout     3600s;
50:         proxy_send_timeout     3600s;
51:     }
52: }
</file>

<file path="docs/project_plan_v3.md">
  1: # MedMonitor: ASEAN SaMD Sandbox & MIC@Home Gateway
  2: **Project Plan — Version 3.1**
  3: *Single Source of Truth — April 26, 2026*
  4: 
  5: ---
  6: 
  7: ## 1. Strategic Context (The "Why")
  8: 
  9: MedMonitor is a pre-compliant, open-source Medical IoT telemetry gateway designed for the ASEAN region.
 10: 
 11: | Use Case | Market | Description |
 12: | :--- | :--- | :--- |
 13: | **Primary** | Singapore | MIC@Home (Mobile Inpatient Care @ Home) — decanting acute patients to virtual home wards |
 14: | **Secondary** | Malaysia | ED "Yellow Zone" Deterioration Warning — public hospital (KKM) step-down monitoring |
 15: | **Regulatory Goal** | ASEAN | MDA/HSA Class B SaMD certification via Investigational Testing Exemption |
 16: 
 17: ---
 18: 
 19: ## 2. Tech Stack
 20: 
 21: | Layer | Technology | Rationale |
 22: | :--- | :--- | :--- |
 23: | **Frontend** | React 19 + Vite + Recharts | Fast HMR, rich charting ecosystem, component-based architecture |
 24: | **Backend** | .NET 8 (C#) Web API | High-performance async processing + SignalR; robust EF Core ORM |
 25: | **Database** | PostgreSQL via Supabase | Managed Postgres; full JSONB/GIN support; port 5432 Session Pooling for RLS |
 26: | **Real-time** | SignalR (WebSocket) | Native to .NET; production-grade for device data streams |
 27: | **DevOps** | Docker + docker-compose + Nginx | Multi-stage builds; reverse proxy for SPA + API |
 28: | **Deployment** | Render / Railway / AWS MY Region | PaaS targets; AWS MY Region for data sovereignty in production |
 29: | **Simulation** | Python + Kaggle ICU CSV | Row-by-row replay of real vitals (HR, SpO2, BP, Temp) |
 30: | **Environment** | DotNetEnv + Python venv | Centralised `.env` management; isolated dependencies |
 31: | **DB Ops** | Supabase CLI + Migrations | Version-controlled schema — the DevOps way |
 32: | **Monitoring** | VictoriaMetrics + Loki + Grafana | Time-series & log observability; 15-day retention; essential for PMS |
 33: 
 34: ---
 35: 
 36: ## 3. Key Features
 37: 
 38: - **TCP/IP Socket simulation** — Python or C# script mimics a physical device sending byte-streams to validate hardware-software integration. *Cloud caveat: Free-tier PaaS exposes only ports 80/443. Use WebSocket simulation in the cloud; keep raw TCP for local/demo.*
 39: - **Real-time dashboard** — SignalR charts update on every ingested reading. Append-only (no full re-render) for efficient data visualization.
 40: - **REST API** — CRUD + date-range filtering + device-scoped queries on sensor readings and alerts.
 41: - **PostgreSQL JSONB** — Flexible sensor payload; GIN index for sub-millisecond key queries at scale.
 42: - **JWT Authentication** — Role-based access (nurse / doctor / admin) enforced at every endpoint.
 43: - **Patient management** — Admit, assign, and discharge patients; per-patient alert thresholds.
 44: - **Dynamic Permission Engine (NEW):** Transition from hardcoded roles to a 4-layer database-driven model (Permissions → Roles → Groups → Users).
 45: - **Shift Handover PDF:** Auto-generated per-shift summary report (QuestPDF).
 46: - **MEWS Composite Scoring:** Modified Early Warning Score algorithm (Phase 4).
 47: - **Audit Trail:** Immutable append-only log with HMAC-SHA256 chain and actor identity.
 48: 
 49: ---
 50: 
 51: ## 4. Technical Implementation Architecture
 52: 
 53: ### 4.1 Fine-Grained Access Control (Dynamic RBAC)
 54: - **The Model:** Atomic permissions (e.g., `alerts:resolve`) are bundled into Roles. Roles are assigned to Groups (scoped to Departments).
 55: - **Runtime Enforcement:** A custom `.NET Middleware` reads permissions directly from the JWT claims. Access decisions are made at the API boundary before hitting the Service layer.
 56: - **Safety Guard:** `is_system_role` flag prevents accidental deletion of core clinical capabilities (e.g., a "Nurse" role cannot be stripped of "alert:resolve").
 57: 
 58: ### 4.2 Data Isolation Policy (RLS)
 59: - **Permission vs. Scope:** Having the `alerts:resolve` permission allows the capability, but Row-Level Security (RLS) restricts the *data scope* to the user's assigned `department_id`.
 60: - **Current Architecture:** Session Pooling (Port 5432). Claims injected via .NET Middleware using `set_config('app.current_user_id', ..., false)`.
 61: - **Security Logic:** Manual connection management ensures session variables are cleared before returning to the pool, preventing cross-tenant data leakage (connection pool poisoning).
 62: - **Scale Path:** Migration to Transaction Pooling (Port 6543) via EF Core `DbCommandInterceptor` is scheduled for Phase 5 (Enterprise Scale-out). This is a scale optimisation, not a security requirement for Class B sandbox entry.
 63: 
 64: ### 4.3 Supabase Connection Strategy
 65: 
 66: Supabase is used strictly as a cloud-hosted PostgreSQL instance. The SDK, Auth, and WebSocket layers are deliberately avoided.
 67: 
 68: 1. Connect the .NET 8 backend via `Npgsql.EntityFrameworkCore.PostgreSQL` on **Port 5432** (Session Pooling).
 69: 2. All REST APIs are hand-written in C#. All WebSockets use SignalR.
 70: 3. All schema changes go through timestamped migration files (Supabase CLI).
 71: 4. RLS session variables are set at the application layer, not via Supabase Auth.
 72: 
 73: *Rationale: Full control over schema, EF Core query optimisation, and SignalR hub logic.*
 74: 
 75: ### 4.3 Clinical Safety Logic
 76: 
 77: - **Alarm Fatigue:** 5-minute rolling suppression window per IEC 60601-1-8. Clinically validated by Cvach (2012, *Heart & Lung*) — suppression windows increase alarm Positive Predictive Value (PPV) without compromising patient safety in step-down environments.
 78: - **Early Warning:** Modified Early Warning Score (MEWS) composite algorithm to be implemented in `ReadingService.cs` (Phase 4, Sprint 4.2).
 79: - **Safety Standard Alignment:** Joint Commission NPSG.06.01.01 (Improve the safety of clinical alarm systems).
 80: 
 81: ### 4.4 Observability & Retention
 82: 
 83: | Component | Purpose | Retention |
 84: | :--- | :--- | :--- |
 85: | **VictoriaMetrics** | High-performance time-series metrics from backend + system | 15 days (`--retentionPeriod` flag) |
 86: | **Loki** | Log aggregation from .NET backend and Python simulator | 15 days (Loki compactor) |
 87: | **Grafana** | Unified dashboard for ingestion rate and clinical logs | Permanent (Docker volume) |
 88: 
 89: *Note: The 15-day observability retention is for system metrics (PMS evidence). Clinical `sensor_readings` are subject to the 30-day PDPA purge policy (see Section 7).*
 90: 
 91: ---
 92: 
 93: ## 5. Data Strategy
 94: 
 95: - **Source:** Kaggle ICU Vital Signs CSV (383,540 rows × 25 columns). Columns include: `heart_rate`, `spo2`, `respiratory_rate`, `systolic_bp`, `diastolic_bp`, `temperature`, `patient_id`, `diagnosis`, `age`, `gender`.
 96: - **Replay:** `device_simulator.py` reads rows chronologically at configurable speed (`REPLAY_SPEED_SEC`), staggering three concurrent ICU beds with row offsets so each bed streams unique data.
 97: - **Volume:** 383K rows at 3 s/row ≈ 13 days of continuous streaming — within Supabase 500 MB free tier.
 98: - **Patient seeding:** `patients_meta.csv` (500 rows) seeds the `patients` table on first run, linking `patient_id` to `bed_assignments`.
 99: - **Edge Buffering (Phase 4):** Python simulator will be updated to simulate Wi-Fi dropouts and bulk-upload — critical for MIC@Home remote use cases.
100: 
101: ---
102: 
103: ## 6. Database Schema
104: 
105: ### `permissions`
106: | Column | Type | Notes |
107: | :--- | :--- | :--- |
108: | id | UUID PK | |
109: | resource | VARCHAR(50)| e.g., 'alerts', 'patients' |
110: | action | VARCHAR(50)| e.g., 'resolve', 'view', 'admit' |
111: 
112: ### `roles` & `role_permissions`
113: | Column | Type | Notes |
114: | :--- | :--- | :--- |
115: | id | UUID PK | |
116: | name | VARCHAR(100)| e.g., 'Senior Staff Nurse' |
117: | is_system_role | BOOLEAN | If TRUE, cannot be deleted/modified |
118: 
119: ### `groups` & `user_groups`
120: | Column | Type | Notes |
121: | :--- | :--- | :--- |
122: | id | UUID PK | |
123: | name | VARCHAR(100)| e.g., 'ICU Night Shift Team A' |
124: | department_id | UUID FK | Links to ward isolation |
125: 
126: ### `patients`
127: | Column | Type | Notes |
128: | :--- | :--- | :--- |
129: | id | UUID PK | `gen_random_uuid()` |
130: | mrn | VARCHAR(20) | Medical Record Number — UNIQUE, NOT NULL |
131: | full_name | VARCHAR(100) | NOT NULL |
132: | date_of_birth | DATE | NOT NULL |
133: | gender | VARCHAR(20) | |
134: | blood_type | VARCHAR(5) | |
135: | allergies | TEXT[] | Array of allergy strings |
136: | consent | BOOLEAN | PDPA consent flag, default FALSE |
137: | created_at | TIMESTAMPTZ | DEFAULT NOW() |
138: 
139: ### `bed_assignments`
140: | Column | Type | Notes |
141: | :--- | :--- | :--- |
142: | id | BIGSERIAL PK | |
143: | patient_id | UUID FK | REFERENCES patients(id) |
144: | device_id | UUID FK | REFERENCES devices(id) |
145: | admitted_at | TIMESTAMPTZ | DEFAULT NOW() |
146: | discharged_at | TIMESTAMPTZ | NULL = currently admitted |
147: | attending_physician | VARCHAR(100) | |
148: | diagnosis | TEXT | ICD-10 preferred |
149: | admission_type | VARCHAR(50) | emergency \| elective \| transfer |
150: 
151: ### `patient_thresholds`
152: | Column | Type | Notes |
153: | :--- | :--- | :--- |
154: | id | BIGSERIAL PK | |
155: | patient_id | UUID FK | REFERENCES patients(id) |
156: | vital_sign | VARCHAR(50) | heart_rate, spo2, temperature, etc. |
157: | min_value | DECIMAL | NULL = use global default |
158: | max_value | DECIMAL | NULL = use global default |
159: | set_by | VARCHAR(100) | Clinician name |
160: | set_at | TIMESTAMPTZ | DEFAULT NOW() |
161: 
162: ### `users`
163: | Column | Type | Notes |
164: | :--- | :--- | :--- |
165: | id | UUID PK | `gen_random_uuid()` |
166: | email | VARCHAR(255) | UNIQUE, NOT NULL |
167: | password_hash | VARCHAR(255) | bcrypt / Argon2 |
168: | role | VARCHAR(20) | nurse \| doctor \| admin |
169: | full_name | VARCHAR(100) | |
170: | department_id | UUID FK | Ward isolation enforcement |
171: | is_active | BOOLEAN | DEFAULT TRUE |
172: | created_at | TIMESTAMPTZ | DEFAULT NOW() |
173: 
174: ### `audit_log`
175: | Column | Type | Notes |
176: | :--- | :--- | :--- |
177: | id | BIGSERIAL PK | Append-only — no UPDATE or DELETE |
178: | user_id | UUID FK | REFERENCES users(id) ON DELETE SET NULL |
179: | action | VARCHAR(100) | e.g. RESOLVE_ALERT, ADMIT_PATIENT |
180: | entity_type | VARCHAR(50) | e.g. alerts, patients |
181: | entity_id | BIGINT | |
182: | detail | JSONB | Before/after snapshot or context |
183: | ip_address | INET | |
184: | prev_hash | VARCHAR(64) | HMAC-SHA256 of previous row — tamper detection |
185: | occurred_at | TIMESTAMPTZ | DEFAULT NOW() |
186: 
187: ---
188: 
189: ## 7. Regulatory & Compliance Framework
190: 
191: ### 7.1 IEC 62304 Software Safety Classification
192: 
193: | Class | Definition | This System |
194: | :--- | :--- | :--- |
195: | Class A | No injury possible from software failure | — |
196: | **Class B** | **Possible injury, not death (monitoring aid)** | **MedMonitor** — monitoring aid, not life support |
197: | Class C | Death or serious injury possible | Pacemaker firmware, infusion pump — not applicable |
198: 
199: **Classification justification:** The system displays and alerts on vital signs but does not control any actuator, infusion, or life-support device. Failure to alert does not directly cause injury — nurse maintains primary observation duty.
200: 
201: **Intended Use Statement (HSA/MDA submission):** *"MedMonitor is a software application intended to acquire, store, and display physiological vital signs (HR, SpO2, Temperature) from connected sensors. It provides visual and auditory notifications when physiological parameters exceed clinician-defined thresholds to aid nursing staff in step-down or MIC@Home environments. It is not intended for active patient monitoring in life-threatening situations where immediate clinical action is required."*
202: 
203: ### 7.2 Software Requirements Specification (SRS)
204: 
205: | ID | Requirement | Verification |
206: | :--- | :--- | :--- |
207: | **SRS-001** | The system shall generate a CRITICAL alert within 5 seconds of detecting HR > 120 bpm or HR < 40 bpm. | Test: inject reading, verify alert row created within 5 s |
208: | **SRS-002** | The system shall generate a CRITICAL alert within 5 seconds of detecting SpO2 < 90%. | Test: inject reading, verify alert row created within 5 s |
209: | **SRS-003** | Alert resolution shall record the resolving user ID and timestamp. | Test: resolve via API with valid JWT, verify `audit_log` entry |
210: | **SRS-004** | All state-changing endpoints shall require a valid JWT with appropriate role claim. | Test: call without JWT, expect HTTP 401 |
211: | **SRS-005** | The system shall purge sensor readings older than 30 days automatically once per day. | Verify `sensor_readings` table contains no rows older than 30 days |
212: | **SRS-006** | Patient data export shall require explicit `consent=true` flag on the patient record. | Test: export with `consent=false`, expect HTTP 403 |
213: | **SRS-007** | A clinician resolving an alert must belong to the same department (ward) as the device that raised it. | Test: attempt resolve with different department, expect HTTP 403 |
214: | **SRS-008** | The audit log shall include a hash of the previous entry to detect tampering. | Test: modify a log entry → verification endpoint returns failure |
215: | **SRS-009** | The system shall enforce a 5-minute alarm suppression window per alert type per patient. | Test: trigger same alert type twice within 5 min, verify second alert suppressed |
216: 
217: ### 7.3 RBAC Matrix
218: 
219: | Action | Nurse | Doctor | Admin |
220: | :--- | :--- | :--- | :--- |
221: | View vitals / alerts | ✅ | ✅ | ✅ |
222: | Acknowledge / resolve alert (own ward) | ✅ | ✅ | ❌ |
223: | Set patient thresholds | ❌ | ✅ | ❌ |
224: | Admit / discharge patient | ❌ | ✅ | ❌ |
225: | Download shift report | ✅ | ✅ | ❌ |
226: | Manage users | ❌ | ❌ | ✅ |
227: | View audit log | ❌ | ✅ | ✅ |
228: 
229: ### 7.4 QMS Documentation Plan (`docs/qms-62304/`)
230: 
231: | Document | Purpose | Status |
232: | :--- | :--- | :--- |
233: | `SDP.md` | Software Development Plan — GitHub Actions, CI/CD pipeline | Phase 4 |
234: | `SRS.md` | Software Requirements Spec — testable statements (see §7.2) | Phase 4 |
235: | `SAD.md` | Software Architecture Document — safety segregation (backend vs UI) | Phase 4 |
236: | `SOUP.md` | Software of Unknown Provenance — .NET 8, React, Hangfire, PostgreSQL risk tracking | Phase 4 |
237: | `ISO14971_Risk_Matrix.md` | Hazard analysis with code-level mitigations | Phase 4 |
238: | `CER.md` | Clinical Evaluation Report — alarm fatigue PPV justification with citations | Phase 4 |
239: 
240: ---
241: 
242: ## 8. Gap Analysis vs. Production Standard (IEC 62304 Class B)
243: 
244: **Status:** ✔ Done | ~ Partial | ✘ Missing  
245: **Priority:** P0 = show-stopper | P1 = clinical completeness | P2 = professional polish | P3 = future work
246: 
247: ### 8.1 Data Acquisition
248: 
249: | Feature | Status | Priority | Notes |
250: | :--- | :--- | :--- | :--- |
251: | CSV replay simulator | ✔ Done | — | `device_simulator.py` with row offsets |
252: | HL7 / FHIR protocol parsing | ✘ Missing | P3 | Document as future work; add HL7v2 ADT stub |
253: | Device certificate & pairing | ✘ Missing | P3 | Add `devices.certificate_thumbprint` column + pairing endpoint |
254: | Sensor calibration log | ✘ Missing | P2 | New table: `calibration_records` (device_id, offset, calibrated_at, technician) |
255: 
256: ### 8.2 Clinical Logic & Alerting
257: 
258: | Feature | Status | Priority | Notes |
259: | :--- | :--- | :--- | :--- |
260: | HR global threshold | ✔ Done | — | `ReadingService` persists alert + broadcasts via SignalR |
261: | SpO2 alerting (persisted) | ✔ Done | — | Creates DB alert when SpO2 < 90 |
262: | Trend / rate-of-change alerting | ✔ Done | — | Alerts if HR delta >= 20 bpm between readings |
263: | Per-patient threshold overrides | ✔ Done | — | Queries `patient_thresholds` table with global fallback |
264: | Alarm fatigue suppression | ✔ Done | — | 5-minute rolling window per alert type |
265: | Alert resolution with actor + reason | ✔ Done | — | Immutable `audit_log` entry with `user_id` from JWT |
266: | Alert resolution ward check | ✔ Done | — | HTTP 403 if clinician department ≠ device department |
267: | Alert escalation (nurse → doctor) | ✘ Missing | P2 | If alert unacknowledged for N minutes, escalate severity |
268: | MEWS composite scoring | ✘ Missing | P1 | Sprint 4.2 — `ReadingService.cs` |
269: 
270: ### 8.3 Patient & Ward Management
271: 
272: | Feature | Status | Priority | Notes |
273: | :--- | :--- | :--- | :--- |
274: | Patient profiles (MRN, DOB) | ✔ Done | — | `patients` table seeded with synthetic data |
275: | Bed assignment flow | ✔ Done | — | `bed_assignments`; `DevicesController` returns current patient |
276: | Ward / site grouping | ✔ Done | — | Devices grouped by `devices.location` in React sidebar |
277: | Per-patient medication schedule | ✘ Missing | P3 | Table: `medication_schedules` — future work |
278: | Clinical notes (SOAP format) | ✘ Missing | P3 | Table: `clinical_notes` — future work |
279: 
280: ### 8.4 Authentication & Access Control
281: 
282: | Feature | Status | Priority | Notes |
283: | :--- | :--- | :--- | :--- |
284: | JWT infrastructure | ✔ Done | — | `[Authorize]` applied to all clinical controllers |
285: | RBAC (nurse / doctor / admin) | ~ Partial | P1 | Role claim in JWT; granular `[Authorize(Roles=...)]` checks needed |
286: | Login / logout UI | ✔ Done | — | React login page with session persistence and auto token refresh |
287: | Audit trail | ✔ Done | — | Immutable `audit_log` table with HMAC chain |
288: | 2FA / Hospital AD SSO | ✘ Missing | P3 | Out of scope — document as future integration point |
289: 
290: ### 8.5 Reporting & Data Export
291: 
292: | Feature | Status | Priority | Notes |
293: | :--- | :--- | :--- | :--- |
294: | Grafana operations dashboard | ✔ Done | — | Provisioned: Loki log panel + VictoriaMetrics ingestion rate |
295: | Clinical shift handover (PDF) | ✔ Done | — | QuestPDF: 8-hour window summary per bed |
296: | Vitals trend chart in PDF | ✘ Missing | P2 | Render Recharts to image server-side or SVG in QuestPDF |
297: | Data export CSV / FHIR R4 | ✘ Missing | P3 | 3–6 weeks effort — document as future work |
298: 
299: ### 8.6 Regulatory & Compliance
300: 
301: | Feature | Status | Priority | Notes |
302: | :--- | :--- | :--- | :--- |
303: | TLS in transit (HTTPS) | ~ Partial | P1 | Nginx handles TLS termination; enforce HTTPS redirect |
304: | Data at-rest encryption | ~ Partial | P1 | Supabase TDE enabled; document and verify in SRS |
305: | PDPA consent model | ✔ Done | — | `consent` flag on `patients` table; export blocked without `consent=true` |
306: | IEC 62304 SRS / QMS docs | ✘ Missing | P1 | Sprint 4.4 — populate `docs/qms-62304/` |
307: | Data retention purge (30 days) | ✔ Done | — | Hangfire job; aligns with PDPA Principle 7 |
308: 
309: ### 8.7 Operations & Resilience
310: 
311: | Feature | Status | Priority | Notes |
312: | :--- | :--- | :--- | :--- |
313: | EF Core retry-on-failure | ✔ Done | — | 3 retries, 5 s delay |
314: | Supabase keep-alive | ✔ Done | — | GitHub Actions pings `/api/devices` every 3 days |
315: | Health check endpoint | ✔ Done | — | `/health` (liveness) and `/health/db` (EF Core readiness) |
316: | Swagger with bearer auth | ✔ Done | — | `AddSecurityDefinition('Bearer')` enabled |
317: | Offline / edge buffer | ✘ Missing | P2 | Sprint 4.3 — Python sim: queue + retry with backoff |
318: | Backup / disaster recovery | ✘ Missing | P3 | Supabase PITR; document RPO/RTO in SRS |
319: 
320: ---
321: 
322: ## 9. Integrated Execution Roadmap
323: 
324: ### ✅ Phase 1 & 2: Infrastructure & Clinical Core (S0–S2)
325: - [x] Multi-stage Docker setup, VictoriaMetrics + Loki + Grafana
326: - [x] JWT Auth, Patient ADT (Admit/Discharge/Transfer), Multi-vital thresholds
327: - [x] QuestPDF shift handover report generation
328: - [x] Health checks (liveness + readiness), Swagger bearer auth
329: 
330: ### ✅ Phase 3: Production Security Hardening (S3)
331: - [x] **RLS Session Isolation:** Manual connection lifecycle on Port 5432 via `set_config()`
332: - [x] **Data Retention:** Hangfire job for 30-day auto-purge (PDPA Principle 7)
333: - [x] **Audit Chain:** HMAC-SHA256 cryptography for immutable clinical action logging
334: - [x] **Ward Isolation:** Alert resolution restricted to clinician's own department
335: 
336: ### 🚀 Phase 4: Clinical Sandbox & Investigational Testing (S4–S5)
337: - [ ] **Sprint 4.1 (Engineering):** Refactor `AuditService.cs` — wrap locks in `BeginTransactionAsync()`.
338: - [ ] **Sprint 4.2 (Engineering):** Implement **Dynamic RBAC Schema** and `[RequirePermission]` middleware.
339: - [ ] **Sprint 4.3 (Engineering):** Implement **MEWS scoring algorithm** in `ReadingService.cs`.
340: - [ ] **Sprint 4.4 (Engineering):** Edge buffering in Python simulator for MIC@Home Wi-Fi dropouts.
341: - [ ] **Sprint 4.5 (Regulatory):** Populate `docs/qms-62304/` templates.
342: - [ ] **Sprint 4.6 (Clinical):** Finalize CER with citations (IEC 60601-1-8, Cvach 2012).
343: 
344: ### 🟢 Phase 5: Enterprise Scale & Polish (S6)
345: - [ ] **Sprint 5.1 (Engineering):** Migrate to Transaction Pooler (Port 6543) via EF Core `DbCommandInterceptor`
346: - [ ] **Sprint 5.2 (Engineering):** mTLS IoT Security — replace static `X-Device-Api-Key` with X.509 client certificates
347: - [ ] **Sprint 5.3 (DevOps):** Final production deployment (Render / Railway / AWS MY Region); README screenshots + GIF
348: 
349: ---
350: 
351: ## 10. Project Folder Structure
352: 
353: ```
354: medical-device-monitoring/
355: ├── frontend/                  # React 19 + Vite
356: │   ├── src/
357: │   └── Dockerfile
358: ├── backend/                   # .NET 8 Web API (C#)
359: │   ├── Controllers/
360: │   ├── Hubs/                  # SignalR hub
361: │   ├── Services/              # Core business logic (ReadingService, AuditService)
362: │   ├── Models/
363: │   └── Dockerfile
364: ├── database/                  # Simulation & Data
365: │   ├── device_simulator.py    # Python script to replay Kaggle CSV
366: │   ├── requirements.txt
367: │   └── venv/
368: ├── supabase/                  # Cloud Infrastructure
369: │   └── migrations/            # Timestamped .sql files (DevOps way)
370: ├── docker/                    # Infrastructure configurations
371: │   ├── nginx.conf
372: │   ├── loki-config.yml
373: │   └── grafana/               # Dashboards & datasource provisioning
374: ├── docs/
375: │   └── qms-62304/             # IEC 62304 / ISO 13485 QMS templates
376: │       ├── SDP.md
377: │       ├── SRS.md
378: │       ├── SAD.md
379: │       ├── SOUP.md
380: │       ├── ISO14971_Risk_Matrix.md
381: │       └── CER.md
382: ├── docker-compose.yml
383: ├── .env.example
384: └── README.md
385: ```
386: 
387: ---
388: 
389: ## 11. Risk Register
390: 
391: | Risk | Severity | Mitigation |
392: | :--- | :--- | :--- |
393: | Connection pool poisoning | High | Session variable clearing in `Program.cs` middleware + Port 5432 |
394: | Audit chain forking | Medium | Sprint 4.1 — `BeginTransactionAsync()` wrapping in `AuditService.cs` (in progress) |
395: | Alarm fatigue | High | 5-min suppression window (current); MEWS composite scoring (Sprint 4.2, planned) |
396: | PDPA non-compliance | Medium | Automated 30-day purge + consent-based export blocking |
397: | TCP ports blocked on PaaS | Medium | WebSocket fallback in cloud; raw TCP for local testing — documented in README |
398: | JSONB query slowness | Low | GIN index on payload column; Nth-point decimation in `ReadingService` |
399: | Supabase auto-pause | Medium | GitHub Actions keepalive every 3 days; manual restore before demonstrations |
400: | Sensor readings table > 500 MB | High | 30-day Hangfire purge job; daily size monitoring alert |
401: | FHIR integration not delivered | Medium | De-prioritised to P3; documented as future work (3–6 weeks effort) |
402: | HSA sandbox requires SG partner | High | Pursue MDA investigational testing first; approach Synapxe/SingHealth with pilot data |
403: | SRS-005 retention conflict | Resolved | 30-day clinical data purge (PDPA); 15-day system metrics (PMS) — both documented |
404: | Stale Permissions | Medium | Implement `token_version` on `users` table; increment on role/group change to invalidate JWTs. |
405: | Permission Over-privilege | High | Atomic permission catalogue ensures users only have access to specific resources (e.g., `audit:view` for Doctors but not Nurses). |
406: 
407: ---
408: 
409: ## 12. Deployment
410: 
411: | Tier | Service | Notes |
412: | :--- | :--- | :--- |
413: | **Database** | Supabase Free | 500 MB storage. Pauses after 7 days inactivity — keepalive workflow active. Enable PITR for backup. |
414: | **Backend** | Render / Railway / AWS MY | .NET Docker container. Set `SUPABASE_CONN_STRING`, `JWT_SECRET`, `LOKI_URL` as env vars. |
415: | **Frontend** | Vercel / Netlify | Set `VITE_BACKEND_URL` to live backend URL. |
416: | **Monitoring** | Docker Compose | VictoriaMetrics + Loki + Grafana run locally or on a small VPS alongside the app. |
417: 
418: *AWS MY Region is the target for production deployment to satisfy Malaysian data residency expectations under PDPA.*
419: 
420: ---
421: 
422: ## 13. Dependency Rationale
423: 
424: ### Backend (.NET 8)
425: - **DotNetEnv** — loads `.env` at startup; prevents secrets from reaching Git
426: - **Npgsql.EntityFrameworkCore.PostgreSQL** — supports JSONB type mapping via `HasColumnType("jsonb")`
427: - **Swashbuckle** — OpenAPI/Swagger UI with bearer security definition
428: - **QuestPDF** — pure .NET PDF generation; no external runtime dependency
429: - **Hangfire** — scheduled data retention purge job (30-day `sensor_readings` delete)
430: - **System.Security.Cryptography** (built-in) — HMAC-SHA256 for audit log integrity
431: 
432: ### Simulation (Python)
433: - **venv** — isolates `requests`, `python-dotenv`, `python-logging-loki` from system Python
434: - **python-dotenv** — shares root `.env` with backend; single source of truth for `BACKEND_API_URL`
435: 
436: ### DevOps
437: - **Supabase CLI** — migration-based schema management; every change is a timestamped `.sql` file
438: - **dotenv-cli** — injects env vars into Supabase CLI commands without polluting the shell
439: 
440: ### Monitoring
441: - **VictoriaMetrics** — 10× lower RAM footprint than Prometheus; identical PromQL query language
442: - **Loki** — label-indexed log aggregation; device-scoped and level-scoped LogQL queries in Grafana
443: - **Grafana** — pre-provisioned datasources and dashboard JSON for plug-and-play setup
444: 
445: ---
446: 
447: ## 14. Frontend Rationale
448: 
449: | Factor | React 19 + Vite | Vue 3 + Vite |
450: | :--- | :--- | :--- |
451: | Component ecosystem | Extensive | Sufficient |
452: | State management | Robust (Hooks/Context) | Built-in (Ref/Reactive) |
453: | Performance | Optimised for Recharts | Slightly smoother |
454: | Scalability | Industry standard | High |
455: 
456: **Recommended UI stack:** React 19 + Vite + Recharts + Tailwind CSS. shadcn/ui for form components (login, discharge modal, threshold editor).
457: 
458: ---
459: 
460: ## 15. Documentation & Architecture Strategy
461: 
462: 1. **Architecture Diagram** — Mermaid diagram: *Device Simulator → .NET API → Supabase Postgres → SignalR → React UI*
463: 2. **Challenges & Solutions** — document high-frequency data spike handling via server-side decimation in .NET
464: 3. **Tech Choice Justifications** — "Used Supabase strictly as managed Postgres to maintain ownership of custom RDBMS schemas and SignalR hubs"
465: 4. **Safety Standards** — highlight IEC 62304 Class B framing to define safety-critical software boundaries
466: 5. **TCP/Cloud Trade-off** — justify WebSocket simulation in cloud vs. raw TCP in local environments
467: 6. **SYNTHETIC DATA banner** — all patient data is from Kaggle ICU simulation; must be prominent in README
468: 
469: ---
470: 
471: *This document is the Single Source of Truth for MedMonitor development. All prior versions (v2, v3.0) are superseded.*
</file>

<file path="frontend/Dockerfile">
 1: FROM node:20-alpine AS build
 2: WORKDIR /app
 3: COPY package*.json ./
 4: RUN npm install
 5: COPY . .
 6: RUN npm run build
 7: 
 8: FROM nginx:alpine
 9: COPY --from=build /app/dist /usr/share/nginx/html
10: # Nginx config for SPA routing is handled by the root docker/nginx.conf
11: EXPOSE 80
12: CMD ["nginx", "-g", "daemon off;"]
</file>

<file path="frontend/eslint.config.js">
 1: import js from '@eslint/js'
 2: import globals from 'globals'
 3: import reactHooks from 'eslint-plugin-react-hooks'
 4: import reactRefresh from 'eslint-plugin-react-refresh'
 5: import { defineConfig, globalIgnores } from 'eslint/config'
 6: export default defineConfig([
 7:   globalIgnores(['dist']),
 8:   {
 9:     files: ['**/*.{js,jsx}'],
10:     extends: [
11:       js.configs.recommended,
12:       reactHooks.configs.flat.recommended,
13:       reactRefresh.configs.vite,
14:     ],
15:     languageOptions: {
16:       ecmaVersion: 2020,
17:       globals: globals.browser,
18:       parserOptions: {
19:         ecmaVersion: 'latest',
20:         ecmaFeatures: { jsx: true },
21:         sourceType: 'module',
22:       },
23:     },
24:     rules: {
25:       'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
26:     },
27:   },
28: ])
</file>

<file path="frontend/index.html">
 1: <!doctype html>
 2: <html lang="en">
 3:   <head>
 4:     <meta charset="UTF-8" />
 5:     <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
 6:     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 7:     <title>frontend</title>
 8:   </head>
 9:   <body>
10:     <div id="root"></div>
11:     <script type="module" src="/src/main.jsx"></script>
12:   </body>
13: </html>
</file>

<file path="frontend/package.json">
 1: {
 2:   "name": "frontend",
 3:   "private": true,
 4:   "version": "0.0.0",
 5:   "type": "module",
 6:   "scripts": {
 7:     "dev": "vite",
 8:     "build": "vite build",
 9:     "lint": "eslint .",
10:     "preview": "vite preview"
11:   },
12:   "dependencies": {
13:     "@microsoft/signalr": "^10.0.0",
14:     "axios": "^1.15.2",
15:     "lucide-react": "^1.8.0",
16:     "react": "^19.2.5",
17:     "react-dom": "^19.2.5",
18:     "recharts": "^3.8.1"
19:   },
20:   "devDependencies": {
21:     "@eslint/js": "^9.39.4",
22:     "@tailwindcss/vite": "^4.2.4",
23:     "@types/react": "^19.2.14",
24:     "@types/react-dom": "^19.2.3",
25:     "@vitejs/plugin-react": "^6.0.1",
26:     "eslint": "^9.39.4",
27:     "eslint-plugin-react-hooks": "^7.1.1",
28:     "eslint-plugin-react-refresh": "^0.5.2",
29:     "globals": "^17.5.0",
30:     "tailwindcss": "^4.2.4",
31:     "vite": "^8.0.9"
32:   }
33: }
</file>

<file path="frontend/src/App.css">
  1: .counter {
  2:   font-size: 16px;
  3:   padding: 5px 10px;
  4:   border-radius: 5px;
  5:   color: var(--accent);
  6:   background: var(--accent-bg);
  7:   border: 2px solid transparent;
  8:   transition: border-color 0.3s;
  9:   margin-bottom: 24px;
 10:   &:hover {
 11:     border-color: var(--accent-border);
 12:   }
 13:   &:focus-visible {
 14:     outline: 2px solid var(--accent);
 15:     outline-offset: 2px;
 16:   }
 17: }
 18: .hero {
 19:   position: relative;
 20:   .base,
 21:   .framework,
 22:   .vite {
 23:     inset-inline: 0;
 24:     margin: 0 auto;
 25:   }
 26:   .base {
 27:     width: 170px;
 28:     position: relative;
 29:     z-index: 0;
 30:   }
 31:   .framework,
 32:   .vite {
 33:     position: absolute;
 34:   }
 35:   .framework {
 36:     z-index: 1;
 37:     top: 34px;
 38:     height: 28px;
 39:     transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
 40:       scale(1.4);
 41:   }
 42:   .vite {
 43:     z-index: 0;
 44:     top: 107px;
 45:     height: 26px;
 46:     width: auto;
 47:     transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
 48:       scale(0.8);
 49:   }
 50: }
 51: #center {
 52:   display: flex;
 53:   flex-direction: column;
 54:   gap: 25px;
 55:   place-content: center;
 56:   place-items: center;
 57:   flex-grow: 1;
 58:   @media (max-width: 1024px) {
 59:     padding: 32px 20px 24px;
 60:     gap: 18px;
 61:   }
 62: }
 63: #next-steps {
 64:   display: flex;
 65:   border-top: 1px solid var(--border);
 66:   text-align: left;
 67:   & > div {
 68:     flex: 1 1 0;
 69:     padding: 32px;
 70:     @media (max-width: 1024px) {
 71:       padding: 24px 20px;
 72:     }
 73:   }
 74:   .icon {
 75:     margin-bottom: 16px;
 76:     width: 22px;
 77:     height: 22px;
 78:   }
 79:   @media (max-width: 1024px) {
 80:     flex-direction: column;
 81:     text-align: center;
 82:   }
 83: }
 84: #docs {
 85:   border-right: 1px solid var(--border);
 86:   @media (max-width: 1024px) {
 87:     border-right: none;
 88:     border-bottom: 1px solid var(--border);
 89:   }
 90: }
 91: #next-steps ul {
 92:   list-style: none;
 93:   padding: 0;
 94:   display: flex;
 95:   gap: 8px;
 96:   margin: 32px 0 0;
 97:   .logo {
 98:     height: 18px;
 99:   }
100:   a {
101:     color: var(--text-h);
102:     font-size: 16px;
103:     border-radius: 6px;
104:     background: var(--social-bg);
105:     display: flex;
106:     padding: 6px 12px;
107:     align-items: center;
108:     gap: 8px;
109:     text-decoration: none;
110:     transition: box-shadow 0.3s;
111:     &:hover {
112:       box-shadow: var(--shadow);
113:     }
114:     .button-icon {
115:       height: 18px;
116:       width: 18px;
117:     }
118:   }
119:   @media (max-width: 1024px) {
120:     margin-top: 20px;
121:     flex-wrap: wrap;
122:     justify-content: center;
123:     li {
124:       flex: 1 1 calc(50% - 8px);
125:     }
126:     a {
127:       width: 100%;
128:       justify-content: center;
129:       box-sizing: border-box;
130:     }
131:   }
132: }
133: #spacer {
134:   height: 88px;
135:   border-top: 1px solid var(--border);
136:   @media (max-width: 1024px) {
137:     height: 48px;
138:   }
139: }
140: .ticks {
141:   position: relative;
142:   width: 100%;
143:   &::before,
144:   &::after {
145:     content: '';
146:     position: absolute;
147:     top: -4.5px;
148:     border: 5px solid transparent;
149:   }
150:   &::before {
151:     left: 0;
152:     border-left-color: var(--border);
153:   }
154:   &::after {
155:     right: 0;
156:     border-right-color: var(--border);
157:   }
158: }
</file>

<file path="frontend/src/main.jsx">
1: import { StrictMode } from 'react'
2: import { createRoot } from 'react-dom/client'
3: import './index.css'
4: import App from './App.jsx'
5: createRoot(document.getElementById('root')).render(
6:   <StrictMode>
7:     <App />
8:   </StrictMode>,
9: )
</file>

<file path="frontend/vite.config.js">
1: import { defineConfig } from 'vite'
2: import react from '@vitejs/plugin-react'
3: import tailwindcss from '@tailwindcss/vite'
4: export default defineConfig({
5:   plugins: [
6:     react(),
7:     tailwindcss(),
8:   ],
9: })
</file>

<file path=".github/workflows/keepalive.yml">
 1: name: Supabase Keep-Alive Ping
 2: on:
 3:   schedule:
 4:     # Runs at 00:00 every 3rd day
 5:     - cron: '0 0 */3 * *'
 6:   workflow_dispatch: # Allows manual trigger from GH UI
 7: jobs:
 8:   ping:
 9:     runs-on: ubuntu-latest
10:     steps:
11:       - name: Call health check to wake database
12:         # /health — liveness check (fast, no DB query)
13:         # /health/db — readiness check (confirms Supabase Postgres is reachable)
14:         # Update YOUR_APP_NAME once deployed to Render/Railway
15:         run: |
16:           STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-app-name.onrender.com/health)
17:           echo "Health check responded with HTTP $STATUS"
18:           if [ "$STATUS" != "200" ]; then
19:             echo "::warning::Health check returned $STATUS — backend may be sleeping or unhealthy"
20:           fi
</file>

<file path="backend/controllers/patients_controller.cs">
 1: using MedicalDeviceMonitor.Data;
 2: using MedicalDeviceMonitor.Services;
 3: using MedicalDeviceMonitor.Models;
 4: using Microsoft.AspNetCore.Authorization;
 5: using Microsoft.AspNetCore.Mvc;
 6: using Microsoft.EntityFrameworkCore;
 7: using System.Security.Claims;
 8: namespace MedicalDeviceMonitor.Controllers;
 9: [Authorize]
10: [ApiController]
11: [Route("api/[controller]")]
12: public class PatientsController : ControllerBase
13: {
14:     private readonly AppDbContext _db;
15:     private readonly MedicationService _medService;
16:     public PatientsController(AppDbContext db, MedicationService medService)
17:     {
18:         _db = db;
19:         _medService = medService;
20:     }
21:     [HttpPost("debug/check-meds")]
22:     public async Task<IActionResult> TriggerMedCheck()
23:     {
24:         await _medService.CheckOverdueMedicationsAsync();
25:         return Ok(new { message = "Overdue medication scan completed manually." });
26:     }
27:     [HttpGet("{id}/export")]
28:     public async Task<IActionResult> ExportPatientData(Guid id)
29:     {
30:         var patient = await _db.Patients.FindAsync(id);
31:         if (patient == null) return NotFound();
32:         // SRS-006: Patient data export shall require explicit consent=true flag
33:         if (!patient.Consent)
34:         {
35:             return StatusCode(403, new 
36:             { 
37:                 error = "PDPA_CONSENT_REQUIRED", 
38:                 message = "Patient has not provided explicit consent for data export." 
39:             });
40:         }
41:         // Return the secure export payload
42:         return Ok(new
43:         {
44:             patient.Mrn,
45:             patient.FullName,
46:             patient.DateOfBirth,
47:             patient.Gender,
48:             patient.BloodType,
49:             patient.Allergies,
50:             ExportedAt = DateTime.UtcNow,
51:             Disclaimer = "Exported in accordance with PDPA guidelines. This document contains protected health information (PHI)."
52:         });
53:     }
54:     [HttpPost("{id}/discharge")]
55:     public async Task<IActionResult> DischargePatient(Guid id, [FromQuery] string? notes)
56:     {
57:         var strategy = _db.Database.CreateExecutionStrategy();
58:         return await strategy.ExecuteAsync<IActionResult>(async () => 
59:         {
60:             using var transaction = await _db.Database.BeginTransactionAsync();
61:             try 
62:             {
63:                 var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
64:                 // 1. Find the active assignment (linked to filtered DbContext)
65:                 var assignment = await _db.BedAssignments
66:                     .FirstOrDefaultAsync(b => b.PatientId == id && b.DischargedAt == null);
67:                 if (assignment == null) 
68:                     return BadRequest(new { error = "Patient is not currently admitted to any bed." });
69:                 var deviceId = assignment.DeviceId;
70:                 // 2. End the assignment
71:                 assignment.DischargedAt = DateTime.UtcNow;
72:                 // 3. Record the ADT event
73:                 var transfer = new PatientTransfer {
74:                     PatientId = id,
75:                     FromDeviceId = deviceId,
76:                     ToDeviceId = null,
77:                     ActionType = "DISCHARGE",
78:                     PerformedBy = userId,
79:                     Notes = notes
80:                 };
81:                 _db.PatientTransfers.Add(transfer);
82:                 await _db.SaveChangesAsync();
83:                 await transaction.CommitAsync();
84:                 return Ok(new { message = "Patient discharged successfully." });
85:             } 
86:             catch 
87:             {
88:                 await transaction.RollbackAsync();
89:                 throw;
90:             }
91:         });
92:     }
93: }
</file>

<file path="backend/services/audit_service.cs">
 1: using System.Security.Cryptography;
 2: using System.Text;
 3: using System.Text.Json;
 4: using MedicalDeviceMonitor.Data;
 5: using MedicalDeviceMonitor.Models;
 6: using Microsoft.EntityFrameworkCore;
 7: namespace MedicalDeviceMonitor.Services;
 8: public class AuditService
 9: {
10:     private readonly AppDbContext _db;
11:     private readonly string _hmacKey;
12:     private readonly ILogger<AuditService> _logger;
13:     public AuditService(AppDbContext db, IConfiguration config, ILogger<AuditService> logger)
14:     {
15:         _db = db;
16:         _logger = logger;
17:         _hmacKey = Environment.GetEnvironmentVariable("AUDIT_HMAC_SECRET") 
18:             ?? config["Audit:HmacSecret"] 
19:             ?? "FallbackAuditSecretKey123!@#";
20:     }
21:     public async Task LogActionAsync(Guid? userId, string action, string entityType, string entityId, object? detail = null)
22:     {
23:         // Lock table to prevent race conditions during hash chain calculation
24:         await _db.Database.ExecuteSqlRawAsync("LOCK TABLE audit_log IN EXCLUSIVE MODE;");
25:         var lastLog = await _db.AuditLogs
26:             .OrderByDescending(a => a.Id)
27:             .FirstOrDefaultAsync();
28:         string? previousHash = lastLog?.Hash;
29:         var auditLog = new AuditLog
30:         {
31:             UserId = userId,
32:             Action = action,
33:             EntityType = entityType,
34:             EntityId = entityId,
35:             Detail = detail != null ? JsonSerializer.Serialize(detail) : null,
36:             OccurredAt = DateTime.UtcNow,
37:             PreviousHash = previousHash
38:         };
39:         auditLog.Hash = CalculateHash(auditLog);
40:         _db.AuditLogs.Add(auditLog);
41:         await _db.SaveChangesAsync();
42:         _logger.LogInformation("Audit log entry created for {Action} on {EntityType} {EntityId}", action, entityType, entityId);
43:     }
44:     private string CalculateHash(AuditLog log)
45:     {
46:         var timeStr = log.OccurredAt.ToString("yyyy-MM-dd HH:mm:ss.fff");
47:         // Ensure Detail is treated consistently (null vs empty string)
48:         string detailStr = string.IsNullOrEmpty(log.Detail) ? "NULL" : log.Detail;
49:         var rawData = $"{log.UserId?.ToString() ?? "NULL"}|{log.Action}|{log.EntityType}|{log.EntityId}|{detailStr}|{timeStr}|{log.PreviousHash ?? "NULL"}";
50:         using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_hmacKey));
51:         var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawData));
52:         return Convert.ToHexString(hashBytes).ToLower();
53:     }
54:     public async Task<bool> VerifyChainAsync()
55:     {
56:         // .AsNoTracking() forces EF Core to read fresh data from Postgres 
57:         // bypassing the internal memory cache.
58:         var logs = await _db.AuditLogs
59:             .AsNoTracking()
60:             .OrderBy(a => a.Id)
61:             .ToListAsync();
62:         if (!logs.Any()) return true; // Empty is technically "intact"
63:         string? expectedPrev = null;
64:         foreach (var log in logs)
65:         {
66:             if (log.PreviousHash != expectedPrev) 
67:             {
68:                 _logger.LogWarning("Audit chain broken at ID {Id}: PreviousHash mismatch", log.Id);
69:                 return false;
70:             }
71:             var recalculated = CalculateHash(log);
72:             if (log.Hash != recalculated) 
73:             {
74:                 _logger.LogWarning("Audit chain broken at ID {Id}: Hash mismatch", log.Id);
75:                 return false;
76:             }
77:             expectedPrev = log.Hash;
78:         }
79:         return true;
80:     }
81: }
</file>

<file path="backend/services/medication_service.cs">
 1: using MedicalDeviceMonitor.Data;
 2: using MedicalDeviceMonitor.Models;
 3: using Microsoft.EntityFrameworkCore;
 4: namespace MedicalDeviceMonitor.Services;
 5: public class MedicationService
 6: {
 7:     private readonly AppDbContext _db;
 8:     private readonly ILogger<MedicationService> _logger;
 9:     public MedicationService(AppDbContext db, ILogger<MedicationService> logger)
10:     {
11:         _db = db;
12:         _logger = logger;
13:     }
14:     public async Task CheckOverdueMedicationsAsync()
15:     {
16:         await _db.Database.OpenConnectionAsync();
17:         try
18:         {
19:             await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', 'system', false)");
20:             var now = DateTime.UtcNow;
21:             // Find meds scheduled in the past that are still 'scheduled' and not administered
22:             var overdueMeds = await _db.Set<MedicationSchedule>()
23:                 .Where(m => m.Status == "scheduled" && m.ScheduledAt < now.AddMinutes(-30))
24:                 .ToListAsync();
25:         foreach (var med in overdueMeds)
26:         {
27:             med.Status = "overdue";
28:             // Link to the device the patient is currently in (if any) to trigger a bed alert
29:             var currentBed = await _db.BedAssignments
30:                 .IgnoreQueryFilters()
31:                 .FirstOrDefaultAsync(b => b.PatientId == med.PatientId && b.DischargedAt == null);
32:             if (currentBed != null)
33:             {
34:                 _db.Alerts.Add(new Alert {
35:                     DeviceId = currentBed.DeviceId,
36:                     AlertType = "MISSED_MEDICATION",
37:                     Severity = "WARNING",
38:                     Message = $"Overdue Medication: {med.MedicationName} ({med.Dosage}) was scheduled for {med.ScheduledAt:HH:mm}",
39:                     CreatedAt = DateTime.UtcNow
40:                 });
41:             }
42:         }
43:         await _db.SaveChangesAsync();
44:         }
45:         finally
46:         {
47:             await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', '', false)");
48:             await _db.Database.CloseConnectionAsync();
49:         }
50:     }
51: }
</file>

<file path="backend/services/retention_service.cs">
 1: using MedicalDeviceMonitor.Data;
 2: using Microsoft.EntityFrameworkCore;
 3: using Microsoft.Extensions.Logging;
 4: namespace MedicalDeviceMonitor.Services;
 5: public class RetentionService
 6: {
 7:     private readonly AppDbContext _db;
 8:     private readonly ILogger<RetentionService> _logger;
 9:     public RetentionService(AppDbContext db, ILogger<RetentionService> logger)
10:     {
11:         _db = db;
12:         _logger = logger;
13:     }
14:     public async Task PurgeOldReadingsAsync()
15:     {
16:         var cutoff = DateTime.UtcNow.AddDays(-30);
17:         await _db.Database.OpenConnectionAsync();
18:         try
19:         {
20:             // Grant background job bypass rights for RLS
21:             await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', 'system', false)");
22:             var deleted = await _db.Database.ExecuteSqlRawAsync(
23:                 "DELETE FROM sensor_readings WHERE recorded_at < {0}", cutoff);
24:             _logger.LogInformation("Retention job: purged {Count} sensor readings older than {Cutoff}", deleted, cutoff);
25:         }
26:         finally
27:         {
28:             // Clean up pool
29:             await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', '', false)");
30:             await _db.Database.CloseConnectionAsync();
31:         }
32:     }
33: }
</file>

<file path="docker/loki-config.yml">
 1: # ============================================================
 2: # Loki Configuration — 15-day retention
 3: # ============================================================
 4: auth_enabled: false
 5: server:
 6:   http_listen_port: 3100
 7:   grpc_listen_port: 9096
 8: common:
 9:   path_prefix: /loki
10:   storage:
11:     filesystem:
12:       chunks_directory: /loki/chunks
13:       rules_directory: /loki/rules
14:   replication_factor: 1
15:   ring:
16:     instance_addr: 127.0.0.1
17:     kvstore:
18:       store: inmemory
19: schema_config:
20:   configs:
21:     - from: 2024-01-01
22:       store: tsdb
23:       object_store: filesystem
24:       schema: v13
25:       index:
26:         prefix: index_
27:         period: 24h
28: # ─── Retention: auto-purge logs older than 15 days ──────────
29: limits_config:
30:   retention_period: 360h        # 15 days × 24h = 360h
31: compactor:
32:   working_directory: /loki/compactor 
33:   delete_request_store: filesystem
34:   compaction_interval: 10m
35:   retention_enabled: true       
36:   retention_delete_delay: 2h
37:   retention_delete_worker_count: 150
38: ruler:
39:   alertmanager_url: http://localhost:9093
40: analytics:
41:   reporting_enabled: false
</file>

<file path="frontend/src/index.css">
1: @import "tailwindcss";
2: body {
3:     background-color: rgb(2, 6, 23);
4:     color: rgb(248, 250, 252);
5: }
</file>

<file path="frontend/src/Login.jsx">
  1: import React, { useState } from 'react';
  2: import axios from 'axios';
  3: import { Activity, Lock, Mail, Loader2 } from 'lucide-react';
  4: export default function Login({ setAuth, backendUrl }) {
  5:   const [email, setEmail] = useState('admin@medmonitor.local');
  6:   const [password, setPassword] = useState('Admin123!');
  7:   const [twoFactorCode, setTwoFactorCode] = useState('');
  8:   const [needs2FA, setNeeds2FA] = useState(false);
  9:   const [error, setError] = useState('');
 10:   const [loading, setLoading] = useState(false);
 11:   const handleLogin = async (e) => {
 12:     e.preventDefault();
 13:     setLoading(true);
 14:     setError('');
 15:     try {
 16:       const payload = { email, password };
 17:       if (needs2FA) payload.twoFactorCode = twoFactorCode;
 18:       const res = await axios.post(`${backendUrl}/api/Auth/login`, payload);
 19:       // Pass the token and user data up to the main App
 20:       setAuth(res.data.token, res.data.user);
 21:     } catch (err) {
 22:       const serverError = err.response?.data?.error;
 23:       const serverMessage = err.response?.data?.message;
 24:       if (serverError === '2FA_REQUIRED') {
 25:         setNeeds2FA(true);
 26:         setError(''); // Clear error to show 2FA screen cleanly
 27:       } else {
 28:         setError(serverMessage || serverError || 'Failed to connect to server');
 29:       }
 30:     } finally {
 31:       setLoading(false);
 32:     }
 33:   };
 34:   return (
 35:     <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-200">
 36:       <div className="sm:mx-auto sm:w-full sm:max-w-md">
 37:         <div className="flex justify-center text-emerald-400">
 38:           <Activity size={48} />
 39:         </div>
 40:         <h2 className="mt-6 text-center text-3xl font-extrabold text-white">MedMonitor Command Center</h2>
 41:         <p className="mt-2 text-center text-sm text-slate-400">Restricted Clinical Access System</p>
 42:       </div>
 43:       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
 44:         <div className="bg-slate-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-800">
 45:           <form className="space-y-6" onSubmit={handleLogin}>
 46:             {!needs2FA ? (
 47:               <>
 48:                 <div>
 49:                   <label className="block text-sm font-medium text-slate-300">Email address</label>
 50:                   <div className="mt-1 relative rounded-md shadow-sm">
 51:                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 52:                       <Mail className="h-5 w-5 text-slate-500" />
 53:                     </div>
 54:                     <input
 55:                       type="email"
 56:                       value={email}
 57:                       onChange={(e) => setEmail(e.target.value)}
 58:                       className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-2.5 sm:text-sm"
 59:                       required
 60:                     />
 61:                   </div>
 62:                 </div>
 63:                 <div>
 64:                   <label className="block text-sm font-medium text-slate-300">Password</label>
 65:                   <div className="mt-1 relative rounded-md shadow-sm">
 66:                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 67:                       <Lock className="h-5 w-5 text-slate-500" />
 68:                     </div>
 69:                     <input
 70:                       type="password"
 71:                       value={password}
 72:                       onChange={(e) => setPassword(e.target.value)}
 73:                       className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-2.5 sm:text-sm"
 74:                       required
 75:                     />
 76:                   </div>
 77:                 </div>
 78:               </>
 79:             ) : (
 80:               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
 81:                 <label className="block text-sm font-medium text-slate-300">Authenticator Code</label>
 82:                 <p className="text-xs text-slate-500 mb-3 mt-1">Please enter the 6-digit code from your authenticator app.</p>
 83:                 <div className="mt-1 relative rounded-md shadow-sm">
 84:                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 85:                     <Lock className="h-5 w-5 text-emerald-500" />
 86:                   </div>
 87:                   <input
 88:                     type="text"
 89:                     maxLength={6}
 90:                     pattern="\d{6}"
 91:                     value={twoFactorCode}
 92:                     onChange={(e) => setTwoFactorCode(e.target.value)}
 93:                     placeholder="000000"
 94:                     className="bg-slate-950 border border-slate-700 text-emerald-400 font-mono tracking-widest text-center text-lg rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-2.5"
 95:                     required
 96:                     autoFocus
 97:                   />
 98:                 </div>
 99:                 <button 
100:                   type="button" 
101:                   onClick={() => { setNeeds2FA(false); setTwoFactorCode(''); }}
102:                   className="mt-4 text-xs text-slate-400 hover:text-white transition w-full text-center"
103:                 >
104:                   &larr; Back to password
105:                 </button>
106:               </div>
107:             )}
108:             {error && <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-900/50">{error}</div>}
109:             <button
110:               type="submit"
111:               disabled={loading}
112:               className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
113:             >
114:               {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Authenticate'}
115:             </button>
116:           </form>
117:         </div>
118:       </div>
119:     </div>
120:   );
121: }
</file>

<file path="package.json">
 1: {
 2:   "name": "med-device-monitor-ops",
 3:   "version": "1.0.0",
 4:   "description": "Database management scripts",
 5:   "scripts": {
 6:     "run-sql": "dotenv -- npx supabase db query --linked --file"
 7:   },
 8:   "devDependencies": {
 9:     "dotenv-cli": "^8.0.0",
10:     "supabase": "^2.93.0"
11:   }
12: }
</file>

<file path="supabase/current_schema.sql">
  1: -- =============================================================================
  2: -- FINAL DATABASE SCHEMA (after all migrations up to 20260503000000)
  3: -- Includes: devices + department RBAC, clinical tables, audit hash chain, RLS
  4: -- =============================================================================
  5: -- ============================================================
  6: -- 1. CLEANUP: Drop deprecated tables (old RBAC, ward_assignments, access_policies)
  7: -- ============================================================
  8: DROP TABLE IF EXISTS ward_assignments CASCADE;
  9: DROP TABLE IF EXISTS role_permissions CASCADE;      -- old version
 10: DROP TABLE IF EXISTS access_policies CASCADE;       -- replaced by dynamic RBAC
 11: -- ============================================================
 12: -- 2. CORE INFRASTRUCTURE: Departments
 13: -- ============================================================
 14: CREATE TABLE IF NOT EXISTS departments (
 15:     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 16:     name        VARCHAR(100) NOT NULL UNIQUE,
 17:     site        VARCHAR(100) NOT NULL,
 18:     description TEXT,
 19:     created_at  TIMESTAMPTZ DEFAULT NOW()
 20: );
 21: -- ============================================================
 22: -- 3. DEVICES (added department_id, kept legacy hierarchy for compatibility)
 23: -- ============================================================
 24: CREATE TABLE IF NOT EXISTS devices (
 25:     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 26:     device_code   VARCHAR(50)  NOT NULL UNIQUE,
 27:     description   TEXT,
 28:     site          VARCHAR(100),                     -- legacy, kept for reports
 29:     department    VARCHAR(100),                     -- legacy, kept for reports
 30:     room          VARCHAR(50),                      -- legacy
 31:     labels        TEXT[] DEFAULT '{}',
 32:     api_key_hash  VARCHAR(255),
 33:     is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
 34:     created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
 35:     department_id UUID REFERENCES departments(id) ON DELETE SET NULL   -- new RBAC link
 36: );
 37: -- ============================================================
 38: -- 4. SENSOR READINGS
 39: -- ============================================================
 40: CREATE TABLE IF NOT EXISTS sensor_readings (
 41:     id          BIGSERIAL    PRIMARY KEY,
 42:     device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
 43:     recorded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
 44:     payload     JSONB        NOT NULL
 45: );
 46: -- ============================================================
 47: -- 5. ALERTS
 48: -- ============================================================
 49: CREATE TABLE IF NOT EXISTS alerts (
 50:     id          BIGSERIAL    PRIMARY KEY,
 51:     device_id   UUID         NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
 52:     reading_id  BIGINT       REFERENCES sensor_readings(id) ON DELETE SET NULL,
 53:     alert_type  VARCHAR(50)  NOT NULL,
 54:     severity    VARCHAR(20)  NOT NULL DEFAULT 'WARNING',
 55:     message     TEXT         NOT NULL,
 56:     is_resolved BOOLEAN      NOT NULL DEFAULT FALSE,
 57:     created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
 58:     resolved_at TIMESTAMPTZ
 59: );
 60: -- ============================================================
 61: -- 6. USERS (with 2FA and RBAC columns)
 62: -- ============================================================
 63: CREATE TABLE IF NOT EXISTS users (
 64:     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 65:     email           VARCHAR(255) UNIQUE NOT NULL,
 66:     password_hash   VARCHAR(255) NOT NULL,
 67:     role            VARCHAR(20) NOT NULL CHECK (role IN ('nurse', 'doctor', 'admin')),
 68:     full_name       VARCHAR(100) NOT NULL,
 69:     is_active       BOOLEAN DEFAULT TRUE,
 70:     created_at      TIMESTAMPTZ DEFAULT NOW(),
 71:     totp_secret     VARCHAR(255),
 72:     is_totp_enabled BOOLEAN DEFAULT FALSE,
 73:     department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
 74:     token_version   INT DEFAULT 1
 75: );
 76: -- ============================================================
 77: -- 7. PATIENTS
 78: -- ============================================================
 79: CREATE TABLE IF NOT EXISTS patients (
 80:     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 81:     mrn           VARCHAR(20) UNIQUE NOT NULL,
 82:     full_name     VARCHAR(100) NOT NULL,
 83:     date_of_birth DATE NOT NULL,
 84:     gender        VARCHAR(20),
 85:     blood_type    VARCHAR(5),
 86:     allergies     TEXT[],
 87:     consent       BOOLEAN DEFAULT FALSE,
 88:     created_at    TIMESTAMPTZ DEFAULT NOW()
 89: );
 90: -- ============================================================
 91: -- 8. BED ASSIGNMENTS
 92: -- ============================================================
 93: CREATE TABLE IF NOT EXISTS bed_assignments (
 94:     id                  BIGSERIAL PRIMARY KEY,
 95:     patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 96:     device_id           UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
 97:     admitted_at         TIMESTAMPTZ DEFAULT NOW(),
 98:     discharged_at       TIMESTAMPTZ,
 99:     attending_physician VARCHAR(100),
100:     diagnosis           TEXT,
101:     admission_type      VARCHAR(50) CHECK (admission_type IN ('emergency', 'elective', 'transfer'))
102: );
103: -- ============================================================
104: -- 9. PATIENT THRESHOLDS
105: -- ============================================================
106: CREATE TABLE IF NOT EXISTS patient_thresholds (
107:     id          BIGSERIAL PRIMARY KEY,
108:     patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
109:     vital_sign  VARCHAR(50) NOT NULL,
110:     min_value   DECIMAL,
111:     max_value   DECIMAL,
112:     set_by      VARCHAR(100),
113:     set_at      TIMESTAMPTZ DEFAULT NOW()
114: );
115: -- ============================================================
116: -- 10. AUDIT LOG (with hash chain)
117: -- ============================================================
118: CREATE TABLE IF NOT EXISTS audit_log (
119:     id            BIGSERIAL PRIMARY KEY,
120:     user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
121:     action        VARCHAR(100) NOT NULL,
122:     entity_type   VARCHAR(50) NOT NULL,
123:     entity_id     VARCHAR(100),
124:     detail        JSONB,
125:     ip_address    INET,
126:     occurred_at   TIMESTAMPTZ DEFAULT NOW(),
127:     previous_hash VARCHAR(64),
128:     hash          VARCHAR(64)
129: );
130: -- ============================================================
131: -- 11. CALIBRATION RECORDS
132: -- ============================================================
133: CREATE TABLE IF NOT EXISTS calibration_records (
134:     id            BIGSERIAL PRIMARY KEY,
135:     device_id     UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
136:     calibrated_at TIMESTAMPTZ DEFAULT NOW(),
137:     technician    VARCHAR(100) NOT NULL,
138:     notes         TEXT,
139:     passed        BOOLEAN NOT NULL DEFAULT TRUE
140: );
141: -- ============================================================
142: -- 12. MEDICATION SCHEDULES (MAR)
143: -- ============================================================
144: CREATE TABLE IF NOT EXISTS medication_schedules (
145:     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
146:     patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
147:     medication_name VARCHAR(255) NOT NULL,
148:     dosage          VARCHAR(100) NOT NULL,
149:     route           VARCHAR(50),
150:     scheduled_at    TIMESTAMPTZ NOT NULL,
151:     administered_at TIMESTAMPTZ,
152:     administered_by UUID REFERENCES users(id),
153:     status          VARCHAR(20) DEFAULT 'scheduled',
154:     notes           TEXT
155: );
156: -- ============================================================
157: -- 13. CLINICAL NOTES (SOAP)
158: -- ============================================================
159: CREATE TABLE IF NOT EXISTS clinical_notes (
160:     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
161:     patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
162:     author_id   UUID NOT NULL REFERENCES users(id),
163:     subjective  TEXT,
164:     objective   TEXT,
165:     assessment  TEXT,
166:     plan        TEXT,
167:     created_at  TIMESTAMPTZ DEFAULT NOW()
168: );
169: -- ============================================================
170: -- 14. PATIENT TRANSFERS (ADT History)
171: -- ============================================================
172: CREATE TABLE IF NOT EXISTS patient_transfers (
173:     id              BIGSERIAL PRIMARY KEY,
174:     patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
175:     from_device_id  UUID REFERENCES devices(id),
176:     to_device_id    UUID REFERENCES devices(id),
177:     action_type     VARCHAR(20) NOT NULL,
178:     performed_by    UUID NOT NULL REFERENCES users(id),
179:     occurred_at     TIMESTAMPTZ DEFAULT NOW(),
180:     notes           TEXT
181: );
182: -- ============================================================
183: -- 15. DYNAMIC RBAC TABLES
184: -- ============================================================
185: -- Permissions catalogue
186: CREATE TABLE IF NOT EXISTS permissions (
187:     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
188:     resource    VARCHAR(50) NOT NULL,
189:     action      VARCHAR(50) NOT NULL,
190:     description TEXT,
191:     UNIQUE(resource, action)
192: );
193: -- Roles (bundles of permissions)
194: CREATE TABLE IF NOT EXISTS roles (
195:     id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
196:     name           VARCHAR(100) UNIQUE NOT NULL,
197:     description    TEXT,
198:     is_system_role BOOLEAN DEFAULT FALSE,
199:     created_at     TIMESTAMPTZ DEFAULT NOW()
200: );
201: -- Role-Permission junction
202: CREATE TABLE IF NOT EXISTS role_permissions (
203:     role_id       UUID REFERENCES roles(id) ON DELETE CASCADE,
204:     permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
205:     PRIMARY KEY (role_id, permission_id)
206: );
207: -- Teams / Groups (scoped to department)
208: CREATE TABLE IF NOT EXISTS groups (
209:     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
210:     name          VARCHAR(100) NOT NULL,
211:     department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
212:     description   TEXT,
213:     created_at    TIMESTAMPTZ DEFAULT NOW()
214: );
215: -- Group-Role association
216: CREATE TABLE IF NOT EXISTS group_roles (
217:     group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
218:     role_id  UUID REFERENCES roles(id) ON DELETE CASCADE,
219:     PRIMARY KEY (group_id, role_id)
220: );
221: -- User-Group membership
222: CREATE TABLE IF NOT EXISTS user_groups (
223:     user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
224:     group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
225:     PRIMARY KEY (user_id, group_id)
226: );
227: -- Direct user-role overrides
228: CREATE TABLE IF NOT EXISTS user_roles (
229:     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
230:     role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
231:     PRIMARY KEY (user_id, role_id)
232: );
233: -- ============================================================
234: -- 16. INDEXES (performance & compliance)
235: -- ============================================================
236: CREATE INDEX IF NOT EXISTS idx_sensor_readings_payload   ON sensor_readings USING GIN (payload);
237: CREATE INDEX IF NOT EXISTS idx_sensor_readings_time      ON sensor_readings (device_id, recorded_at DESC);
238: CREATE INDEX IF NOT EXISTS idx_audit_log_hash            ON audit_log (hash);
239: CREATE INDEX IF NOT EXISTS idx_device_hierarchy          ON devices (site, department, room);
240: CREATE INDEX IF NOT EXISTS idx_device_labels             ON devices USING GIN (labels);
241: CREATE INDEX IF NOT EXISTS idx_calibration_device        ON calibration_records (device_id);
242: CREATE INDEX IF NOT EXISTS idx_meds_patient              ON medication_schedules (patient_id);
243: CREATE INDEX IF NOT EXISTS idx_notes_patient             ON clinical_notes (patient_id);
244: CREATE INDEX IF NOT EXISTS idx_adt_patient               ON patient_transfers (patient_id);
245: CREATE INDEX IF NOT EXISTS idx_devices_department        ON devices (department_id);
246: CREATE INDEX IF NOT EXISTS idx_users_department          ON users (department_id);
247: -- ============================================================
248: -- 17. ROW LEVEL SECURITY (RLS) – Department-based access
249: -- ============================================================
250: -- Enable RLS
251: ALTER TABLE devices          ENABLE ROW LEVEL SECURITY;
252: ALTER TABLE devices          FORCE ROW LEVEL SECURITY;
253: ALTER TABLE sensor_readings  ENABLE ROW LEVEL SECURITY;
254: ALTER TABLE sensor_readings  FORCE ROW LEVEL SECURITY;
255: ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;
256: ALTER TABLE alerts           FORCE ROW LEVEL SECURITY;
257: ALTER TABLE bed_assignments  ENABLE ROW LEVEL SECURITY;
258: ALTER TABLE bed_assignments  FORCE ROW LEVEL SECURITY;
259: ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
260: ALTER TABLE patients         FORCE ROW LEVEL SECURITY;
261: -- Helper function (updated for department ID)
262: CREATE OR REPLACE FUNCTION has_device_access(p_device_dept_id UUID)
263: RETURNS BOOLEAN AS $$
264: DECLARE
265:     v_user_role TEXT;
266:     v_user_dept UUID;
267: BEGIN
268:     v_user_role := current_setting('app.user_role', true);
269:     IF v_user_role IN ('admin', 'system') THEN
270:         RETURN TRUE;
271:     END IF;
272:     v_user_dept := NULLIF(current_setting('app.user_dept_id', true), '')::UUID;
273:     RETURN (v_user_dept = p_device_dept_id);
274: END;
275: $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
276: -- Drop old policies if they exist (in case of upgrade)
277: DROP POLICY IF EXISTS device_isolation ON devices;
278: DROP POLICY IF EXISTS reading_isolation ON sensor_readings;
279: DROP POLICY IF EXISTS alert_isolation ON alerts;
280: DROP POLICY IF EXISTS bed_isolation ON bed_assignments;
281: DROP POLICY IF EXISTS patient_isolation ON patients;
282: -- Create new policies based on department
283: CREATE POLICY device_policy ON devices
284:     FOR ALL USING (has_device_access(department_id));
285: CREATE POLICY reading_policy ON sensor_readings
286:     FOR ALL USING (EXISTS (
287:         SELECT 1 FROM devices d
288:         WHERE d.id = device_id AND has_device_access(d.department_id)
289:     ));
290: CREATE POLICY alert_policy ON alerts
291:     FOR ALL USING (EXISTS (
292:         SELECT 1 FROM devices d
293:         WHERE d.id = device_id AND has_device_access(d.department_id)
294:     ));
295: CREATE POLICY bed_policy ON bed_assignments
296:     FOR ALL USING (EXISTS (
297:         SELECT 1 FROM devices d
298:         WHERE d.id = device_id AND has_device_access(d.department_id)
299:     ));
300: CREATE POLICY patient_policy ON patients
301:     FOR ALL USING (EXISTS (
302:         SELECT 1 FROM bed_assignments ba
303:         JOIN devices d ON d.id = ba.device_id
304:         WHERE ba.patient_id = patients.id
305:           AND ba.discharged_at IS NULL
306:           AND has_device_access(d.department_id)
307:     ));
308: -- ============================================================
309: -- 18. SEED DATA (minimum required for operation)
310: -- ============================================================
311: -- Default department
312: INSERT INTO departments (name, site, description) VALUES
313:     ('ICU', 'General Hospital', 'Intensive Care Unit')
314: ON CONFLICT (name) DO NOTHING;
315: -- Assign department to existing devices (simple migration)
316: UPDATE devices SET department_id = (SELECT id FROM departments WHERE name = 'ICU')
317: WHERE department = 'ICU' AND department_id IS NULL;
318: -- Permissions (as defined in dynamic_rbac.sql)
319: INSERT INTO permissions (resource, action, description) VALUES
320:     ('alerts',   'view',      'View real-time telemetry alerts'),
321:     ('alerts',   'resolve',   'Resolve alerts in assigned ward'),
322:     ('patients', 'view',      'View patient medical records'),
323:     ('patients', 'admit',     'Admit/Discharge patients'),
324:     ('patients', 'threshold', 'Set clinical alert thresholds'),
325:     ('patients', 'export',    'Export PHI (PDPA Consent required)'),
326:     ('reports',  'download',  'Generate shift handover PDFs'),
327:     ('audit',    'view',      'View security audit logs'),
328:     ('users',    'manage',    'Manage user accounts'),
329:     ('rbac',     'manage',    'Manage roles and groups')
330: ON CONFLICT (resource, action) DO NOTHING;
331: -- System roles
332: INSERT INTO roles (name, description, is_system_role) VALUES
333:     ('Nurse',  'Clinical staff responsible for monitoring and alarm resolution', TRUE),
334:     ('Doctor', 'Medical officers with authority to set thresholds and admit patients', TRUE),
335:     ('Admin',  'System administrators and IT staff', TRUE)
336: ON CONFLICT (name) DO NOTHING;
337: -- Assign permissions to roles
338: -- Admin: all permissions
339: INSERT INTO role_permissions (role_id, permission_id)
340: SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Admin'
341: ON CONFLICT DO NOTHING;
342: -- Nurse: view/resolve alerts, view patients, download reports
343: INSERT INTO role_permissions (role_id, permission_id)
344: SELECT r.id, p.id FROM roles r, permissions p
345: WHERE r.name = 'Nurse' AND (
346:     (p.resource = 'alerts' AND p.action IN ('view', 'resolve')) OR
347:     (p.resource = 'patients' AND p.action = 'view') OR
348:     (p.resource = 'reports' AND p.action = 'download')
349: )
350: ON CONFLICT DO NOTHING;
351: -- Doctor: all alerts/patients/reports permissions
352: INSERT INTO role_permissions (role_id, permission_id)
353: SELECT r.id, p.id FROM roles r, permissions p
354: WHERE r.name = 'Doctor' AND p.resource IN ('alerts', 'patients', 'reports')
355: ON CONFLICT DO NOTHING;
356: -- Default admin user (password: Admin123!)
357: INSERT INTO users (email, password_hash, role, full_name, department_id)
358: VALUES ('admin@medmonitor.local',
359:         '$2a$11$wK9gQ5YkF1V8C7D/O1H6I.D5a3C1H0F0B0A0C0D0E0F0G0H0I0J0K',
360:         'admin',
361:         'System Admin',
362:         (SELECT id FROM departments WHERE name = 'ICU'))
363: ON CONFLICT (email) DO NOTHING;
364: -- Seed three example devices (with department_id)
365: INSERT INTO devices (device_code, description, site, department, room, api_key_hash, department_id) VALUES
366:     ('ICU-BED-01', 'Patient Monitor — ICU Bed 1', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU')),
367:     ('ICU-BED-02', 'Patient Monitor — ICU Bed 2', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU')),
368:     ('ICU-BED-03', 'Patient Monitor — ICU Bed 3', 'General Hospital', 'ICU', 'Room 412', 'xxx', (SELECT id FROM departments WHERE name = 'ICU'))
369: ON CONFLICT (device_code) DO NOTHING;
370: -- *Updated to 20260503000000_update_func.sql
</file>

<file path="backend/controllers/shift_report_controller.cs">
  1: using MedicalDeviceMonitor.Data;
  2: using MedicalDeviceMonitor.Services;
  3: using Microsoft.AspNetCore.Authorization;
  4: using Microsoft.AspNetCore.Mvc;
  5: using Microsoft.EntityFrameworkCore;
  6: using QuestPDF.Fluent;
  7: using QuestPDF.Helpers;
  8: using QuestPDF.Infrastructure;
  9: namespace MedicalDeviceMonitor.Controllers;
 10: [Authorize]
 11: [ApiController]
 12: [Route("api/[controller]")]
 13: public class ShiftReportController : ControllerBase
 14: {
 15:     private readonly AppDbContext _db;
 16:     private readonly ReadingService _readingService;
 17:     private readonly ILogger<ShiftReportController> _logger;
 18:     public ShiftReportController(AppDbContext db, ReadingService readingService, ILogger<ShiftReportController> logger)
 19:     {
 20:         _db = db;
 21:         _readingService = readingService;
 22:         _logger = logger;
 23:     }
 24:     /// <summary>
 25:     /// Generate a PDF shift handover report for a given bed over the last N hours.
 26:     /// GET /api/shiftreport/{deviceCode}?hours=8
 27:     /// </summary>
 28:     [HttpGet("{deviceCode}")]
 29:     public async Task<IActionResult> GenerateShiftReport(
 30:         string deviceCode,
 31:         [FromQuery] int hours = 8)
 32:     {
 33:         var end = DateTime.UtcNow;
 34:         var start = end.AddHours(-hours);
 35:         // --- 1. Load Device & Current Patient ---
 36:         var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
 37:         if (device == null) return NotFound(new { error = $"Device '{deviceCode}' not found." });
 38:         var assignment = await _db.BedAssignments
 39:             .Include(b => b.Patient)
 40:             .Where(b => b.DeviceId == device.Id && b.DischargedAt == null)
 41:             .FirstOrDefaultAsync();
 42:         // --- 2. Load Readings for the shift window ---
 43:         var history = await _readingService.GetHistoryAsync(deviceCode, 10000, start, end);
 44:         var readingsList = history.ToList();
 45:         // --- 3. Load Alerts fired during the shift ---
 46:         var alerts = await _db.Alerts
 47:             .Where(a => a.DeviceId == device.Id
 48:                      && a.CreatedAt >= start
 49:                      && a.CreatedAt <= end)
 50:             .OrderByDescending(a => a.CreatedAt)
 51:             .Take(50)
 52:             .ToListAsync();
 53:         // --- 4. Compute vital sign stats ---
 54:         var stats = ComputeVitalStats(readingsList);
 55:         // --- 5. Build PDF ---
 56:         QuestPDF.Settings.License = LicenseType.Community;
 57:         var patientName = assignment?.Patient?.FullName ?? "Unknown Patient";
 58:         var patientMrn  = assignment?.Patient?.Mrn ?? "N/A";
 59:         var diagnosis   = assignment?.Diagnosis ?? "Not recorded";
 60:         var reportedBy  = User.FindFirst("FullName")?.Value ?? "Unknown Clinician";
 61:         var pdf = Document.Create(container =>
 62:         {
 63:             container.Page(page =>
 64:             {
 65:                 page.Size(PageSizes.A4);
 66:                 page.Margin(2, Unit.Centimetre);
 67:                 page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Helvetica"));
 68:                 page.Header().Element(ComposeHeader);
 69:                 page.Content().Element(content => ComposeContent(
 70:                     content, deviceCode, patientName, patientMrn, diagnosis,
 71:                     start, end, hours, reportedBy, stats, alerts));
 72:                 page.Footer().AlignCenter().Text(text =>
 73:                 {
 74:                     text.Span("Confidential — Clinical Use Only | Generated: ");
 75:                     text.Span(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC").Bold();
 76:                     text.Span(" | Page ");
 77:                     text.CurrentPageNumber();
 78:                     text.Span(" of ");
 79:                     text.TotalPages();
 80:                 });
 81:             });
 82:         });
 83:         var pdfBytes = pdf.GeneratePdf();
 84:         var fileName = $"ShiftReport_{deviceCode}_{DateTime.UtcNow:yyyyMMdd_HHmm}.pdf";
 85:         _logger.LogInformation("Shift report generated for {Device} by {User}", deviceCode, reportedBy);
 86:         return File(pdfBytes, "application/pdf", fileName);
 87:     }
 88:     // ──────────────────────────────────────────────────────────────────────────
 89:     // PDF Composition Helpers
 90:     // ──────────────────────────────────────────────────────────────────────────
 91:     private static void ComposeHeader(IContainer container)
 92:     {
 93:         container.Column(col =>
 94:         {
 95:             col.Item().Row(row =>
 96:             {
 97:                 row.RelativeItem().Column(c =>
 98:                 {
 99:                     c.Item().Text("MedMonitor Command Centre")
100:                         .FontSize(18).Bold().FontColor(Colors.Teal.Darken2);
101:                     c.Item().Text("Clinical Shift Handover Report")
102:                         .FontSize(12).FontColor(Colors.Grey.Darken1);
103:                 });
104:                 row.ConstantItem(120).AlignRight().Column(c =>
105:                 {
106:                     c.Item().Background(Colors.Red.Lighten4).Padding(3).Text("SYNTHETIC DATA")
107:                         .FontSize(8).Bold().FontColor(Colors.Red.Medium);
108:                 });
109:             });
110:             col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Colors.Teal.Darken2);
111:         });
112:     }
113:     private static void ComposeContent(
114:         IContainer container,
115:         string deviceCode,
116:         string patientName,
117:         string mrn,
118:         string diagnosis,
119:         DateTime start,
120:         DateTime end,
121:         int hours,
122:         string reportedBy,
123:         VitalStats stats,
124:         List<Models.Alert> alerts)
125:     {
126:         container.PaddingTop(12).Column(col =>
127:         {
128:             // ── Section 1: Patient & Shift Info ──────────────────────────────
129:             col.Item().Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
130:             {
131:                 row.RelativeItem().Column(c =>
132:                 {
133:                     c.Item().Text("Patient").Bold().FontColor(Colors.Grey.Darken2).FontSize(8);
134:                     c.Item().Text(patientName).FontSize(13).Bold();
135:                     c.Item().Text($"MRN: {mrn}").FontSize(9).FontColor(Colors.Grey.Darken1);
136:                     c.Item().PaddingTop(4).Text($"Diagnosis: {diagnosis}").FontSize(9);
137:                 });
138:                 row.RelativeItem().Column(c =>
139:                 {
140:                     c.Item().Text("Bed / Device").Bold().FontColor(Colors.Grey.Darken2).FontSize(8);
141:                     c.Item().Text(deviceCode).FontSize(13).Bold();
142:                     c.Item().PaddingTop(4).Text($"Shift Window: {hours}h").FontSize(9);
143:                     c.Item().Text($"{start:yyyy-MM-dd HH:mm} → {end:HH:mm} UTC").FontSize(9).FontColor(Colors.Grey.Darken1);
144:                 });
145:                 row.RelativeItem().Column(c =>
146:                 {
147:                     c.Item().Text("Reported By").Bold().FontColor(Colors.Grey.Darken2).FontSize(8);
148:                     c.Item().Text(reportedBy).FontSize(13).Bold();
149:                     c.Item().PaddingTop(4).Text("IEC 62304 Class B").FontSize(9).FontColor(Colors.Orange.Darken2);
150:                     c.Item().Text("Monitoring Aid — Not Life Support").FontSize(8).FontColor(Colors.Grey.Medium);
151:                 });
152:             });
153:             col.Item().PaddingTop(16).Text("Vital Signs Summary").FontSize(13).Bold();
154:             col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
155:             col.Item().PaddingTop(8).Table(table =>
156:             {
157:                 table.ColumnsDefinition(cols =>
158:                 {
159:                     cols.RelativeColumn(2); // Vital Sign
160:                     cols.RelativeColumn();  // Min
161:                     cols.RelativeColumn();  // Max
162:                     cols.RelativeColumn();  // Avg
163:                     cols.RelativeColumn();  // Readings
164:                 });
165:                 // Header
166:                 table.Header(header =>
167:                 {
168:                     foreach (var h in new[] { "Vital Sign", "Min", "Max", "Mean", "Readings" })
169:                     {
170:                         header.Cell().Background(Colors.Teal.Darken2).Padding(6)
171:                             .Text(h).Bold().FontColor(Colors.White).FontSize(9);
172:                     }
173:                 });
174:                 // Rows
175:                 foreach (var (label, key, unit) in VitalRows)
176:                 {
177:                     var s = stats.GetOrDefault(key);
178:                     bool hasData = s != null;
179:                     table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(label);
180:                     table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
181:                         .Text(hasData ? $"{s!.Min:F1} {unit}" : "—").FontColor(Colors.Grey.Darken1);
182:                     table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
183:                         .Text(hasData ? $"{s!.Max:F1} {unit}" : "—").FontColor(Colors.Grey.Darken1);
184:                     table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
185:                         .Text(hasData ? $"{s!.Avg:F1} {unit}" : "—").FontColor(Colors.Grey.Darken1);
186:                     table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
187:                         .Text(hasData ? s!.Count.ToString() : "0").FontColor(Colors.Grey.Darken1);
188:                 }
189:             });
190:             // ── Section 3: Alerts ───────────────────────────────────────────
191:             col.Item().PaddingTop(20).Text("Alerts Fired This Shift").FontSize(13).Bold();
192:             col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
193:             if (!alerts.Any())
194:             {
195:                 col.Item().PaddingTop(8).PaddingBottom(8)
196:                     .Background(Colors.Green.Lighten4).Padding(10)
197:                     .Text("✓ No alerts triggered during this shift window.")
198:                     .FontColor(Colors.Green.Darken3);
199:             }
200:             else
201:             {
202:                 col.Item().PaddingTop(8).Table(table =>
203:                 {
204:                     table.ColumnsDefinition(cols =>
205:                     {
206:                         cols.RelativeColumn();     // Time
207:                         cols.RelativeColumn(2);    // Type
208:                         cols.RelativeColumn();     // Severity
209:                         cols.RelativeColumn(3);    // Message
210:                         cols.RelativeColumn();     // Resolved
211:                     });
212:                     table.Header(header =>
213:                     {
214:                         foreach (var h in new[] { "Time (UTC)", "Alert Type", "Severity", "Message", "Resolved" })
215:                         {
216:                             header.Cell().Background(Colors.Grey.Darken3).Padding(6)
217:                                 .Text(h).Bold().FontColor(Colors.White).FontSize(9);
218:                         }
219:                     });
220:                     foreach (var alert in alerts)
221:                     {
222:                         var isCritical = alert.Severity == "CRITICAL";
223:                         var bg = isCritical ? Colors.Red.Lighten4 : Colors.Orange.Lighten4;
224:                         table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
225:                             .Padding(5).Text(alert.CreatedAt.ToString("HH:mm:ss")).FontSize(9);
226:                         table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
227:                             .Padding(5).Text(alert.AlertType).FontSize(9);
228:                         table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
229:                             .Padding(5).Text(alert.Severity).Bold().FontSize(9)
230:                             .FontColor(isCritical ? Colors.Red.Darken3 : Colors.Orange.Darken3);
231:                         table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
232:                             .Padding(5).Text(alert.Message).FontSize(9);
233:                         table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
234:                             .Padding(5)
235:                             .Text(alert.IsResolved ? alert.ResolvedAt?.ToString("HH:mm") ?? "Yes" : "Pending")
236:                             .FontSize(9)
237:                             .FontColor(alert.IsResolved ? Colors.Green.Darken2 : Colors.Red.Medium);
238:                     }
239:                 });
240:             }
241:             // ── Section 4: Handover Notes ──────────────────────────────────
242:             col.Item().PaddingTop(20).Text("Handover Notes").FontSize(13).Bold();
243:             col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
244:             col.Item().PaddingTop(8).Border(0.5f).BorderColor(Colors.Grey.Lighten2)
245:                 .Padding(12).MinHeight(80)
246:                 .Text("[ Space reserved for handover notes — to be completed by outgoing nurse ]")
247:                 .FontColor(Colors.Grey.Lighten1).Italic();
248:             // ── Section 5: Sign-Off ────────────────────────────────────────
249:             col.Item().PaddingTop(24).Row(row =>
250:             {
251:                 row.RelativeItem().Column(c =>
252:                 {
253:                     c.Item().Text("Outgoing Nurse Signature").FontSize(9).FontColor(Colors.Grey.Darken1);
254:                     c.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Grey.Darken1);
255:                     c.Item().Text("Name / Date").FontSize(8).FontColor(Colors.Grey.Medium);
256:                 });
257:                 row.ConstantItem(40);
258:                 row.RelativeItem().Column(c =>
259:                 {
260:                     c.Item().Text("Incoming Nurse Signature").FontSize(9).FontColor(Colors.Grey.Darken1);
261:                     c.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Grey.Darken1);
262:                     c.Item().Text("Name / Date").FontSize(8).FontColor(Colors.Grey.Medium);
263:                 });
264:             });
265:         });
266:     }
267:     // ──────────────────────────────────────────────────────────────────────────
268:     // Stats Computation
269:     // ──────────────────────────────────────────────────────────────────────────
270:     private static readonly (string Label, string Key, string Unit)[] VitalRows =
271:     {
272:         ("Heart Rate",       "heart_rate",       "bpm"),
273:         ("SpO2",             "spo2",             "%"),
274:         ("Respiratory Rate", "respiration",      "br/min"),
275:         ("Systolic BP",      "systolic_bp",      "mmHg"),
276:         ("Diastolic BP",     "diastolic_bp",     "mmHg"),
277:         ("Temperature",      "temperature",      "°C"),
278:     };
279:     private static VitalStats ComputeVitalStats(IEnumerable<object> readings)
280:     {
281:         var stats = new VitalStats();
282:         foreach (var item in readings)
283:         {
284:             // Use reflection to get Payload property (it's an anonymous object)
285:             var payloadProp = item.GetType().GetProperty("Payload");
286:             if (payloadProp?.GetValue(item) is not System.Text.Json.JsonDocument doc) continue;
287:             foreach (var (_, key, _) in VitalRows)
288:             {
289:                 if (doc.RootElement.TryGetProperty(key, out var val) && val.TryGetDouble(out var d))
290:                 {
291:                     stats.Record(key, d);
292:                 }
293:             }
294:         }
295:         return stats;
296:     }
297: }
298: // ──────────────────────────────────────────────────────────────────────────────
299: // Stats helper classes
300: // ──────────────────────────────────────────────────────────────────────────────
301: public class VitalStat
302: {
303:     public double Min { get; private set; } = double.MaxValue;
304:     public double Max { get; private set; } = double.MinValue;
305:     public double Sum { get; private set; }
306:     public int Count { get; private set; }
307:     public double Avg => Count > 0 ? Sum / Count : 0;
308:     public void Record(double v)
309:     {
310:         if (v < Min) Min = v;
311:         if (v > Max) Max = v;
312:         Sum += v;
313:         Count++;
314:     }
315: }
316: public class VitalStats : Dictionary<string, VitalStat>
317: {
318:     public void Record(string key, double value)
319:     {
320:         if (!ContainsKey(key)) this[key] = new VitalStat();
321:         this[key].Record(value);
322:     }
323:     public VitalStat? GetOrDefault(string key) => TryGetValue(key, out var s) ? s : null;
324: }
</file>

<file path="docs/security.md">
 1: # Security & Regulatory Compliance Architecture
 2: 
 3: This document details the security posture of the MedMonitor application, mapping specifically to **IEC 62304 Class B**, the **Malaysian PDPA**, and the **Singapore HSA Cybersecurity Labeling Scheme (CLS-MD)**.
 4: 
 5: ## 1. Fine-Grained Access Control (Dynamic RBAC)
 6: 
 7: **Status:** In Progress (Phase 4)
 8: **Regulatory Map:** HSA CLS-MD (Access Control), IEC 62304 (Segregation of Critical Items)
 9: 
10: MedMonitor employs a dynamic, database-driven permission model that separates "Capability" from "Data Scope."
11: 
12: *   **Atomic Permissions:** Actions are granular (e.g., `patients:threshold:write`). This allows hospital admins to create custom clinical roles without modifying application code.
13: *   **JWT Permission Claims:** At login, the backend resolves the user's effective permissions (calculated from Group and Role memberships) and embeds them as a claim in the JWT.
14: *   **Middleware Enforcement:** Every API request is intercepted by a `.NET PermissionMiddleware`. If the JWT lacks the specific atomic permission required for the endpoint, an HTTP 403 Forbidden is returned.
15: *   **System Role Protection:** Critical clinical roles are flagged as `is_system_role`. This prevents administrative users from accidentally removing essential life-safety capabilities (like alert resolution) from clinical staff.
16: 
17: ## 2. Hash-Chained Audit Log Integrity
18: 
19: **Status:** Implemented (Session Pooling Mode)
20: **Regulatory Map:** HSA CLS-MD Level 2 (Data Isolation), HIPAA
21: 
22: While permissions allow a user to *perform* an action, Row-Level Security (RLS) dictates *where* they can perform it.
23: *   **The Scope Check:** Even if a nurse has the `alerts:resolve` permission, the database RLS policy (on Port 5432) ensures they can only query and update alerts where the `device.department_id` matches the user's assigned department.
24: 
25: ## 3. Automated Data Retention & De-identification
26: 
27: **Status:** Implemented (Refactoring for concurrency in Sprint 4.1)
28: **Regulatory Map:** HSA CLS-MD (Tampering Detection), IEC 62304 (Traceability)
29: 
30: To ensure non-repudiation and detect tampering by privileged accounts, the `audit_log` table employs cryptographic hash chaining (HMAC-SHA256).
31: *   **Non-Repudiation:** Every action is linked to a `user_id` and a verified `permission` claim, ensuring clinical accountability.
32: *   **Chain Verification:** Administrative users can trigger a chain verification to prove the log's integrity from the first entry.
33: 
34: ## 4. Device Authentication (Edge Security)
35: 
36: **Status:** Implemented (API Key Hashing)
37: **Regulatory Map:** HSA CLS-MD (Authentication)
38: 
39: Medical devices pushing telemetry must be authenticated. 
40: * Devices submit an `X-Device-Api-Key` HTTP header. 
41: * The backend does *not* store this key in plaintext. It is verified against a `BCrypt` hash (`api_key_hash`) stored in the `devices` table, ensuring that a compromised database snapshot cannot be used to spoof device telemetry.
42: * *Roadmap:* Future enterprise versions will transition to Mutual TLS (mTLS) utilizing X.509 client certificates at the Nginx reverse-proxy layer.
43: 
44: ## 5. Data At-Rest Encryption
45: 
46: **Status:** Enabled via Infrastructure
47: MedMonitor relies on managed PostgreSQL (Supabase/AWS). All underlying RDS instances and automated Point-In-Time Recovery (PITR) backups are encrypted at rest using AES-256 at the EBS volume level. No application-layer cryptography is required for data at rest.
</file>

<file path="backend/controllers/devices_controller.cs">
 1: using MedicalDeviceMonitor.Data;
 2: using Microsoft.AspNetCore.Authorization;
 3: using Microsoft.AspNetCore.Mvc;
 4: using Microsoft.EntityFrameworkCore;
 5: namespace MedicalDeviceMonitor.Controllers;
 6: [Authorize]
 7: [ApiController]
 8: [Route("api/[controller]")]
 9: public class DevicesController : ControllerBase
10: {
11:     private readonly AppDbContext _db;
12:     public DevicesController(AppDbContext db) => _db = db;
13:     [HttpGet]
14:     public async Task<IActionResult> GetDevices()
15:     {
16:         // Fetch devices AND their currently admitted patient
17:         var devices = await _db.Devices
18:             .Select(d => new {
19:                 d.Id,
20:                 d.DeviceCode,
21:                 d.Site,
22:                 d.Department,
23:                 d.Room,
24:                 d.Labels,
25:                 d.Description,
26:                 CurrentAssignment = _db.BedAssignments
27:                     .Include(b => b.Patient)
28:                     .Where(b => b.DeviceId == d.Id && b.DischargedAt == null)
29:                     .FirstOrDefault()
30:             })
31:             .ToListAsync();
32:         return Ok(devices);
33:     }
34:     [HttpGet("{id}")]
35:     public async Task<IActionResult> GetDevice(Guid id)
36:     {
37:         var device = await _db.Devices.FindAsync(id);
38:         if (device == null) return NotFound();
39:         return Ok(device);
40:     }
41: }
</file>

<file path="database/requirements.txt">
1: requests>=2.33.1
2: python-dotenv>=1.2.2
3: python-logging-loki>=0.3.1
4: bcrypt
</file>

<file path="frontend/src/hooks/useVitals.js">
 1: import { useEffect, useState } from "react";
 2: import * as signalR from "@microsoft/signalr";
 3: import axios from "axios";
 4: export const useVitals = (backendUrl, deviceCode, token) => { 
 5:   const [readings, setReadings] = useState([]);
 6:   const [latestReading, setLatestReading] = useState(null);
 7:   const [alerts, setAlerts] = useState([]);
 8:   useEffect(() => {
 9:     if (!deviceCode || !token) return; // Don't fetch if no device is selected or not authed
10:     // Reset state when switching patients
11:     setReadings([]);
12:     setLatestReading(null);
13:     setAlerts([]);
14:     // 1. Fetch History for selected device
15:     axios.get(`${backendUrl}/api/readings/${deviceCode}/history`, {
16:       headers: { Authorization: `Bearer ${token}` }
17:     })
18:       .then(res => setReadings(res.data))
19:       .catch(err => console.error("History fetch failed", err));
20:     // Fetch active alerts for this device
21:     axios.get(`${backendUrl}/api/alerts?deviceCode=${deviceCode}`, {
22:       headers: { Authorization: `Bearer ${token}` }
23:     })
24:       .then(res => setAlerts(res.data))
25:       .catch(err => console.error("Alerts fetch failed", err));
26:     // 2. Setup Real-time connection
27:     const connection = new signalR.HubConnectionBuilder()
28:       .withUrl(`${backendUrl}/hubs/vitalsigns`, {
29:         accessTokenFactory: () => token 
30:       })
31:       .withAutomaticReconnect()
32:       .build();
33:     connection.on("ReceiveNewReading", (data) => {
34:       // ONLY update if the incoming data matches the CURRENTLY selected bed
35:       if (data.deviceCode === deviceCode) {
36:         setLatestReading(data);
37:         setReadings((prev) => [...prev.slice(-49), data]); // Keep last 50 points
38:       }
39:     });
40:     connection.on("ReceiveNewAlert", (alertData) => {
41:       if (alertData.deviceCode === deviceCode) {
42:         setAlerts((prev) => [alertData, ...prev].slice(0, 10)); // Keep latest 10
43:       }
44:     });
45:     connection.start().catch(console.error);
46:     return () => connection.stop();
47:   }, [backendUrl, deviceCode, token]); // Re-run whenever deviceCode or token changes
48:   return { readings, latestReading, alerts };
49: };
</file>

<file path="backend/controllers/alerts_controller.cs">
 1: using MedicalDeviceMonitor.Data;
 2: using MedicalDeviceMonitor.Models;
 3: using MedicalDeviceMonitor.Services;
 4: using Microsoft.AspNetCore.Authorization;
 5: using Microsoft.AspNetCore.Mvc;
 6: using Microsoft.EntityFrameworkCore;
 7: using System.Security.Claims;
 8: namespace MedicalDeviceMonitor.Controllers;
 9: [Authorize]
10: [ApiController]
11: [Route("api/[controller]")]
12: public class AlertsController : ControllerBase
13: {
14:     private readonly AppDbContext _db;
15:     private readonly AuditService _auditService;
16:     public AlertsController(AppDbContext db, AuditService auditService)
17:     {
18:         _db = db;
19:         _auditService = auditService;
20:     }
21:     [HttpGet]
22:     public async Task<IActionResult> GetActiveAlerts([FromQuery] string? deviceCode)
23:     {
24:         var query = _db.Alerts.Include(a => a.Device).AsQueryable();
25:         if (!string.IsNullOrEmpty(deviceCode))
26:         {
27:             var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
28:             if (device == null)
29:                 return NotFound();
30:             // Thanks to Global Query Filters, if the device exists but isn't in an allowed location, 
31:             // the above device lookup returns null (404). No manual check required.
32:             query = query.Where(a => a.Device!.DeviceCode == deviceCode);
33:         }
34:         var alerts = await query.Where(a => !a.IsResolved).OrderByDescending(a => a.CreatedAt).Take(50).ToListAsync();
35:         return Ok(alerts.Select(a => new {
36:             a.Id, DeviceCode = a.Device!.DeviceCode, a.AlertType, a.Severity, a.Message, a.CreatedAt
37:         }));
38:     }
39:     [HttpPost("{id}/resolve")]
40:     public async Task<IActionResult> ResolveAlert(long id)
41:     {
42:         var strategy = _db.Database.CreateExecutionStrategy();
43:         // Added <IActionResult> here to tell the compiler what the lambda returns
44:         return await strategy.ExecuteAsync<IActionResult>(async () => 
45:         {
46:             using var transaction = await _db.Database.BeginTransactionAsync();
47:             try
48:             {
49:                 var alert = await _db.Alerts
50:                     .Include(a => a.Device)
51:                     .FirstOrDefaultAsync(a => a.Id == id);
52:                 if (alert == null) 
53:                 {
54:                     // No need to commit if not found
55:                     return NotFound(); 
56:                 }
57:                 var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
58:                 alert.IsResolved = true;
59:                 alert.ResolvedAt = DateTime.UtcNow;
60:                 var userId = userIdString != null ? Guid.Parse(userIdString) : (Guid?)null;
61:                 await _db.SaveChangesAsync(); 
62:                 await _auditService.LogActionAsync(userId, "RESOLVE_ALERT", "Alert", id.ToString()); 
63:                 await transaction.CommitAsync();
64:                 return Ok(new { message = "Alert resolved and securely logged in audit trail." });
65:             }
66:             catch (Exception)
67:             {
68:                 await transaction.RollbackAsync();
69:                 throw; 
70:             }
71:         });
72:     }
73: }
</file>

<file path="backend/controllers/auth_controller.cs">
  1: using MedicalDeviceMonitor.Data;
  2: using Microsoft.AspNetCore.Authorization;
  3: using Microsoft.AspNetCore.Mvc;
  4: using Microsoft.EntityFrameworkCore;
  5: using Microsoft.IdentityModel.Tokens;
  6: using System.IdentityModel.Tokens.Jwt;
  7: using System.Security.Claims;
  8: using System.Text;
  9: using OtpNet;
 10: namespace MedicalDeviceMonitor.Controllers;
 11: public class LoginDto
 12: {
 13:     public required string Email { get; set; }
 14:     public required string Password { get; set; }
 15:     public string? TwoFactorCode { get; set; }
 16: }
 17: public class Verify2FADto
 18: {
 19:     public required string Code { get; set; }
 20: }
 21: [ApiController]
 22: [Route("api/[controller]")]
 23: public class AuthController : ControllerBase
 24: {
 25:     private readonly AppDbContext _db;
 26:     private readonly IConfiguration _config;
 27:     private readonly ILogger<AuthController> _logger;
 28:     public AuthController(AppDbContext db, IConfiguration config, ILogger<AuthController> logger)
 29:     {
 30:         _db = db;
 31:         _config = config;
 32:         _logger = logger;
 33:     }
 34:     [HttpPost("login")]
 35:     public async Task<IActionResult> Login([FromBody] LoginDto request)
 36:     {
 37:         var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == request.Email);
 38:         if (user == null)
 39:             return Unauthorized(new { error = "User not found in the database." });
 40:         if (!user.IsActive)
 41:             return Unauthorized(new { error = "This account is inactive." });
 42:         bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
 43:         if (!isPasswordValid)
 44:             return Unauthorized(new { error = "Invalid credentials." });
 45:         // --- 2FA ENFORCEMENT ---
 46:         if (user.IsTotpEnabled)
 47:         {
 48:             if (string.IsNullOrEmpty(request.TwoFactorCode))
 49:                 return Unauthorized(new { error = "2FA_REQUIRED", message = "Two-factor authentication code required." });
 50:             var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
 51:             // Allows a 1-step drift (30 seconds before/after) to account for slight clock desync
 52:             if (!totp.VerifyTotp(request.TwoFactorCode, out long timeStepMatched, window: new VerificationWindow(1, 1)))
 53:                 return Unauthorized(new { error = "INVALID_2FA", message = "Invalid or expired 2FA code." });
 54:         }
 55:         var token = GenerateJwtToken(user);
 56:         _logger.LogInformation("User {Email} logged in successfully.", user.Email);
 57:         return Ok(new 
 58:         { 
 59:             Token = token,
 60:             User = new { user.Id, user.Email, user.FullName, user.Role }
 61:         });
 62:     }
 63:     [Authorize]
 64:     [HttpPost("setup-2fa")]
 65:     public async Task<IActionResult> Setup2FA()
 66:     {
 67:         var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
 68:         var user = await _db.Users.FindAsync(userId);
 69:         if (user == null) return NotFound();
 70:         // Generate a new base32 20-byte secret
 71:         var secretKey = KeyGeneration.GenerateRandomKey(20);
 72:         var base32Secret = Base32Encoding.ToString(secretKey);
 73:         user.TotpSecret = base32Secret;
 74:         user.IsTotpEnabled = false; // Remains false until they successfully verify
 75:         await _db.SaveChangesAsync();
 76:         // Return the URI that QR code generators (or Authenticator apps) consume
 77:         var uri = $"otpauth://totp/MedMonitor:{user.Email}?secret={base32Secret}&issuer=MedMonitor";
 78:         return Ok(new { secret = base32Secret, uri = uri });
 79:     }
 80:     [Authorize]
 81:     [HttpPost("verify-2fa-setup")]
 82:     public async Task<IActionResult> Verify2FASetup([FromBody] Verify2FADto request)
 83:     {
 84:         var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
 85:         var user = await _db.Users.FindAsync(userId);
 86:         if (user == null || string.IsNullOrEmpty(user.TotpSecret)) 
 87:             return BadRequest(new { error = "Setup 2FA first." });
 88:         var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
 89:         if (totp.VerifyTotp(request.Code, out long _))
 90:         {
 91:             user.IsTotpEnabled = true;
 92:             await _db.SaveChangesAsync();
 93:             _logger.LogInformation("User {Email} successfully enabled 2FA.", user.Email);
 94:             return Ok(new { message = "Two-factor authentication successfully enabled." });
 95:         }
 96:         return BadRequest(new { error = "Invalid verification code." });
 97:     }
 98:     private string GenerateJwtToken(Models.User user)
 99:     {
100:         var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
101:             ?? _config["Jwt:Secret"] 
102:             ?? "FallbackSecretKeyThatIsAtLeast32BytesLong!";
103:         var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
104:         var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
105:         var claims = new[]
106:         {
107:             new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
108:             new Claim(JwtRegisteredClaimNames.Email, user.Email),
109:             new Claim(ClaimTypes.Role, user.Role),
110:             new Claim("FullName", user.FullName)
111:         };
112:         var token = new JwtSecurityToken(
113:             issuer: _config["Jwt:Issuer"],
114:             audience: _config["Jwt:Audience"],
115:             claims: claims,
116:             expires: DateTime.Now.AddMinutes(120),
117:             signingCredentials: credentials);
118:         return new JwtSecurityTokenHandler().WriteToken(token);
119:     }
120: }
</file>

<file path="docker-compose.yml">
  1: # ============================================================
  2: # docker-compose.yml — Local Development
  3: # ============================================================
  4: # This spins up the backend + frontend behind an Nginx reverse proxy.
  5: # The database lives on Supabase (cloud) — no local Postgres needed.
  6: #
  7: # Usage:
  8: #   docker-compose up --build
  9: #   Frontend         → http://localhost:3000
 10: #   Backend          → http://localhost:3000/api  (proxied via Nginx)
 11: #   Grafana          → http://localhost:3001
 12: #   VictoriaMetrics  → http://localhost:8428
 13: #   Loki             → http://localhost:3100
 14: # ============================================================
 15: services:
 16:   # ─── .NET 8 Web API ────────────────────────────────────────
 17:   backend:
 18:     build:
 19:       context: ./backend
 20:       dockerfile: Dockerfile
 21:     container_name: medmon_backend
 22:     environment:
 23:       - ASPNETCORE_ENVIRONMENT=Development   
 24:       - ConnectionStrings__Supabase=${SUPABASE_CONN_STRING}
 25:       - Jwt__Secret=${JWT_SECRET}
 26:       - Jwt__Issuer=${JWT_ISSUER}
 27:       - Jwt__Audience=${JWT_AUDIENCE}
 28:       - LOKI_URL=${LOKI_URL_INTERNAL}
 29:     expose:
 30:       - "5000"
 31:     ports:
 32:       - "5000:5000"
 33:     restart: unless-stopped
 34:   # ─── React 19 + Vite (production build) ────────────────────
 35:   frontend:
 36:     build:
 37:       context: ./frontend
 38:       dockerfile: Dockerfile
 39:     container_name: medmon_frontend
 40:     expose:
 41:       - "80"
 42:     depends_on:
 43:       - backend
 44:     restart: unless-stopped
 45:   # ─── Nginx Reverse Proxy ────────────────────────────────────
 46:   nginx:
 47:     image: nginx:1.25-alpine
 48:     container_name: medmon_nginx
 49:     ports:
 50:       - "3000:80"
 51:     volumes:
 52:       - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro
 53:     depends_on:
 54:       - backend
 55:       - frontend
 56:     restart: unless-stopped
 57:   # ─── VictoriaMetrics ────────────────────────────────────────
 58:   victoriametrics:
 59:     image: victoriametrics/victoria-metrics:latest
 60:     container_name: medmon_victoriametrics
 61:     ports:
 62:       - "8428:8428"
 63:     volumes:
 64:       - vm_data:/storage
 65:     command:
 66:       - "--storageDataPath=/storage"
 67:       - "--retentionPeriod=15d"
 68:       - "--httpListenAddr=:8428"
 69:     restart: unless-stopped
 70:   # ─── Loki ──────────────────────────────────────────────────
 71:   loki:
 72:     image: grafana/loki:latest
 73:     container_name: medmon_loki
 74:     ports:
 75:       - "3100:3100"
 76:     volumes:
 77:       - loki_data:/loki
 78:       - ./docker/loki-config.yml:/etc/loki/loki-config.yml:ro
 79:     command: -config.file=/etc/loki/loki-config.yml
 80:     restart: unless-stopped
 81:   # ─── Grafana ───────────────────────────────────────────────
 82:   grafana:
 83:     image: grafana/grafana:latest
 84:     container_name: medmon_grafana
 85:     ports:
 86:       - "3001:3000"
 87:     environment:
 88:       - GF_SECURITY_ADMIN_USER=${GRAFANA_USER:-admin}
 89:       - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
 90:       - GF_USERS_ALLOW_SIGN_UP=false
 91:     volumes:
 92:       - grafana_data:/var/lib/grafana
 93:       - ./docker/grafana/provisioning:/etc/grafana/provisioning:ro
 94:       - ./docker/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
 95:     depends_on:
 96:       - victoriametrics
 97:       - loki
 98:     restart: unless-stopped
 99: # ─── Named Volumes ────────────────────────────────────────────
100: # vm_data    — temp  (15 days enforced by --retentionPeriod flag)
101: # loki_data  — temp  (15 days enforced by loki-config.yml)
102: # grafana_data — permanent (no retention limit)
103: volumes:
104:   vm_data:
105:   loki_data:
106:   grafana_data:
</file>

<file path="frontend/src/App.jsx">
  1: import React, { useState, useEffect, useMemo } from 'react';
  2: import axios from 'axios';
  3: import { useVitals } from './hooks/useVitals';
  4: import Login from './Login';
  5: import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
  6: import { Activity, Heart, Thermometer, AlertTriangle, CheckCircle2, Bed, Building2, LogOut } from 'lucide-react';
  7: const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  8: function App() {
  9:   const [token, setToken] = useState(localStorage.getItem('jwt'));
 10:   const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_data')));
 11:   const [devices, setDevices] = useState([]);
 12:   const [selectedDevice, setSelectedDevice] = useState(null);
 13:   // Sync axios headers whenever token changes
 14:   useEffect(() => {
 15:     if (token) {
 16:       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
 17:       localStorage.setItem('jwt', token);
 18:     } else {
 19:       delete axios.defaults.headers.common['Authorization'];
 20:       localStorage.removeItem('jwt');
 21:     }
 22:   }, [token]);
 23:   // Sync user data to localStorage
 24:   useEffect(() => {
 25:     if (user) {
 26:       localStorage.setItem('user_data', JSON.stringify(user));
 27:     } else {
 28:       localStorage.removeItem('user_data');
 29:     }
 30:   }, [user]);
 31:   // Helper to handle login success
 32:   const handleAuth = (jwt, userData) => {
 33:     // Set header immediately to prevent race conditions in subsequent fetches
 34:     axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
 35:     setToken(jwt);
 36:     setUser(userData);
 37:   };
 38:   // Helper to handle logout
 39:   const handleLogout = () => {
 40:     setToken(null);
 41:     setUser(null);
 42:     setSelectedDevice(null);
 43:     delete axios.defaults.headers.common['Authorization'];
 44:   };
 45:   // Fetch all devices/sites on load
 46:   useEffect(() => {
 47:     if (!token) return;
 48:     // Use explicit header for the first fetch to ensure it doesn't fail 
 49:     // while the global axios default is being synchronized
 50:     axios.get(`${BACKEND_URL}/api/devices`, {
 51:       headers: { Authorization: `Bearer ${token}` }
 52:     })
 53:       .then(res => setDevices(res.data))
 54:       .catch(err => {
 55:         console.error("Failed to load devices", err);
 56:         if (err.response?.status === 401) handleLogout(); 
 57:       });
 58:   }, [token]);
 59:   // Group devices by Site/Location
 60:   const sites = useMemo(() => {
 61:     const groups = {};
 62:     devices.forEach(d => {
 63:       // Create a display label like "General Hospital - ICU"
 64:       const loc = d.site 
 65:         ? `${d.site}${d.department ? ` — ${d.department}` : ''}` 
 66:         : 'Unassigned Site';
 67:       if (!groups[loc]) groups[loc] = [];
 68:       groups[loc].push(d);
 69:     });
 70:     return groups;
 71:   }, [devices]);
 72:   // --- RENDER LOGIN IF NOT AUTHENTICATED ---
 73:   if (!token) {
 74:     return <Login setAuth={handleAuth} backendUrl={BACKEND_URL} />;
 75:   }
 76:   return (
 77:     <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
 78:       {/* SIDEBAR: Sites & Patients */}
 79:       <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
 80:         <div className="p-6 border-b border-slate-800">
 81:           <h1 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
 82:             <Activity /> MedMonitor
 83:           </h1>
 84:           <p className="text-xs text-slate-500 mt-1">Multi-Site Command Center</p>
 85:         </div>
 86:         {/* LOGGED IN USER INFO */}
 87:         <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
 88:           <div>
 89:             <div className="text-sm font-semibold">{user?.fullName}</div>
 90:             <div className="text-[10px] text-emerald-400 uppercase tracking-wide">{user?.role}</div>
 91:           </div>
 92:           <button onClick={handleLogout} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition">
 93:             <LogOut size={16} />
 94:           </button>
 95:         </div>
 96:         {/* ... Keep the rest of your aside list rendering the same ... */}
 97:         <div className="overflow-y-auto flex-grow p-4 space-y-6">
 98:           {Object.entries(sites).map(([siteName, beds]) => (
 99:             <div key={siteName}>
100:               <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
101:                 <Building2 size={14} /> {siteName}
102:               </h2>
103:               <div className="space-y-1">
104:                 {beds.map(bed => (
105:                   <button
106:                     key={bed.deviceCode}
107:                     onClick={() => setSelectedDevice(bed.deviceCode)}
108:                     className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
109:                       selectedDevice === bed.deviceCode 
110:                         ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
111:                         : 'hover:bg-slate-800 text-slate-300 border border-transparent'
112:                     }`}
113:                   >
114:                     <Bed size={16} />
115:                     <div className="flex-grow">
116:                       <div className="flex justify-between items-center">
117:                         <span className="font-medium">{bed.deviceCode}</span>
118:                         {bed.currentAssignment && (
119:                           <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-500 uppercase font-bold">Admitted</span>
120:                         )}
121:                       </div>
122:                       <div className="text-[10px] opacity-60">
123:                         {bed.currentAssignment?.patient?.fullName || bed.description}
124:                       </div>
125:                     </div>
126:                   </button>
127:                 ))}
128:               </div>
129:             </div>
130:           ))}
131:         </div>
132:       </aside>
133:       {/* MAIN CONTENT AREA */}
134:       <main className="flex-1 overflow-y-auto">
135:         {selectedDevice ? (
136:           <PatientDetail 
137:             deviceCode={selectedDevice} 
138:             token={token} 
139:             patientInfo={devices.find(d => d.deviceCode === selectedDevice)?.currentAssignment}
140:           />
141:         ) : (
142:           <div className="h-full flex flex-col items-center justify-center text-slate-500">
143:             <Activity size={48} className="mb-4 opacity-20" />
144:             <h2 className="text-xl font-medium text-slate-400">No Patient Selected</h2>
145:             <p className="text-sm mt-2">Select a bed from the sidebar to view real-time telemetry.</p>
146:           </div>
147:         )}
148:       </main>
149:     </div>
150:   );
151: }
152: // Extracted Component for the detailed patient view
153: function PatientDetail({ deviceCode, token, patientInfo }) { 
154:   const { readings, latestReading, alerts } = useVitals(BACKEND_URL, deviceCode, token); 
155:   const [isGenerating, setIsGenerating] = useState(false);
156:   const downloadShiftReport = async () => {
157:     setIsGenerating(true);
158:     try {
159:       const response = await axios.get(`${BACKEND_URL}/api/shiftreport/${deviceCode}`, {
160:         responseType: 'blob'
161:       });
162:       const url = window.URL.createObjectURL(new Blob([response.data]));
163:       const link = document.createElement('a');
164:       link.href = url;
165:       link.setAttribute('download', `ShiftReport_${deviceCode}.pdf`);
166:       document.body.appendChild(link);
167:       link.click();
168:       link.remove();
169:     } catch (err) {
170:       console.error("Failed to download report", err);
171:       alert("Failed to generate report. Ensure you have clinical data for this window.");
172:     } finally {
173:       setIsGenerating(false);
174:     }
175:   };
176:   const payload = latestReading?.payload || {};
177:   const alertState = useMemo(() => {
178:     const hr = payload.heart_rate;
179:     const spo2 = payload.spo2;
180:     if ((hr && (hr > 120 || hr < 40)) || (spo2 && spo2 < 90)) {
181:       return { status: 'CRITICAL', color: 'red', text: 'Abnormal vitals detected. Immediate attention required.' };
182:     }
183:     return { status: 'STABLE', color: 'emerald', text: 'No clinical alerts detected in last 5 minutes.' };
184:   }, [payload]);
185:   return (
186:     <div className="p-8 max-w-6xl mx-auto space-y-6">
187:       <header className="flex justify-between items-start border-b border-slate-800 pb-6">
188:         <div className="space-y-1">
189:           <div className="flex items-center gap-3">
190:             <h2 className="text-2xl font-bold text-slate-100">
191:               {patientInfo?.patient?.fullName || "Unassigned Bed"}
192:             </h2>
193:             <span className="text-xs px-2 py-1 bg-slate-800 rounded-md text-slate-400 font-mono">
194:               {deviceCode}
195:             </span>
196:           </div>
197:           {patientInfo ? (
198:             <div className="flex gap-4 text-xs text-slate-500">
199:               <span>MRN: <span className="text-slate-300">{patientInfo.patient.mrn}</span></span>
200:               <span>•</span>
201:               <span>Diagnosis: <span className="text-slate-300">{patientInfo.diagnosis}</span></span>
202:             </div>
203:           ) : (
204:             <p className="text-xs text-slate-500 italic">No active patient assignment.</p>
205:           )}
206:           <div className="pt-2">
207:             <button 
208:               onClick={downloadShiftReport}
209:               disabled={isGenerating}
210:               className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 text-xs font-bold rounded flex items-center gap-2 transition-colors border border-emerald-500/20"
211:             >
212:               <Activity size={14} />
213:               {isGenerating ? "GENERATING REPORT..." : "SHIFT REPORT (PDF)"}
214:             </button>
215:           </div>
216:         </div>
217:         <div className="flex gap-4">
218:           <StatusCard label="Heart Rate" value={payload.heart_rate} unit="bpm" icon={<Heart className={alertState.color === 'red' && (payload.heart_rate > 120 || payload.heart_rate < 40) ? "text-red-500 animate-pulse" : "text-emerald-400"} />} />
219:           <StatusCard label="SpO2" value={payload.spo2} unit="%" icon={<Activity className={alertState.color === 'red' && payload.spo2 < 90 ? "text-red-500 animate-pulse" : "text-blue-400"} />} />
220:           <StatusCard label="Temp" value={payload.temperature} unit="°C" icon={<Thermometer className="text-orange-400" />} />
221:         </div>
222:       </header>
223:       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
224:         <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 h-[400px] flex flex-col">
225:           <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Live Trend</h3>
226:           <div className="flex-grow">
227:             <ResponsiveContainer width="100%" height="100%">
228:               <LineChart data={readings}>
229:                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
230:                 <XAxis dataKey="recordedAt" hide />
231:                 <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 12}} width={40} />
232:                 <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
233:                 <Line type="monotone" dataKey="payload.heart_rate" name="Heart Rate" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
234:                 <Line type="monotone" dataKey="payload.spo2" name="SpO2" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
235:               </LineChart>
236:             </ResponsiveContainer>
237:           </div>
238:         </div>
239:         <div className="flex flex-col gap-6 h-[400px]">
240:           <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex-shrink-0">
241:              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Status</h3>
242:              <div className={`p-4 bg-${alertState.color}-500/10 border border-${alertState.color}-500/20 rounded-lg text-${alertState.color}-400`}>
243:                 <div className="flex items-center gap-2 mb-1">
244:                   {alertState.status === 'CRITICAL' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
245:                   <p className="font-bold">{alertState.status}</p>
246:                 </div>
247:                 <p className="text-xs opacity-80">{alertState.text}</p>
248:              </div>
249:           </div>
250:           <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex-grow flex flex-col overflow-hidden">
251:             <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Recent Alerts</h3>
252:             <div className="overflow-y-auto space-y-2 pr-2">
253:               {alerts.length === 0 ? (
254:                 <p className="text-xs text-slate-500 italic">No alerts recorded.</p>
255:               ) : (
256:                 alerts.map((a, i) => (
257:                   <div key={i} className="text-xs p-3 rounded bg-red-500/10 border border-red-500/20 text-red-200">
258:                     <div className="flex justify-between mb-1 opacity-70">
259:                       <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
260:                       <span className="font-bold">{a.severity}</span>
261:                     </div>
262:                     <p>{a.message}</p>
263:                   </div>
264:                 ))
265:               )}
266:             </div>
267:           </div>
268:         </div>
269:       </div>
270:     </div>
271:   );
272: }
273: const StatusCard = ({ label, value, unit, icon }) => (
274:   <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800 min-w-[140px]">
275:     {icon}
276:     <div>
277:       <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{label}</p>
278:       <p className="text-2xl font-bold mt-1 text-slate-200">{value ?? '--'}<span className="text-xs ml-1 text-slate-500 font-normal">{unit}</span></p>
279:     </div>
280:   </div>
281: );
282: export default App;
</file>

<file path="backend/MedicalDeviceMonitor.csproj">
 1: <Project Sdk="Microsoft.NET.Sdk.Web">
 2: 
 3:   <PropertyGroup>
 4:     <TargetFramework>net8.0</TargetFramework>
 5:     <Nullable>enable</Nullable>
 6:     <ImplicitUsings>enable</ImplicitUsings>
 7:     <RootNamespace>MedicalDeviceMonitor</RootNamespace>
 8:     <AssemblyName>MedicalDeviceMonitor</AssemblyName>
 9:   </PropertyGroup>
10: 
11:   <ItemGroup>
12:     <!-- PostgreSQL / Supabase connectivity -->
13:     <PackageReference Include="DotNetEnv" Version="3.1.1" />
14:     <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.4" />
15:     <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.4">
16:       <PrivateAssets>all</PrivateAssets>
17:       <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
18:     </PackageReference>
19: 
20:     <!-- JWT Authentication -->
21:     <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.4" />
22:  
23:     <!-- Structured logging → Grafana Loki -->
24:     <PackageReference Include="Serilog.AspNetCore" Version="10.0.0" />
25:     <PackageReference Include="Serilog.Sinks.Grafana.Loki" Version="8.3.2" />
26:     <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.5.1" />
27: 
28:     <!-- OpenAPI / Swagger UI -->
29:     <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
30: 
31:     <!-- BCrypt for password hashing -->
32:     <PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />
33: 
34:     <!-- PDF shift handover report generation (S4) -->
35:     <PackageReference Include="QuestPDF" Version="2024.10.4" />
36:  
37:     <!-- Health checks + EF Core readiness probe (S4) -->
38:     <PackageReference Include="Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore" Version="8.0.4" />
39: 
40:     <!-- Hangfire - background jobs -->
41:     <PackageReference Include="Hangfire.Core" Version="1.8.*" />
42:     <PackageReference Include="Hangfire.PostgreSql" Version="1.20.*" />
43:     <PackageReference Include="Hangfire.AspNetCore" Version="1.8.*" />
44:     
45:     <!-- 2FA / TOTP -->
46:     <PackageReference Include="Otp.NET" Version="1.3.0" />
47:     
48:   </ItemGroup>
49: 
50: </Project>
</file>

<file path=".env.example">
 1: # ============================================================
 2: # Medical Device Monitoring System — Environment Variables
 3: # ============================================================
 4: # Copy this file to .env.local and fill in real values.
 5: # NEVER commit .env.local to Git.
 6: 
 7: # --- Supabase (PostgreSQL Connection String — Transaction Mode) ---
 8: # Found in: Supabase Dashboard → Settings → Database → Connection string → Transaction
 9: SUPABASE_CONN_STRING="Host=aws-0-ap-southeast-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_DB_PASSWORD;SSL Mode=Require;Trust Server Certificate=true;"
10: REPLAY_SPEED_SEC=3
11: 
12: # --- .NET Backend ---
13: ASPNETCORE_ENVIRONMENT=Development
14: # Port the backend listens on (used in docker-compose)
15: BACKEND_PORT=5000
16: 
17: # --- JWT Auth (if implemented) ---
18: JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET_KEY
19: JWT_ISSUER=MedicalDeviceMonitor
20: JWT_AUDIENCE=MedicalDeviceMonitorClient
21: JWT_EXPIRY_MINUTES=60
22: 
23: # --- Device Simulator ---
24: # Base URL of the running .NET backend (used by device_simulator.py)
25: BACKEND_API_URL=http://localhost:5000
26: 
27: # --- Grafana ---
28: # Admin credentials for the Grafana dashboard (http://localhost:3001)
29: GRAFANA_USER=admin
30: GRAFANA_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
31: 
32: # --- Loki ---
33: LOKI_URL_EXTERNAL=http://localhost:3100
34: LOKI_URL_INTERNAL=http://loki:3100
</file>

<file path=".gitignore">
 1: # ─── Secrets ────────────────────────────────────────────────
 2: .env.local
 3: .env.*.local
 4: *.env
 5: backend/appsettings.json
 6: backend/logs/
 7: backup/
 8: 
 9: # ─── .NET / C# ──────────────────────────────────────────────
10: backend/bin/
11: backend/obj/
12: backend/*.user
13: backend/.vs/
14: backend/**/*.user
15: 
16: # ─── Node / Frontend ────────────────────────────────────────
17: frontend/node_modules/
18: frontend/dist/
19: frontend/dist-ssr/
20: frontend/.vite/
21: frontend/coverage/
22: frontend/*.tsbuildinfo
23: frontend/*.log
24: frontend/npm-debug.log*
25: frontend/yarn-debug.log*
26: frontend/yarn-error.log*
27: frontend/pnpm-debug.log*
28: frontend/lerna-debug.log*
29: frontend/.env
30: frontend/.env.local
31: frontend/.env.development.local
32: frontend/.env.test.local
33: frontend/.env.production.local
34: frontend/*.local
35: 
36: # ─── Python ─────────────────────────────────────────────────
37: __pycache__/
38: *.pyc
39: *.pyo
40: database/*.egg-info/
41: database/.venv/
42: database/venv/
43: database/.env
44: 
45: # ─── OS ─────────────────────────────────────────────────────
46: .DS_Store
47: Thumbs.db
48: 
49: # ─── Docker ─────────────────────────────────────────────────
50: docker-compose.override.yml
51: 
52: # ─── Database ───────────────────────────────────────────────
53: database/data/
54: database/*.db
55: database/*.sqlite
56: database/*.sqlite3
57: database/*.csv
58: database/.env
59: database/scripts/*
60: 
61: # ─── Node Modules (General) ──────────────────────────────────
62: node_modules/
63: 
64: # ─── Supabase ────────────────────────────────────────────────
65: supabase.toml
66: supabase/.temp
67: 
68: # ─── Docs ────────────────────────────────────────────────────
69: docs/personal_memorandum.txt
70: docs/architecture_explanation.md
71: 
72: # ─── Other ───────────────────────────────────────────────────
73: *.bak
74: repomix-output.xml
75: repomix.config.json
76: .claude
</file>

<file path="backend/controllers/readings_controller.cs">
 1: using MedicalDeviceMonitor.Data;
 2: using MedicalDeviceMonitor.Services;
 3: using Microsoft.AspNetCore.Mvc;
 4: using Microsoft.AspNetCore.Authorization;
 5: using Microsoft.EntityFrameworkCore;
 6: using System.Security.Claims;
 7: namespace MedicalDeviceMonitor.Controllers;
 8: [Authorize]
 9: [ApiController]
10: [Route("api/[controller]")]
11: public class ReadingsController : ControllerBase
12: {
13:     private readonly ReadingService _readingService;
14:     private readonly AppDbContext _db;
15:     private readonly ILogger<ReadingsController> _logger;
16:     public ReadingsController(ReadingService readingService, AppDbContext db, ILogger<ReadingsController> logger)
17:     {
18:         _readingService = readingService;
19:         _db = db;
20:         _logger = logger;
21:     }
22:     [AllowAnonymous]
23:     [HttpPost("ingest")]
24:     public async Task<IActionResult> IngestData([FromBody] IngestReadingDto dto)
25:     {
26:         // 1. Extract the per-device API key from the headers
27:         var apiKey = Request.Headers["X-Device-Api-Key"].FirstOrDefault();
28:         if (string.IsNullOrEmpty(apiKey))
29:         {
30:             _logger.LogWarning("Ingest attempt rejected: Missing API Key for device {DeviceCode}", dto.DeviceCode);
31:             return Unauthorized(new { error = "Missing Device API Key." });
32:         }
33:         try
34:         {
35:             // 2. Pass the key down to the service for cryptographic verification
36:             await _readingService.ProcessNewReadingAsync(dto, apiKey);
37:             return Ok(new { message = "Data ingested and broadcasted successfully" });
38:         }
39:         catch (UnauthorizedAccessException ex)
40:         {
41:             _logger.LogWarning("Ingest attempt rejected: {Message}", ex.Message);
42:             return Unauthorized(new { error = ex.Message });
43:         }
44:         catch (Exception ex)
45:         {
46:             _logger.LogError(ex, "API Error ingesting data for device {DeviceCode}", dto.DeviceCode);
47:             return BadRequest(new { error = ex.Message });
48:         }
49:     }
50:     [HttpGet("{deviceCode}/history")]
51:     public async Task<IActionResult> GetHistory(
52:         string deviceCode, 
53:         [FromQuery] int limit = 1000, 
54:         [FromQuery] DateTime? start = null, 
55:         [FromQuery] DateTime? end = null)
56:     {
57:         try
58:         {
59:             var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
60:             if (device == null)
61:                 return NotFound();
62:             var history = await _readingService.GetHistoryAsync(deviceCode, limit, start, end);
63:             return Ok(history.Reverse()); // Return chronologically for charts
64:         }
65:         catch (Exception ex)
66:         {
67:             return BadRequest(new { error = ex.Message });
68:         }
69:     }
70: }
</file>

<file path="database/device_simulator.py">
  1: import os
  2: import time
  3: import csv
  4: import json
  5: import random
  6: import requests
  7: import threading
  8: from datetime import datetime, timezone
  9: from pathlib import Path
 10: import uuid
 11: # --- Configuration ---
 12: BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")
 13: LOKI_URL        = f"{os.getenv('LOKI_URL_EXTERNAL', 'http://localhost:3100')}/loki/api/v1/push"
 14: REPLAY_SPEED    = float(os.getenv("REPLAY_SPEED_SEC", "2")) 
 15: CSV_PATH        = Path(__file__).parent / "data" / "icu_vitals.csv"
 16: INGEST_ENDPOINT = f"{BACKEND_API_URL}/api/readings/ingest"
 17: # The 3 default devices from our database schema
 18: TARGET_DEVICES = ["ICU-BED-01", "ICU-BED-02", "ICU-BED-03"]
 19: COLUMN_MAP = {
 20:     "heart_rate": "heart_rate", "spo2": "spo2", "systolic_bp": "systolic_bp",
 21:     "diastolic_bp": "diastolic_bp", "temperature": "temperature", "respiratory_rate": "respiration"
 22: }
 23: THRESHOLDS = {
 24:     "heart_rate": {"min": 40, "max": 120},
 25:     "spo2": {"min": 90, "max": 100},
 26: }
 27: def push_to_loki(device_code, level, message, status="normal", correlation_id="unknown"):
 28:     timestamp_ns = str(time.time_ns())
 29:     payload = {
 30:         "streams": [
 31:             {
 32:                 "stream": {
 33:                     "app": "device_simulator",
 34:                     "level": level,
 35:                     "status": status,
 36:                     "device": device_code,
 37:                     "correlation_id": correlation_id
 38:                 },
 39:                 "values": [[timestamp_ns, message]]
 40:             }
 41:         ]
 42:     }
 43:     try:
 44:         requests.post(LOKI_URL, json=payload, timeout=2)
 45:     except:
 46:         pass # Ignore Loki errors so simulation doesn't crash if Docker isn't running
 47: def stream_csv(path: Path, start_offset: int):
 48:     """ Yields CSV rows infinitely, starting at a specific offset to stagger the data """
 49:     while True:
 50:         with open(path, newline="", encoding="utf-8") as f:
 51:             reader = csv.DictReader(f)
 52:             # Skip rows to give each device unique data
 53:             for _ in range(start_offset):
 54:                 next(reader, None)
 55:             for row in reader:
 56:                 payload = {json_key: float(row[csv_col]) for csv_col, json_key in COLUMN_MAP.items() if row.get(csv_col)}
 57:                 # Add slight random noise so the beds don't look identical if offsets align
 58:                 if "heart_rate" in payload: payload["heart_rate"] += random.randint(-2, 2)
 59:                 yield payload
 60: def check_alert(payload: dict) -> str | None:
 61:     for key, bounds in THRESHOLDS.items():
 62:         val = payload.get(key)
 63:         if val and (val < bounds["min"] or val > bounds["max"]):
 64:             return f"CRITICAL_{key.upper()}: {val}"
 65:     return None
 66: def simulate_device(device_code: str, row_offset: int):
 67:     """ Runs in a separate thread for each device """
 68:     print(f"[{device_code}] Thread started. Offset: {row_offset}")
 69:     # Introduce a slight random start delay so they don't hit the API at the exact same millisecond
 70:     time.sleep(random.uniform(0, 1.5))
 71:     source = stream_csv(CSV_PATH, row_offset)
 72:     for payload in source:
 73:         correlation_id = str(uuid.uuid4())
 74:         body = {
 75:             "deviceCode": device_code,
 76:             "recordedAt": datetime.now(timezone.utc).isoformat(),
 77:             "payload": payload,
 78:         }
 79:         headers = {
 80:             "X-Correlation-ID": correlation_id,
 81:             "X-Device-Api-Key": os.getenv("DEVICE_API_KEY", "DeviceSecret123!")
 82:         }
 83:         alert = check_alert(payload)
 84:         if alert:
 85:             print(f"[{device_code}] ⚠️  ALERT: {alert}")
 86:             push_to_loki(device_code, "WARN", f"Alert: {alert}", "abnormal", correlation_id)
 87:         try:
 88:             resp = requests.post(INGEST_ENDPOINT, json=body, headers=headers, timeout=10)
 89:             if resp.status_code in (200, 201):
 90:                 print(f"[{device_code}] ✅ HR={payload.get('heart_rate')} SpO2={payload.get('spo2')}")
 91:                 # Log success to Loki so we see activity in Grafana
 92:                 push_to_loki(device_code, "INFO", f"Ingested HR={payload.get('heart_rate')}", "normal", correlation_id)
 93:             else:
 94:                 print(f"[{device_code}] ❌ Backend Error: {resp.status_code} — {resp.text}")
 95:                 push_to_loki(device_code, "ERROR", f"HTTP {resp.status_code}", "abnormal", correlation_id)
 96:         except requests.exceptions.RequestException as e:
 97:             print(f"[{device_code}] ❌ Connection Error: {e}")
 98:             push_to_loki(device_code, "ERROR", f"Connection Error: {e}", "abnormal", correlation_id)
 99:         time.sleep(REPLAY_SPEED)
100: def run_fleet():
101:     print(f"🏥 Starting Multi-Patient Simulator targeted at: {BACKEND_API_URL}")
102:     threads = []
103:     # Start a thread for each device. We give them row offsets (0, 500, 1000) 
104:     # so they read different parts of the CSV and their vitals look completely different!
105:     for i, device_code in enumerate(TARGET_DEVICES):
106:         t = threading.Thread(target=simulate_device, args=(device_code, i * 500))
107:         t.daemon = True
108:         t.start()
109:         threads.append(t)
110:     try:
111:         # Keep main thread alive
112:         while True:
113:             time.sleep(1)
114:     except KeyboardInterrupt:
115:         print("\n🛑 Simulation stopped by user.")
116: if __name__ == "__main__":
117:     run_fleet()
</file>

<file path="backend/services/reading_service.cs">
  1: using MedicalDeviceMonitor.Data;
  2: using MedicalDeviceMonitor.Hubs;
  3: using MedicalDeviceMonitor.Models;
  4: using Microsoft.AspNetCore.SignalR;
  5: using Microsoft.EntityFrameworkCore;
  6: using System.Text.Json;
  7: using Serilog;
  8: namespace MedicalDeviceMonitor.Services;
  9: public class IngestReadingDto
 10: {
 11:     public required string DeviceCode { get; set; }
 12:     public DateTime RecordedAt { get; set; }
 13:     public required JsonElement Payload { get; set; }
 14: }
 15: public class ReadingService
 16: {
 17:     private readonly AppDbContext _db;
 18:     private readonly IHubContext<VitalSignsHub> _hub;
 19:     private readonly ILogger<ReadingService> _logger;
 20:     // Global defaults — applied when no per-patient threshold override exists
 21:     private static readonly Dictionary<string, (double Min, double Max)> GlobalThresholds = new()
 22:     {
 23:         { "heart_rate", (40, 120) },
 24:         { "spo2",       (90, 100) },
 25:         { "temperature",(35, 39)  },
 26:     };
 27:     public ReadingService(AppDbContext db, IHubContext<VitalSignsHub> hub, ILogger<ReadingService> logger)
 28:     {
 29:         _db = db;
 30:         _hub = hub;
 31:         _logger = logger;
 32:     }
 33:     public async Task ProcessNewReadingAsync(IngestReadingDto dto, string apiKey)
 34:     {
 35:         var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == dto.DeviceCode);
 36:         if (device == null)
 37:         {
 38:             _logger.LogWarning("Abnormal Event: Received data for unknown device {DeviceCode}", dto.DeviceCode);
 39:             throw new Exception($"Device {dto.DeviceCode} not found.");
 40:         }
 41:         // --- DEVICE AUTHENTICATION ---
 42:         if (string.IsNullOrEmpty(device.ApiKeyHash) || !BCrypt.Net.BCrypt.Verify(apiKey, device.ApiKeyHash))
 43:         {
 44:             throw new UnauthorizedAccessException($"Invalid API Key for device {dto.DeviceCode}");
 45:         }
 46:         // 1. Get last reading (for Rate-of-Change alerts)
 47:         var lastReading = await _db.SensorReadings
 48:             .Where(r => r.DeviceId == device.Id)
 49:             .OrderByDescending(r => r.RecordedAt)
 50:             .FirstOrDefaultAsync();
 51:         // 2. Resolve current patient (for per-patient thresholds)
 52:         var currentAssignment = await _db.BedAssignments
 53:             .Where(b => b.DeviceId == device.Id && b.DischargedAt == null)
 54:             .FirstOrDefaultAsync();
 55:         // 3. Load per-patient threshold overrides
 56:         Dictionary<string, (double? Min, double? Max)> patientThresholds = new();
 57:         if (currentAssignment != null)
 58:         {
 59:             var thresholdRows = await _db.Set<PatientThreshold>()
 60:                 .Where(t => t.PatientId == currentAssignment.PatientId)
 61:                 .ToListAsync();
 62:             foreach (var row in thresholdRows)
 63:                 patientThresholds[row.VitalSign] = (row.MinValue, row.MaxValue);
 64:         }
 65:         // 4. Save new reading
 66:         var reading = new SensorReading
 67:         {
 68:             DeviceId = device.Id,
 69:             RecordedAt = dto.RecordedAt.ToUniversalTime(),
 70:             Payload = JsonDocument.Parse(dto.Payload.GetRawText())
 71:         };
 72:         _db.SensorReadings.Add(reading);
 73:         // 5. CLINICAL LOGIC & ALARM FATIGUE MANAGEMENT
 74:         var activeAlertsToSave = new List<Alert>();
 75:         // Suppress duplicate alert types within a 5-minute window
 76:         var recentAlertTypes = await _db.Alerts
 77:             .Where(a => a.DeviceId == device.Id && a.CreatedAt >= DateTime.UtcNow.AddMinutes(-5))
 78:             .Select(a => a.AlertType)
 79:             .ToListAsync();
 80:         // ── Rule A: Absolute Heart Rate ────────────────────────────────────
 81:         if (dto.Payload.TryGetProperty("heart_rate", out var hr))
 82:         {
 83:             double currentHr = hr.GetDouble();
 84:             var (hrMin, hrMax) = ResolveThreshold("heart_rate", patientThresholds);
 85:             if ((currentHr > hrMax || currentHr < hrMin) && !recentAlertTypes.Contains("ABNORMAL_HEART_RATE"))
 86:             {
 87:                 activeAlertsToSave.Add(CreateAlert(device.Id, reading, "ABNORMAL_HEART_RATE", "CRITICAL",
 88:                     $"Abnormal Heart Rate: {currentHr} bpm (threshold: {hrMin}–{hrMax})"));
 89:             }
 90:             // ── Rule B: Rate of Change ────────────────────────────────────
 91:             if (lastReading != null && lastReading.Payload.RootElement.TryGetProperty("heart_rate", out var lastHr))
 92:             {
 93:                 double delta = Math.Abs(currentHr - lastHr.GetDouble());
 94:                 if (delta >= 20 && !recentAlertTypes.Contains("SUDDEN_HR_CHANGE"))
 95:                 {
 96:                     activeAlertsToSave.Add(CreateAlert(device.Id, reading, "SUDDEN_HR_CHANGE", "WARNING",
 97:                         $"Sudden HR change detected: Δ{delta:F0} bpm between consecutive readings."));
 98:                 }
 99:             }
100:         }
101:         // ── Rule C: SpO2 ──────────────────────────────────────────────────
102:         if (dto.Payload.TryGetProperty("spo2", out var spo2))
103:         {
104:             double currentSpo2 = spo2.GetDouble();
105:             var (spo2Min, _) = ResolveThreshold("spo2", patientThresholds);
106:             if (currentSpo2 < spo2Min && !recentAlertTypes.Contains("LOW_SPO2"))
107:             {
108:                 activeAlertsToSave.Add(CreateAlert(device.Id, reading, "LOW_SPO2", "CRITICAL",
109:                     $"Critical SpO2 Level: {currentSpo2}% (threshold: ≥{spo2Min}%)"));
110:             }
111:         }
112:         // ── Rule D: Temperature ───────────────────────────────────────────
113:         if (dto.Payload.TryGetProperty("temperature", out var temp))
114:         {
115:             double currentTemp = temp.GetDouble();
116:             var (tempMin, tempMax) = ResolveThreshold("temperature", patientThresholds);
117:             if ((currentTemp > tempMax || currentTemp < tempMin) && !recentAlertTypes.Contains("ABNORMAL_TEMPERATURE"))
118:             {
119:                 activeAlertsToSave.Add(CreateAlert(device.Id, reading, "ABNORMAL_TEMPERATURE", "WARNING",
120:                     $"Abnormal Temperature: {currentTemp}°C (threshold: {tempMin}–{tempMax}°C)"));
121:             }
122:         }
123:         if (activeAlertsToSave.Any())
124:             _db.Alerts.AddRange(activeAlertsToSave);
125:         await _db.SaveChangesAsync();
126:         // 6. Broadcast via SignalR
127:         await _hub.Clients.All.SendAsync("ReceiveNewReading", new
128:         {
129:             reading.Id,
130:             reading.DeviceId,
131:             device.DeviceCode,
132:             reading.RecordedAt,
133:             Payload = dto.Payload
134:         });
135:         foreach (var alert in activeAlertsToSave)
136:         {
137:             _logger.LogWarning("Clinical Alert Triggered: {Type} for {Device}", alert.AlertType, device.DeviceCode);
138:             await _hub.Clients.All.SendAsync("ReceiveNewAlert", new
139:             {
140:                 alert.Id,
141:                 alert.DeviceId,
142:                 DeviceCode = device.DeviceCode,
143:                 alert.AlertType,
144:                 alert.Severity,
145:                 alert.Message,
146:                 alert.CreatedAt
147:             });
148:         }
149:     }
150:     // ──────────────────────────────────────────────────────────────────────────
151:     // Resolve threshold: per-patient override takes priority; falls back to global
152:     // ──────────────────────────────────────────────────────────────────────────
153:     private static (double Min, double Max) ResolveThreshold(
154:         string key,
155:         Dictionary<string, (double? Min, double? Max)> patientOverrides)
156:     {
157:         var def = GlobalThresholds.TryGetValue(key, out var g) ? g : (Min: 0.0, Max: double.MaxValue);
158:         if (!patientOverrides.TryGetValue(key, out var p))
159:             return def;
160:         return (p.Min ?? def.Min, p.Max ?? def.Max);
161:     }
162:     private static Alert CreateAlert(Guid deviceId, SensorReading reading, string type, string severity, string message)
163:     {
164:         return new Alert
165:         {
166:             DeviceId = deviceId,
167:             Reading = reading,
168:             AlertType = type,
169:             Severity = severity,
170:             Message = message,
171:             CreatedAt = DateTime.UtcNow
172:         };
173:     }
174:     public async Task<IEnumerable<object>> GetHistoryAsync(string deviceCode, int limit, DateTime? start, DateTime? end)
175:     {
176:         var query = _db.SensorReadings
177:             .Include(r => r.Device)
178:             .Where(r => r.Device!.DeviceCode == deviceCode);
179:         if (start.HasValue) query = query.Where(r => r.RecordedAt >= start.Value.ToUniversalTime());
180:         if (end.HasValue)   query = query.Where(r => r.RecordedAt <= end.Value.ToUniversalTime());
181:         var rawData = await query
182:             .OrderByDescending(r => r.RecordedAt)
183:             .Take(limit)
184:             .ToListAsync();
185:         // Server-side decimation — keeps chart performant for long windows
186:         const int maxChartPoints = 100;
187:         if (rawData.Count > maxChartPoints)
188:         {
189:             int step = (int)Math.Ceiling(rawData.Count / (double)maxChartPoints);
190:             rawData = rawData.Where((x, index) => index % step == 0).ToList();
191:         }
192:         return rawData.Select(r => new {
193:             r.Id,
194:             r.DeviceId,
195:             DeviceCode = r.Device!.DeviceCode,
196:             r.RecordedAt,
197:             Payload = r.Payload
198:         });
199:     }
200: }
</file>

<file path="backend/data/app_db_context.cs">
 1: using MedicalDeviceMonitor.Models;
 2: using Microsoft.EntityFrameworkCore;
 3: namespace MedicalDeviceMonitor.Data;
 4: public class AppDbContext : DbContext
 5: {
 6:     public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
 7:     {
 8:     }
 9:     public DbSet<Device> Devices { get; set; }
10:     public DbSet<SensorReading> SensorReadings { get; set; }
11:     public DbSet<Alert> Alerts { get; set; }
12:     public DbSet<User> Users { get; set; }
13:     public DbSet<Patient> Patients { get; set; }
14:     public DbSet<BedAssignment> BedAssignments { get; set; }
15:     public DbSet<AuditLog> AuditLogs { get; set; }
16:     public DbSet<PatientThreshold> PatientThresholds { get; set; }
17:     public DbSet<CalibrationRecord> CalibrationRecords { get; set; }
18:     public DbSet<MedicationSchedule> MedicationSchedules { get; set; }
19:     public DbSet<ClinicalNote> ClinicalNotes { get; set; }
20:     public DbSet<PatientTransfer> PatientTransfers { get; set; } 
21:     public DbSet<Department> Departments { get; set; }
22:     public DbSet<Permission> Permissions { get; set; }
23:     public DbSet<Role> Roles { get; set; }
24:     public DbSet<Group> Groups { get; set; }
25:     protected override void OnModelCreating(ModelBuilder modelBuilder)
26:     {
27:         base.OnModelCreating(modelBuilder);
28:         // JSONB mapping for Postgres
29:         modelBuilder.Entity<SensorReading>().Property(e => e.Payload).HasColumnType("jsonb");
30:         modelBuilder.Entity<AuditLog>().Property(e => e.Detail).HasColumnType("jsonb");
31:         // Ensure decimal precision for vitals if needed
32:         modelBuilder.Entity<PatientThreshold>().Property(p => p.MinValue).HasColumnType("decimal");
33:         modelBuilder.Entity<PatientThreshold>().Property(p => p.MaxValue).HasColumnType("decimal");
34:     }
35: }
</file>

<file path="backend/Program.cs">
  1: using MedicalDeviceMonitor.Data;
  2: using MedicalDeviceMonitor.Hubs;
  3: using MedicalDeviceMonitor.Services;
  4: using Microsoft.EntityFrameworkCore;
  5: using DotNetEnv;
  6: using Serilog;
  7: using Serilog.Sinks.Grafana.Loki;
  8: using Serilog.Context;
  9: using Microsoft.AspNetCore.Authentication.JwtBearer;
 10: using Microsoft.AspNetCore.Diagnostics.HealthChecks;
 11: using Microsoft.Extensions.Diagnostics.HealthChecks;
 12: using Microsoft.IdentityModel.Tokens;
 13: using Microsoft.OpenApi.Models;
 14: using System.Text;
 15: using System.Text.Json;
 16: using MedicalDeviceMonitor.Models;
 17: using System.Security.Claims;
 18: using Hangfire;
 19: using Hangfire.PostgreSql;
 20: // Load .env.local and force overwrite existing env vars
 21: Env.Load("../.env", new LoadOptions(
 22:     setEnvVars: true,
 23:     clobberExistingVars: true,
 24:     onlyExactPath: false
 25: ));
 26: var lokiUrl = Environment.GetEnvironmentVariable("LOKI_URL") ?? "http://localhost:3100";
 27: Log.Logger = new LoggerConfiguration()
 28:     .MinimumLevel.Information()
 29:     .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
 30:     .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)
 31:     .Enrich.FromLogContext()
 32:     .WriteTo.Console()
 33:     .WriteTo.GrafanaLoki(lokiUrl,
 34:         labels: new[] { new LokiLabel { Key = "app", Value = "medmon_backend" } },
 35:         propertiesAsLabels: new[] { "device", "level" }
 36:     )
 37:     .CreateLogger();
 38: var builder = WebApplication.CreateBuilder(args);
 39: builder.Host.UseSerilog();
 40: builder.Configuration.AddEnvironmentVariables();
 41: var connectionString = Environment.GetEnvironmentVariable("SUPABASE_CONN_STRING")
 42:                        ?? builder.Configuration.GetConnectionString("Supabase");
 43: if (string.IsNullOrEmpty(connectionString))
 44:     throw new InvalidOperationException(
 45:         "SUPABASE_CONN_STRING environment variable or configuration is missing. Check your .env.local file.");
 46: builder.Services.AddDbContext<AppDbContext>(options =>
 47:     options.UseNpgsql(connectionString, npgsqlOptions =>
 48:     {
 49:         npgsqlOptions.EnableRetryOnFailure(
 50:             maxRetryCount: 3,
 51:             maxRetryDelay: TimeSpan.FromSeconds(5),
 52:             errorCodesToAdd: null);
 53:     })
 54: );
 55: // ─── Health Checks ─────────────────────────────────────────────────────────
 56: // /health      → liveness (always 200 if process is up)
 57: // /health/db   → readiness — confirms Supabase Postgres is reachable
 58: builder.Services.AddHealthChecks()
 59:     .AddDbContextCheck<AppDbContext>(
 60:         name: "database",
 61:         failureStatus: HealthStatus.Unhealthy,
 62:         tags: new[] { "db", "ready" });
 63: // ─── JWT Authentication ─────────────────────────────────────────────────────
 64: var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
 65:                 ?? builder.Configuration["Jwt:Secret"]
 66:                 ?? "FallbackSecretKeyThatIsAtLeast32BytesLong!";
 67: builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
 68:     .AddJwtBearer(options =>
 69:     {
 70:         options.TokenValidationParameters = new TokenValidationParameters
 71:         {
 72:             ValidateIssuerSigningKey = true,
 73:             IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
 74:             ValidateIssuer = false,
 75:             ValidateAudience = false,
 76:             ClockSkew = TimeSpan.Zero
 77:         };
 78:         options.Events = new JwtBearerEvents
 79:         {
 80:             OnMessageReceived = context =>
 81:             {
 82:                 var accessToken = context.Request.Query["access_token"];
 83:                 var path = context.HttpContext.Request.Path;
 84:                 if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/vitalsigns"))
 85:                     context.Token = accessToken;
 86:                 return Task.CompletedTask;
 87:             }
 88:         };
 89:     });
 90: builder.Services.AddAuthorization();
 91: builder.Services.AddSignalR();
 92: builder.Services.AddControllers();
 93: builder.Services.AddCors(options =>
 94: {
 95:     options.AddPolicy("AllowFrontend", policy =>
 96:         policy.WithOrigins(
 97:                 "http://localhost:5173",
 98:                 "http://localhost:3000"
 99:               )
100:               .AllowAnyHeader()
101:               .AllowAnyMethod()
102:               .AllowCredentials());
103: });
104: builder.Services.AddEndpointsApiExplorer();
105: // ─── Swagger with JWT bearer auth ──────────────────────────────────────────
106: builder.Services.AddSwaggerGen(c =>
107: {
108:     c.SwaggerDoc("v1", new OpenApiInfo
109:     {
110:         Title = "MedMonitor API",
111:         Version = "v2",
112:         Description = "Medical Device Monitoring System — IEC 62304 Class B"
113:     });
114:     c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
115:     {
116:         Description = "JWT Authorization. Enter your token below. Example: \"Bearer eyJ...\"",
117:         Name = "Authorization",
118:         In = ParameterLocation.Header,
119:         Type = SecuritySchemeType.Http,
120:         Scheme = "bearer",
121:         BearerFormat = "JWT"
122:     });
123:     c.AddSecurityRequirement(new OpenApiSecurityRequirement
124:     {
125:         {
126:             new OpenApiSecurityScheme
127:             {
128:                 Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
129:             },
130:             Array.Empty<string>()
131:         }
132:     });
133: });
134: builder.Services.AddScoped(typeof(ReadingService));
135: builder.Services.AddScoped<AuditService>();
136: builder.Services.AddScoped<MedicationService>();
137: // Hangfire for scheduled jobs
138: builder.Services.AddHangfire(config =>
139:     config.UsePostgreSqlStorage(options => options.UseNpgsqlConnection(connectionString)));
140: builder.Services.AddHangfireServer();
141: // Register the retention job as a service
142: builder.Services.AddScoped<RetentionService>();
143: var app = builder.Build();
144: Log.Information("Medical Device Monitor Backend starting on {Time}", DateTime.Now);
145: if (app.Environment.IsDevelopment())
146: {
147:     app.UseSwagger();
148:     app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "MedMonitor v2"));
149: }
150: // ─── Health Check Endpoints ─────────────────────────────────────────────────
151: // Liveness — GitHub Actions keepalive should point here instead of /api/devices
152: app.MapHealthChecks("/health", new HealthCheckOptions
153: {
154:     Predicate = _ => false, // Only checks that the app is alive (no DB query)
155:     ResponseWriter = async (ctx, _) =>
156:     {
157:         ctx.Response.ContentType = "application/json";
158:         await ctx.Response.WriteAsync("{\"status\":\"healthy\",\"service\":\"medmon-backend\"}");
159:     }
160: });
161: // Readiness — includes DB probe
162: app.MapHealthChecks("/health/db", new HealthCheckOptions
163: {
164:     Predicate = hc => hc.Tags.Contains("db"),
165:     ResponseWriter = async (ctx, report) =>
166:     {
167:         ctx.Response.ContentType = "application/json";
168:         var result = new
169:         {
170:             status = report.Status.ToString(),
171:             checks = report.Entries.Select(e => new
172:             {
173:                 name = e.Key,
174:                 status = e.Value.Status.ToString(),
175:                 description = e.Value.Description
176:             })
177:         };
178:         await ctx.Response.WriteAsync(JsonSerializer.Serialize(result));
179:     }
180: });
181: // ─── Correlation ID Middleware ──────────────────────────────────────────────
182: app.Use(async (context, next) =>
183: {
184:     var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
185:                         ?? Guid.NewGuid().ToString();
186:     using (LogContext.PushProperty("correlation_id", correlationId))
187:     {
188:         context.Response.Headers.Append("X-Correlation-ID", correlationId);
189:         await next();
190:     }
191: });
192: app.UseCors("AllowFrontend");
193: app.UseAuthentication();
194: app.UseAuthorization();
195: app.Use(async (context, next) =>
196: {
197:     var userIdString = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
198:     var userRole     = context.User?.FindFirst(ClaimTypes.Role)?.Value;
199:     // Detect system-level requests (like the Python Simulator hitting the Ingest API)
200:     bool isSystemIngest = false;
201:     // We allow the ingest endpoint to bypass RLS here so the controller can load 
202:     // the device from the database and cryptographically verify the X-Device-Api-Key.
203:     if (string.IsNullOrEmpty(userIdString) && context.Request.Path.StartsWithSegments("/api/readings/ingest", StringComparison.OrdinalIgnoreCase))
204:     {
205:         isSystemIngest = true;
206:     }
207:     var db = context.RequestServices.GetRequiredService<AppDbContext>();
208:     // 1. EXPLICITLY OPEN THE CONNECTION
209:     // This forces EF Core to keep the same physical connection for the entire HTTP request,
210:     // ensuring our Postgres Session Variables survive across multiple queries.
211:     await db.Database.OpenConnectionAsync();
212:     try
213:     {
214:         if (!string.IsNullOrEmpty(userIdString))
215:         {
216:             // FALSE is correct here because we are using Port 5432 (Session pooling)
217:             await db.Database.ExecuteSqlRawAsync(
218:                 "SELECT set_config('app.current_user_id', {0}, false)",
219:                 userIdString
220:             );
221:         }
222:         else if (isSystemIngest)
223:         {
224:             // System processes bypass RLS
225:             await db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', 'system', false)");
226:         }
227:         await next();
228:     }
229:     finally
230:     {
231:         // PREVENT ADO.NET CONNECTION POOL POISONING
232:         // Clears the session variables before the connection is returned to the pool.
233:         await db.Database.ExecuteSqlRawAsync(
234:             "SELECT set_config('app.current_user_id', '', false), " +
235:             "       set_config('app.user_role', '', false)"
236:         );
237:         // 2. EXPLICITLY CLOSE THE CONNECTION
238:         await db.Database.CloseConnectionAsync();
239:     }
240: });
241: app.MapControllers();
242: app.MapHub<VitalSignsHub>("/hubs/vitalsigns");
243: using (var scope = app.Services.CreateScope())
244: {
245:     var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
246:     recurringJobManager.AddOrUpdate<RetentionService>(
247:         "purge-old-readings",
248:         svc => svc.PurgeOldReadingsAsync(),
249:         "0 2 * * *");
250:     // Check for missed meds every 15 minutes
251:     recurringJobManager.AddOrUpdate<MedicationService>(
252:         "check-missed-meds",
253:         svc => svc.CheckOverdueMedicationsAsync(),
254:         "*/15 * * * *");
255: }
256: app.Run();
</file>

</files>