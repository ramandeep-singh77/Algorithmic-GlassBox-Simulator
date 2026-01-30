import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    sourcemap: true
  },
  define: {
    // Ensure we don't use eval in development
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
});

