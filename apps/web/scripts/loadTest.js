#!/usr/bin/env node

/**
 * High-Concurrency Frontend Load Tester
 *
 * Simulates thousands of concurrent users hitting the Next.js frontend.
 * This script chunks the requests to simulate high-load spikes
 * without crashing the local Node.js test process.
 */

const TARGET_REQUESTS = parseInt(process.env.TARGET_REQUESTS || '10000', 10)
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '500', 10)
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000/'

async function runFrontendLoadTest() {
  console.log(`🧨 Starting Frontend Load Test...`)
  console.log(`   Target URL:      ${TARGET_URL}`)
  console.log(`   Target Requests: ${TARGET_REQUESTS}`)
  console.log(`   Chunk Size:      ${CHUNK_SIZE}`)
  console.log('----------------------------------------------------')

  const startTime = Date.now()
  let completed = 0
  let failed = 0

  // Process in chunks to avoid overwhelming the OS network stack
  // and the Node.js event loop of this tester script.
  for (let i = 0; i < TARGET_REQUESTS; i += CHUNK_SIZE) {
    const chunkPromises = []
    const currentChunkSize = Math.min(CHUNK_SIZE, TARGET_REQUESTS - i)

    for (let j = 0; j < currentChunkSize; j++) {
      chunkPromises.push(
        fetch(TARGET_URL, {
          // Prevent keep-alive socket exhaustion on extreme loads
          headers: { Connection: 'close' },
        })
          .then((res) => {
            if (!res.ok) {
              failed++
              if (failed === 1) {
                console.warn(
                  `   ⚠️ First Failure Status: ${res.status} ${res.statusText}`,
                )
              }
            }
          })
          .catch((err) => {
            failed++
            if (failed === 1) {
              console.warn(`   ⚠️ First Network Failure: ${err.message}`)
            }
          }),
      )
    }

    await Promise.all(chunkPromises)
    completed += currentChunkSize

    // Progress Logging
    const progress = ((completed / TARGET_REQUESTS) * 100).toFixed(2)
    console.log(
      `   [${progress}%] Completed ${completed} requests... (Failures: ${failed})`,
    )
  }

  const endTime = Date.now()
  const durationSec = (endTime - startTime) / 1000
  const requestsPerSec = TARGET_REQUESTS / durationSec

  console.log('----------------------------------------------------')
  console.log(
    `✅ Frontend Load Test Completed in ${durationSec.toFixed(2)} seconds.`,
  )
  console.log(`📊 Performance: ${requestsPerSec.toFixed(2)} req/sec`)
  console.log(`❌ Failures: ${failed} / ${TARGET_REQUESTS}`)
}

runFrontendLoadTest().catch((err) => {
  console.error('❌ Frontend Load Test failed:', err)
  process.exit(1)
})
