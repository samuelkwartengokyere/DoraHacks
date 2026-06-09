const { ethers } = require("ethers");
const { getChainConfig } = require("../config/chainConfig");

const PLACEHOLDER_KEYS = new Set([
  "",
  "your_wallet_private_key",
  "your_wallet_private_key_here",
]);

class BnbChainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.initialized = false;
  }

  isPrivateKeyConfigured() {
    const privateKey = process.env.PRIVATE_KEY?.trim();
    return Boolean(privateKey && !PLACEHOLDER_KEYS.has(privateKey));
  }

  initialize() {
    const { rpcUrl } = getChainConfig();
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !this.isPrivateKeyConfigured()) {
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.initialized = true;
    } catch (error) {
      console.warn("BNB Chain init failed:", error.message);
    }
  }

  isConfigured() {
    return this.initialized;
  }
}

const service = new BnbChainService();
service.initialize();

module.exports = service;
