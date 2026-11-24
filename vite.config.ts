import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)/,
              priority: 30,
            },
            {
              name: 'vendor-tanstack',
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 25,
            },
            {
              name: 'vendor-ui',
              test: /node_modules[\\/](@base-ui|cmdk|sonner|lucide-react|class-variance-authority|clsx|tailwind-merge|cn)/,
              priority: 20,
            },
            {
              name: 'vendor-motion',
              test: /node_modules[\\/](motion|framer-motion)/,
              priority: 20,
            },
            {
              name: 'vendor-forms',
              test: /node_modules[\\/](react-hook-form|@hookform|zod)/,
              priority: 20,
            },
            {
              name: 'vendor-echarts',
              test: /node_modules[\\/]echarts/,
              priority: 25,
            },
          ],
        },
      },
    },
  },
})
