# CraftCommand Architecture

## Overview

CraftCommand is a Minecraft Server Management Solution built with a **Hybrid Orchestration** model, bridging the gap between simple local launchers and complex enterprise infrastructure.

### Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Framer Motion
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Shared**: TypeScript Types (`@shared/types`)
- **Storage**: Hybrid Dual-Storage (SQLite for teams, JSON for solo portability)

## Core Systems & High-Order Automation

### 1. Advanced Process Management Engine (`ProcessManager.ts`)

- **Multi-Engine Spawning**: Abstraction between `native` (local child_process) and `docker`.
- **Port Protection**: Automatically scans for and resolves "Ghost Processes" holding server ports.
- **State Recovery**: Synchronous status checks to detect external crashes or manual stops.

### 2. Intelligent Auto-Healing (`DiagnosisService.ts`)

- **Predictive Diagnostics**: Log-based analysis for JVM version mismatches, Heap/RAM issues, and NBT overflows.
- **Corruption Sentry**: Scans crash reports for world data corruption and triggers backup warnings.

### 3. Smart Software Pipeline (`InstallerService.ts`)

- **Heuristic Installation**: Analyzes ZIP files to identify pack types (CurseForge, Modrinth).
- **In-Place Flattening**: Fixes "user nesting errors" in ZIPs automatically.

## Structure

```
/
├── frontend/           # React Application
│   ├── src/
│   │   ├── components/ # UI Components
│   │   ├── features/   # Feature-grouped Components
│   │   └── lib/        # API and Utilities
│   └── dist/           # Built static files
│
├── backend/            # Node.js Server
│   ├── src/
│   │   ├── services/   # Business Logic (Auth, Servers, System)
│   │   ├── storage/    # Data Access Layer (Repositories)
│   │   ├── sockets/    # Real-time Event Handlers
│   │   └── server.ts   # Entry Point
│   └── data/           # Runtime Data (JSON files)
│
└── shared/             # Shared Code
    └── types/          # TypeScript Interfaces
```

## Real-time Communication

Socket.IO is used for console streaming, status updates, and real-time telemetry (CPU/RAM).
