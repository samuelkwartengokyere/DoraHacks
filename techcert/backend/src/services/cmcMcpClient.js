const axios = require("axios");

const DEFAULT_MCP_URL = "https://mcp.coinmarketcap.com/mcp";

class CmcMcpClient {
  isConfigured() {
    const key = process.env.CMC_MCP_API_KEY?.trim() || process.env.CMC_PRO_API_KEY?.trim();
    const placeholders = new Set(["", "your_cmc_pro_api_key", "your_cmc_mcp_api_key"]);
    return Boolean(key && !placeholders.has(key));
  }

  getUrl() {
    return (process.env.CMC_MCP_URL || DEFAULT_MCP_URL).replace(/\/$/, "");
  }

  getApiKey() {
    return process.env.CMC_MCP_API_KEY?.trim() || process.env.CMC_PRO_API_KEY?.trim();
  }

  async callTool(toolName, args = {}) {
    const response = await axios.post(
      this.getUrl(),
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-CMC_PRO_API_KEY": this.getApiKey(),
        },
        timeout: 20000,
      }
    );

    const result = response.data?.result;
    if (result?.isError) {
      throw new Error(result.content?.[0]?.text || `MCP tool ${toolName} failed`);
    }

    const text = result?.content?.find((c) => c.type === "text")?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return result;
  }

  async getQuote(symbol) {
    return this.callTool("cryptocurrency_quotes_latest", {
      symbol: symbol.toUpperCase(),
      convert: "USD",
    });
  }

  async getGlobalMetrics() {
    return this.callTool("global_metrics_quotes_latest", { convert: "USD" });
  }
}

module.exports = new CmcMcpClient();
