# Software Architecture Document (SAD)
**Document ID:** MED-SAD-001 | **Classification:** IEC 62304 Class B

## 1. System Overview
MedMonitor operates on a segregated architectural model to ensure clinical safety, alert integrity, and strict access isolation.

## 2. Architectural Layers
1. **Edge/Device Layer:** IoT monitors push HL7/FHIR or raw JSON payloads. Authenticated via mTLS (`certificate_thumbprint`).
2. **API Gateway & Routing:** Nginx reverse proxy routes traffic, terminates TLS, and enforces rate limits.
3. **Application Backend:** .NET 8 Web API. Enforces dynamic RBAC via JWT claims and processes clinical logic (MEWS, Alarm Fatigue).
4. **Data Layer:** PostgreSQL (Supabase). Enforces Data Isolation via Row-Level Security (RLS) on Port 5432. Immutable audit logs are maintained here.
5. **Presentation Layer:** React 19 SPA. Stateless, receiving real-time updates via SignalR.
