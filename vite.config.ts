import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'dev'; }
})();

const buildDate = new Date().toISOString().slice(0, 10);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH?.trim() || "/";

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      // Proxy API requests in development to avoid CORS during local dev.
      // Use VITE_API_PROXY_TARGET if provided, otherwise fall back to VITE_API_BASE or http://localhost:3000
      proxy: {
        "/api": {
          target:
            (env.VITE_API_PROXY_TARGET && env.VITE_API_PROXY_TARGET.trim()) ||
            (env.VITE_API_BASE && env.VITE_API_BASE.trim()) ||
            "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      __GIT_HASH__: JSON.stringify(gitHash),
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
