# SOUP / COTS List (Software of Unknown Provenance)
**Document ID:** MED-SOUP-001

Per IEC 62304, third-party software components incorporated into the medical device must be evaluated for risk.

| Component | Version | Purpose | Risk Evaluation & Mitigation |
| :--- | :--- | :--- | :--- |
| **.NET 8** | 8.0.x | Backend Framework | Low risk. Maintained by Microsoft. Mitigated via extensive automated health checks. |
| **PostgreSQL** | 15+ | Relational Database | Low risk. Mitigated via Managed PaaS (Supabase) with AES-256 encryption and PITR backups. |
| **React** | 19.x | UI Framework | Low risk. Does not process clinical logic. Backend enforces all safety/security boundaries. |
| **Hangfire** | 1.8.x | Background Jobs | Medium risk. If jobs fail, DB could fill up. Mitigated by `RetensionService` error logging to Loki. |
| **QuestPDF** | 2024.x | Shift Handover PDF | Low risk. Visual representation only. Includes "SYNTHETIC DATA / NOT FOR DIAGNOSIS" disclaimer. |