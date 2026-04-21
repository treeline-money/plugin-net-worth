<script lang="ts">
  import type { AccountWithSeries, Totals } from "./types";

  interface Props {
    totals: Totals;
    formatFull: (n: number) => string;
  }
  let { totals, formatFull }: Props = $props();

  interface SidedAccount extends AccountWithSeries {
    side: "asset" | "liability";
  }

  let allAccounts = $derived<SidedAccount[]>(
    Object.values(totals.byCat).flatMap((c) =>
      c.accounts.map((a) => ({ ...a, side: c.side })),
    ),
  );

  let assetAccounts = $derived(
    allAccounts
      .filter((a) => a.side === "asset")
      .sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance)),
  );
  let liabAccounts = $derived(
    allAccounts
      .filter((a) => a.side === "liability")
      .sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance)),
  );

  function pct(value: number, total: number): string {
    if (total === 0) return "—";
    return `${Math.round((Math.abs(value) / Math.abs(total)) * 100)}%`;
  }
</script>

{#snippet accountRows(
  accounts: SidedAccount[],
  total: number,
  side: "asset" | "liability",
)}
  {#each accounts as a (a.account_id)}
    <div class="nw-bd-row">
      <div class="nw-bd-row-name">
        <span>{a.name}</span>
        {#if a.institution_name}
          <span class="nw-bd-row-sub">{a.institution_name}</span>
        {/if}
      </div>
      <span class="nw-bd-row-pct mono">{pct(a.balance, total)}</span>
      <div class="nw-bd-row-val mono {side === 'liability' ? 'negative' : ''}">
        {formatFull(Math.abs(a.balance))}
      </div>
    </div>
  {/each}
{/snippet}

{#if allAccounts.length === 0}
  <div class="nw-bd-empty">
    No accounts to show. Connect accounts to see your net worth.
  </div>
{:else}
  <div class="nw-bd-split">
    <div class="nw-bd-side">
      <div class="nw-bd-side-header">
        <span class="nw-bd-side-label">Assets</span>
        <span class="nw-bd-side-total mono positive">
          {formatFull(totals.assets)}
        </span>
      </div>
      {#if assetAccounts.length === 0}
        <div class="nw-bd-empty">No asset accounts.</div>
      {:else}
        {@render accountRows(assetAccounts, totals.assets, "asset")}
      {/if}
    </div>
    <div class="nw-bd-side">
      <div class="nw-bd-side-header">
        <span class="nw-bd-side-label">Liabilities</span>
        <span class="nw-bd-side-total mono negative">
          {formatFull(Math.abs(totals.liabs))}
        </span>
      </div>
      {#if liabAccounts.length === 0}
        <div class="nw-bd-empty">No liabilities.</div>
      {:else}
        {@render accountRows(liabAccounts, totals.liabs, "liability")}
      {/if}
    </div>
  </div>
{/if}
