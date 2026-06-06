# SignalForge AI

**BNB Hack: AI Trading Agent Edition** — autonomous trading agents that read CoinMarketCap signals, decide, and execute on BNB Smart Chain via Trust Wallet Agent Kit.

Built for [DoraHacks BNB Hack (CMC × Trust Wallet)](https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail).

## Hackathon Tracks

| Track | Feature in SignalForge |
|-------|------------------------|
| **Track 1 — Autonomous Agents** | CMC signal → agent decision → TWAK execution on BSC testnet |
| **Track 2 — Strategy Skills** | CMC skill pipeline + backtestable MA crossover on BNB |

## Sponsor Stack

1. **CoinMarketCap Agent Hub** — market signals via `CMC_PRO_API_KEY`
2. **Trust Wallet Agent Kit** — execution via `TWAK_API_URL` + `TWAK_API_KEY`
3. **BNB Chain** — BSC testnet (chain ID 97)

## Quick Start

```bash
cd techcert
npm run setup
```

Edit `backend/.env`:

```env
CMC_PRO_API_KEY=your_key_from_pro.coinmarketcap.com
TWAK_API_URL=your_twak_url
TWAK_API_KEY=your_twak_key
AGENT_EXECUTION_MODE=paper
PRIVATE_KEY=your_bsc_testnet_key
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
```

```bash
npm run dev
```

- Landing: http://localhost:3000
- Agent console: http://localhost:3000/admin
- Default login: `admin@signalforge.ai` / `admin123` (or your existing seeded admin email)

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/signals/:symbol` | Public CMC trading signal |
| GET/POST | `/api/agents` | List / create agents |
| POST | `/api/agents/:id/run` | Run agent (auth) |
| GET | `/api/trades` | Trade log |
| POST | `/api/strategies/backtest` | Run CMC strategy skill |

## Demo Flow (for judges)

1. Open **Agent Console** → create BNB Momentum Agent → **Run Agent**
2. Open **Strategy Skills** → **Run CMC Strategy Skill** → view backtest P&L
3. Open **Integrations** → confirm CMC / TWAK / BSC status
4. Show trade log with signal reasoning and execution mode

## Paper vs Live

- **Paper** (default): works without tBNB — simulates TWAK execution
- **Live**: set `AGENT_EXECUTION_MODE=live` + fund BSC testnet wallet + configure TWAK

## Project Structure

```
techcert/
├── backend/     # Agent orchestration, CMC, TWAK, strategies
├── frontend/    # SignalForge dashboard + landing
└── contracts/   # Legacy Hardhat (optional)
```

## Submission

- Register BUIDL on [DoraHacks](https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail)
- Include GitHub link + demo video showing both tracks
- Mention all three sponsor integrations in your write-up
