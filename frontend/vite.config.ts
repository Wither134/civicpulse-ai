import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fall back to 5174 when 5173 is already taken (common during local restarts).
    strictPort: false,
  },
})
