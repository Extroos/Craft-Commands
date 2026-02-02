# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] - 2026-02-02 - Quality Mode & Adaptive Design

### Added

- **Quality Mode (Beta)**: Custom backgrounds, glassmorphism, blur effects, and smooth animations.
- **Adaptive Dashboard**: New "Micro Mode" for stats cards and fully responsive grid layout with drag-and-drop persistence.
- **Smart Terminal**: Resizable console with adaptive single-line prompt, scanline effects, and multi-line wrapping.
- **System Diagnosis**: Integrated crash analysis, auto-fix suggestions, and stability health checks directly in the dashboard.
- **Background Manager**: User-friendly interface for uploading and managing custom background images per-page.

### Changed

- **UI Polish**: Refined typography, added accent borders, and introduced explicit "Beta" indicators.
- **Safety Core**: Enhanced backend validation for port ranges and RAM stability.

## [1.7.7] - 2026-02-01 - Global Alignment & Integrity

### Changed

- **Version Alignment**: Unified project version to 1.7.7 across all manifests and documentation.
- **Documentation**: Synchronized `version.json` feature notes with recent stability updates.

## [1.7.6] - 2026-02-01 - Remote Start & Path Stabilization

### Added

- **Explicit Executable Tracking**: Servers now explicitly track their executable targets in the database, reducing reliance on implicit defaults.
- **Absolute Path Resolution**: StartupManager now resolves all file targets to absolute paths to prevent environment discrepancies during remote initiation.

### Fixed

- **Vague Error Reporting**: Improved `SafetyService` error messages to display full file paths instead of `undefined` when targets are missing.
- **Remote Login Issues**: Resolved "executable not found" errors that occurred for remote users due to relative path inconsistencies.

## [1.7.5] - 2026-01-31 - CLI Aesthetics & Syntax Fix

### Fixed

- **PowerShell Quoting**: Corrected quoting in `run_locally.bat` to prevent syntax errors when status messages contain parentheses (e.g., `SECURE (Caddy)`).
- **CLI Aesthetics**: Refined color output and terminal titles for a more professional developer experience.

## [1.7.4] - 2026-01-31 - Process Control & Ghost Hunting

### Added

- **Ghost Hunter**: Implemented mechanism to detect and purge unmanaged/orphan processes holding server ports.
- **Unmanaged Status**: Introduced a new `UNMANAGED` status state to indicate servers running outside of panel control.
- **Diagnosis Rules**: Added proactive port conflict detection with one-click "Purge Ghost" actions.

### Changed

- **Adoption Logic**: Removed silent "fake adoption" in favor of explicit user-controlled process management.

## [1.7.1] - 2026-01-31 - Patch & Stabilization

### Added

