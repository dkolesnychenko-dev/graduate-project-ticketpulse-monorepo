import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import {
  EVENT_METADATA_SCHEMA_VERSION,
  uploadEventMetadata,
  uploadFile,
  type EventMetadata,
} from '@ticketpulse/ipfs'

import { COVER_IMAGE } from '@ticketpulse/sdk/constants'

import { getServerIpfsConfig } from '@/shared/lib/ipfs/config'

/**
 * IPFS upload proxy (F-Notes case 2 / NFR-SEC-002).
 *
 * Two upload modes, distinguished by `type`:
 *   • `file`     → multipart with a `file` field — cover image only.
 *   • `metadata` → JSON with description + location — the off-chain
 *                  EventMetadata blob whose CID lands in
 *                  `EventInitialized.ipfsMetadataCid`.
 *
 * `PINATA_JWT` is read from `serverEnv` and never leaves this function.
 */
export const runtime = 'edge'
// Disable static optimisation — every call is a write.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const config = getServerIpfsConfig()

  const formData = await request.formData()
  const type = formData.get('type')

  if (type === 'file') {
    return handleFileUpload(formData, config)
  }
  if (type === 'metadata') {
    return handleMetadataUpload(formData, config)
  }

  return NextResponse.json(
    { error: 'Missing or invalid `type` field. Use "file" or "metadata".' },
    { status: 400 },
  )
}

async function handleFileUpload(
  formData: FormData,
  config: ReturnType<typeof getServerIpfsConfig>,
) {
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file in upload' }, { status: 400 })
  }
  if (file.size > COVER_IMAGE.maxSizeBytes) {
    return NextResponse.json(
      {
        error: `File exceeds the ${(COVER_IMAGE.maxSizeBytes / 1024 / 1024).toFixed(0)} MB limit`,
      },
      { status: 413 },
    )
  }
  if (!COVER_IMAGE.acceptedMimeTypes.includes(file.type as never)) {
    return NextResponse.json(
      { error: `Unsupported MIME type: ${file.type}` },
      { status: 415 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const result = await uploadFile(bytes, config)
  return NextResponse.json(result, { status: 200 })
}

async function handleMetadataUpload(
  formData: FormData,
  config: ReturnType<typeof getServerIpfsConfig>,
) {
  const raw = formData.get('metadata')
  if (typeof raw !== 'string') {
    return NextResponse.json(
      { error: 'Missing `metadata` (stringified JSON) field' },
      { status: 400 },
    )
  }
  let parsed: EventMetadata
  try {
    parsed = JSON.parse(raw) as EventMetadata
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (parsed.schemaVersion !== EVENT_METADATA_SCHEMA_VERSION) {
    return NextResponse.json(
      {
        error: `Unsupported schemaVersion ${parsed.schemaVersion} — expected ${EVENT_METADATA_SCHEMA_VERSION}`,
      },
      { status: 400 },
    )
  }
  if (
    typeof parsed.description !== 'string' ||
    typeof parsed.location !== 'string' ||
    parsed.description.trim().length === 0 ||
    parsed.location.trim().length === 0
  ) {
    return NextResponse.json(
      { error: 'Both `description` and `location` are required and non-empty.' },
      { status: 400 },
    )
  }

  const result = await uploadEventMetadata(parsed, config)
  return NextResponse.json(result, { status: 200 })
}
