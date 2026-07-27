import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../etnet_go/frontend_dist',
    emptyOutDir: true
  },
  server: {
    port: 3630
  }
})
