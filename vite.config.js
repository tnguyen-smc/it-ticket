import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT:
// - If deploying to https://USERNAME.github.io/REPO-NAME/  -> set base to '/REPO-NAME/'
// - If deploying to a custom domain (root domain)           -> set base to '/'
export default defineConfig({
  plugins: [react()],
  base: '/it-ticket/',
})
