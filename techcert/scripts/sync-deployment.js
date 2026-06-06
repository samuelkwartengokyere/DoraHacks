#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const deploymentPath = path.join(rootDir, "scripts/deployment.json");
const backendEnvPath = path.join(rootDir, "backend/.env");
const frontendEnvPath = path.join(rootDir, "frontend/.env.local");

function upsertEnvValue(filePath, key, value) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing ${filePath}. Run npm run setup first.`);
    process.exit(1);
  }

  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, updated.join("\n"));
}

function main() {
  if (!fs.existsSync(deploymentPath)) {
    console.error("No deployment.json found. Deploy contracts first:");
    console.error("  cd contracts && npm run deploy:testnet");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const techCert = deployment.contracts?.TechCert;
  const soulbound = deployment.contracts?.SoulboundCertificate;

  if (!techCert || !soulbound) {
    console.error("deployment.json is missing contract addresses.");
    process.exit(1);
  }

  upsertEnvValue(backendEnvPath, "TECHCERT_CONTRACT_ADDRESS", techCert);
  upsertEnvValue(backendEnvPath, "SOULBOUND_CONTRACT_ADDRESS", soulbound);
  upsertEnvValue(frontendEnvPath, "NEXT_PUBLIC_TECHCERT_CONTRACT_ADDRESS", techCert);
  upsertEnvValue(frontendEnvPath, "NEXT_PUBLIC_SOULBOUND_CONTRACT_ADDRESS", soulbound);

  console.log("Synced contract addresses from scripts/deployment.json");
  console.log(`  TechCert:             ${techCert}`);
  console.log(`  SoulboundCertificate: ${soulbound}`);
  console.log("");
  console.log("Updated:");
  console.log(`  ${backendEnvPath}`);
  console.log(`  ${frontendEnvPath}`);
  console.log("");
  console.log("Restart the backend and frontend to apply changes.");
}

main();
