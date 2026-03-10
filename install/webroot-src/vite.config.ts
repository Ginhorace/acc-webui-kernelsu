import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, '.')
    }
  },
  build: {
    outDir: '../webroot',
    emptyOutDir: true,
    sourcemap: false,
    minify: false
  },
  server: {
    port: 3000,
    open: true
  },
})
