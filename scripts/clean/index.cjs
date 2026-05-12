const { rimraf } = require('rimraf')
const fs = require('fs')
const path = require('path')

async function clean() {
  const rootDir = resolveRootDir()
  const toDelete = []

  console.log('Scanning for files to clean...')

  // 1. Core workspace targets
  const coreTargets = [
    'node_modules',
    '.turbo',
    'apps/*/node_modules',
    'packages/*/node_modules',
  ]

  // 2. Specific package targets requested by user
  const specificTargets = [
    'packages/subgraph/docs-build',
    'packages/subgraph/build',
    'packages/subgraph/generated',
    'packages/subgraph/networks.local.json',
    'packages/contracts/cache',
    'packages/contracts/broadcast',
    'packages/contracts/out',
    'packages/contracts/artifacts',
    'packages/contracts/.deps',
    'packages/contracts/.states',
    'packages/contracts/src/artifacts',
    'packages/contracts/src/.deps',
    'packages/contracts/src/.states',
  ]

  const allPatterns = [...coreTargets, ...specificTargets]

  for (const pattern of allPatterns) {
    if (pattern.includes('*')) {
      const paths = resolveGlob(rootDir, pattern)
      toDelete.push(...paths)
    } else {
      const p = path.join(rootDir, pattern)
      if (fs.existsSync(p)) {
        toDelete.push(p)
      }
    }
  }

  // Filter unique paths and ensure they exist
  const uniquePaths = [...new Set(toDelete)].filter((p) => fs.existsSync(p))

  if (uniquePaths.length === 0) {
    console.log('Nothing to clean.')
    return
  }

  console.log('Cleaning the following paths:')
  uniquePaths.forEach((p) => console.log(` - ${path.relative(rootDir, p)}`))

  try {
    for (const p of uniquePaths) {
      const relativePath = path.relative(rootDir, p)
      process.stdout.write(`Deleting ${relativePath}... `)
      await rimraf(p)
      console.log('Done.')
    }
    console.log('\nClean completed successfully.')
  } catch (err) {
    console.error('\nClean failed:', err.message)
    process.exit(1)
  }
}

/**
 * Simple manual glob resolver for one-level deep wildcards (e.g. packages/* /node_modules)
 */
function resolveGlob(rootDir, pattern) {
  const parts = pattern.split(/[\\\/]/)
  const wildcardIndex = parts.indexOf('*')

  if (wildcardIndex === -1) return [path.join(rootDir, pattern)]

  const base = path.join(rootDir, ...parts.slice(0, wildcardIndex))
  if (!fs.existsSync(base)) return []

  const subDirs = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  const remaining = parts.slice(wildcardIndex + 1)
  const results = []

  for (const dir of subDirs) {
    const p = path.join(base, dir, ...remaining)
    if (fs.existsSync(p)) {
      results.push(p)
    }
  }

  return results
}

function resolveRootDir() {
  // Move up two levels from scripts/clean/index.cjs to root
  return path.resolve(__dirname, '..', '..')
}

clean()
