# Troubleshooting Guide

This guide covers common issues, error codes, and solutions for CraftCommand.

## Common Mistakes

### 1. EULA Not Accepted

**Symptom**: Server starts but immediately stops.
**Fix**: Minecraft requires you to accept the EULA (End User License Agreement).

- **GUI**: Go to the server's "Console" tab and look for the EULA prompt, or deleted the server and check "Accept EULA" during creation.
- **Manual**: Open `eula.txt` in the server's folder and change `eula=false` to `eula=true`.

### 2. Java Version Mismatch

**Symptom**: Server fails to start with "Java version mismatch" or "class file version" errors.
**Fix**: Different Minecraft versions require different Java versions.

- **1.21+ (Latest)**: Requires **Java 21**.
- **1.18 - 1.20**: Requires **Java 17**.
- **1.17**: Requires **Java 16**.
- **1.16 and below**: Requires **Java 8** or **Java 11**.
  _Go to Server Settings -> Java Environment to change the version._

### 3. Port Forwarding / Connection Refused

**Symptom**: Friends cannot join your server.
**Fix**:

- **LAN**: Ensure Windows Firewall allows "Java(TM) Platform SE Binary" on Private networks.
- **Internet**: You must port forward the server port (Default: `25565`) in your router settings to your PC's local IP address.

## Error Code Dictionary

If you see an error code in the dashboard, look it up here.

### System & Connection

| Code                   | Title             | Meaning & Solution                                                                                                        |
| :--------------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **E_NODE_OFFLINE**     | Node Offline      | The remote node (or your local background worker) is not running. Check if `run_locally.bat` or the Node Agent is active. |
| **E_NODE_UNREACHABLE** | Connection Failed | The dashboard cannot talk to the backend. Check your network connection or VPN settings.                                  |
| **E_SERVER_BUSY**      | Server Busy       | Another operation (like an update or backup) is running. Wait a moment and try again.                                     |
| **E_SERVER_OFFLINE**   | Server Offline    | You tried to send a command to a stopped server. Start the server first.                                                  |

### Configuration & Resources

| Code                        | Title         | Meaning & Solution                                                                                                    |
| :-------------------------- | :------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **E_PORT_IN_USE**           | Port Conflict | Port `25565` (or your chosen port) is taken by another program. Stop the other server or change the port in Settings. |
| **E_SERVER_ALREADY_EXISTS** | Name Taken    | A server with this name already exists. Choose a unique name.                                                         |
| **E_FILE_NOT_FOUND**        | File Missing  | A required file (like a world folder or jar) is missing. Did you delete it manually?                                  |

### Java & Runtime

| Code                    | Title             | Meaning & Solution                                                                                            |
| :---------------------- | :---------------- | :------------------------------------------------------------------------------------------------------------ |
| **E_JAVA_MISSING**      | Java Not Found    | No compatible Java installation was found. Install Java from the Settings page or manually install JDK 17/21. |
| **E_JAVA_INCOMPATIBLE** | Incompatible Java | The selected Java version doesn't support this Minecraft version. See "Java Version Mismatch" above.          |
| **E_EULA_NOT_ACCEPTED** | EULA Required     | You must accept the Mojang EULA to run a server.                                                              |

## "The Doctor" Diagnostics

CraftCommand includes a specialized diagnostic tool called "The Doctor".

1.  Go to your Server Dashboard.
2.  Click the **"Stethoscope"** icon (Diagnostics).
3.  The system will analyze your logs for common patterns (Crash Reports, Plugin Errors, Port Binds) and suggest a fix.

## Need more help?

- [Submit a Bug Report](https://github.com/Extroos/Craft-Commands/issues)
- [Join Discord Community](https://discord.gg/craftcommands)
