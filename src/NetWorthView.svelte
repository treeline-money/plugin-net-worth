<script lang="ts">
  import type { PluginSDK } from "@treeline-money/plugin-sdk";
  import type { AccountWithSeries, RangeId } from "./types";
  import { CATS } from "./categories";
  import { fmtDate } from "./format";
  import {
    aggregateNetWorth,
    computeMovers,
    computeTotals,
    densifySeries,
    loadAccounts,
    loadSnapshots,
    RANGES,
    sliceRange,
  } from "./data";

  import TrendChart from "./TrendChart.svelte";
  import BreakdownRows from "./BreakdownRows.svelte";
  import styleText from "./styles.css?inline";

  const STYLE_ID = "plugin-net-worth-styles";

  function ensureStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = styleText;
    document.head.appendChild(el);
  }

  interface Props {
    sdk: PluginSDK;
  }
  let { sdk }: Props = $props();

  const fmtFull = (n: number): string => sdk.currency.format(n);
  const fmtCompact = (n: number): string => sdk.currency.formatCompact(n);
  const fmtSigned = (n: number): string =>
    n > 0 ? `+${fmtFull(n)}` : fmtFull(n);

  interface PersistedSettings {
    exclude?: string[];
  }

  let loading = $state(true);
  let errorMsg = $state<string | null>(null);

  let accounts = $state<AccountWithSeries[]>([]);
  let lastSnapshotAt = $state<Date | null>(null);

  let rangeId = $state<RangeId>("1Y");
  let scrubIdx = $state<number | null>(null);
  let excluded = $state<Set<string>>(new Set());
  let settingsHydrated = $state(false);

  let totals = $derived(computeTotals(accounts, excluded));
  let fullSeries = $derived(aggregateNetWorth(accounts, excluded));
  let series = $derived(sliceRange(fullSeries, rangeId));
  let movers = $derived(computeMovers(accounts, rangeId, excluded));

  let current = $derived(series.length > 0 ? series[series.length - 1].v : 0);
  let first = $derived(series.length > 0 ? series[0].v : 0);
  let chg = $derived(current - first);
  let chgPct = $derived(first !== 0 ? (chg / Math.abs(first)) * 100 : 0);
  let scrubPt = $derived(scrubIdx != null ? series[scrubIdx] ?? null : null);

  let topGainers = $derived(movers.filter((m) => m.beneficial > 0).slice(0, 3));
  let topLosers = $derived(movers.filter((m) => m.beneficial < 0).slice(0, 3));

  async function initialize() {
    loading = true;
    errorMsg = null;
    ensureStyles();
    try {
      const saved = await sdk.settings.get<PersistedSettings>();
      if (saved && Array.isArray(saved.exclude)) excluded = new Set(saved.exclude);
      settingsHydrated = true;

      const raw = await loadAccounts(sdk);
      const ids = raw.map((a) => a.account_id);
      const snaps = await loadSnapshots(sdk, ids);

      const today = new Date();
      const byAccount = new Map<string, typeof snaps>();
      for (const id of ids) byAccount.set(id, []);
      for (const s of snaps) byAccount.get(s.account_id)?.push(s);

      const withSeries: AccountWithSeries[] = raw.map((a) => ({
        ...a,
        series: densifySeries(a, byAccount.get(a.account_id) ?? [], today),
      }));

      const maxTime = snaps.reduce((m, s) => {
        const t = new Date(s.snapshot_date + "T00:00:00").getTime();
        return t > m ? t : m;
      }, 0);
      lastSnapshotAt = maxTime > 0 ? new Date(maxTime) : null;

      accounts = withSeries;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      console.error("Net worth init error:", e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    initialize();
  });

  $effect(() => {
    const unsubscribe = sdk.onDataRefresh(() => {
      initialize();
    });
    return unsubscribe;
  });

  $effect(() => {
    if (!settingsHydrated) return;
    const snapshot: PersistedSettings = { exclude: [...excluded] };
    void sdk.settings.set<PersistedSettings>(snapshot);
  });

  function toggleCat(key: string) {
    const next = new Set(excluded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    excluded = next;
  }

  function clearExcluded() {
    excluded = new Set();
  }

  function setRange(r: RangeId) {
    rangeId = r;
  }

  function onScrub(idx: number | null) {
    scrubIdx = idx;
  }

  function heroLabel(): string {
    if (scrubPt) return `Net worth · ${fmtDate(scrubPt.t)}`;
    return "Net worth · today";
  }

  let subText = $derived.by(() => {
    const count = accounts.length;
    if (count === 0) return "No connected accounts";
    const when = lastSnapshotAt ? fmtDate(lastSnapshotAt) : "no snapshots yet";
    return `Derived from ${count} connected account${count === 1 ? "" : "s"} · last snapshot ${when}`;
  });
</script>

<div class="nw-view">
  <header class="view-header">
    <div>
      <h1 class="view-title">Net worth</h1>
      <div class="view-sub">{subText}</div>
    </div>
  </header>

  {#if loading}
    <div class="nw-loading">
      <div class="nw-spinner"></div>
      <span>Loading net worth…</span>
    </div>
  {:else if errorMsg}
    <div class="nw-error">
      <span>Couldn't load net worth: {errorMsg}</span>
      <button class="btn-link" onclick={() => initialize()}>Retry</button>
    </div>
  {:else if accounts.length === 0}
    <div class="nw-loading">
      <span>No accounts connected yet. Connect accounts to start tracking.</span>
    </div>
  {:else}
    <div class="nw-hero-panel">
      <div class="nw-hero-left">
        <div class="section-title">{heroLabel()}</div>
        <div class="nw-big mono">
          {fmtFull(scrubPt?.v ?? current)}
        </div>
        <div class="nw-delta-row">
          <span class="nw-delta mono {chg >= 0 ? 'positive' : 'negative'}">
            {chg >= 0 ? "▲" : "▼"} {fmtFull(Math.abs(chg))}
          </span>
          <span class="nw-delta-pct mono {chg >= 0 ? 'positive' : 'negative'}">
            {chgPct >= 0 ? "+" : "−"}{Math.abs(chgPct).toFixed(2)}%
          </span>
          <span class="nw-delta-label">{rangeId}</span>
        </div>
        <div class="nw-sub-stats">
          <div>
            <div class="section-title">Assets</div>
            <div class="mono positive">
              {fmtCompact(totals.assets)}
            </div>
          </div>
          <div>
            <div class="section-title">Liabilities</div>
            <div class="mono negative">
              {fmtCompact(Math.abs(totals.liabs))}
            </div>
          </div>
        </div>
      </div>

      <div class="nw-hero-right">
        <div class="nw-range-row">
          {#each RANGES as r (r.id)}
            <button
              class="nw-range-pill {rangeId === r.id ? 'on' : ''}"
              onclick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          {/each}
        </div>
        <TrendChart
          {series}
          height={220}
          {onScrub}
          formatFull={fmtFull}
          formatCompact={fmtCompact}
        />
      </div>
    </div>

    <div class="nw-movers">
      <div class="nw-movers-col">
        <div class="section-title">Top contributors · {rangeId}</div>
        {#if topGainers.length === 0}
          <div class="nw-movers-empty">No positive movement this period.</div>
        {:else}
          {#each topGainers as m (m.account.account_id)}
            <div class="nw-mover-row">
              <div class="nw-mover-name-col">
                <span class="nw-mover-name">{m.account.name}</span>
                {#if m.account.institution_name}
                  <span class="nw-mover-inst">{m.account.institution_name}</span>
                {/if}
              </div>
              <span class="nw-mover-chg mono positive">
                {CATS[m.account.cat].side === "liability" ? "−" : "+"}{fmtCompact(Math.abs(m.chg))}
              </span>
            </div>
          {/each}
        {/if}
      </div>
      <div class="nw-movers-col">
        <div class="section-title">Top detractors · {rangeId}</div>
        {#if topLosers.length === 0}
          <div class="nw-movers-empty">No detractors this period.</div>
        {:else}
          {#each topLosers as m (m.account.account_id)}
            <div class="nw-mover-row">
              <div class="nw-mover-name-col">
                <span class="nw-mover-name">{m.account.name}</span>
                {#if m.account.institution_name}
                  <span class="nw-mover-inst">{m.account.institution_name}</span>
                {/if}
              </div>
              <span class="nw-mover-chg mono negative">
                {CATS[m.account.cat].side === "liability" ? "+" : "−"}{fmtCompact(Math.abs(m.chg))}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    {#if excluded.size > 0}
      <div class="nw-excl-strip">
        <span class="section-title">Excluded</span>
        {#each [...excluded] as k (k)}
          <button class="nw-chip nw-chip-excl" onclick={() => toggleCat(k)}>
            {CATS[k as keyof typeof CATS]?.label ?? k} ×
          </button>
        {/each}
        <button class="btn-link" onclick={clearExcluded}>Clear</button>
      </div>
    {/if}

    <div class="nw-panel">
      <div class="nw-panel-head">
        <h3>Breakdown</h3>
      </div>
      <BreakdownRows {totals} formatFull={fmtFull} />
    </div>
  {/if}
</div>
