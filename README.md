<div align="center">
  
# Craft Commands

**Professional Minecraft server management platform focused on local-first and team hosting.**

![version](https://img.shields.io/badge/version-v1.8.0--stable-emerald)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

A self-hosted Minecraft control panel designed to **prevent mistakes**, **explain problems**, and **scale safely from solo use to small teams**.

Built with **React 19** and **Node.js**, featuring **granular permissions**, **audit logging**, **atomic proxying**, and **secure, guided connectivity options**.

[Features](#features) • [Quick Start](#quick-start) • [Security Model](#security-model) • [Documentation](#documentation)

</div>

## Features

### 🎮 For Everyone (The Smooth Experience)

- **Hybrid Orchestration** — Run servers as local processes or isolated Docker containers with a single toggle.
- **One-Click Modpacks** — Guided setup for Paper, Purpur, Fabric, Forge, NeoForge, and major Modpacks.
- **Zero-Config HTTPS** — Secure your panel with native SSL management handled entirely by our guided launcher.
- **File Manager IDE** — Edit configurations, logs, and properties with syntax highlighting and instant saving.

### 🛠️ For Developers & Power Users (The Engineering Edge)

- **3-State Permissions** — Granular Access Control Lists (Grant, Deny, Inherit) for every server and system node.
- **Audit Ledger** — Immutable logging of every system action, from login attempts to hierarchy violations.
- **Aikar's Optimizations** — Built-in suite for JVM tuning, GC selection (ZGC/G1GC), and thread priority management.
- **SQL Scaling (Optional)** — Switch from JSON to SQLite/MySQL for team deployments with a single config change.

---

## Why Craft Commands? 🚀

### The "Goldilocks" Solution

Most server tools are either **too simple** (a basic `.bat` file that crashes if you look at it wrong) or **too complex** (Enterprise panels like Pterodactyl that require a Linux degree and 4 hours to install).

Craft Commands sits perfectly in the middle:

- **Easier than a Batch File**: One click to start. No editing text files to change RAM.
- **More Powerful than a Launcher**: Full breakdown of CPU/RAM usage, player auditing, and remote access.
- **Simpler than Enterprise**: Runs on **Windows**, runs **Natively** (no Docker required), and installs in **seconds**.

### 🆚 Competitor Breakdown

| Feature           | Standard Launchers | Enterprise Panels (Pterodactyl/Pelican) |      **Craft Commands**       |
| :---------------- | :----------------: | :-------------------------------------: | :---------------------------: |
| **Setup Time**    |      Instant       |        Hours (Linux/Docker req.)        |   **Instant (Unzip & Run)**   |
| **OS Support**    |        All         |           Linux Only (mostly)           |    **Windows, Mac, Linux**    |
| **Process Type**  |    Local Child     |           Isolated Container            | **Hybrid (Native OR Docker)** |
| **Remote Access** |         ❌         |                   ✅                    |    **✅ (Secure Tunnels)**    |
| **Auto-Repair**   | ❌ (Crash = Dead)  |            ✅ (Auto-Restart)            | **✅ (Diagnosis + Healing)**  |
| **Proxy Support** |         ❌         |              Manual Config              | **✅ Atomic (Self-Healing)**  |

---

## The "Secret Sauce" (Fun Details) 🧪

We didn't just build a panel; we built a **Sysadmin in a Box**.

- **👻 The Exorcist**: Ever tried to start a server and got "Port 25565 already in use"? Our `NetUtils` engine hunts down those "ghost" Java processes and politely (forcefully) removes them so you can start instantly.
- **🎨 "Arty" Interface**: We hate boring dashboards. Ours runs at **60 FPS** with Framer Motion animations, glassmorphism, and reactive layouts. It feels like a video game, not a spreadsheet.
- **🧠 The Doctor**: Our **Heuristic Diagnosis Engine** reads your logs faster than you can. It doesn't just say "Crashed"; it says _"You accepted the EULA but forgot to install Java 21. Fixing it now..."_
- **⚛️ Atomic Proxy**: Want a network? Deploy a Velocity Proxy. If it crashes, we restart it. If a backend server dies, we queue players. It's a self-healing mesh network for your bedroom.

---

## Quick Start

### Requirements

- **Node.js 18+**
- **Windows 10+**, **macOS 10.15+**, or **Linux (Ubuntu 20.04+)**

---

### Windows (Recommended)

Craft Commands includes a guided launcher — **no commands required**.

1. Run `run_locally.bat`
2. Choose **[1] Start (Auto-Setup)**
3. The dashboard opens automatically in your browser

The launcher also provides:

- HTTPS setup
- Remote access setup
- Repair / recovery options
- Emergency remote-access disable

---

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

Open the dashboard at:  
**http://localhost:3000**

---

### Default Credentials (First Run Only)

- **Email:** `admin@craftcommands.io`
- **Password:** `admin`

You will be **required to change these credentials immediately** after the first login.

---

## Security Model 🛡️

Craft Commands follows a **Secure by Default, Explicit by Choice** philosophy.

- **Network Isolation** — Local-only binding by default (`127.0.0.1`).
- **Explicit Exposure** — Remote access requires owner-level approval and guided configuration.
- **Hierarchy Guard** — Strict role-based isolation (Owner > Admin > Manager). Users cannot modify anyone at or above their own level.
- **Token Hardening** — JWT-based sessions with industry-standard bcrypt hashing for all credentials.
- **Atomic Operations** — Resource locking prevents data corruption during simultaneous server modifications.
- **Emergency Killswitch** — Instant local launcher options to sever all external connections.

---

## Technical Architecture ⚙️

- **Frontend:** React 19 (Latest), Vite, TailwindCSS, Framer Motion (60FPS animations)
- **Backend:** Node.js (CommonJS), Express, Socket.IO (Real-time streams)
- **Orchestration:** Native Process Spawning & Docker Engine Integration
- **Storage:** Hybrid SQLite (for teams) and JSON (for solo portability)
- **Security:** Helmet, Rate-Limiting, JWT, Hierarchy Middleware

---

<div align="center">
Developed by <a href="https://github.com/Extroos">Extroos</a>
</div>
