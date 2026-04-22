
---

# Medical Device Data Acquisition & Monitoring System — Project Plan

> **Target Roles:** Keysight · Pentamaster · Intel Malaysia (Penang medical device & automation sector)

---

## 1. Tech Stack

| Layer        | Technology                          | Rationale                                                   |
|--------------|-------------------------------------|-------------------------------------------------------------|
| Frontend     | React 19 + Vite + Recharts          | Fast HMR, rich charting ecosystem, highest job-market ROI   |
| Backend      | .NET 8 (C#) Web API                 | Preferred by medical device companies; native async & SignalR |
| Database     | PostgreSQL via Supabase             | 500MB free managed Postgres; full access to JSONB/GIN features |
| Real-time    | SignalR (WebSocket)                 | Native to .NET; production-grade for device data streams    |
| DevOps       | Docker + docker-compose + Nginx     | Multi-stage builds; reverse proxy for frontend + backend    |
| Deployment   | Railway / Render + Supabase         | Free-tier PaaS + reliable cloud database; zero overhead     |
| Simulation   | Python script + Kaggle CSV          | "Replay" a real ICU dataset to simulate a physical device   |
| Environment  | DotNetEnv & venv                    | Centralized `.env` management & isolated dependencies        |
| DevOps       | Supabase CLI + Migrations           | Version-controlled database schema (The DevOps Way)          |
| Monitoring   | VictoriaMetrics + Loki + Grafana    | Time-series & log observability with 15-day retention policy |


---

## 2. Key Features

- **TCP/IP Socket simulation** — A Python or C# script mimics a medical device sending byte streams; this is the portfolio differentiator that proves hardware-software integration awareness.
  - *Cloud caveat:* Free-tier PaaS exposes only ports 80/443. Use WebSocket simulation in the cloud; keep raw TCP for local/demo. Document this trade-off explicitly in the README.
- **Real-time dashboard** — Charts update every 5–10 seconds via SignalR; append data points only (no full re-render) to show engineering maturity.
- **REST API** — CRUD + filtering + date-range queries on sensor data.
- **PostgreSQL JSONB (Supabase)** — Store flexible sensor payloads; add a GIN index to keep queries fast at scale.
- **Optional:** Basic login / JWT auth (Handled in .NET, not Supabase Auth).

---

## 3. Data Strategy

- **Tool:** Download real "ICU Vital Signs" from Kaggle (Timestamp, HR, SpO2, BP). Write a Python script to "replay" this data row-by-row into your .NET backend.
- **Volume:** 20,000 to 50,000 rows — large enough for realistic pagination/aggregation, small enough for free-tier hosting forever.
- **Storage estimate:** ~80 MB; **Supabase free tier provides 500 MB** (6× headroom).

### 3.1 Observability & Data Retention Strategy

To demonstrate enterprise-level infrastructure awareness, the system includes a dedicated monitoring stack:
- **VictoriaMetrics**: Handles high-performance time-series metrics from the backend and system.
  - *Retention:* 15 days (auto-purged to manage disk space).
- **Loki**: Aggregates logs from the .NET backend and simulation scripts.
  - *Retention:* 15 days (enforced via Loki compactor).
- **Grafana**: Provides a unified dashboard for system health and data ingestion rates.
  - *Persistence:* Permanent (dashboards and datasources survive rebuilds via Docker volumes).

---

## 4. The Supabase Strategy 

Supabase is a "Backend-as-a-Service" that offers its own APIs, Auth, and WebSockets. **Do not use them.**

Instead, use Supabase **strictly as a cloud PostgreSQL database**:
1. Create a Supabase project and grab the **PostgreSQL Connection String** (Transaction mode).
2. Connect your **.NET 8 Backend** to Supabase using Entity Framework Core (`Npgsql.EntityFrameworkCore.PostgreSQL`) or Dapper.
3. Write your own REST APIs in C#.
4. Write your own WebSockets using SignalR in C#.

**Why this works:** You get a world-class, free, cloud-hosted database, but you still prove to employers that you can write complex backend logic, queries, and socket routing in C#.

### 4.1 The DevOps Way (CLI & Migrations)
To demonstrate industrial maturity, we avoid manual SQL execution in the dashboard:
1.  **Supabase CLI**: Installed as a dev dependency to manage the project locally.
2.  **Migrations**: Every schema change is captured in a timestamped `.sql` file, allowing for reproducible database states across different environments (local vs. production).
3.  **Local Development**: Using `supabase init` and `supabase link` to bridge the gap between local code and cloud infrastructure.

---

## 5. Project Status & To-Do List

### ✅ Completed
- [x] Initial local Git version control (`git init`)
- [x] Configure a robust `.gitignore` file
- [x] Setup environment variable management (`.env` + `DotNetEnv`)
- [x] **Python Simulation:** Isolated dependencies using **venv**
- [x] **DevOps:** Multi-stage **Dockerfile** for Backend and Frontend
- [x] **DevOps:** `docker-compose.yml` with monitoring stack (VictoriaMetrics/Loki/Grafana)

### 🚀 Upcoming Tasks
- [ ] GitHub Push · Supabase CLI linking · Database migrations
- [ ] .NET 8 REST API (CRUD, filtering, connect to Supabase)
- [ ] React + Vite frontend · Real-time charts via SignalR
- [ ] Polish UI/UX · Decimation logic · Production deployment

---

## 6. Execution Plan 

**Initial Setup Phase**
- Initialize local Git version control (`git init`).
- Configure a robust `.gitignore` file to ensure secrets, binaries, and dependencies are never committed.

| No. | Deliverable                                              |
|------|----------------------------------------------------------|
| 1    | Push to GitHub repo · **Setup Supabase CLI** · migrations · Seed Python script |
| 2    | .NET 8 REST API (CRUD, filtering, connect to Supabase)   | 
| 3    | React + Vite frontend · dashboard layout · API wiring    | 
| 4    | SignalR / WebSocket live updates · TCP simulator         | 
| 5    | Dockerfile · docker-compose.yml · deploy to Render       | 

---

## 7. Deployment Notes

- **Database:** Supabase (Free tier: 500MB storage, 2 active projects).
- **Backend:** Railway or Render (.NET Docker container). Connects to Supabase via `DATABASE_URL` environment variable.
- **Frontend:** Vercel, Netlify, or bundled with your .NET app.
- **Supabase Pause Caveat:** Free Supabase projects pause after 1 week of inactivity. You will need to log into the Supabase dashboard and click "Restore" before showing it to an interviewer.

---

## 8. Frontend Framework: React + Vite (Recommended)

React is the clear choice for this project's target market:

| Factor                  | React + Vite          | Vue 3 + Vite        |
|-------------------------|-----------------------|---------------------|
| Malaysia job market     | ✅ 3–5× more listings | Available but fewer |
| Keysight / Pentamaster  | ✅ Accepted           | ✅ Accepted         |
| PETRONAS Digital        | ✅ Preferred          | Acceptable          |
| Ecosystem & libraries   | ✅ Largest            | Sufficient          |
| Real-time chart perf    | Good (Recharts)       | Slightly smoother   |

**Recommended UI stack:** React 19 + Vite · Recharts or Chart.js · Tailwind CSS + shadcn/ui

---

## 9. Project Folder Structure

```
medical-device-monitoring/
├── frontend/                  # React 19 + Vite
│   ├── src/
│   ├── Dockerfile
├── backend/                   # .NET 8 Web API (C#)
│   ├── Controllers/
│   ├── Hubs/                  # SignalR hub
│   ├── Services/              # TCP simulator service
│   ├── Models/
│   └── Dockerfile
├── database/
│   ├── migrations/            # Supabase migrations (DevOps way)
│   ├── schema.sql             # Reference SQL schema
│   └── device_simulator.py    # Python script to read Kaggle CSV & stream to backend
├── docker/                    # Infrastructure configurations
│   ├── nginx.conf             # Reverse proxy config
│   ├── loki-config.yml        # Log retention & storage rules
│   └── grafana/               # Dashboards & Datasource provisioning
├── docker-compose.yml         # full stack (app + monitoring)
├── .env.example               # SUPABASE_CONN_STRING, GRAFANA_USER, etc.
└── README.md                  # Architecture diagram + challenges
```

---

## 10. README

1. **Architecture diagram** (draw.io or Mermaid) — Device Simulator → .NET API → Supabase Postgres → SignalR → React.
2. **Challenges & Solutions** section — e.g., *"Charts lagged at 1,000 data points → implemented server-side data decimation in .NET before sending via SignalR."*
3. **Tech choice justifications** — *"Used Supabase purely as a managed PostgreSQL instance to leverage JSONB indexing while keeping business logic and WebSocket routing strictly inside .NET 8 to demonstrate enterprise architecture."*
4. **Live demo link** + screenshots.
5. **TCP caveat** — Clearly explain the cloud port-restriction trade-off. Add a GIF showing the local TCP simulation working.

---

## 11. Risk Register

| Risk                             | Severity | Mitigation                                                        |
|----------------------------------|----------|-------------------------------------------------------------------|
| TCP ports blocked on free PaaS   | Low      | WebSocket fallback in cloud; document in README                   |
| JSONB query slowness at scale    | Low      | GIN index on payload column via Supabase SQL Editor               |
| Supabase DB Auto-Pausing         | Medium   | Set calendar reminder to ping the DB, or wake it up before interviews |
| Timeline slip                    | Medium   | Weekly incremental builds; deploy early                          |
| Database Sync Issues             | Low      | Use **Supabase CLI & Migrations** for consistent schema across dev/prod |
| Complex .NET EF Core migrations  | Low      | Use Dapper or raw ADO.NET if EF Core mapping to JSONB gets too complex |

---

## 12. Dependency & Environment Rationale

To ensure "zero-config" portability and professional standards, we utilize several key dependencies:

### Backend (.NET 8)
- **DotNetEnv**: Decouples configuration from the binary by loading `.env` files. This is essential for preventing secret leaks to GitHub.
- **Npgsql.EntityFrameworkCore.PostgreSQL**: The standard provider for connecting C# applications to PostgreSQL, supporting advanced features like JSONB.
- **Swashbuckle**: Automatically generates OpenAPI/Swagger documentation, proving that the API is built to industry standards.

### Simulation (Python)
- **venv (Virtual Environment)**: Essential for isolating project dependencies (`requests`, `python-dotenv`) from the system Python installation.
- **python-dotenv**: Allows the simulator to share the same `.env` file as the backend, ensuring a "single source of truth" for configuration.

### DevOps
- **Supabase CLI**: Provides a command-line interface for database management, enabling the migration-based workflow.
- **dotenv-cli**: A helper tool to inject environment variables into the Supabase CLI commands.

### 12.4 Monitoring & Observability
- **VictoriaMetrics**: Chosen over standard Prometheus for its significantly lower RAM/CPU footprint and simpler retention management, making it ideal for resource-constrained demo environments.
- **Loki**: Provides "Prometheus-like" log aggregation. By indexing labels instead of full text, it keeps storage requirements minimal while still allowing for powerful log filtering across the entire stack.
- **Grafana**: The industry standard for visualization. Pre-provisioned datasources ensure that the project is "plug-and-play" for anyone reviewing the code.