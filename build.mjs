import * as esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function build() {
  try {
    // Bundle the server with all dependencies
    await esbuild.build({
      entryPoints: [join(__dirname, 'src/server.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: join(__dirname, 'dist/server.bundle.js'),
      minify: true,
      sourcemap: false,
      external: [
        // These are Node.js built-ins that should not be bundled
      ],
      define: {
        // Ensure process.env is available
        'process.env.NODE_ENV': '"production"'
      },
      banner: {
        js: '#!/usr/bin/env node\n'
      },
      metafile: true
    })

    console.log('✅ Bundle created successfully at dist/server.bundle.js')
    console.log('📦 Single file contains all dependencies and is ready to run')
    console.log('🚀 Run with: node dist/server.bundle.js')
  } catch (error) {
    console.error('❌ Bundle failed:', error)
    process.exit(1)
  }
}

build()
