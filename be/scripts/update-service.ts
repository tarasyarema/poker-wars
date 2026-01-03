#!/usr/bin/env bun

import { $ } from "bun";

const SERVICE_NAME = "poker-wars";

console.log(`Updating ${SERVICE_NAME} service...`);

// Stop the service
console.log("Stopping service...");
await $`sudo systemctl stop ${SERVICE_NAME}`.quiet();

// Pull latest code
console.log("Pulling latest code...");
await $`git pull`;

// Install dependencies
console.log("Installing dependencies...");
await $`bun install`;

// Start the service
console.log("Starting service...");
await $`sudo systemctl start ${SERVICE_NAME}`;

// Check status
console.log("\nService status:");
await $`sudo systemctl status ${SERVICE_NAME} --no-pager`;

console.log(`\n${SERVICE_NAME} updated successfully!`);
