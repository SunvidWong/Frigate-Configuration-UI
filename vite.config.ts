import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5121,
    host: '0.0.0.0',
    strictPort: true,
    open: false,
  },
  preview: {
    port: 5121,
    host: '0.0.0.0',
    strictPort: true,
  }
})
