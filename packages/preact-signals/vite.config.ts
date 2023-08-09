import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";
import packageJson from "./package.json";

export default defineConfig(({ command, mode }) => ({
  // eslint-disable-next-line
  plugins: [preact() as any],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "RemixRouterPreactSignals",
      // eslint-disable-next-line
      fileName: (format) => `${packageJson.name}.${format}.js`,
    },
    rollupOptions: {
      external: ["@remix-run/router", "preact", "@preact/signals"],
      output: {
        globals: {
          "@remix-run/router": "Router",
        },
      },
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./reference-app"),
      "remix-router-preact-signals": resolve(__dirname, "src/index.ts"),
    },
    dedupe: ["preact", "@preact/signals"],
  },
  clearScreen: command === "serve" && mode === "development",
}));
