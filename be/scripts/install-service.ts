#!/usr/bin/env bun

import { $ } from "bun";

const SERVICE_NAME = "poker-wars";
const SERVICE_FILE = `/etc/systemd/system/${SERVICE_NAME}.service`;

const projectDir = import.meta.dir.replace("/scripts", "");
const bunPath = (await $`which bun`.text()).trim();

const serviceContent = `[Unit]
Description=Poker Wars Backend API
After=network.target

[Service]
Type=simple
User=${Bun.env.USER}
WorkingDirectory=${projectDir}
ExecStart=${bunPath} src/index.ts
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`;

console.log(`Installing ${SERVICE_NAME} systemd service...`);

// Write service file
await Bun.write("/tmp/poker-wars.service", serviceContent);

// Copy to systemd directory (requires sudo)
await $`sudo cp /tmp/poker-wars.service ${SERVICE_FILE}`;
await $`sudo chmod 644 ${SERVICE_FILE}`;

// Reload systemd
await $`sudo systemctl daemon-reload`;

// Enable service
await $`sudo systemctl enable ${SERVICE_NAME}`;

console.log(`Service installed successfully!`);
console.log(`\nUseful commands:`);
console.log(`  sudo systemctl start ${SERVICE_NAME}   # Start the service`);
console.log(`  sudo systemctl stop ${SERVICE_NAME}    # Stop the service`);
console.log(`  sudo systemctl status ${SERVICE_NAME}  # Check status`);
console.log(`  journalctl -u ${SERVICE_NAME} -f       # View logs`);
