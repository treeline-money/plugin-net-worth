# Net Worth Plugin

A Treeline plugin that renders net worth over time from accounts and balance snapshots. Read-only — no plugin-owned tables.

## Key Files

| File | Purpose |
|------|---------|
| `manifest.json` | Plugin metadata (id: "net-worth") |
| `src/index.ts` | Plugin entry point |
| `src/NetWorthView.svelte` | Main UI component |
| `src/data.ts` | Account and snapshot queries |
| `src/categories.ts` | Account-type → display-category mapping |
| `src/types.ts` | TypeScript types |
| `package.json` | Dependencies (includes `@treeline-money/plugin-sdk`) |

## Quick Commands

```bash
npm install          # Install dependencies
npm run build        # Build to dist/index.js
npm run dev          # Watch mode
tl plugin install .  # Install locally for testing
```

## Plugin Data

This plugin does not own any tables. It reads:

- `sys_accounts` — name, type, classification, balance
- `sys_balance_snapshots` — historical balances per account

Settings (breakdown mode, excluded account IDs) persist via `sdk.settings.get/set`.

## Classification

The plugin requires accounts to have `classification` set to `"asset"` or `"liability"` — anything else falls back to `"asset"`. Within each side, account_type drives the category label and icon (see `src/categories.ts`): `cash`, `savings`, `investment`, `retirement`, `mortgage`, `credit`, `loan`, `other_liability`.

## SDK Import

```typescript
import type { Plugin, PluginContext, PluginSDK } from "@treeline-money/plugin-sdk";
```

## SDK Quick Reference

| Method | What it does |
|--------|--------------|
| `sdk.query(sql)` | Read from `sys_accounts` / `sys_balance_snapshots` |
| `sdk.settings.get/set()` | Persist breakdown mode and exclusions |
| `sdk.currency.format(amount)` | Format as currency |
| `sdk.theme.current()` | Get "light" or "dark" (for chart colors) |

## Releasing

```bash
./scripts/release.sh 0.1.0   # Tags and pushes, GitHub Action creates release
```

## Full Documentation

See https://github.com/treeline-money/treeline
