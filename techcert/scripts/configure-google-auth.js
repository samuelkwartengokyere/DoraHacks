#!/usr/bin/env node
/**
 * Writes the same Google OAuth Client ID to backend/.env and frontend/.env.local.
 *
 * Usage:
 *   npm run configure:google -- 123456789-abc.apps.googleusercontent.com
 *   npm run configure:google   (prints setup checklist)
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_ENV = path.join(ROOT, "backend", ".env");
const FRONTEND_ENV = path.join(ROOT, "frontend", ".env.local");
const CLIENT_ID_PATTERN = /^\d+-[\w-]+\.apps\.googleusercontent\.com$/;

function printChecklist() {
  console.log(`
Google Sign-In setup checklist
==============================

1. Open Google Cloud Console credentials:
   https://console.cloud.google.com/apis/credentials

2. Create (or select) a project.

3. Configure OAuth consent screen (if not done):
   - User type: External
   - App name + support email
   - Add your Google account under Test users (while in Testing)

4. Create credentials → OAuth client ID → Web application

5. Authorized JavaScript origins (add each URL you use):
   - http://localhost:3000
   - https://dora-hacks-three.vercel.app
   - your other production frontend URLs (no trailing slashes)

   Do NOT add trailing slashes. Redirect URIs are not required for this app.

6. Copy the Client ID, then run:

   npm run configure:google -- YOUR_CLIENT_ID.apps.googleusercontent.com

7. Restart the app:

   npm run dev
`);
}

function upsertEnvVar(filePath, key, value) {
  const line = `${key}=${value}`;
  let content = "";

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
  }

  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `\n# Google Sign-In\n${line}\n`;
  }

  fs.writeFileSync(filePath, content, "utf8");
}

function validateClientId(clientId) {
  const trimmed = clientId.trim();
  if (!trimmed) {
    throw new Error("Client ID is required.");
  }
  if (!CLIENT_ID_PATTERN.test(trimmed)) {
    throw new Error(
      "Client ID must look like 123456789012-abcdef.apps.googleusercontent.com",
    );
  }
  return trimmed;
}

function promptClientId() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Paste your Google OAuth Client ID: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  let clientId = process.argv[2];

  if (!clientId) {
    printChecklist();
    if (!process.stdin.isTTY) {
      process.exit(1);
    }
    clientId = await promptClientId();
  }

  try {
    clientId = validateClientId(clientId);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    printChecklist();
    process.exit(1);
  }

  for (const filePath of [BACKEND_ENV, FRONTEND_ENV]) {
    if (!fs.existsSync(filePath)) {
      console.error(`Missing ${filePath}. Run npm run setup first.`);
      process.exit(1);
    }
  }

  upsertEnvVar(BACKEND_ENV, "GOOGLE_CLIENT_ID", clientId);
  upsertEnvVar(FRONTEND_ENV, "NEXT_PUBLIC_GOOGLE_CLIENT_ID", clientId);

  console.log("\nGoogle Sign-In configured successfully.\n");
  console.log(`  backend/.env          → GOOGLE_CLIENT_ID=${clientId}`);
  console.log(`  frontend/.env.local   → NEXT_PUBLIC_GOOGLE_CLIENT_ID=${clientId}`);
  console.log("\nRestart both servers: npm run dev\n");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
