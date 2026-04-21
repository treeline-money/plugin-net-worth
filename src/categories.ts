import type {
  AssetClassKey,
  CategoryKey,
  Classification,
  IconName,
} from "./types";

export interface CategoryMeta {
  label: string;
  side: Classification;
  liquid: boolean;
  icon: IconName;
  order: number;
}

export const CATS: Record<CategoryKey, CategoryMeta> = {
  cash:            { label: "Cash",         side: "asset",     liquid: true,  icon: "wallet", order: 1 },
  investments:     { label: "Investments",  side: "asset",     liquid: true,  icon: "chart",  order: 2 },
  crypto:          { label: "Crypto",       side: "asset",     liquid: true,  icon: "zap",    order: 3 },
  property:        { label: "Property",     side: "asset",     liquid: false, icon: "home",   order: 4 },
  other_asset:     { label: "Other assets", side: "asset",     liquid: false, icon: "wallet", order: 5 },
  mortgage:        { label: "Mortgage",     side: "liability", liquid: false, icon: "home",   order: 10 },
  credit:          { label: "Credit cards", side: "liability", liquid: true,  icon: "card",   order: 11 },
  loan:            { label: "Loans",        side: "liability", liquid: false, icon: "loan",   order: 12 },
  other_liability: { label: "Other debts",  side: "liability", liquid: false, icon: "loan",   order: 13 },
};

export function categoryFor(
  accountType: string | null,
  classification: Classification,
): CategoryKey {
  const t = (accountType || "").toLowerCase().trim();
  if (classification === "asset") {
    if (["checking", "savings", "cash", "money_market", "depository"].includes(t)) return "cash";
    if (["brokerage", "ira", "roth", "401k", "investment", "mutual_fund", "retirement"].includes(t)) return "investments";
    if (["crypto", "cryptocurrency"].includes(t)) return "crypto";
    if (["property", "real_estate", "home", "vehicle", "auto"].includes(t)) return "property";
    return "other_asset";
  }
  if (["mortgage"].includes(t)) return "mortgage";
  if (["credit", "credit_card"].includes(t)) return "credit";
  if (["loan", "auto_loan", "student_loan", "line_of_credit"].includes(t)) return "loan";
  return "other_liability";
}

export interface AssetClassMeta {
  label: string;
  order: number;
  tone: string;
}

export const ASSET_CLASSES: Record<string, AssetClassMeta> = {
  us_stock:   { label: "US stocks",   order: 1, tone: "#6aaa83" },
  intl_stock: { label: "Intl stocks", order: 2, tone: "#4a8a63" },
  bonds:      { label: "Bonds",       order: 3, tone: "#e4b85b" },
  reit:       { label: "Real estate", order: 4, tone: "#b8944a" },
  crypto:     { label: "Crypto",      order: 5, tone: "#8a6a3a" },
  cash_equiv: { label: "Cash equiv.", order: 6, tone: "#5c6661" },
};

export function assetClassMeta(k: AssetClassKey | string): AssetClassMeta {
  return ASSET_CLASSES[k] ?? { label: k, order: 99, tone: "#5c6661" };
}

export interface IconPaths {
  paths: string[];
}

export const CAT_ICONS: Record<IconName, IconPaths> = {
  wallet: {
    paths: [
      "M20 12V7H5a2 2 0 0 1 0-4h14v4",
      "M3 5v14a2 2 0 0 0 2 2h16v-4",
      "M18 12a2 2 0 0 0 0 4h4v-4z",
    ],
  },
  chart: {
    paths: [
      "M18 20V10",
      "M12 20V4",
      "M6 20v-6",
    ],
  },
  zap: {
    paths: ["M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 Z"],
  },
  home: {
    paths: [
      "M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-8H9v8H5a2 2 0 0 1-2-2z",
    ],
  },
  card: {
    paths: [
      "M2 5 L22 5 L22 19 L2 19 Z",
      "M2 10 L22 10",
    ],
  },
  loan: {
    paths: [
      "M12 3 A9 9 0 1 1 12 21 A9 9 0 1 1 12 3",
      "M12 7v10",
      "M9 10h6",
      "M9 14h6",
    ],
  },
};
