<script lang="ts">
  import type { SeriesPoint } from "./types";
  import { fmtDate, fmtDateShort } from "./format";

  interface Props {
    series: SeriesPoint[];
    height?: number;
    onScrub?: (idx: number | null) => void;
    formatFull: (n: number) => string;
    formatCompact: (n: number) => string;
  }
  let {
    series,
    height = 220,
    onScrub,
    formatFull,
    formatCompact,
  }: Props = $props();

  const PAD_L = 56;
  const PAD_R = 16;
  const PAD_T = 14;
  const PAD_B = 28;

  let wrapEl = $state<HTMLDivElement | undefined>();
  let W = $state(1000);
  let hover = $state<number | null>(null);

  $effect(() => {
    if (!wrapEl) return;
    const el = wrapEl;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        if (w > 0) W = w;
      }
    });
    ro.observe(el);
    W = Math.floor(el.getBoundingClientRect().width) || 1000;
    return () => ro.disconnect();
  });

  interface ChartPoint {
    x: number;
    y: number;
    t: Date;
    v: number;
    i: number;
  }

  interface ChartData {
    path: string;
    areaPath: string;
    pts: ChartPoint[];
    yTicks: { v: number; y: number }[];
    xLabels: { i: number; x: number; t: Date; align: "start" | "middle" | "end" }[];
  }

  let chart = $derived<ChartData | null>(
    (() => {
      if (!series || series.length < 2) return null;
      const vals = series.map((p) => p.v);
      const minV0 = Math.min(...vals);
      const maxV0 = Math.max(...vals);
      // Anchor at zero so flat-looking data reads accurately against its
      // actual magnitude. Extend past zero only if net worth went negative.
      const minV = Math.min(0, minV0);
      const maxV = Math.max(0, maxV0) * 1.08 || 1;
      const cw = W - PAD_L - PAD_R;
      const ch = height - PAD_T - PAD_B;
      const xAt = (i: number) => PAD_L + (i / (series.length - 1)) * cw;
      const yAt = (v: number) => PAD_T + ch - ((v - minV) / (maxV - minV)) * ch;
      const pts: ChartPoint[] = series.map((p, i) => ({
        x: xAt(i),
        y: yAt(p.v),
        t: p.t,
        v: p.v,
        i,
      }));
      const path =
        "M " + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
      const areaPath =
        `M ${pts[0].x.toFixed(1)},${(PAD_T + ch).toFixed(1)} L ` +
        pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ") +
        ` L ${pts[pts.length - 1].x.toFixed(1)},${(PAD_T + ch).toFixed(1)} Z`;

      const niceStep = (range: number, target: number) => {
        const rough = range / target;
        const pow = Math.pow(10, Math.floor(Math.log10(Math.abs(rough))));
        const n = rough / pow;
        const mult = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
        return mult * pow;
      };
      const step = niceStep(maxV - minV, 4);
      const yTicks: { v: number; y: number }[] = [];
      const startTick = Math.ceil(minV / step) * step;
      for (let v = startTick; v <= maxV + 1e-6; v += step) {
        yTicks.push({ v, y: yAt(v) });
        if (yTicks.length > 6) break;
      }

      const idxs = [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
      const xLabels = idxs.map((i, k) => ({
        i,
        x: pts[i].x,
        t: pts[i].t,
        align: (k === 0 ? "start" : k === 2 ? "end" : "middle") as
          | "start"
          | "middle"
          | "end",
      }));

      return { path, areaPath, pts, yTicks, xLabels };
    })(),
  );

  let activeIdx = $derived(
    hover != null ? hover : chart ? chart.pts.length - 1 : 0,
  );
  let activePt = $derived(chart ? chart.pts[activeIdx] : null);
  let firstPt = $derived(chart ? chart.pts[0] : null);
  let lastPt = $derived(chart ? chart.pts[chart.pts.length - 1] : null);
  let rising = $derived(!!lastPt && !!firstPt && lastPt.v >= firstPt.v);
  let color = $derived(rising ? "var(--accent-primary)" : "var(--accent-danger)");

  function handleMove(e: MouseEvent) {
    if (!wrapEl || !chart) return;
    const rect = wrapEl.getBoundingClientRect();
    const xRel = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < chart.pts.length; i++) {
      const d = Math.abs(chart.pts[i].x - xRel);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    hover = best;
    onScrub?.(best);
  }

  function handleLeave() {
    hover = null;
    onScrub?.(null);
  }

  function xLabelTransform(align: "start" | "middle" | "end"): string {
    if (align === "start") return "translateX(0)";
    if (align === "end") return "translateX(-100%)";
    return "translateX(-50%)";
  }
</script>

<div
  bind:this={wrapEl}
  class="nw-trend"
  onmousemove={handleMove}
  onmouseleave={handleLeave}
  role="img"
  aria-label="Net worth trend"
  style="height: {height}px"
>
  {#if chart}
    <svg width={W} {height}>
      <defs>
        <linearGradient id="nw-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={color} stop-opacity="0.22" />
          <stop offset="1" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>
      {#each chart.yTicks as t, i (i)}
        <line
          x1={PAD_L}
          y1={t.y}
          x2={W - PAD_R}
          y2={t.y}
          stroke="var(--border-secondary)"
          stroke-dasharray="2 3"
        />
      {/each}
      <path d={chart.areaPath} fill="url(#nw-area-grad)" />
      <path
        d={chart.path}
        stroke={color}
        stroke-width="1.75"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      {#if lastPt}
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="3.5"
          fill={color}
          stroke="var(--bg-primary)"
          stroke-width="2"
        />
      {/if}
      {#if activePt && hover != null}
        <line
          x1={activePt.x}
          y1={PAD_T}
          x2={activePt.x}
          y2={height - PAD_B}
          stroke="var(--text-muted)"
          stroke-dasharray="2 2"
          opacity="0.5"
        />
        <circle
          cx={activePt.x}
          cy={activePt.y}
          r="5"
          fill={color}
          stroke="var(--bg-primary)"
          stroke-width="2"
        />
      {/if}
    </svg>

    {#each chart.yTicks as t, i (i)}
      <div
        class="axis-label-html y"
        style="right: calc(100% - {PAD_L - 8}px); left: 0; top: {t.y}px; transform: translateY(-50%); width: {PAD_L - 10}px;"
      >
        {formatCompact(t.v)}
      </div>
    {/each}
    {#each chart.xLabels as l, i (i)}
      <div
        class="axis-label-html x"
        style="left: {l.x}px; bottom: 4px; transform: {xLabelTransform(l.align)}; white-space: nowrap;"
      >
        {fmtDateShort(l.t)}
      </div>
    {/each}
    {#if activePt && hover != null}
      <div class="nw-trend-tip" style="left: {activePt.x}px">
        <div class="nw-trend-tip-value">{formatFull(activePt.v)}</div>
        <div class="nw-trend-tip-date">{fmtDate(activePt.t)}</div>
      </div>
    {/if}
  {:else}
    <div class="nw-trend-empty" style="height: {height}px">
      Need at least 2 snapshots to chart.
    </div>
  {/if}
</div>
