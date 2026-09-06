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
      "/bmkg-cdn": {
        target: "https://data.bmkg.go.id",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bmkg-cdn/, ""),
      },
      "/bmkg-www": {
        target: "https://www.bmkg.go.id",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bmkg-www/, ""),
      },
      "/bmkg-api": {
        target: "https://api.bmkg.go.id",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bmkg-api/, ""),
      },
    },
  },
});
