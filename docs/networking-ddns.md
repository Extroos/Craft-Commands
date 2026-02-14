# Networking & DDNS Configuration

CraftCommand provides per-server networking settings, allowing you to assign unique hostnames and dynamic DNS (DDNS) providers to each of your server instances.

## Key Features

- **Per-Server Isolation**: Each server can have its own hostname (e.g., `survival.duckdns.org`, `creative.duckdns.org`).
- **Dynamic IP Monitoring**: The system automatically detects your public IP and verifies that your configured hostnames resolve correctly.
- **Stable Share Links**: The public status page and dashboard prefer your custom hostname over the raw numeric IP for a more professional join experience.
- **Integrated Wizard**: A step-by-step setup guide for popular providers like DuckDNS, No-IP, and Dynu.

## Configuration

To configure networking for a specific server:

1. Navigate to the **Server Selection** screen.
2. Select your server and click **Connect**.
3. Open **Settings** (Gear icon).
4. Select the **Networking** tab.
5. Click **Domain Setup Wizard** to link your provider credentials and hostname.

## Technical Details

- **Public IP Detection**: The system polls multiple external APIs (ipify, icanhazip, etc.) to ensure accurate IP detection even if some services are down.
- **DNS Propagation**: DNS changes typically take 1-10 minutes to propagate. If the status indicator shows an error, wait a few minutes and click the refresh icon.
- **Port Forwarding**: Remember that assigning a hostname does not bypass the need for port forwarding. You must still open the server's port (e.g., 25565) in your router pointed to your host machine's local IP.

## Troubleshooting

- **"Resolution Mismatch"**: Your hostname resolves to a different IP than your current public IP. Check your DDNS updater client (or router setting) to ensure it's successfully updating the provider.
- **"Unknown Host"**: Ensure you have correctly typed the hostname in the wizard. Some providers require the full domain (e.g., `name.duckdns.org`) while others might just want the prefix.
