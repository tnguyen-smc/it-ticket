import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT:
// - If deploying to https://github.com/tnguyen-smc/it-ticket  -> set base to '/it-ticket/'
// - If deploying to a custom domain (root domain)           -> set base to '/'
export default defineConfig({
  plugins: [react()],
  base: '/it-ticket/',
})
