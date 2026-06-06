#!/usr/bin/env node

const path = require("path");
const backendDir = path.join(__dirname, "../backend");
const backendNodeModules = path.join(backendDir, "node_modules");

function requireBackend(moduleName) {
  return require(path.join(backendNodeModules, moduleName));
}

requireBackend("dotenv").config({
  path: path.join(backendDir, ".env"),
});

const mongoose = requireBackend("mongoose");

const {
  getIntegrationStatus,
  testCmcConnection,
  testTwakConnection,
  testBnbChainConnection,
} = require("../backend/src/utils/integrationStatus");

function printResult(label, ok, message) {
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${label}: ${message}`);
}

async function main() {
  console.log("SignalForge AI — Integration Check\n");

  const baseStatus = await getIntegrationStatus();
  console.log(`Current mode: ${baseStatus.mode.toUpperCase()}`);
  console.log(`Hackathon ready: ${baseStatus.readyForProduction ? "YES" : "NO"}\n`);

  console.log("Configuration checklist:");
  for (const item of baseStatus.checklist) {
    printResult(item.label, item.done, item.done ? "done" : "pending");
  }

  console.log("\nLive connection tests:");

  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      printResult("MongoDB", true, "Connected successfully");
      await mongoose.disconnect();
    } catch (error) {
      printResult("MongoDB", false, error.message);
    }
  } else {
    printResult("MongoDB", true, "Already connected");
  }

  const cmc = await testCmcConnection();
  printResult("CoinMarketCap Agent Hub", cmc.ok, cmc.message);

  const twak = await testTwakConnection();
  printResult("Trust Wallet Agent Kit", twak.ok, twak.message);

  const bnb = await testBnbChainConnection();
  printResult("BNB Chain Testnet", bnb.ok, bnb.message);
  if (bnb.agentBalanceBnb !== undefined) {
    console.log(`  Agent wallet: ${bnb.agentAddress}`);
    console.log(`  Balance: ${bnb.agentBalanceBnb} tBNB`);
  }

  const deepStatus = await getIntegrationStatus({ deep: true });

  console.log("\nSummary:");
  console.log(`  Mode after live tests: ${deepStatus.mode.toUpperCase()}`);
  console.log(`  Frontend URL: ${deepStatus.urls.frontend}`);
  console.log(`  API URL: ${deepStatus.urls.api}`);

  if (!deepStatus.readyForProduction) {
    console.log("\nNext steps:");
    if (!cmc.ok) {
      console.log("  • Add CMC_PRO_API_KEY to backend/.env");
    }
    if (!twak.ok) {
      console.log("  • Add TWAK_API_URL and TWAK_API_KEY from Trust Wallet developer portal");
    }
    if (!bnb.ok) {
      console.log("  • Set PRIVATE_KEY and BNB_TESTNET_RPC; fund wallet with tBNB for live trades");
    }
    if (!baseStatus.checklist.find((item) => item.id === "jwt")?.done) {
      console.log("  • Change JWT_SECRET in backend/.env");
    }
    process.exit(1);
  }

  console.log("\nAll hackathon integrations are live. SignalForge is ready for demo and submission.");
}

main().catch((error) => {
  console.error("Check failed:", error.message);
  process.exit(1);
});
