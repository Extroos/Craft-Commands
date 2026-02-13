# Changelog

All notable changes to this project will be documented in this file.

## [1.10.0] - 2026-02-11 - Distributed Operations & Cluster Resilience

### Added

- **One-Click Distributed Nodes**: Automated enrollment via Bootstrap ZIP for remote hosts.
- **Global Operations Center (GOC)**: Distributed resource telemetry and spatial heatmap visualization.
- **Intelligent Scheduler**: Dynamic, metric-based server assignment across worker nodes.
- **Zombie Adoption**: Integrated self-healing that re-acquires running server processes after agent crashes or panel restarts.
- **Embedded Monaco IDE**: Full-screen configuration editor with syntax highlighting and real-time co-presence.
- **Chaos-Hardened Sockets**: Hardened retry logic and exponential backoff for inter-node communication.
- **Fixed Navigation**: Implemented a state-aware `fixed` header to preserve global controls during deep scrolling.
- **Documentation Hub**: Established a dedicated `/docs` core with a centralized index, unifying technical references and user guides.
- **Minimalist Server Selection**: Redesigned the server entry point with a compact, high-density grid for better cluster visibility.
- **Safe Downgrade Path**: Implemented bidirectional sync in the SQLite engine. Data written to SQL is automatically reflected in JSON backups, ensuring no data loss when switching providers.
- **Distributed Nodes Feature Gating**: Context-aware UI items for 'Global Operations' and 'Monitoring' that only appear when the engine is active and the user is authorized.
- **Rainbow Hold Authentication**: An interactive, high-contrast login refinement with a progressive 'Rainbow' button hold effect for secure entry.
- **Native Bedrock Support**: End-to-end integration for Minecraft Bedrock Edition, including automated binary repair, specialized log tracking, and software-aware configuration settings.
- **Server Icon Customization**: Support for custom icons (`server-icon.png` for Java, `world_icon.png` for Bedrock) with a dedicated preview and upload UI.
- **Branded Iconography**: Integrated new professional brand icons across Login and Global Settings, with `website-icon.png` as the default server fallback.

### Improved

- **Professional UI Refresh**: Glassmorphic dashboard overhaul with optimized layout compression and high-density spacing.
- **Documentation Consolidation**: Merged `features.md` into `ARCHITECTURE.md` and unified security policies into a single `docs/SECURITY.md`.
- **Smart Terminal**: Responsive CLI with adaptive prompts and scanline effects.
- **Layout Consistency**: Standardized page padding across all core views (Dashboard, Settings, Profile) to prevent header overlap.
- **Storage Consolidation**: Migrated legacy `audit.json` and fragmented `schedules/*.json` files into a unified, high-performance SQLite provider.
- **Audit Resilience**: Implemented automated pruning (5,000 entry cap) for SQL-based audit logs to ensure cluster longevity.
- **Login Aesthetics**: Overhauled login glassmorphism with better contrast, refined typography, and improved cursor-following lighting effects.
- **HTTPS Stability**: Hardened the Zero-Config Caddy integration and resolved "Protocol Mismatch" warnings in the Settings UI.

### Fixed & Patched

- **Node Registry Emergency Fix**: Resolved a critical race condition where node deployment state was not persisting across container restarts.
- **Global Settings API**: Fixed a 404 error caused by legacy endpoint routing in the settings module.
- **Node Management 403**: Patched a permission elevation check that was erroneously blocking node configuration on some setups.
- **Node Selection Persistence**: Corrected a state-reset bug where the "Select Node" dropdown would revert during multifactor configuration.
- **Docker Lifecycle Stability**: Hardened the lifecycle management service to ensure reliable container cleanup and synchronization.
- **API Reliability**: Eliminated 401/403 loop conditions during rapid navigation across distributed nodes.
- **Global Safety Redirects**: Implemented automatic redirects if unauthorized paths (like Global Operations) are accessed while the Distributed Engine is disabled.
- **Schedule Migration Heuristics**: Automated migration logic for legacy per-server schedules, including safety-renaming of old files.
- **Header Alignment**: Fixed layout issues in the fixed header specifically when navigating between manage and selection views.
- **Bedrock Versioning**: Patched an logic error where Bedrock servers defaulted to `server.jar` in metadata; implemented a backend healing layer for native execution.
- **Log Pattern Reliability**: Fixed a bug where Bedrock player join/leave events were not detected in the real-time roster.

