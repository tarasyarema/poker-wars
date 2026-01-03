#!/usr/bin/env bun

import { $ } from "bun";

const SERVICE_NAME = "poker-wars";
const SERVICE_FILE = `/etc/systemd/system/${SERVICE_NAME}.service`;

console.log(`Uninstalling ${SERVICE_NAME} systemd service...`);

// Stop the service
console.log("Stopping service...");
await $`sudo systemctl stop ${SERVICE_NAME}`.quiet();

// Disable the service
console.log("Disabling service...");
await $`sudo systemctl disable ${SERVICE_NAME}`.quiet();

// Remove service file
console.log("Removing service file...");
await $`sudo rm -f ${SERVICE_FILE}`;

// Reload systemd
console.log("Reloading systemd...");
await $`sudo systemctl daemon-reload`;

console.log(`\n${SERVICE_NAME} service uninstalled successfully!`);
