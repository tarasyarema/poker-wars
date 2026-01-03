# Systemd Deployment Guide

Deploy the Poker Wars backend as a systemd service on Linux.

## Prerequisites

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone and setup the project**:
   ```bash
   git clone <repository-url>
   cd poker-wars/be
   bun install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

## Installation

Run the install script:

```bash
bun scripts/install-service.ts
```

This will:
- Create a systemd service file at `/etc/systemd/system/poker-wars.service`
- Enable the service to start on boot
- Reload the systemd daemon

## Service Management

```bash
# Start the service
sudo systemctl start poker-wars

# Stop the service
sudo systemctl stop poker-wars

# Restart the service
sudo systemctl restart poker-wars

# Check status
sudo systemctl status poker-wars

# View logs (follow mode)
journalctl -u poker-wars -f

# View last 100 log lines
journalctl -u poker-wars -n 100
```

## Updating

To update the service with the latest code:

```bash
bun scripts/update-service.ts
```

This will:
- Stop the service
- Pull the latest code from git
- Install dependencies
- Start the service

## Uninstalling

To remove the service:

```bash
bun scripts/uninstall-service.ts
```

This will:
- Stop and disable the service
- Remove the service file
- Reload the systemd daemon

## Manual Service Configuration

If you need to customize the service, the service file is located at:

```
/etc/systemd/system/poker-wars.service
```

After making changes, reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart poker-wars
```

## Troubleshooting

**Service fails to start:**
```bash
# Check detailed status
sudo systemctl status poker-wars -l

# Check full logs
journalctl -u poker-wars --no-pager
```

**Permission issues:**
Ensure the user running the service has read access to the project directory and `.env` file.

**Bun not found:**
Make sure bun is installed system-wide or update the `ExecStart` path in the service file.
