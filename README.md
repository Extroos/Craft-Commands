<div align="center">
  
# CraftCommand

**Professional Minecraft server management platform focused on local-first and team hosting.**

![version](https://img.shields.io/badge/version-v1.8.1--stable-emerald)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

A self-hosted Minecraft control panel designed to **prevent mistakes**, **explain problems**, and **scale safely from solo use to small teams**.

Built with **React 19** and **Node.js**, featuring **granular permissions**, **audit logging**, **atomic proxying**, and **secure, guided connectivity options**.

[Features](#features) • [Quick Start](#quick-start) • [Security Model](#security-model) • [Documentation](#documentation)

</div>

## Why Craft Commands?

### The "Goldilocks" Solution

Most server tools are either **too simple** (a basic `.bat` file that crashes if you look at it wrong) or **too complex** (Enterprise panels like Pterodactyl that require a Linux degree and 4 hours to install).

Craft Commands sits perfectly in the middle:

- **Easier than a Batch File**: One click to start. No editing text files to change RAM.
- **More Powerful than a Launcher**: Full breakdown of CPU/RAM usage, player auditing, and remote access.
- **Simpler than Enterprise**: Runs on **Windows**, runs **Natively** (Docker is optional and never required), and installs in **seconds**.

### Honest Comparison

| Feature           | Standard Launchers | Enterprise Panels (Pterodactyl/Pelican) |         **Craft Command**          |
| :---------------- | :----------------: | :-------------------------------------: | :--------------------------------: |
| **Ideal For**     |      Testing       |       Reselling & Large Networks        |      **Home Hosting & Teams**      |
| **Setup Time**    |      Instant       |        Hours (Linux/Docker req.)        |     **Instant (Unzip & Run)**      |
| **Architecture**  |    Local Child     |            Distributed Nodes            |    **Monolithic (All-in-One)**     |
| **OS Focus**      |        All         |               Linux First               |         **Windows First**          |
| **Reselling**     |         ❌         |                   ✅                    | **❌ (Not for hosting providers)** |
| **Auto-Repair**   | ❌ (Crash = Dead)  |            ✅ (Auto-Restart)            |    **✅ (Diagnosis + Healing)**    |
| **Proxy Support** |         ❌         |              Manual Config              |    **✅ Atomic (Self-Healing)**    |

> [!NOTE]
> **Use Pterodactyl if** you need to manage multiple physical machines from one panel or sell servers to customers.
> **Use Craft Command if** you want a powerful, self-hosted panel for your own machine without needing a Linux degree.

![Server Selection](assets/ServerSelection.png)
_manage multiple servers with a clean, professional interface._

---

## Platform Support

### **Windows** (Recommended)

- **Status**: 🟢 **Full Support**
- **Modes**: Native Process or Docker Container.
- **Features**: Automatic Java installation, one-click launcher, native file permissions.

### **Linux & macOS**

- **Status**: 🟡 **Docker Recommended**
- **Modes**: Docker Container (Best) or Manual Native (Experimental).
- **Note**: The native process manager is optimized for Windows. For Linux/Mac, we strongly recommend using the **Docker Mode** (`npm run dev`) which pulls pre-configured environments safely.

---

## Features

### For Everyone (The Smooth Experience)

- **One-Click Modpacks** — Guided setup for Paper, Purpur, Fabric, Forge, NeoForge, and major Modpacks.
- **Zero-Config HTTPS** — Secure your panel with native SSL management handled entirely by our guided launcher.
- **File Manager IDE** — Edit configurations, logs, and properties with syntax highlighting and instant saving.
- **Quality Mode** — A stunning, glass-morphic interface that feels like a modern app, not a spreadsheet.

### For Developers & Power Users (The Engineering Edge)

- **Hybrid Orchestration** — Run servers as local processes or isolated Docker containers with a single toggle.
- **3-State Permissions** — Granular Access Control Lists (Grant, Deny, Inherit) for every server and system node.
- **Audit Ledger** — Immutable logging of every system action, from login attempts to hierarchy violations.
- **SQL Scaling** — Start with JSON for portability, switch to SQLite (Robust v1.8.1) or MySQL for teams with one config change.

![Dashboard](assets/Dashboard.png)
_Real-time monitoring with heuristic diagnosis and self-healing controls._

---

## The "Secret Sauce" (Fun Details)

We didn't just build a panel; we built a **Sysadmin in a Box**.

- **Agile Networking**: Ever tried to start a server and got "Port 25565 already in use"? Our engine detects the conflict and guides you to fix it instantly.
- **The Doctor**: Our **Heuristic Diagnosis Engine** reads your logs faster than you can. It identifies common issues (EULA, Java version, Crash loops) and offers solutions or automatic fixes where safe.
- **Atomic Proxy**: Want a network? Deploy a Velocity Proxy. If it crashes, we restart it. If a backend server dies, we queue players. It's a self-healing mesh network for your bedroom.

---

## Quick Start

### Requirements

- **Node.js 18+**
- **Windows 10+**, **macOS 10.15+**, or **Linux (Ubuntu 20.04+)**

### Windows (Recommended)

Craft Commands includes a guided launcher — **no commands required**.

1. Run `run_locally.bat`
2. Choose **[1] Start (Auto-Setup)**
3. The dashboard opens automatically in your browser

The launcher also provides HTTPS setup, remote access controls, and emergency repairs.

### Linux / macOS (Manual)

```bash
git clone https://github.com/Extroos/craft-commands.git
cd craft-commands
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm run start:all
```

### Access

Open the dashboard at: **http://localhost:3000**

### Default Credentials (First Run Only)

- **Email:** `admin@craftcommands.io`
- **Password:** `admin`

_You will be **required to change these credentials immediately** after the first login._

---

## Security Model

Craft Commands follows a **Secure by Default, Explicit by Choice** philosophy.

- **Network Isolation** — Local-only binding by default (`127.0.0.1`).
- **Explicit Exposure** — Remote access requires owner-level approval and guided configuration.
- **Hierarchy Guard** — Strict role-based isolation (Owner > Admin > Manager). Users cannot modify anyone at or above their own level.
- **Token Hardening** — JWT-based sessions with industry-standard bcrypt hashing for all credentials.
- **Emergency Killswitch** — Instant local launcher options to sever all external connections.

---

## Technical Architecture

- **Frontend:** React 19 (Latest), Vite, TailwindCSS, Framer Motion (60FPS animations)
- **Backend:** Node.js, Express, Socket.IO (Real-time streams)
- **Orchestration:** Native Process Spawning & Docker Engine Integration
- **Storage:** Hybrid SQLite (for teams) and JSON (for solo portability)
- **Security:** Helmet, Rate-Limiting, JWT, Hierarchy Middleware

---

<div align="center">
Developed by <a href="https://github.com/Extroos">Extroos</a>
</div>
