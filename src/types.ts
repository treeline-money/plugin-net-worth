export type Classification = "asset" | "liability";

export type CategoryKey =
  | "cash"
  | "investments"
  | "crypto"
  | "property"
  | "other_asset"
  | "mortgage"
  | "credit"
  | "loan"
  | "other_liability";

export interface Account {
  account_id: string;
  name: string;
  institution_name: string | null;
  account_type: string | null;
  classification: Classification;
  balance: number;
  cat: CategoryKey;
  lastSnapshotAt: Date | null;
}

export interface SnapshotRow {
  account_id: string;
  snapshot_date: string;
  balance: number;
}

export interface SeriesPoint {
  t: Date;
  v: number;
}

export interface AccountWithSeries extends Account {
  series: SeriesPoint[];
}

export interface Totals {
  assets: number;
  liabs: number;
  net: number;
  byCat: Record<string, CategoryGroup>;
}

export interface CategoryGroup {
  cat: CategoryKey;
  label: string;
  side: Classification;
  liquid: boolean;
  icon: IconName;
  order: number;
  value: number;
  accounts: AccountWithSeries[];
}

export interface Mover {
  account: AccountWithSeries;
  chg: number;
}

export type AssetClassKey =
  | "us_stock"
  | "intl_stock"
  | "bonds"
  | "reit"
  | "crypto"
  | "cash_equiv";

export interface Position {
  account_id: string;
  account_name: string;
  symbol: string;
  name: string;
  qty: number;
  price: number;
  klass: AssetClassKey | string;
  value: number;
}

export interface PortfolioClass {
  klass: AssetClassKey | string;
  value: number;
  positions: Position[];
}

export interface PortfolioSummary {
  classes: PortfolioClass[];
  investedTotal: number;
  coverage: number;
  totalAccounts: number;
  accountsWithoutPositions: AccountWithSeries[];
}

export type IconName = "wallet" | "chart" | "zap" | "home" | "card" | "loan";

export type RangeId = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export interface RangeDef {
  id: RangeId;
  days: number | null;
  label: string;
}
