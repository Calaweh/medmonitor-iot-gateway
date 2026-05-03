# Software Development Plan (SDP)
**Document ID:** MED-SDP-001
**Class:** IEC 62304 Class B

## 1. Development Lifecycle
The project follows a modified Agile lifecycle with strict Waterfall gate reviews for clinical safety features.

## 2. Source Control & Branching
- **Branching Strategy:** GitFlow.
- **Main Branch:** Production-ready code only.
- **Develop Branch:** Integration of features.
- **Pull Requests:** Require at least one expert review and 100% pass on CI/CD pipelines.

## 3. Tooling & Environment
- **IDE:** Visual Studio / VS Code.
- **Languages:** C# (.NET 8), JavaScript (React 19).
- **CI/CD:** GitHub Actions (linting, build verification, unit tests).
- **Containerization:** Docker for development parity.

## 4. Change Control Process
Every code change must reference an **SRS ID** or a **Bug ID**. Changes to clinical logic (e.g., MEWS scoring) require a re-verification of the associated test cases in `MedicalDeviceMonitor.Tests`.

## 5. Risk Management Integration
Risk controls identified in `ISO14971_Risk_Matrix.md` must be implemented as unit tests or architectural constraints (e.g., RLS, Advisory Locks).
