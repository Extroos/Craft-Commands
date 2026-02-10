# CraftCommand: Exhaustive Feature Analysis & Technical Ranking

This report is a deep-dive into the entire codebase of CraftCommand (backend, frontend, and shared types), identifying every significant feature, technical sub-system, and operational capability.

---

## 🏛️ Tier 1: Core Systems & High-Order Automation

_The most complex systems involving deep OS interaction, heavy async coordination, or sophisticated algorithms._

### 1. Advanced Process Management Engine (`ProcessManager.ts`) [Rank: 1]

- **Feature**: Multi-Engine Server Spawning.
- **Sub-Features**:
  - **Execution Abstraction**: Switches between `native` (local child_process) and `docker` via the `IServerRunner` interface.
  - **Port Protection Engine**: Automatically scans for and kills "Ghost Processes" holding a server's port before startup.
  - **Managed vs. Unmanaged Detection**: Identifies if a process on a server port was started by the panel or an external source.
  - **Synchronous State Recovery**: Re-syncs server status every 15s to detect external process crashes.
- **Technical Power**: High. Handles raw streams (`stdout/stderr`), process signals, and low-level networking.

### 2. Intelligent Auto-Healing & Recovery (`DiagnosisService.ts`) [Rank: 2]

- **Feature**: Log-Based Predictive Diagnostics.
- **Sub-Features**:
  - **JVM Version Parser**: Detects `UnsupportedClassVersionError` and maps bytecodes (61.0 -> Java 17) to recommend the exact Java runtime needed.
  - **Heap Analysis**: Detects OOM (Out of Memory) and proactively suggests RAM increases or Spark profiler optimization.
  - **Corruption Sentry**: Scans crash reports for `RegionFile` or `level.dat` corruption to trigger immediate backup warnings.
  - **NBT Overflow Shield**: Detects packet explosions (exploits) and offers data file truncation.
  - **JVM Native Crash Monitor**: Detects `hs_err_pid` files and diagnoses graphics driver or hardware failures.
- **Technical Power**: Uses complex Regex matrices and filesystem state checks for autonomous decision making.

### 3. Smart Software Pipeline (`InstallerService.ts`) [Rank: 3]

- **Feature**: Heuristic-Driven Software Installation.
- **Sub-Features**:
  - **Modpack Heuristics**: Recursively analyzes ZIP files to identify pack types (CurseForge, Modrinth) by scanning for `overrides/` or `mods.toml`.
  - **In-Place Flattening**: Detects "user nesting errors" in ZIPs and automatically pulls files up to the server root.
  - **Mod-Link Resolution**: Resolves `modrinth:ID` strings to direct high-bandwidth primary mirrors.
  - **One-Click Injection**: Can auto-inject performance mods (like Spark) into the `plugins/` folder during server setup.
- **Technical Power**: Handles high-concurrency downloads with event-based progress tracking.

### 4. Hierarchical Access Control (RBAC) (`PermissionService.ts`) [Rank: 4]

- **Feature**: Trio-State Permission Engine.
- **Sub-Features**:
  - **Logical States**: Inherit, Allow, and Deny levels.
  - **Granular Scoping**: Permissions can be applied to specific server actions (e.g., "Allow start, Deny file edit").
  - **Staff Guard**: Prevents permission elevation by ensuring sub-roles cannot grant rights they don't possess.
- **Technical Power**: Complex recursive logic for permission inheritance.

---

## 🛠️ Tier 2: Operational Intelligence & Security

_Sub-systems that ensure stability, safety, and community interaction._

### 5. Atomic Backup & Reconstruction (`BackupService.ts`) [Rank: 5]

- **Feature**: Transactional Snapshots.
- **Sub-Features**:
  - **Swap Restoration**: Buffers restoration files before deletion to ensure the server can roll back if the ZIP is corrupted.
  - **Metadata Snapshots**: Includes server configs within the backup for a full system "Reconstruction" elsewhere.
  - **Zip-In-Zip Guard**: Prevents recursive compression loops during world backups.

