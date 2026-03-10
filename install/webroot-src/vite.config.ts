import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
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
