# Net Worth

A [Treeline](https://github.com/treeline-money/treeline) plugin for tracking net worth over time.

## Features

- **Trend chart** — net worth across 1M, 3M, 6M, YTD, 1Y, or all-time
- **Period movers** — which accounts contributed or detracted most over the selected window
- **Breakdown** — drill into assets and liabilities by account, or group by portfolio asset class (cash, investments, retirement, credit, loans)
- **Account exclusions** — hide accounts you don't want counted
- **Auto-derived** — reads your existing accounts and balance snapshots; no extra data entry

## How It Works

1. Connect accounts (or add manual ones) in Treeline's core Accounts view
2. As balances update — from syncs, manual edits, or CSV imports — snapshots accrue automatically
3. The plugin reads those snapshots and renders your net worth over time

## Installation

### From Community Plugins (Recommended)

1. Open Treeline
2. Go to Settings > Plugins > Community Plugins
3. Find "Net Worth" and click Install
4. Restart Treeline

### Manual Installation

```bash
tl plugin install https://github.com/treeline-money/plugin-net-worth
# Restart Treeline
```

## Development

```bash
git clone https://github.com/treeline-money/plugin-net-worth
cd plugin-net-worth
npm install
npm run build
tl plugin install .
```

## License

MIT
