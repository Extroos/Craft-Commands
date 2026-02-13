# Security Policy

## Supported Versions

The following versions are currently supported with security updates:

| Version | Supported                   |
| ------- | --------------------------- |
| 1.10.x  | :white_check_mark: (Stable) |
| 1.9.x   | :warning: (Legacy)          |

## Reporting a Vulnerability

If you discover a security vulnerability, **do not create a public issue**. Contact the development team directly with a detailed description and steps to reproduce.

## Hardening Measures (v1.10.0+)

- **Trio-State RBAC**: Inherit, Allow, and Deny logic with strict role isolation (Owner > Admin > Manager).
- **Network Isolation**: Local-only binding by default; remote exposure requires explicit owner-level approval.
- **Zero-Config SSL**: Automated self-signed certificate generation for local HTTPS.
- **Atomic Persistence**: Database writes use atomic operations to prevent corruption.
- **Audit Synchronization**: Every security-sensitive action is logged with immutable timestamps.
- **Token Hardening**: JWT-based sessions with industry-standard `bcryptjs` hashing.

## File System Security

- **Path Traversal Protection**: Services use sanitized paths.
- **Isolation**: Server instances run in isolated directories within `minecraft_servers/`.
- **Repo Layer Isolation**: Direct file I/O is restricted to the Repository Layer.