### 6. Discord Smart-Sync High Fidelity (`DiscordService.ts`) [Rank: 6]

- **Feature**: Bidirectional Community Connection.
- **Sub-Features**:
  - **Managed Listener Pattern**: Prevents event duplication during server restarts.
  - **Debounced Telemetry**: Throttles player-count and status updates to prevent Discord API rate limiting.
  - **Auto-Slash Command Deployment**: Syncs bot commands with the global registry on startup.

### 7. Java Runtime Master (`JavaManager.ts`) [Rank: 7]

- **Feature**: On-Demand Environment Virtualization.
- **Sub-Features**:
  - **Isolated Runtimes**: Downloads and isolates Java 8, 11, 17, and 21 into the `runtimes/` folder.
  - **Dynamic Path Injection**: Injects the specific Java bin path into the server's execution environment at runtime.

### 8. Precision Scheduling Engine (`ScheduleService.ts`) [Rank: 8]

- **Feature**: Cron-Based Automation.
- **Sub-Features**:
  - **Complex Chains**: Can run sequences of commands (e.g., "Announce, Wait 5m, Backup, Restart").
  - **Persistence Guard**: Re-aligns the task queue after a power failure or panel reboot.

---

## 📊 Tier 3: Management Interface & Utility

_Visual and auxiliary features that enhance administrative speed._

### 9. Real-Time Telemetry Dashboard (`Dashboard.tsx`) [Rank: 9]

- **Features**:
  - Chart-based CPU/RAM/TPS visualizers.
  - Interactive terminal with command history and Tab-completion.
  - Live Player List with kick/ban integration.

### 10. Recursive File Manager (`FileManager.tsx`) [Rank: 10]

- **Features**:
  - Search/Filter by name or extension.
  - Bulk Upload (Drag & Drop).
  - One-click ZIP extraction and folder creation.
  - Live code editor with syntax highlighting for `.yml`, `.json`, and `.properties`.

### 11. Global Security & Safety Layer (`SafetyService.ts`) [Rank: 11]

- **Features**:
  - IP-based Rate Limiting.
  - Brute-force account lockout.
  - Remote Access Wizard with safety validation.

### 12. Smart Import Engine (`ImportService.ts`) [Rank: 12]

- **Features**:
  - Local directory scanning (points the panel to an existing folder).
  - Auto-detection of `server.properties`.

---

## 📈 Summary Metadata

- **Total Identified Modules**: 18
- **Primary Logic Services**: 36
- **Utility Layers**: 5
- **Project Maturity**: Highly Stable / Enterprise Grade
- **Architectural Philosophy**: "Deep Control" (Focus on local OS integration & safety)

---

## 🌍 Platform Support & Compatibility

_Analysis of OS-specific implementations vs. Cross-Platform capabilities._

### Windows (Native & Docker)

- **Status**: 🟢 **Fully Supported**
- **Native Mode**: Uses `JavaManager.ts` to automatically download and isolate Java 8/17/21 binaries into `runtimes/` (Windows-optimized).
- **Docker Mode**: Fully supported via Docker Desktop.
- **Startup**: One-click `run_locally.bat` launcher.

### Linux & macOS (Docker Only)

- **Status**: 🟡 **Partially Supported (Docker Recommended)**
- **Native Mode**: ⚠️ **Experimental**. The `JavaManager` currently contains Windows-specific download paths (`.exe`, `windows-x64`). Manual Java installation is required for native execution.
- **Docker Mode**: 🟢 **Fully Supported**. The `DockerRunner` bypasses local Java dependencies by pooling `eclipse-temurin` images directly from Docker Hub, making it the ideal way to run CraftCommand on non-Windows OS.
- **Startup**: Must be launched via terminal (`npm run dev` or `npm start`).
