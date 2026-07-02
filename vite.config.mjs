import { defineConfig } from 'vite'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { builtinModules } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const nodeBuiltins = builtinModules.flatMap((moduleName) => [
  moduleName,
  `node:${moduleName}`,
])

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    rollupOptions: {
      external: ['vscode', ...nodeBuiltins],
    },
    outDir: 'dist',
    sourcemap: true,
  },
})
