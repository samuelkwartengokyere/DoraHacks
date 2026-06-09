function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getChainMode() {
  const mode = (process.env.BNB_CHAIN_MODE || "testnet").trim().toLowerCase();
  return mode === "mainnet" ? "mainnet" : "testnet";
}

function getChainConfig() {
  const mode = getChainMode();
  const isMainnet = mode === "mainnet";

  return {
    mode,
    chainId: isMainnet ? 56 : 97,
    networkName: isMainnet ? "BNB Smart Chain Mainnet" : "BNB Chain Testnet",
    rpcUrl: isMainnet
      ? process.env.BNB_MAINNET_RPC || "https://bsc-dataseed.binance.org"
      : process.env.BNB_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
    twakChain: isMainnet ? "bsc" : "bsc-testnet",
    explorerBase: isMainnet ? "https://bsctrace.com" : "https://testnet.bscscan.com",
    allowLiveMainnet: process.env.ALLOW_MAINNET === "true",
  };
}

function assertLiveExecutionAllowed() {
  const config = getChainConfig();
  if (config.mode === "mainnet" && !config.allowLiveMainnet) {
    const err = new Error(
      "Mainnet live execution blocked. Set ALLOW_MAINNET=true after funding your agent wallet for the competition window."
    );
    err.code = "MAINNET_BLOCKED";
    throw err;
  }
  return config;
}

module.exports = {
  getChainMode,
  getChainConfig,
  assertLiveExecutionAllowed,
  parseNumber,
};