## [1.9.1] - 2026-02-10 - Collab Hardening & Host Mode Sync

### Added

- **Host Mode**: A master switch to toggle multi-user collaboration features (Chat, Presence, User Management) and enforce Solo Mode.
- **Centralized Versioning**: Programmatic linkage using `version.json` as the single source of truth for the entire application.

### Improved

- **OperatorChat**: Synchronized user profiles (PFPs) and removed automated system tips for a cleaner experience.
- **Update Logic**: Hardened version comparison in `UpdateService` to prevent stale notification alerts.

## [1.9.0] - 2026-02-10 - Plugin Marketplace Stabilization

### Added

- **Plugin Marketplace**: Fully operational aggregate search (Modrinth, Spiget, Hangar) and automated installation.
- **Enhanced Notifications**: Real-time error alerts and persistent system notifications.
- **Stable Auth**: Hardened JWT verification and consistent developer secrets.

### Fixed

- **UI Consistency**: Resolved missing "Plugins" tab in the header.
- **API Reliability**: Fixed 401 Unauthorized loops and malformed response crashes in the frontend.

## [1.8.1] - 2026-02-10 - Integrated Notification System

### Added

- **Notification System**: Full persistent notification engine with real-time Socket.IO alerts.
- **Bell Icon**: Header integration with unread badge counter and dropdown list.
- **Update Integration**: Automated GitHub update checks now trigger system-wide notifications instead of dashboard banners.
- **Auto-Pruning**: Periodic cleanup of old notifications to maintain performance.

### Fixed

- **Header Imports**: Resolved duplicate import issues in the key layout component.

## [1.8.0] - 2026-02-02 - Quality Mode & Adaptive Design

- **Quality Mode (Beta)**: Glassmorphism, custom backgrounds, and smooth animations.
- **Adaptive Dashboard**: New "Micro Mode" and responsive grid layout with drag-and-drop persistence.
- **Smart Terminal**: Resizable console with adaptive prompt and scanline effects.
- **System Diagnosis**: Integrated crash analysis and auto-fix suggestions.

## [1.7.x] - Remote Access & Process Control

- **[1.7.7] Global Alignment**: Unified versioning and documentation synch.
- **[1.7.6] Path Stabilization**: Explicit executable tracking and absolute path resolution.
- **[1.7.5] CLI Aesthetics**: Refined terminal output and PowerShell quoting fixes.
- **[1.7.4] Ghost Hunter**: Detection and purging of unmanaged processes holding server ports.
- **[1.7.1] Connectivity Suite**: **Zero-Config HTTPS** (Caddy) and **Automated Remote Bridge** (Playit.gg) with Panic Control.
- **[1.7.0] Granular Permissions**: **3-State Access Control** (Inherit/Allow/Deny) and Global System Rights.

## [1.6.x] - RBAC & Multi-User

- **[1.6.2] Identity**: Account linking, profile picture customization, and reduced motion accessibility.
- **[1.6.0] Professional Core**: **Pro-Grade Dashboard** refresh, Zero-Config SSL, and solidified Multi-User RBAC.

## [1.5.0] - UI Redesign

- **Compact UI**: Redesigned Global Settings for professional density.
- **Audit Logging**: Real-time system action logging.

## [1.4.x] - Stability & Architecture

- **[1.4.0] Stable Release**: Introduced **Server Architect** wiki, Atomic Writes, and Operation Locking.
- **[1.4.3]**: Java installation heuristic improvements.

## Known Issues

- **Node Persistence (Edge Case)**: Occasionally, rapid agent restarts might create a "Ghost" node in the UI until the next panel refresh.
- **Docker Networking**: Auto-forwarding of ports within Docker containers is currently restricted to Linux hosts.

## Roadmap & Strategy

- **v1.11.x**: Distributed Backup Replication (RAID-1 for server data).
- **v1.12.x**: AI-Powered Log Analysis (Predictive crash prevention).
- **v2.0.0**: Native Mobile Application (iOS/Android) for cluster management.
