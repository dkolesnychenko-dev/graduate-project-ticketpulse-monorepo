import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import { publicEnv } from '@/shared/env/public'
import { serverEnv } from '@/shared/env/server'

/**
 * Apollo proxy → The Graph (F-Notes case 4 / NFR-SEC-002).
 *
 * The client-side Apollo instance sends every GraphQL request here so:
 *   1. `GRAPH_API_KEY` (when present) never appears in the browser bundle.
 *   2. We can add Edge-level caching headers without touching the client.
 *
 * Edge runtime, no Node APIs needed.
 */
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const body = await request.text()

  const upstream = publicEnv.NEXT_PUBLIC_SUBGRAPH_URL
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (serverEnv.GRAPH_API_KEY) {
    headers['Authorization'] = `Bearer ${serverEnv.GRAPH_API_KEY}`
  }

  const res = await fetch(upstream, {
    method: 'POST',
    headers,
    body,
    // Subgraph queries are dynamic; rely on Apollo's normalised cache
    // for client-side dedup. Don't accidentally cache at the fetch layer.
    cache: 'no-store',
  })

  const text = await res.text()

  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      // Allow Apollo to follow CORS preflight if a future client ships
      // outside our origin.
      'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
      'Cache-Control': 'no-store',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
