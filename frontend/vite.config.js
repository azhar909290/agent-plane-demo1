import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// All Flask routes are proxied to the backend on :5000 (no CORS issues in dev)
const target = 'http://localhost:5000';
const routes = ['/api', '/agents', '/agent', '/prompts', '/telemetry', '/add_prompt', '/add_agent', '/update_prompt', '/delete_prompt', '/health', '/initializations', '/copilot', '/ui'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: Object.fromEntries(routes.map(r => [r, { target, changeOrigin: true }])),
  },
});
