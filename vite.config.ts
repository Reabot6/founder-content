import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL || "";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: apiBase
        ? {
            "/api/content/generate": {
              target: apiBase,
              changeOrigin: true,
              rewrite: () => "/webhook/generate-content",
            },
            "/api/content/repurpose": {
              target: apiBase,
              changeOrigin: true,
              rewrite: () => "/webhook/repurpose-content",
            },
            "/api/content/job": {
              target: apiBase,
              changeOrigin: true,
              rewrite: (path) => {
                const url = new URL(path, "http://x");
                const jobId = encodeURIComponent(url.searchParams.get("job_id") ?? "");
                return `/webhook/job-status?job_id=${jobId}`;
              },
            },
          }
        : {},
    },
  };
});
