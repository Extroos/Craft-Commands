# CraftCommand – DDNS / Custom Domain Support Plan (Agent Task)

Purpose: help users avoid changing public IPs by guiding them to a stable hostname (DDNS or custom domain).

Outcome: users share `play.example.com` instead of `105.x.x.x:25565`.

---

# 0) Core Principle

CraftCommand should not pretend IPs are stable.
It should:

- detect when public IP changes
- recommend DDNS
- make setup simple
- validate connectivity
- keep users safe (no accidental exposure)

---

# 1) User Problem Definition

## Problem

Home ISPs give dynamic public IPs that change.
Users currently share `public_ip:25565`, which breaks.

## Desired

A stable hostname:

- `myserver.duckdns.org`
- `myserver.ddns.net`
- `play.mydomain.com`

---

# 2) Scope (What we implement)

## Must-have (v1)

1. **DDNS education & wizard** (in-app)
2. **Public IP detector** (with change tracking)
3. **DDNS status checker** (does hostname resolve to current public IP?)
4. **Port reachability check** (TCP port open externally)
5. **Safe guidance** (local-only by default, strong warnings for internet exposure)

## Nice-to-have (later)

- optional built-in DDNS updater for select providers
- router UPnP/NAT-PMP assistance (opt-in)
- reverse proxy / tunnel options (Cloudflare Tunnel / Tailscale) — only if you decide later

---

# 3) UX Deliverables

## A) “Share Address” Panel

Show in one place:

- LAN address: `192.168.x.x:25565`
- Detected Public IP: `105.x.x.x:25565`
- Preferred Hostname: `yourname.duckdns.org:25565`

With clear labels:

- “Works on same Wi-Fi”
- “Works from internet (needs port forwarding)”

## B) DDNS Setup Wizard

Step-by-step pages:

1. Choose provider: DuckDNS / No-IP / Dynu / Custom domain
2. Create hostname
3. Choose updater method:
   - Router built-in DDNS
   - Windows service/app updater
   - Linux cron/systemd updater

4. Verify:
   - hostname resolves
   - matches current public IP

5. Optional: “Keep monitoring” toggle

## C) Warnings & Safety Gate

Before enabling remote access guidance:

- show risks (DDoS, brute force, exploits)
- require explicit opt-in
- recommend whitelist / rate limit / firewall checks

---

# 4) Backend Tasks

## 4.1 Public IP Detection

Implement a service:

- fetch public IP from 2+ sources (failover)
- store last-known public IP + timestamp
- emit event if changed

Interface:

- `GET /api/network/public-ip`
- `GET /api/network/public-ip/history`

## 4.2 DNS Resolution Check

Implement:

- resolve A/AAAA for hostname
- compare with current public IP
- return status:
  - OK (matches)
  - Mismatch
  - Not resolving

Interface:

- `POST /api/network/ddns/verify` { hostname }

## 4.3 Port Reachability Check (External)

Two options:

### Option A (recommended): Self-check using outbound test

- make an outbound TCP attempt to your own public IP:port
- may fail depending on NAT hairpin support

### Option B: Use a lightweight external checker endpoint (safer accuracy)

- host a tiny “port check” service that attempts to connect to `{public_ip}:{port}` and reports success
- requires minimal infra but improves accuracy

Return status:

- Open
- Closed
- Filtered/Timeout

Interface:

- `POST /api/network/port-check` { port, protocol }

---

# 5) Frontend Tasks

## 5.1 New Settings Area

Add “Networking → Domains (DDNS)” section:

- hostname input
- provider quick links
- verify button
- current status badge

## 5.2 Guided Copy Buttons

- Copy LAN address
- Copy Public address
- Copy Hostname address

## 5.3 Monitoring UI

- show last IP change time
- show last DDNS verify time
- show last port-check time

---

# 6) Documentation Deliverables

Add docs page: `docs/networking-ddns.md`
Include:

- why IP changes
- DDNS overview
- provider instructions (DuckDNS, No-IP, Dynu)
- router DDNS screenshots placeholders
- troubleshooting:
  - ISP CGNAT
  - port forwarding errors
  - firewall
  - double NAT

Also add to Troubleshooting error codes:

- `E_PUBLIC_IP_UNAVAILABLE`
- `E_DDNS_NOT_RESOLVING`
- `E_DDNS_MISMATCH`
- `E_PORT_CLOSED`
- `E_CGNAT_DETECTED`

---

# 7) Edge Cases & Honesty Rules

## 7.1 CGNAT Detection

If user’s router public IP differs from detected public IP, or port checks always fail:

- suggest they may be behind CGNAT
- recommend alternatives (paid static IP, IPv6 if available, VPN mesh like Tailscale later)

## 7.2 IPv6

If IPv6 present:

- show AAAA records
- explain that friends must have IPv6 too

## 7.3 Never “guarantee”

Always display clear states:

- “Verified now”
- “Not verified”
- “Mismatch”

Do not claim remote connectivity is working unless checks succeed.

---

# 8) Testing Plan

Automated tests:

- DNS resolver unit tests
- public IP fetcher failover tests

Manual scenarios:

1. IP changes (force by reconnect/router reboot)
2. Hostname mismatch
3. No DNS record
4. Port closed
5. CGNAT environment

Success criteria:

- user can set hostname
- system detects change
- system tells user what broke and why

---

# 9) Suggested Milestone Naming

Release: **vNext – Stable Share Link (DDNS Wizard)**

---

# 10) Agent Next Actions Checklist

1. Identify best insertion point in UI: “Share / Networking”
2. Implement public IP service + storage
3. Implement hostname verify
4. Implement port check (choose Option A or B)
5. Add wizard UI
6. Add docs + troubleshooting codes
7. Add monitoring + event log

---

End.
