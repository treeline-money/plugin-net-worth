import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFileSync, copyFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const isWatch = process.argv.includes("--watch");

function getOutDir(): string {
  if (!isWatch) return "dist";
  try {
    const manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
    const treelineDir = process.env.TREELINE_DIR || join(homedir(), ".treeline");
    return join(treelineDir, "plugins", manifest.id);
  } catch {
    return "dist";
  }
}

function copyManifestPlugin() {
  if (!isWatch) return null;
  return {
    name: "copy-manifest",
    writeBundle(options: any) {
      try {
        const outDir = options.dir || "dist";
        copyFileSync("manifest.json", join(outDir, "manifest.json"));
      } catch {
        // best-effort
      }
    },
  };
}

const outDir = getOutDir();

export default defineConfig({
  plugins: [
    svelte({
      emitCss: false, // Inline CSS into JS - required for plugins
    }),
    copyManifestPlugin(),
  ].filter(Boolean),
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir,
    emptyOutDir: !isWatch,
    cssCodeSplit: false,
  },
});
