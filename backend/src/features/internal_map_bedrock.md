# Bedrock Integration: Internal System Map

This document maps the core lifecycles of Java-based servers in CraftCommand and identifies the specific points where Bedrock Dedicated Server (BDS) must be integrated.

## 1. Installation Lifecycle

- **Entry Point**: `InstallerService.ts`
- **Current Flow**:
  - `InstallerService` provides dedicated methods (`installPaper`, `installFabric`, etc.) that fetch metadata via APIs (PaperMC, Modrinth, etc.) and download JARs using `downloadFile`.
  - It handles extracting ZIPs (Modpacks) using `extract-zip`.
  - It creates `eula.txt` and returns the main executable path.
- **Bedrock Integration**:
  - Add `installBedrock(serverDir, version)` to `InstallerService.ts`.
  - Needs to fetch BDS zip from official Mojang download URL.
  - Needs to extract and handle the `bedrock_server.exe` (Windows) or `bedrock_server` (Linux).

## 2. Startup Lifecycle

- **Entry Point**: `ServerService.ts` -> `StartupManager.ts`
- **Current Flow**:
  - `StartupManager.startServer` coordinates:
    - `safetyService.validateServer`
    - `NetUtils.checkPort`
    - `prepareEnvironment` (Checks for `mods`/`plugins` folders)
    - `javaManager.ensureJava`
    - `buildStartCommand` (Constructs JVM args and run command)
    - `enforceBackendProperties` (Writes `server-port` to `server.properties`)
  - Launches via `processManager.startServer`.
- **Bedrock Integration**:
  - `prepareEnvironment`: Add logic for Bedrock folders (if any, e.g., `worlds`).
  - `buildStartCommand`: Logic for non-Java execution. Skip JVM args. Use `./bedrock_server`.
  - `enforceBackendProperties`: Support Bedrock property keys (e.g., `server-port` vs `server-port-v6`).

## 3. Execution Layer

- **Entry Point**: `ProcessManager.ts` -> `RunnerFactory.ts` -> `NativeRunner.ts`
- **Current Flow**:
  - `NativeRunner` spawns the process and buffers logs.
  - `getStats` heuristic looks for `java` in descendants.
  - `stop` sends `stop\n` to stdin.
- **Bedrock Integration**:
  - `RunnerFactory`: Already engine-based ('native'|'docker'|'remote'), suitable for Bedrock.
  - `NativeRunner.getStats`: Update heuristic to find `bedrock_server`.
  - `stop`: Verify if Bedrock responds to `stop` or `quit`. (Bedrock uses `stop`).

## 4. Diagnosis & Healing

- **Entry Point**: `DiagnosisService.ts` -> `DiagnosisRules.ts`
- **Current Flow**:
  - `DiagnosisService` runs registered `CoreRules`.
  - Rules use regex on logs and check filesystem.
  - `AutoHealingService` executes the `action` returned by a rule.
- **Bedrock Integration**:
  - Add `BedrockRules` (regex for Bedrock console output).
  - Reuse generic rules (PortConflict, MissingDirectory).

## 5. Configuration Management

- **Entry Point**: `ServerConfigService.ts`
- **Current Flow**:
  - `verifyConfig`: Checks `server.properties` and `eula.txt`.
  - `enforceConfig`: Overwrites disk with DB settings.
- **Bedrock Integration**:
  - Adapt to Bedrock's `server.properties` format (UDP ports).
  - Bedrock doesn't use `eula.txt` in the same way (agreement usually in `allow-list.json` or just by running).

## 6. Shared Machinery (Already Compatible)

- `AuditLog`: Repository-based, decoupled from server type.
- `Schedules`: `ScheduleService` uses `ServerService.sendCommand`. Compatible if commands are same.
- `Backups`: `BackupService.createBackup` is directory-based. Compatible.
- `Nodes`: `RemoteRunner` sends commands over RPC. Compatible.
