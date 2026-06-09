/**
 * BNB Hack Track 1 eligible BEP-20 symbols (149 tokens on CoinMarketCap).
 * Trades outside this list do not count toward competition ranking.
 */
const ELIGIBLE_SYMBOLS = [
  "ETH", "USDT", "USDC", "XRP", "TRX", "DOGE", "ZEC", "ADA", "LINK", "BCH",
  "DAI", "TON", "USD1", "USDE", "M", "LTC", "AVAX", "SHIB", "XAUT", "WLFI",
  "H", "DOT", "UNI", "ASTER", "DEXE", "USDD", "ETC", "AAVE", "ATOM", "U",
  "STABLE", "FIL", "INJ", "币安人生", "NIGHT", "FET", "TUSD", "BONK", "PENGU", "CAKE",
  "SIREN", "LUNC", "ZRO", "KITE", "FDUSD", "BEAT", "PIEVERSE", "BTT", "NFT",
  "EDGE", "FLOKI", "LDO", "B", "FF", "PENDLE", "NEX", "STG", "AXS", "TWT",
  "HOME", "RAY", "COMP", "GWEI", "XCN", "GENIUS", "XPL", "BAT", "SKYAI", "APE",
  "IP", "SFP", "TAG", "NXPC", "AB", "SAHARA", "1INCH", "CHEEMS", "BANANAS31",
  "RIVER", "MYX", "RAVE", "SNX", "FORM", "LAB", "HTX", "USDF", "CTM", "BDX",
  "SLX", "UB", "DUCKY", "FRAX", "BILL", "WFI", "KOGE", "ALE", "FRXUSD", "USDF",
  "GOMINING", "VCNT", "GUA", "DUSD", "SMILEK", "0G", "BEAM", "MY", "SOON",
  "REAL", "Q", "AIOZ", "ZIG", "YFI", "TAC", "LISUSD", "CYS", "ZAMA", "TRIA",
  "HUMA", "PLUME", "ZIL", "XPR", "ZETA", "BABYDOGE", "NILA", "ROSE", "VELO",
  "UAI", "BRETT", "OPEN", "BSB", "TOSHI", "BAS", "ACH", "AXL", "LUR", "ELF",
  "KAVA", "APR", "IRYS", "EURI", "XUSD", "BARD", "DUSK", "SUSHI", "PEAQ",
  "COAI", "BDCA", "XAUM", "BNB", "WBNB",
];

const ELIGIBLE_SET = new Set(ELIGIBLE_SYMBOLS);

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function isEligibleToken(symbol) {
  if (process.env.ENFORCE_ELIGIBLE_TOKENS === "false") {
    return true;
  }
  return ELIGIBLE_SET.has(normalizeSymbol(symbol));
}

function assertEligibleToken(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!isEligibleToken(normalized)) {
    const err = new Error(
      `${normalized} is not an eligible competition token. Pick one of the ${ELIGIBLE_SET.size} BEP-20 symbols listed on CoinMarketCap for Track 1.`
    );
    err.code = "INELIGIBLE_TOKEN";
    err.symbol = normalized;
    throw err;
  }
  return normalized;
}

module.exports = {
  ELIGIBLE_SYMBOLS,
  ELIGIBLE_SET,
  normalizeSymbol,
  isEligibleToken,
  assertEligibleToken,
};
