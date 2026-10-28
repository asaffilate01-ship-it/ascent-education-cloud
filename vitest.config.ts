import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Unit tests must never inherit a real project's backend or credentials.
    env: {
      VITE_SUPABASE_URL: 'https://unipathway-browser-ci.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_ci_only',
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
