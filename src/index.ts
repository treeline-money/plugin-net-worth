import type { Plugin, PluginContext, PluginSDK } from "@treeline-money/plugin-sdk";
import { mount, unmount } from "svelte";
import NetWorthView from "./NetWorthView.svelte";

export const plugin: Plugin = {
  manifest: {
    id: "net-worth",
    name: "Net Worth",
    version: "0.1.0",
    description:
      "Track net worth over time: trend chart, period movers, and by-account or portfolio-asset-class breakdowns.",
    author: "Treeline",
    icon: "trending-up",
    permissions: {
      read: ["accounts", "balance_snapshots"],
      schemaName: "plugin_net_worth",
    },
  },

  activate(context: PluginContext) {
    context.registerView({
      id: "net-worth",
      name: "Net Worth",
      icon: "trending-up",
      mount: (target: HTMLElement, props: { sdk: PluginSDK }) => {
        const instance = mount(NetWorthView, { target, props });
        return () => {
          unmount(instance);
        };
      },
    });

    context.registerSidebarItem({
      sectionId: "main",
      id: "net-worth",
      label: "Net Worth",
      icon: "trending-up",
      viewId: "net-worth",
    });

    context.registerCommand({
      id: "net-worth.open",
      name: "View Net Worth",
      description: "Open the net worth tracker",
      execute: () => {
        context.openView("net-worth");
      },
    });

    console.log("✓ Net Worth plugin loaded");
  },

  deactivate() {
    console.log("Net Worth plugin deactivated");
  },
};
