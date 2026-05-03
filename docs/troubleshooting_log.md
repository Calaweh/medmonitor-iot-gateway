# 🛠️ Troubleshooting Log

This document records critical errors encountered during the development of the Medical Device Data Acquisition system and their respective solutions.

## 1. The "Ghost Process" Error
- **Symptom:** Grafana showed errors (e.g., `timeout=5`) that did not match the current code in VS Code.
- **Why:** Python scripts often continue running in the background. Old versions were pushing "zombie" data to Loki.
- **Solution:** Used `taskkill /F /IM python.exe` to forcefully wipe all Python processes from memory.

## 2. The Cloud Latency Timeout
- **Symptom:** Simulator `❌ Connection Error: Read timed out (read timeout=5)`.
- **Why:** The default 5s timeout was too short for round-trips to the cloud database (Supabase) during network fluctuations.
- **Solution:** Increased the timeout to `timeout=15` in the simulator's `requests.post` call.

## 3. Connection Pool Exhaustion (Transient Failure)
- **Symptom:** `{"error": "An exception has been raised that is likely due to a transient failure."}`
- **Why:** Supabase Free Tier transaction pooler ran out of slots when data was sent every 1.0 seconds.
- **Solution:** 
    - Slowed down the simulator to 3.0 seconds (`REPLAY_SPEED_SEC=3`).
    - Implemented EF Core Resiliency (Retry logic) in `Program.cs`.

## 4. The "Correlation ID" Gap
- **Symptom:** Some logs in Grafana had a `correlation_id`, but errors said `unknown`.
- **Why:** The `correlation_id` was generated but not passed to the `push_to_loki` function in `except` blocks.
- **Solution:** Updated the `push_to_loki` helper function to explicitly require and attach the `correlation_id` to every log level.

## 5. Npgsql Driver Syntax Error
- **Symptom:** `Backend 400 Error: {"error":"Couldn't set disable prepared statements (Parameter 'disable prepared statements')"}` or `maximum auto prepare`.
- **Why:** Npgsql 8.0+ is stricter with connection string parameters. Using non-standard or version-mismatched flags (like `Disable Prepared Statements` or `Max Auto Prepare`) can cause parsing failures in the backend.
- **Solution:** Simplified the connection string in `.env` to use only the essential **`No Reset On Close=true`** flag. This is the primary requirement for the Supabase Transaction Pooler and is the most compatible across Npgsql versions.

## 6. LogQL Case Sensitivity
- **Symptom:** `{app="medmon_backend", level="ERROR"}` returned no logs.
- **Why:** Loki is case-sensitive. Serilog sends `Error` (Title Case), while the simulator sends `ERROR` (All Caps).
- **Solution:** Verified label values in the "Indexed Labels" panel and matched exact casing, or used `|~ "(?i)error"`.

## 7. Labels vs. Structured Metadata
- **Symptom:** `{app="medmon_backend", detected_level="error"}` failed.
- **Why:** Labels are queried inside `{ }`. Non-indexed metadata must be filtered after the braces using `|`.
- **Solution:** Changed the query to `{app="medmon_backend"} | json | level="Error"`.

## 8. QuestPDF Chain Violation (CS1929)
- **Symptom:** `error CS1929: 'TextBlockDescriptor' does not contain a definition for 'Padding'`.
- **Why:** In QuestPDF, `Padding()` and `Background()` are methods on `IContainer`. Calling `.Text("...")` returns a `TextBlockDescriptor`, which ends the container chain and starts a text chain.
- **Solution:** Moved `Background()` and `Padding()` calls *before* the `.Text()` call so they apply to the container holding the text.

## 9. .NET 8 Tuple Method Ambiguity (CS0019)
- **Symptom:** `error CS0019: Operator '??' cannot be applied to operands of type 'double?' and 'method group'`.
- **Why:** .NET 8 introduced static `double.Min` and `double.Max` methods. If a variable is named `global` or if a tuple element is named `Min`/`Max` without explicit typing, the compiler may confuse the tuple element with the `System.Double` method group.
- **Solution:** Renamed the local variable from `global` to `def` and used named tuple literals `(Min: 0.0, Max: double.MaxValue)` to explicitly define the field names and avoid resolution ambiguity.

## 10. Sprint 0 Hardening: Build & Runtime Failures
- **Symptoms:**
    - `error CS0246: The type or namespace name 'AppDbContext' could not be found`
    - `error CS1061: 'IServiceCollection' does not contain a definition for 'AddHangfireServer'`
    - `Unhandled exception: System.InvalidOperationException: Current JobStorage instance has not been initialized yet.`
