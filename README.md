# Medical Device Data Acquisition & Monitoring System

> A full-stack portfolio project targeting roles at **Keysight · Pentamaster · Intel Malaysia**.

[![.NET](https://img.shields.io/badge/.NET-8.0-purple)](https://dotnet.microsoft.com)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com)

---

## 🏗️ Architecture

```
┌─────────────────────┐        TCP / HTTP POST
│  device_simulator.py │ ──────────────────────────►  ┌──────────────────────┐
│  (Python · Kaggle CSV│                              │   .NET 8 Web API      │
│   row-by-row replay) │                              │   (ASP.NET Core)      │
└─────────────────────┘                              │                       │
                                                      │  ┌─────────────────┐  │
                                                      │  │  SignalR Hub    │  │
                                                      │  └────────┬────────┘  │
                                                      └───────────┼───────────┘
                                                                  │ WebSocket
                                                      ┌───────────▼───────────┐
                                                      │    React 19 + Vite    │
                                                      │    (Recharts / shadcn) │
                                                      └───────────────────────┘
                                                                  │
                                                     (Supabase PostgreSQL)
                                                      ┌───────────▼───────────┐
                                                      │  PostgreSQL (JSONB)   │
                                                      │  hosted on Supabase   │
                                                      └───────────────────────┘
```

---

## 🗂️ Folder Structure

```
.
├── frontend/          # React 19 + Vite dashboard
├── backend/           # .NET 8 Web API + SignalR
├── database/          # schema.sql + device_simulator.py
├── docker/            # Nginx config
├── docker-compose.yml # Local dev orchestration
├── docs/              # Technical documentation
│   ├── portfolio_project_plan.md
│   └── devops_guide.md # Supabase CLI, Migrations, & Env setup
├── .env.example       # Environment variable template
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [Python 3.11+](https://python.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- A free [Supabase](https://supabase.com) project

### 1. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local and fill in your Supabase connection string
```

### 2. Initialize the Database
Run `database/schema.sql` in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query).

### 3. Start Backend
```bash
cd backend
dotnet restore
dotnet run
# API available at http://localhost:5000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

### 5. Run Device Simulator
```bash
cd database
# Create and activate virtual environment (venv)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies and run
pip install -r requirements.txt
python device_simulator.py
# Streams ICU data rows to the backend every second
```

### 6. Docker (Full Stack)
```bash
docker-compose up --build
# Frontend: http://localhost:3000  Backend: http://localhost:5000
```

---

## 🛠️ DevOps & Database Management

For a professional workflow using the **Supabase CLI** and **Database Migrations**, please refer to our:

👉 **[DevOps Guide](docs/devops_guide.md)**

It covers:
- Supabase CLI setup.
- Database migration workflow.
- Environment management with `venv` and `DotNetEnv`.

---

## ⚙️ Tech Choices & Trade-offs

| Decision | Choice | Why |
|----------|--------|-----|
| Database hosting | Supabase (PostgreSQL) | Free managed Postgres; used **only** as a DB via connection string — no Supabase SDK |
| Backend | .NET 8 Web API | Medical device companies (Keysight, Pentamaster) favour C# |
| Real-time | SignalR | Native .NET WebSocket abstraction; production-grade |
| Data simulation | Python CSV replay | Kaggle ICU dataset gives realistic HR/SpO₂/BP ranges |
| Environment | DotNetEnv + .env | Centralized config management across C# and Python |
| JSONB + GIN index | Yes | Efficient storage and querying of flexible sensor payloads |

---

## 🧗 Challenges Solved

- **Chart rendering lag** at 1,000+ data points → server-side data decimation in .NET before SignalR push, reducing payload ~80%.
- **TCP ports blocked on PaaS** → WebSocket simulation in cloud; raw TCP kept for local demo (documented here transparently).
- **Supabase auto-pause** → keep-alive ping scheduled via GitHub Actions cron.

---

## 📸 Screenshots

> *(Add screenshots / GIFs here after the dashboard is built)*

---

## 📄 License

MIT
