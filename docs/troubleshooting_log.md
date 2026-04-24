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
