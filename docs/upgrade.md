# Upgrade Guide — CraftCommand v1.10.x

This guide outlines the steps required to upgrade from previous versions (v1.8.x or v1.9.x) to the v1.10.x "Distributed Operations" release.

## Major Changes

### 1. Hybrid Module System

In v1.10.x, we have removed `"type": "module"` from the root `package.json`. This ensures the backend (CommonJS) can correctly import shared constants and types without ESM conflicts.

> [!IMPORTANT]
> If you are running from source and have custom scripts, ensure they are compatible with a CommonJS root environment.

### 2. Distributed Nodes (Wizard Enrollment)

v1.10.0 introduces a new enrollment flow for worker nodes.

- Old manual node configurations might need to be re-paired.
- Use the **Add Node Wizard** in Global Settings to generate a fresh **Bootstrap ZIP**.

### 3. Webhook Scoping

Webhooks are now server-scoping aware.

- Existing global webhooks will continue to work.
- New webhooks created via the server settings panel will only trigger for 그 server.

## Upgrade Steps

1.  **Stop All Services**: Ensure the panel and all agents are stopped.
2.  **Pull Latest Codes**: `git pull origin main` or download the latest release ZIP.
3.  **Clean Install**:
    ```bash
    npm install
    npm run build --prefix frontend
    ```
4.  **Verify Root package.json**: Ensure `"type": "module"` is **NOT** present in the root directory's `package.json`.
5.  **Start Platform**: `npm run dev` (or `run_locally.bat`).

## Troubleshooting

If you encounter `ERR_REQUIRE_ESM` on start, confirm that your root `package.json` does not contain `"type": "module"`. The frontend maintains its own ESM configuration in `frontend/package.json`.
