# CraftCommand Testing Strategy & Quality Standards

This document outlines the mandatory testing procedures and success metrics for the CraftCommand project. These rules apply to every development phase and are non-negotiable.

## 🛠 Global Testing Rules

### 1. Test-Driven Flow

- **Tests First:** Add tests BEFORE shipping any code changes. No feature is considered complete without accompanying validation.

### 2. Mandatory Test Classes

The following test suites must be maintained and executed regularly:

- **E2E Tests:** Covering the onboarding wizard, remote node starting, and reliable file transfer protocols.
- **Chaos Testing:** Verifying system resilience against random disconnects, process kills, and power-cycle simulations.
- **Security Regressions:** Monitoring for secret leakage, path traversal vulnerabilities, and JWT/token integrity.

### 3. Preservation of Quality

- **Never Delete:** Valuable tests must never be deleted. If they become legacy or slow, move them under a structured `/tests/*` directory but maintain their execution capability.

### 4. Git-Based Validation

Before any commit or merge, perform a manual audit:

- `git status` (Check for untracked side effects)
- `git diff` (Review logic changes line-by-line)
- `git log --stat` (Understand the blast radius of recent changes)

---

## 📊 Success Metrics

We track the following KPIs to measure the health of the project:

| Metric                   | Target     | Description                                                                    |
| :----------------------- | :--------- | :----------------------------------------------------------------------------- |
| **First Server Started** | >95%       | Success rate of the initial server creation and boot flow.                     |
| **Second Node Added**    | >90%       | Success rate of the multi-node enrollment wizard.                              |
| **Support Density**      | <2 per 100 | Number of support tickets per 100 active users.                                |
| **Recovery Success**     | 100%       | Successful auto-healing/recovery after a network disconnect.                   |
| **Time-to-Fix**          | <5 mins    | Average time taken for a user to resolve an issue using Diagnosis suggestions. |

---

## 📁 Repository Structure

- `tests/e2e`: Playwright/Cypress end-to-end flows.
- `tests/chaos`: Scripts for system stress and reliability testing.
- `tests/security`: Automated scans and regression checks.
