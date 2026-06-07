import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import {
  fetchIpfsBytesWithFallback,
  fetchIpfsJsonWithFallback,
} from '@ticketpulse/sdk/services'

import { getServerIpfsConfig } from '@/shared/lib/ipfs/config'

/**
 * IPFS view-aggregator proxy (NFR-PERF-007 / F-Notes case 1 & 3).
 *
 *   GET /api/ipfs/{cid}         → raw bytes (cover image preview)
 *   GET /api/ipfs/{cid}?as=json → JSON body (EventMetadata, backups)
 *
 * Strategy:
 *   • Edge runtime, so latency is minimal.
 *   • Cached for 5 minutes — IPFS CIDs are content-addressed, so the
 *     payload for a given CID is immutable. Longer cache windows are
 *     safe but 5 min strikes a balance with quick invalidation when an
 *     organiser realises they uploaded the wrong cover.
 *   • Falls back across multiple gateways if the first is down.
 */
export const runtime = 'edge'

type RouteCtx = { params: Promise<{ cid: string }> }

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { cid } = await ctx.params
  if (!cid || !/^[a-zA-Z0-9]+$/.test(cid)) {
    return NextResponse.json({ error: 'Invalid CID' }, { status: 400 })
  }

  const asJson = request.nextUrl.searchParams.get('as') === 'json'
  const config = getServerIpfsConfig()

  try {
    if (asJson) {
      const data = await fetchIpfsJsonWithFallback<unknown>(cid, config)
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=300, max-age=60' },
      })
    }
    const bytes = await fetchIpfsBytesWithFallback(cid, config)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, s-maxage=300, max-age=60, immutable',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'IPFS fetch failed' },
      { status: 502 },
    )
  }
}
