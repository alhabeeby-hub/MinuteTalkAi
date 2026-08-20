import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // Environment variables starting with VITE_ are exposed to the client
    envPrefix: ['VITE_', 'REACT_APP_'],
    define: {
      // In development, default to the local FastAPI server.
      // In production, VITE_API_URL MUST be set as an Amplify environment
      // variable (the API Gateway invoke URL). If it is missing we bake an
      // empty string so the failure is visible instead of silently pointing
      // at http://localhost:8000.
      'process.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || (mode === 'development' ? 'http://localhost:8000' : ''),
      ),
    },
    build: {
      // Output directory for production build
      outDir: 'dist',
      // Disable sourcemaps for production to reduce bundle size
      sourcemap: false,
    },
    // Ensure proper handling of SPA routing
    server: {
      port: 5173,
      host: true,
    },
  }
})
