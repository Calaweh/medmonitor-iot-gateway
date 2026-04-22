
---

# Medical Device Data Acquisition & Monitoring System — Project Plan

> **Target Roles:** Keysight · Pentamaster · Intel Malaysia (Penang medical device & automation sector)

---

## 1. Tech Stack

| Layer        | Technology                          | Rationale                                                   |
|--------------|-------------------------------------|-------------------------------------------------------------|
| Frontend     | React 19 + Vite + Recharts          | Fast HMR, rich charting ecosystem, highest job-market ROI   |
| Backend      | .NET 8 (C#) Web API                 | Preferred by medical device companies; native async & SignalR |
| Database     | **PostgreSQL via Supabase**         | 500MB free managed Postgres; full access to JSONB/GIN features |
| Real-time    | SignalR (WebSocket)                 | Native to .NET; production-grade for device data streams    |
| DevOps       | Docker + docker-compose + Nginx     | Multi-stage builds; reverse proxy for frontend + backend    |
| Deployment   | Railway / Render + **Supabase**     | Free-tier PaaS + reliable cloud database; zero overhead     |
| Simulation   | Python script + Kaggle CSV          | "Replay" a real ICU dataset to simulate a physical device   |

**Excluded intentionally:** Redis, Prometheus, VictoriaMetrics, Grafana — unnecessary for a portfolio demo.

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

---

## 4. The Supabase Strategy 

Supabase is a "Backend-as-a-Service" that offers its own APIs, Auth, and WebSockets. **Do not use them.**

Instead, use Supabase **strictly as a cloud PostgreSQL database**:
1. Create a Supabase project and grab the **PostgreSQL Connection String** (Transaction mode).
2. Connect your **.NET 8 Backend** to Supabase using Entity Framework Core (`Npgsql.EntityFrameworkCore.PostgreSQL`) or Dapper.
3. Write your own REST APIs in C#.
4. Write your own WebSockets using SignalR in C#.

**Why this works:** You get a world-class, free, cloud-hosted database, but you still prove to employers that you can write complex backend logic, queries, and socket routing in C#.

---

## 5. Execution Plan 

**Initial Setup Phase (Pre-Week 1)**
- Initialize local Git version control (`git init`).
- Configure a robust `.gitignore` file to ensure secrets, binaries, and dependencies are never committed.

| Week | Deliverable                                              |
|------|----------------------------------------------------------|
| 1    | Push to GitHub repo · **Setup Supabase DB** · schema.sql · Seed Python script |
| 2    | .NET 8 REST API (CRUD, filtering, connect to Supabase)   | 
| 3    | React + Vite frontend · dashboard layout · API wiring    | 
| 4    | SignalR / WebSocket live updates · TCP simulator         | 
| 5    | Dockerfile · docker-compose.yml · deploy to Render       | 

---

## 6. Deployment Notes

- **Database:** Supabase (Free tier: 500MB storage, 2 active projects).
- **Backend:** Railway or Render (.NET Docker container). Connects to Supabase via `DATABASE_URL` environment variable.
- **Frontend:** Vercel, Netlify, or bundled with your .NET app.
- **Supabase Pause Caveat:** Free Supabase projects pause after 1 week of inactivity. You will need to log into the Supabase dashboard and click "Restore" before showing it to an interviewer.

---

## 7. Frontend Framework: React + Vite (Recommended)

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

## 8. Project Folder Structure

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
│   ├── schema.sql             # Table definitions + GIN index to run in Supabase SQL Editor
│   └── device_simulator.py    # Python script to read Kaggle CSV & stream to backend
├── docker-compose.yml         # app + nginx (for local dev)
├── .env.example               # SUPABASE_CONN_STRING="Host=aws-0-....pooler.supabase.com;..."
└── README.md                  # Architecture diagram + challenges
```

---

## 9. README Must-Haves (Your Hiring Pitch)

1. **Architecture diagram** (draw.io or Mermaid) — Device Simulator → .NET API → Supabase Postgres → SignalR → React.
2. **Challenges & Solutions** section — e.g., *"Charts lagged at 1,000 data points → implemented server-side data decimation in .NET before sending via SignalR."*
3. **Tech choice justifications** — *"Used Supabase purely as a managed PostgreSQL instance to leverage JSONB indexing while keeping business logic and WebSocket routing strictly inside .NET 8 to demonstrate enterprise architecture."*
4. **Live demo link** + screenshots.
5. **TCP caveat** — Clearly explain the cloud port-restriction trade-off. Add a GIF showing the local TCP simulation working.

---

## 10. Risk Register

| Risk                             | Severity | Mitigation                                                        |
|----------------------------------|----------|-------------------------------------------------------------------|
| TCP ports blocked on free PaaS   | Low      | WebSocket fallback in cloud; document in README                   |
| JSONB query slowness at scale    | Low      | GIN index on payload column via Supabase SQL Editor               |
| Supabase DB Auto-Pausing         | Medium   | Set calendar reminder to ping the DB, or wake it up before interviews |
| Timeline slip                    | Medium   | Weekly incremental builds; deploy early                          |
| Complex .NET EF Core migrations  | Low      | Use Dapper or raw ADO.NET if EF Core mapping to JSONB gets too complex |

---

## 11. Post-Launch Checklist

- [ ] Supabase connected via connection string (not Supabase Client SDK)
- [ ] Live URL on Railway / Render working
- [ ] Architecture diagram in README
- [ ] "Challenges Solved" section written
- [ ] Screen-recording GIF of the local TCP ingestion added to README
- [ ] LinkedIn post with live link
- [ ] Resume updated with project URL + tech stack