import type { PluginSDK } from "@treeline-money/plugin-sdk";
import type {
  Account,
  AccountWithSeries,
  CategoryGroup,
  Mover,
  PortfolioClass,
  PortfolioSummary,
  Position,
  RangeDef,
  RangeId,
  SeriesPoint,
  SnapshotRow,
  Totals,
} from "./types";
import { CATS, categoryFor } from "./categories";
import { toISO } from "./format";

const DAY_MS = 86_400_000;

// Accounts that have dropped to ~0 and haven't synced in this many days are
// treated as closed/rolled-over — excluded from "top movers" since the change
// reflects a transfer out, not a net worth loss.
const STALE_THRESHOLD_DAYS = 30;
const CLOSED_BALANCE_THRESHOLD = 1;

export const RANGES: RangeDef[] = [
  { id: "1M", days: 30, label: "1M" },
  { id: "3M", days: 90, label: "3M" },
  { id: "6M", days: 180, label: "6M" },
  { id: "YTD", days: null, label: "YTD" },
  { id: "1Y", days: 365, label: "1Y" },
  { id: "ALL", days: null, label: "ALL" },
];

interface AccountRow {
  account_id: string;
  name: string;
  institution_name: string | null;
  account_type: string | null;
  classification: string | null;
  balance: number | string | null;
  last_snapshot_at: string | null;
}

export async function loadAccounts(sdk: PluginSDK): Promise<Account[]> {
  const rows = await sdk.sql<AccountRow>(`
    SELECT
      a.account_id,
      COALESCE(a.nickname, a.name) AS name,
      a.institution_name,
      a.account_type,
      COALESCE(a.classification, 'asset') AS classification,
      COALESCE(latest.balance, a.balance, 0) AS balance,
      CAST(latest.snap_time AS VARCHAR) AS last_snapshot_at
    FROM accounts a
    LEFT JOIN (
      SELECT account_id, balance, snapshot_time AS snap_time
      FROM balance_snapshots
      QUALIFY ROW_NUMBER() OVER (
        PARTITION BY account_id ORDER BY snapshot_time DESC, balance DESC
      ) = 1
    ) latest ON a.account_id = latest.account_id
    ORDER BY name
  `);

  const seen = new Set<string>();
  const accounts: Account[] = [];
  for (const r of rows) {
    if (seen.has(r.account_id)) continue;
    seen.add(r.account_id);
    const classification = r.classification === "liability" ? "liability" : "asset";
    const lastSnapshotAt = r.last_snapshot_at ? new Date(r.last_snapshot_at) : null;
    accounts.push({
      account_id: r.account_id,
      name: r.name,
      institution_name: r.institution_name,
      account_type: r.account_type,
      classification,
      balance: Number(r.balance) || 0,
      cat: categoryFor(r.account_type, classification),
      lastSnapshotAt,
    });
  }
  return accounts;
}

export async function loadSnapshots(
  sdk: PluginSDK,
  accountIds: string[],
): Promise<SnapshotRow[]> {
  if (accountIds.length === 0) return [];
  const placeholders = accountIds.map(() => "?").join(",");
  const rows = await sdk.sql<{
    account_id: string;
    snapshot_date: string;
    balance: number | string;
  }>(
    `
    SELECT
      account_id,
      CAST(snapshot_time AS DATE) AS snapshot_date,
      balance
    FROM balance_snapshots
    WHERE account_id IN (${placeholders})
    ORDER BY snapshot_time ASC
  `,
    accountIds,
  );
  return rows.map((r) => ({
    account_id: r.account_id,
    snapshot_date: String(r.snapshot_date).slice(0, 10),
    balance: Number(r.balance) || 0,
  }));
}

export function densifySeries(
  account: Account,
  snapshots: SnapshotRow[],
  today: Date,
): SeriesPoint[] {
  if (snapshots.length === 0) {
    return [{ t: new Date(today), v: account.balance }];
  }

  const sorted = snapshots.slice().sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const start = new Date(sorted[0].snapshot_date + "T00:00:00");
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  const series: SeriesPoint[] = [];
  let snapIdx = 0;
  let lastBalance = sorted[0].balance;

  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const iso = toISO(new Date(t));
    while (snapIdx < sorted.length && sorted[snapIdx].snapshot_date <= iso) {
      lastBalance = sorted[snapIdx].balance;
      snapIdx++;
    }
    series.push({ t: new Date(t), v: lastBalance });
  }
  return series;
}

