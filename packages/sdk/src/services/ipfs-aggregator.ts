import { getGatewayUrls, type IpfsConfig } from '@ticketpulse/ipfs'

/**
 * View-Aggregator pattern (NFR-PERF-007).
 *
 * Tries every configured gateway in priority order and returns the first
 * successful response. Designed to be called from Edge routes; the result
 * is then cached at the Edge with `s-maxage=…` so we don't pay the IPFS
 * round-trip on every request.
 *
 * Why we don't use `@ticketpulse/ipfs#fetchEventMetadata` directly: the
 * IPFS package's fetch helper is shaped for the typed `EventMetadata`
 * object, but here we need to be flexible — sometimes we're fetching
 * arbitrary JSON (e.g. an encrypted identity backup blob), sometimes raw
 * bytes (cover image previews on the server side).
 */

interface FallbackOptions {
  /** Override the default gateway priority list (e.g. for tests). */
  gatewayUrls?: string[]
  /** Per-attempt timeout in ms. Defaults to 4 000. */
  timeoutMs?: number
  /** Inject a custom fetch (Edge runtime gives you one — pass it through). */
  fetchImpl?: typeof fetch
  /** Optional `AbortSignal` propagated to every attempt. */
  signal?: AbortSignal
}

async function fetchWithTimeout(
  url: string,
  opts: { timeoutMs: number; fetchImpl: typeof fetch; signal?: AbortSignal },
): Promise<Response> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort('IPFS gateway timeout'), opts.timeoutMs)
  const onParentAbort = () => ctl.abort('aborted by parent')
  opts.signal?.addEventListener('abort', onParentAbort, { once: true })
  try {
    return await opts.fetchImpl(url, { signal: ctl.signal })
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onParentAbort)
  }
}

export async function fetchIpfsJsonWithFallback<T>(
  cid: string,
  config: IpfsConfig,
  options: FallbackOptions = {},
): Promise<T> {
  const gateways = options.gatewayUrls ?? getGatewayUrls(cid, config)
  const { timeoutMs = 4_000, fetchImpl = fetch } = options

  const errors: string[] = []
  for (const url of gateways) {
    try {
      const res = await fetchWithTimeout(url, { timeoutMs, fetchImpl, signal: options.signal })
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`)
        continue
      }
      return (await res.json()) as T
    } catch (err) {
      errors.push(`${url} → ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  throw new Error(
    `[ipfs-aggregator] All gateways failed for ${cid}:\n${errors.map((e) => '  • ' + e).join('\n')}`,
  )
}

export async function fetchIpfsBytesWithFallback(
  cid: string,
  config: IpfsConfig,
  options: FallbackOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const gateways = options.gatewayUrls ?? getGatewayUrls(cid, config)
  const { timeoutMs = 4_000, fetchImpl = fetch } = options

  const errors: string[] = []
  for (const url of gateways) {
    try {
      const res = await fetchWithTimeout(url, { timeoutMs, fetchImpl, signal: options.signal })
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`)
        continue
      }
      return new Uint8Array(await res.arrayBuffer())
    } catch (err) {
      errors.push(`${url} → ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  throw new Error(
    `[ipfs-aggregator] All gateways failed for ${cid}:\n${errors.map((e) => '  • ' + e).join('\n')}`,
  )
}
