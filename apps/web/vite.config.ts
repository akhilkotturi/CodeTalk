import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    define: {
      "process.env.VITE_API_BASE_URL": JSON.stringify(env.VITE_API_BASE_URL),
      "process.env.VITE_WS_BASE_URL": JSON.stringify(env.VITE_WS_BASE_URL),
      "process.env.VITE_DEV_API_PROXY_TARGET": JSON.stringify(env.VITE_DEV_API_PROXY_TARGET),
    },
  };
});
