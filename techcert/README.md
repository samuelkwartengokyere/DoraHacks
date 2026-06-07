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

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | v18 or newer recommended |
| **MongoDB** | Running locally (default URI: `mongodb://localhost:27017/signalforge`) |
| **npm** | Included with Node.js |

Optional (for full integrations — **not required** for a paper demo):

- [CoinMarketCap Pro](https://pro.coinmarketcap.com/login) API key
- [Trust Wallet Agent Kit](https://developer.trustwallet.com) credentials
- BSC testnet wallet + tBNB (only for **live** on-chain trades)

---

## Quick Start

```bash
git clone <your-github-repo-url>
cd techcert
npm run setup
```

`npm run setup` installs backend and frontend dependencies and copies `.env.example` files if they do not exist yet.

### Configure environment

#### Backend (`backend/.env`)

**Minimum for a local demo:**

```env
MONGODB_URI=mongodb://localhost:27017/signalforge
JWT_SECRET=any-long-random-string
AGENT_EXECUTION_MODE=paper
```

**Recommended for a full hackathon demo** (real CMC data, TWAK, agent wallet on the Agent page):

```env
CMC_PRO_API_KEY=your_cmc_pro_api_key
TWAK_API_URL=your_twak_api_url
TWAK_API_KEY=your_twak_api_key
AGENT_EXECUTION_MODE=paper
PRIVATE_KEY=your_bsc_testnet_private_key
AGENT_WALLET_ADDRESS=0xYourPublicWalletAddress
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
```

See `backend/.env.example` for all available options.

**Paper mode** (`AGENT_EXECUTION_MODE=paper`) simulates TWAK execution and does not require tBNB. If CMC or TWAK keys are missing, the app falls back to mock market data so the UI still works.

#### Frontend (`frontend/.env.local`)

Usually fine as copied from setup:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Start MongoDB

The backend requires MongoDB before it can start.

```bash
# Linux (system service)
sudo systemctl start mongod

# or Docker
docker run -d -p 27017:27017 --name signalforge-mongo mongo
```

### Start the application

From the `techcert` directory:

```bash
npm run dev
```

This runs both services:

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API | http://localhost:5000 |

Health check: http://localhost:5000/api/health

Optional integration check:

```bash
npm run check:live
```

### Log in

Open **http://localhost:3000/admin**

On first run with an empty database, a default operator is seeded from `backend/.env`:

| Field | Default (from `.env.example`) |
|-------|-------------------------------|
| Email | `admin@signalforge.ai` |
| Password | `admin123` |

You can also **Register** a new account from the login screen.

Landing page (no login): http://localhost:3000

---

## Track 1 Evaluation (Autonomous Agents)

SignalForge implements the Track 1 scoring rules in-app:

| Rule | Implementation |
|------|----------------|
| **Live PnL / total return** | Per-agent portfolio tracked in MongoDB (`evaluation.equityUsd`, `totalReturnPercent`) |
| **Held-out window** | Set `EVALUATION_WINDOW_START` / `EVALUATION_WINDOW_END` — trades outside the window are rejected |
| **Max drawdown cap** | Default 30% (`EVALUATION_MAX_DRAWDOWN_PERCENT`) — exceeding it disqualifies the agent |
| **Minimum trade count** | Default 5 (`EVALUATION_MIN_TRADE_COUNT`) — required for leaderboard eligibility |
| **Transaction costs** | Fees + slippage on every fill (`EVALUATION_FEE_BPS`, `EVALUATION_SLIPPAGE_BPS`) |
| **Autonomous execution** | **Start monitor** auto-executes on signal change when `EVALUATION_AUTO_EXECUTE=true` |

Leaderboard: `GET /api/evaluation/leaderboard` · Config: `GET /api/evaluation/config`

---

## Demo Flow (for judges)

1. **Agent** — Create an agent → **Check signal now** or **Execute trade**
2. **Strategies** — **Run CMC Strategy Skill** → view backtest P&L
3. **Settings → Integrations** — Confirm CMC, TWAK, and BNB Chain status
4. **Trades** — Review trade log with signal reasoning and execution mode
5. **Agent** — Copy **Agent address** (needed for Track 1 BUIDL submission)

---

## Paper vs Live

| Mode | Setting | What happens |
|------|---------|--------------|
| **Paper** (default) | `AGENT_EXECUTION_MODE=paper` | Simulated trades; no tBNB required |
| **Live** | `AGENT_EXECUTION_MODE=live` + TWAK + funded wallet | Real swaps on BSC testnet (chain ID 97) |

For live mode, fund the agent wallet with testnet BNB from the [BNB testnet faucet](https://testnet.bnbchain.org/faucet-smart).

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/signals/:symbol` | Public CMC trading signal |
| GET/POST | `/api/agents` | List / create agents |
| POST | `/api/agents/:id/run` | Run agent (auth) |
| GET | `/api/trades` | Trade log |
| POST | `/api/strategies/backtest` | Run CMC strategy skill |

---

## Project Structure

```
techcert/
├── backend/     # Express API — agents, CMC, TWAK, strategies
├── frontend/    # Next.js dashboard + landing
├── contracts/   # Legacy Hardhat (optional)
└── scripts/     # check-live.js integration checker
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend fails to start | Ensure MongoDB is running and `MONGODB_URI` is correct |
| CMC rate limit (429) | App uses mock quotes as fallback; wait or use your own API key |
| `check:live` shows PARTIAL | Expected in paper mode; set `AGENT_EXECUTION_MODE=live` only if testing on-chain |
| Cannot log in | Check seeded email in `ADMIN_EMAIL` or register a new account |

---

## Submission

- Register BUIDL on [DoraHacks](https://dorahacks.io/hackathon/bnbhack-twt-cmc/detail)
- Include GitHub link + demo video showing both tracks
- Mention all three sponsor integrations in your write-up

---

## One-line summary

> Clone → `npm run setup` → edit `backend/.env` (paper mode is enough) → start MongoDB → `npm run dev` → open http://localhost:3000/admin