export function aggregateNetWorth(
  accounts: AccountWithSeries[],
  excluded: Set<string>,
): SeriesPoint[] {
  const active = accounts.filter(
    (a) => !excluded.has(a.cat) && a.series.length > 0,
  );
  if (active.length === 0) return [];

  // Start at the earliest snapshot across all accounts. For dates before an
  // account's first snapshot, that account contributes 0 to the aggregate —
  // adding a new account shows up as a bump, which is honest to the data.
  let earliestStart = Infinity;
  for (const a of active) {
    const t = a.series[0].t.getTime();
    if (t < earliestStart) earliestStart = t;
  }

  const lookups = active.map((a) => {
    const m = new Map<string, number>();
    for (const p of a.series) m.set(toISO(p.t), p.v);
    return m;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const out: SeriesPoint[] = [];
  for (let t = earliestStart; t <= today.getTime(); t += DAY_MS) {
    const iso = toISO(new Date(t));
    let total = 0;
    for (const m of lookups) total += m.get(iso) ?? 0;
    out.push({ t: new Date(t), v: total });
  }
  return out;
}

export function sliceRange(series: SeriesPoint[], rangeId: RangeId): SeriesPoint[] {
  if (series.length === 0) return [];
  if (rangeId === "ALL") return series;
  if (rangeId === "YTD") {
    const now = series[series.length - 1].t;
    const start = new Date(now.getFullYear(), 0, 1);
    return series.filter((p) => p.t >= start);
  }
  const def = RANGES.find((r) => r.id === rangeId);
  if (!def || def.days == null) return series;
  const cutoff = series[series.length - 1].t.getTime() - def.days * DAY_MS;
  return series.filter((p) => p.t.getTime() >= cutoff);
}

export function computeTotals(
  accounts: AccountWithSeries[],
  excluded: Set<string>,
): Totals {
  let assets = 0;
  let liabs = 0;
  const byCat: Record<string, CategoryGroup> = {};
  for (const a of accounts) {
    if (excluded.has(a.cat)) continue;
    const meta = CATS[a.cat];
    if (!byCat[a.cat]) {
      byCat[a.cat] = {
        cat: a.cat,
        label: meta.label,
        side: meta.side,
        liquid: meta.liquid,
        icon: meta.icon,
        order: meta.order,
        value: 0,
        accounts: [],
      };
    }
    byCat[a.cat].value += a.balance;
    byCat[a.cat].accounts.push(a);
    if (meta.side === "asset") assets += a.balance;
    else liabs += a.balance;
  }
  return { assets, liabs, net: assets + liabs, byCat };
}

export function computeMovers(
  accounts: AccountWithSeries[],
  rangeId: RangeId,
  excluded: Set<string>,
): Mover[] {
  const now = Date.now();
  const out: Mover[] = [];
  for (const a of accounts) {
    if (excluded.has(a.cat)) continue;
    // Treat near-zero stale accounts as closed/rolled over — a 401k that moved
    // to $0 months ago shouldn't count as a detractor, the money went
    // elsewhere (and shows up there).
    if (Math.abs(a.balance) < CLOSED_BALANCE_THRESHOLD && a.lastSnapshotAt) {
      const daysStale = (now - a.lastSnapshotAt.getTime()) / DAY_MS;
      if (daysStale > STALE_THRESHOLD_DAYS) continue;
    }
    const sliced = sliceRange(a.series, rangeId);
    if (sliced.length < 2) continue;
    const chg = sliced[sliced.length - 1].v - sliced[0].v;
    if (chg === 0) continue;
    const side = CATS[a.cat].side;
    const beneficial = side === "asset" ? chg : -chg;
    out.push({ account: a, chg, beneficial });
  }
  return out.sort((x, y) => Math.abs(y.chg) - Math.abs(x.chg));
}

interface PortfolioRow {
  account_id: string;
  account_name: string;
  symbol: string;
  name: string | null;
  qty: number | string;
  price: number | string;
  asset_class: string | null;
}

export async function loadPortfolio(
  sdk: PluginSDK,
  accounts: Account[],
  excluded: Set<string>,
): Promise<PortfolioSummary> {
  const assetAccounts = accounts.filter(
    (a) => !excluded.has(a.cat) && CATS[a.cat].side === "asset",
  );

  let rows: PortfolioRow[] = [];
  try {
    rows = await sdk.sql<PortfolioRow>(`
      SELECT
        p.account_id,
        COALESCE(a.nickname, a.name) AS account_name,
        p.symbol,
        p.name,
        p.qty,
        p.price,
        p.asset_class
      FROM sys_portfolio_positions p
      LEFT JOIN accounts a ON a.account_id = p.account_id
    `);
  } catch {
    rows = [];
  }

  const classes = new Map<string, PortfolioClass>();
  const accountsWithPositions = new Set<string>();
  let investedTotal = 0;

  for (const r of rows) {
    if (excluded.has(categoryFor(null, "asset"))) continue;
    const acct = accounts.find((a) => a.account_id === r.account_id);
    if (!acct || excluded.has(acct.cat)) continue;
    const qty = Number(r.qty) || 0;
    const price = Number(r.price) || 0;
    const value = qty * price;
    const klass = r.asset_class ?? "other";
    if (!classes.has(klass)) classes.set(klass, { klass, value: 0, positions: [] });
    const entry = classes.get(klass)!;
    const pos: Position = {
      account_id: r.account_id,
      account_name: r.account_name ?? acct.name,
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      qty,
      price,
      klass,
      value,
    };
    entry.value += value;
    entry.positions.push(pos);
    investedTotal += value;
    accountsWithPositions.add(r.account_id);
  }

  const accountsWithoutPositions = assetAccounts
    .filter((a) => !accountsWithPositions.has(a.account_id))
    .map((a) => a as AccountWithSeries);

  return {
    classes: [...classes.values()],
    investedTotal,
    coverage: accountsWithPositions.size,
    totalAccounts: assetAccounts.length,
    accountsWithoutPositions,
  };
}
