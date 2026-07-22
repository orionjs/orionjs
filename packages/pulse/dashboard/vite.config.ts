import {resolve} from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, '../assets/dashboard'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          if (
            moduleId.includes('/node_modules/recharts/') ||
            moduleId.includes('/node_modules/d3-')
          ) {
            return 'charts'
          }
          if (
            moduleId.includes('/node_modules/react/') ||
            moduleId.includes('/node_modules/react-dom/')
          ) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
