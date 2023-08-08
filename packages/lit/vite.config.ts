import { resolve } from "node:path";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig(({ command, mode }) => {
  return {
    build: {
      lib: {
        entry: "src/index.ts",
        name: "RemixRouterLit",
        // eslint-disable-next-line
        fileName: (format) => `${packageJson.name}.${format}.js`,
      },
      rollupOptions: {
        external: ["@remix-run/router", "lit", "@lit-labs/context"],
        // output: {
        //   globals: {
        //     "@remix-run/router": "Router",
        //   },
        // },
      },
    },
    resolve: {
      alias: {
        "~": resolve(__dirname, "./reference-app"),
        "remix-router-lit": resolve(__dirname, "src/index.ts"),
      },
      dedupe: ["lit", "@lit-labs/context"],
    },
    server: {
      hmr: mode === "development",
      open: command === "serve" || mode === "development",
    },
    clearScreen: command === "serve" && mode === "development",
  };
});