- **Why:**
    1. **Namespace Isolation:** New services (e.g., `RetentionService`) were added to the `Services` namespace but lacked `using` directives for `Data` and `Models`.
    2. **Missing Dependencies:** `Hangfire.Core` was installed, but `Hangfire.AspNetCore` (providing DI extensions) and `Hangfire.PostgreSql` (providing the storage provider) were missing from `csproj` or the `using` block.
    3. **Static API Usage:** Using the static `RecurringJob.AddOrUpdate` in .NET Core before the DI container is fully built leads to initialization race conditions.
- **Solutions:**
    - **Usings:** Synchronized namespaces and added `using MedicalDeviceMonitor.Data;`, `using MedicalDeviceMonitor.Models;`, and `using Hangfire;` across all new controllers and services.
    - **Csproj:** Added `Hangfire.AspNetCore` and `Hangfire.PostgreSql` to `MedicalDeviceMonitor.csproj`.
    - **DI-Aware Jobs:** Replaced static `RecurringJob` calls with `IRecurringJobManager` resolved from an `IServiceScope` after `app.Build()`.
    - **Cleanup:** Fixed a duplicate `userIdString` declaration in `AlertsController` and removed a broken "TenantId" query filter workaround in `AppDbContext`.

## 11. Database Schema Mismatch (400/500 Errors)
- **Symptom:** `GET /api/alerts 500 (Internal Server Error)` and `GET /api/readings/.../history 400 (Bad Request)`. Backend logs showed `Npgsql.PostgresException: 42703: column d.department_id does not exist`.
- **Why:** The C# models were updated to use new RBAC columns (like `department_id`), but the actual Supabase database was still using the old schema. Running `CREATE TABLE IF NOT EXISTS` in `current_schema.sql` failed to add the new columns because the tables already existed.
- **Solution:** 
    - Implemented an **idempotent startup hotfix** in `Program.cs` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
    - Added an automated seed step to ensure a default "ICU" department exists and that all legacy devices are assigned to it to prevent RLS/Foreign Key constraint failures.
    - Updated `AuthController` and `Program.cs` to use `ClaimTypes.NameIdentifier` for better compatibility with standard JWT claim mapping.

## 12. Ghost Function Build Failure (CS0103)
- **Symptom:** `error CS0103: The name 'VerifyDeviceSignature' does not exist in the current context`.
- **Why:** A trailing call to a non-existent method was accidentally left in `ReadingService.cs` during a refactor. This blocked the Docker build pipeline.
- **Solution:** Removed the non-existent call and associated comments. Hardened verification logic remains in the `ReadingsController` via API Key checks.

## 13. JWT Validation Type Mismatch (InvalidCastException)
- **Symptom:** `System.InvalidCastException: Reading as 'System.Int32' is not supported for fields having DataTypeName 'text'`.
- **Why:** The `token_version` column in PostgreSQL was created as `TEXT` or `VARCHAR`, but the EF Core model expected an `INT`. This caused the JWT `OnTokenValidated` hook to crash during revocation checks.
- **Solution:** Updated the startup hotfix in `Program.cs` to explicitly cast the column: `ALTER TABLE users ALTER COLUMN token_version TYPE INT USING NULLIF(token_version::text, '')::integer;`.

## 14. Interceptor Result Set Interference
- **Symptom:** `System.InvalidOperationException: The underlying reader doesn't have as many fields as expected. Expected: 11, actual: 1.`
- **Why:** The `TenantInterceptor` was prepending `SELECT set_config(...)` to database queries. Prepending `SELECT` returns a result set (the config value), which EF Core mistook for the actual data row.
- **Solution:** Switched from `SELECT set_config(...)` to `SET LOCAL app.current_user_id = '...';`. `SET` is a side-effect command that does not return rows, allowing EF Core to see the intended data.

## 15. Real-time Feed Schema Drift
- **Symptom:** `Npgsql.PostgresException: 42703: column d.last_seen_at does not exist`.
- **Why:** New clinical features (Device Heartbeat and Alert Acknowledgement) introduced new columns (`last_seen_at`, `acknowledged_at`) in the C# models, but these were missing from the database schema.
- **Solution:** Added `last_seen_at` (devices) and `acknowledged_at`/`acknowledged_by` (alerts) to the idempotent startup hotfix in `Program.cs`.
