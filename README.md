<div align="center">
  
# CraftCommand

**The Professional Hybrid Cloud Platform for Java & Bedrock Infrastructure**

![version](https://img.shields.io/badge/version-v1.10.1-emerald)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)
![license](https://img.shields.io/badge/license-AGPLv3-blue.svg)

**CraftCommand** is a professional-grade orchestrator that bridges the gap between simple local launchers and complex enterprise infrastructure. It provides **monolithic management** with a **distributed data plane**, designed to **prevent mistakes**, **explain problems**, and **scale safely** from solo use to massive networks.

[Features](docs/ARCHITECTURE.md) • [Architecture](docs/ARCHITECTURE.md) • [Quick Start](#quick-start) • [Security Model](docs/SECURITY.md) • [Full Docs](docs/README.md)

</div>

---

## Why CraftCommand?

### The "Goldilocks" Solution

Most hosting solutions are either **too fragile** (Basic `.bat` files) or **too complex** (Enterprise panels requiring Linux degrees and hours of setup). CraftCommand offers a third way: **Hybrid Orchestration**.

- **Easier than a Batch File**: One click to start. No editing text files to fix RAM or Java versions.
- **Unified Engine**: Native support for **Java (Paper, Spigot, Vanilla)** and **Bedrock Edition (Dedicated Server)** with software-aware configurations.
- **Simpler than Enterprise**: Runs on **Windows**, installs in **seconds**, and scales with **Zero-Knowledge** worker nodes.

### Honest Comparison Matrix

| Feature              | Standard Launchers |     Enterprise Panels      |      **CraftCommand (v1.10.0)**       |
| :------------------- | :----------------: | :------------------------: | :-----------------------------------: |
| **Ideal For**        |      Testing       | Reselling & Large Networks |       **Home Hosting & Teams**        |
| **Setup Time**       |      Instant       |     Hours (Linux req.)     |       **Instant (Zero-Config)**       |
| **Architecture**     |    Local Child     |     Distributed Docker     |      **Hybrid (Local + Agents)**      |
| **OS Synergy**       |        All         |        Linux First         | **Universal (Win Panel + Lin Nodes)** |
| **Resilience**       |    Crash = Dead    |        Auto-Restart        |  **Self-Healing + Zombie Adoption**   |
| **Networking**       |  Manual Port Fwd   |       Reverse Proxy        |   **Atomic Proxy + SSL Auto-Issue**   |
| **License Model**    |      Various       |        Proprietary         |         **Copyleft (AGPLv3)**         |
| **Environment Fix**  |   Manual Install   |        Error & Exit        |  **Integrated Auto-Fix (Heuristic)**  |
| **File Transfer**    |     Local Only     |      SFTP Client Req.      |  **Secure Chunked Sync (Built-in)**   |
| **UX Design**        |  Industrial/Flat   |      Functional/Busy       |     **Premium Glassmorphic IDE**      |
| **Audit Logging**    |         ❌         |        Per-Instance        |   **Immutable Cluster-Wide Ledger**   |
| **Software Support** |  Java Only (typ.)  |         Universal          |    **Java & Bedrock (Optimized)**     |

![Server Selection](assets/ServerSelection.png)
_Manage multiple servers with a professional, data-dense interface._

---

## Core Capabilities

### 1. Global Operations Center (GOC)

_The cluster-wide "God View"_

- **Resource Heatmap**: Spatial visualization of CPU/RAM density across the entire cluster.
- **Environment Health**: Integrated prerequisite detection (Java 8-21, Docker, Git).
- **One-Click Auto-Fix**: Automatically repair remote node environments directly from the UI using heuristic diagnosis.
- **Unified Instance Monitor**: High-performance searchable monitor for all instances across all hosts.

### 2. Intelligent Scheduler

_Deterministic Infrastructure Orchestration_

- **Metric-Based Placement**: Servers are automatically deployed to the node with the healthiest resource profile (Lowest CPU load, Highest Free RAM).
- **Capacity Guards**: Prevents over-provisioning through proactive hardware monitoring and capability advertising.

### 3. Resilience & Self-Healing (The "Doctor")

- **Zombie Adoption**: If the Node Agent or Panel restarts, it automatically re-attaches to running server processes without downtime.
- **Heuristic Diagnosis**: Our engine reads logs faster than you can, identifying EULA issues, Java conflicts, or plugin loops instantly.
- **Atomic Proxy**: Velocity and Bungee proxies are managed as atomic units—if a backend falls, the proxy holds the player connection until recovery.
- **Watchdog System**: Proactive monitoring for hangs and deadlocks with automated recovery.

### 4. Developer Experience (DevX)

- **Embedded Monaco IDE**: The power of VS Code in your browser with full syntax highlighting for YAML, JSON, and Properties.
- **Real-time Co-Presence**: See exactly which file or tab your teammates are viewing to prevent configuration drift.
- **Plugin Marketplace**: Aggregate search (Modrinth, Spiget, Hangar) with automated, one-click installation.
- **Smart Terminal**: Resizable console with adaptive prompt, scanline effects, and PowerShell quoting stabilization.

![Dashboard](assets/Dashboard.png)
_Real-time monitoring with heuristic diagnosis and self-healing controls._

---

## Distributed Hosting (Worker Nodes)

**Scale safely without touching the command line.**

CraftCommand utilizes a specialized **Node Agent** to manage remote resources (Other PCs, VPS, or Old Laptops).

- **One-Click Enrollment**: Use the Wizard to generate a secure **Bootstrap ZIP**.
- **Zero-Knowledge Pairing**: Automated cryptographic handshake using rotating secrets.
- **Mixed OS Clusters**: Host your Panel on Windows and your Servers on a fleet of Linux VPS instances seamlessly.

---

## Quick Start

### Installation & Launch

#### Flow 1: Single PC (Hybrid Mode)

_Best for: Users who want to play and host on the same computer._

1.  **Download & Extract** the latest release.
2.  **Run Launcher**: Execute `run_locally.bat`.
3.  **Start**: Choose **[1] Start (Auto-Setup)**.
4.  **Access**: Open `http://localhost:3000`.

#### Flow 2: Distributed (Commander + Nodes)

_Best for: Managing a fleet of servers (VPS, extra laptops, etc)._

1.  **Set up the Commander**: Follow Flow 1 to install the panel on your main PC.
2.  **Add a Node**:
    - Go to **Global Settings > Nodes**.
    - Click **"Add Node"**.
    - Follow the Wizard to generate a **Bootstrap Bundle (ZIP)**.
3.  **Deploy Agent**:
    - Copy the ZIP to your second machine.
    - Extract and run `bootstrap_agent.bat`.
    - The node will automatically pair with your Commander panel using Zero-Knowledge encryption.

#### Flow 3: Developer (Source)

_Best for: Contributing to CraftCommand._

1.  **Clone Repo**: `git clone https://github.com/Extroos/Craft-Commands.git`
2.  **Install**: `npm install` (Root directory).
3.  **Dev Mode**: `npm run dev`.
4.  **Access**: Open `http://localhost:3000`.

### Default Credentials

- **Email:** `admin@craftcommands.io`
- **Password:** `admin`

> [!CAUTION]
> You will be **required to change these credentials immediately** after your first login.

---

## Security Model

**Secure by Default, Explicit by Choice.**

- **RBAC (Hierarchy Guard)**: Strict role isolation (Owner > Admin > Manager).
- **Network Isolation**: Local-only binding by default; remote exposure requires owner-level approval.
- **Token Hardening**: JWT-based sessions with industry-standard bcrypt hashing.
- **Capability Advertising**: Nodes advertise their limits; the Panel never sends a task a node cannot sustain.

---

---

## Troubleshooting

Common issues and error codes are documented in our dedicated guide.

[**View the Troubleshooting Guide (Error Codes & Fixes)**](docs/troubleshooting.md)

Some common quick fixes:

- **E_JAVA_MISSING**: Install Java 21 (for 1.21+) or Java 17 (for 1.18+).
- **E_PORT_IN_USE**: Port 25565 is taken. Stop other servers or change the port.
- **Can't Connect**: Check your firewall and port forwarding settings.

---

## Technical Architecture

- **Core**: React 19, TypeScript, Node.js, Express, Socket.IO.
- **Styling**: Framer Motion (60FPS), TailwindCSS, Glassmorphism (Quality Mode).
- **Orchestration**: Native Process Spawning & Docker Engine API integration.
- **Storage**: Hybrid Dual-Storage (SQLite for teams, JSON for solo portability).
- **License**: [GNU Affero General Public License v3.0](LICENSE)

---

<div align="center">
  Developed by <a href="https://github.com/Extroos">Extroos</a>
</div>
