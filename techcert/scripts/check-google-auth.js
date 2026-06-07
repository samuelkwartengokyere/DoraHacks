#!/usr/bin/env node
/**
 * Verifies Google Sign-In env vars are set and match on frontend + backend.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_ENV = path.join(ROOT, "backend", ".env");
const FRONTEND_ENV = path.join(ROOT, "frontend", ".env.local");

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function main() {
  const backendId = readEnvValue(BACKEND_ENV, "GOOGLE_CLIENT_ID");
  const frontendId = readEnvValue(FRONTEND_ENV, "NEXT_PUBLIC_GOOGLE_CLIENT_ID");

  console.log("Google Sign-In configuration\n");

  if (!backendId) {
    console.log("  backend GOOGLE_CLIENT_ID .............. NOT SET");
  } else {
    console.log(`  backend GOOGLE_CLIENT_ID .............. set (${backendId.slice(0, 12)}...)`);
  }

  if (!frontendId) {
    console.log("  frontend NEXT_PUBLIC_GOOGLE_CLIENT_ID  NOT SET");
  } else {
    console.log(
      `  frontend NEXT_PUBLIC_GOOGLE_CLIENT_ID  set (${frontendId.slice(0, 12)}...)`,
    );
  }

  if (!backendId || !frontendId) {
    console.log("\nRun: npm run configure:google -- YOUR_CLIENT_ID.apps.googleusercontent.com\n");
    process.exit(1);
  }

  if (backendId !== frontendId) {
    console.log("\n  ERROR: Client IDs do not match. Use the same value in both files.\n");
    process.exit(1);
  }

  console.log("\n  OK — client IDs match. Restart npm run dev if you just changed env files.\n");
}

main();
