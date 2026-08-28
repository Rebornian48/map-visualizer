import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/map-visualizer/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
  },
  server: {
    proxy: {
      "/otsum-cdn": {
        target: "https://cdn.opentransum.randspace0.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/otsum-cdn/, ""),
      },
    },
  },
});
