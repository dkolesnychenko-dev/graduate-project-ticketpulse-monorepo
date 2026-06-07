import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/config/index.ts',
    'src/constants/index.ts',
    'src/contracts/index.ts',
    'src/wagmi/index.ts',
    'src/apollo/index.ts',
    'src/graphql/index.ts',
    'src/identity/index.ts',
    'src/services/index.ts',
    'src/formatting/index.ts',
    'src/errors/index.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  splitting: false,
  treeshake: true,
})
