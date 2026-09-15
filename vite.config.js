import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/map-visualizer/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    target: "es2020",
    cssMinify: true,
    minify: "esbuild",
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom")) return "react-dom";
          if (id.includes("react")) return "react";
          if (id.includes("react-leaflet")) return "leaflet";
          if (id.includes("leaflet")) return "leaflet";
          if (id.includes("jszip")) return "jszip";
          if (id.includes("html-to-image")) return "html-to-image";
          return "vendor";
        },
      },
    },
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
      "/magma-web": {
        target: "https://magma.esdm.go.id",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/magma-web/, ""),
      },
      "/awc-api": {
        target: "https://aviationweather.gov",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/awc-api/, ""),
      },
      "/rebornian-assets": {
        target: "https://rebornian48.my.id",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/rebornian-assets/, "/assets"),
      },
    },
  },
});
