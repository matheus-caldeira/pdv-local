import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/escoteiros/v2/',
  build: {
    outDir: path.resolve(__dirname, '../v2'),
    emptyOutDir: true,
  },
})
