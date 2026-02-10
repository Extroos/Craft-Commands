# Changelog

All notable changes to this project will be documented in this file.

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