- **Zero-Config HTTPS (Caddy)**: Fully automated browser secure-access. Automatically provisions the Caddy binary, generates a domain-specific Caddyfile, and manages the lifecycle with one-click setup/disable.
- **Automated Remote Bridge (Playit.gg)**: Zero-config tunnel synchronization. Automatically downloads the Playit agent and provides dedicated decommissioning controls.
- **Panic Control Routine**: Global network kill-switch that severs all external bridges (Caddy, Playit, Cloudflare) and reverts the system to safe local-only mode instantly.
- **Dynamic Access Reporting**: The launcher and backend now intelligently report the active secure Access Point URL (e.g., https://craftcommands) based on current bridge status.
- **Docker CPU Stabilization**: Normalized CPU reporting across multi-core systems and implemented Exponential Moving Average (EMA) smoothing to dampen startup spikes.
- **Global Docker Enforcement**: Hardened the backend to respect global Docker settings, ensuring individual server configurations cannot bypass the intentional disablement of the Docker engine.

### Changed

- **Version Synchronize**: Project-wide version bump to 1.7.1 for all subsystems and launcher.

### Fixed

- **Docker Default State**: Ensured new installations default to 'OFF' to prevent startup issues on systems without an active Docker daemon.

## [1.7.0] - 2026-01-31 - Granular Permissions & Global Overrides Stable

### Added

- **Granular Permission Engine**: Complete overhaul of the access control system. Supports 3-state nodes (Inherit, Allow, Deny) for fine-grained control over every feature.
- **Global System Rights**: New section in Access Control to manage system-wide permissions (Staff Management, Server Provisioning, System Config) independent of specific servers.
- **Explicit Lifecycle Permissions**: Introduced `server.create` and `server.delete` as distinct permission nodes, replacing hardcoded role checks.
- **Custom Role Aliases**: Support for personalized role names (e.g., 'Head Moderator', 'Junior Admin') that persist across the UI.

### Changed

- **Security Hardening**: Reinforced hierarchical guards in `AuthService` to prevent Admins from modifying Global permissions or elevating their own authority.
- **UI Density**: Refined "Access Control" dashboard into a dual-layered view (Global System vs. Project Specific).
- **Versioning**: Synchronized project version to 1.7.0 across all subsystems and launcher.

### Fixed

- **Permission Masking**: Resolved issues where server-specific "Deny" overrides were accidentally bypassed by global role defaults.

## [1.6.2] - 2026-01-30 - Profile Customization & Account Linking Stable

### Added

- **Account Linking**: Dynamic Minecraft account verification and linking to user profiles.
- **Profile Picture Customization**: Manual avatar URL support and one-click high-quality Minecraft skin sync (helm/overlay included).
- **Reduced Motion Support**: Global preference to disable heavy animations and high-frequency UI tickers for improved accessibility.

### Changed

- **UI Polish**: Refined individual server cards and navigation density for a more professional look.
- **Header Dynamics**: Real-time avatar and status synchronization across all dashboard components.

### Fixed

- **Login Lockouts**: Improved rate-limiting feedback and session recovery.
- **Navigation Flickers**: Resolved state inconsistency during rapid tab switching.

## [1.6.0] - 2026-01-30 - Professional Multi-User & RBAC Stable

### Added

- **Multi-User Stability**: Verified and consolidated multi-user support with flawless role-based synchronization.
- **Granular RBAC**: Hardened security across all modules, ensuring restricted roles (Viewer/Manager) cannot trigger unauthorized actions.
- **Zero-Config SSL**: Automatic self-signed certificate generation for secure local hosting.
- **Pro-Grade Dashboard**: High-density 60FPS UI with advanced sparklines and compact management cards.

### Changed

- **UI Polish**: Global refinement of padding, card sizes, and animations for a classic, professional aesthetic.
- **Performance**: Optimized frontend rendering and state synchronization for 60FPS excellence.

### Fixed

- **RBAC Security Leaks**: Eliminated 403 Forbidden errors for non-admin roles on background update checks and File Manager mutations.
- **Logout Flow**: Resolved synchronization issues where users were occasionally stuck during sign-out.
- **API Reliability**: Standardized response validation across all server and system endpoints.

## [1.5.0-unstable] - 2026-01-30 - UI Redesign & Security Fixes

### Added

- **Compact UI**: Redesigned Global Settings for a more professional, "arty" feel with reduced card sizes and better density.
- **Remote Access Control**: Added "Disable" button directly in Global Settings and Remote Access Wizard.
- **Audit Logging**: Implemented missing backend endpoint for real-time system audit logs.

### Changed

- **Layout Optimization**: Global Settings now uses a responsive 3-column grid for better screen utilization.
- **Aesthetics**: Removed excessive animations and large padding in favor of a clean, classic design.

### Fixed

- **Host Mode Security**: Fixed a critical bug where authentication was bypassed incorrectly in Personal Mode even if Host Mode was enabled.
- **API Reliability**: Added missing `verifyToken` checks and audit log routes.

## [1.4.3] - 2026-01-29 - Bug Fix and Stabilization

### Fixed

- **UI Issue**: Fixed Start button being disabled after creating a new server until page refresh.
- **Java Download**: Improved `isJavaDownloading` logic to only check active download phases.

### Changed

- **Java Installation**: Optimized Java download process for better performance.

## [1.4.0] - 2026-01-29

### Stability Update

- **Stable Release**: This version marks a significant stability milestone, superseding v1.3.0 and v1.0.0.

### Added

- **Server Architect**: Built-in Wiki for deployment guides and hardware sizing.
- **Atomic Writes**: Implemented safe file writing to prevent data corruption during crashes.
- **Operation Locking**: Added concurrency controls for server operations.
- **Plugin Marketplace (Preview)**: Interface for browsing plugins (Install functionality in progress).
- **Diagnostics Engine**: "Explain-My-Server" rules for crash analysis.

### Changed

- **Security Hardening**: Enforced strict path validation to prevent directory traversal.
- **Documentation**: Updated README with accurate feature set and "Local-first" warnings.
- **Deprecation**: Quarantined unused assets and legacy config files.

### Fixed

- **Logo Paths**: Resolved simplified logo imports for better build compatibility.
- **Race Conditions**: Fixed potential state conflicts in `ServerService`.

## [1.2.0] - Previous Release

- Role-Based Access Control (RBAC).
- Discord Integration.
- Server Templates.
