import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const src = fileURLToPath(new URL("../src", import.meta.url));
const variant = process.env.HTML5_VARIANT ?? "base";
const cta = variant === "base" && process.env.HTML5_CTA === "1";

/** Standalone entry for the portal HTML5 package. Never part of the Next build. */
export default defineConfig({
  root,
  base: "./",
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: [
      { find: "next/link", replacement: fileURLToPath(new URL("./shims/next-link.tsx", import.meta.url)) },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  css: { postcss: fileURLToPath(new URL("..", import.meta.url)) },
  define: {
    __HTML5_VERSION__: JSON.stringify(process.env.HTML5_VERSION ?? "HTML5 build v1 · levelSet v1 · sim-v2 · from spotthedifferencegame.com"),
    __HTML5_CTA__: JSON.stringify(cta),
    // Only materialises in the base build with HTML5_CTA=1; dead-code eliminated otherwise.
    __HTML5_CTA_URL__: JSON.stringify(cta ? "https://spotthedifferencegame.com/?utm_source=html5" : ""),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: process.env.HTML5_OUT ?? "../dist-html5",
    emptyOutDir: true,
    assetsDir: "assets",
    assetsInlineLimit: 0,
    modulePreload: false,
    sourcemap: false,
  },
});
