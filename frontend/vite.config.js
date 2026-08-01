import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This exposes the server to 0.0.0.0
    port: 5173,
    watch: {
      usePolling: true, // Needed for hot-reloading inside Docker Windows/Mac
    },
  },
});
