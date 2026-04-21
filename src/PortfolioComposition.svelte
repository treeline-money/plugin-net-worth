<script lang="ts">
  import type { PortfolioSummary } from "./types";
  import { fmtPct } from "./format";
  import { assetClassMeta } from "./categories";

  interface Props {
    portfolio: PortfolioSummary;
    formatFull: (n: number) => string;
    formatCompact: (n: number) => string;
  }
  let { portfolio, formatFull, formatCompact }: Props = $props();

  interface Segment {
    klass: string;
    value: number;
    share: number;
    label: string;
    tone: string;
    positions: {
      symbol: string;
      name: string;
      account_name: string;
      value: number;
    }[];
  }

  let segments = $derived<Segment[]>(
    portfolio.classes
      .map((c) => {
        const meta = assetClassMeta(c.klass);
        return {
          klass: c.klass,
          value: c.value,
          share: portfolio.investedTotal > 0 ? c.value / portfolio.investedTotal : 0,
          label: meta.label,
          tone: meta.tone,
          positions: c.positions
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((p) => ({
              symbol: p.symbol,
              name: p.name,
              account_name: p.account_name.split(" · ")[0],
              value: p.value,
            })),
        };
      })
      .sort((x, y) => assetClassMeta(x.klass).order - assetClassMeta(y.klass).order),
  );
</script>

{#if portfolio.coverage === 0}
  <div class="nw-pf-empty">
    <div class="nw-pf-empty-ico">◔</div>
    <div class="nw-pf-empty-title">No portfolio holdings connected</div>
    <div class="nw-pf-empty-body">
      Portfolio composition breaks down your investments by asset class (US stocks,
      bonds, international, etc.). It needs position-level data — available on
      brokerage &amp; IRA accounts from providers like Fidelity, Vanguard, and
      Schwab.
    </div>
    <div class="nw-pf-empty-body">Connect a brokerage in Accounts to populate this.</div>
  </div>
{:else}
  <div class="nw-pf-wrap">
    <div class="nw-pf-coverage">
      <span>
        Based on <span class="mono">{formatCompact(portfolio.investedTotal)}</span>
        across <span class="mono">{portfolio.coverage}</span> of
        <span class="mono">{portfolio.totalAccounts}</span> investment accounts
      </span>
      {#if portfolio.accountsWithoutPositions.length > 0}
        <span class="nw-pf-coverage-sub">
          Not included:
          {portfolio.accountsWithoutPositions.map((a) => a.name.split(" · ")[0]).join(", ")}
        </span>
      {/if}
    </div>

    <div class="nw-pf-bar">
      {#each segments as s (s.klass)}
        <div
          class="nw-pf-seg"
          style="flex: {s.share}; background: {s.tone}"
          title="{s.label}: {fmtPct(s.share * 100)}"
        >
          {#if s.share > 0.08}
            <span class="nw-pf-seg-inner mono">{(s.share * 100).toFixed(0)}%</span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="nw-pf-classes">
      {#each segments as s (s.klass)}
        <div class="nw-pf-class">
          <div class="nw-pf-class-head">
            <div class="nw-pf-class-label">
              <span class="nw-pf-dot" style="background: {s.tone}"></span>
              <span>{s.label}</span>
            </div>
            <div class="nw-pf-class-vals">
              <span class="mono nw-pf-class-pct">{(s.share * 100).toFixed(1)}%</span>
              <span class="mono nw-pf-class-val">{formatCompact(s.value)}</span>
            </div>
          </div>
          <div class="nw-pf-positions">
            {#each s.positions as p, i (i)}
              <div class="nw-pf-pos">
                <span class="nw-pf-pos-sym mono">{p.symbol}</span>
                <span class="nw-pf-pos-name">{p.name}</span>
                <span class="nw-pf-pos-acct">{p.account_name}</span>
                <span class="nw-pf-pos-val mono">
                  {formatCompact(p.value)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
