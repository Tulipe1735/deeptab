import { defineConfig } from 'vite'
import { resolve } from 'path'
import { builtinModules } from 'module'

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
