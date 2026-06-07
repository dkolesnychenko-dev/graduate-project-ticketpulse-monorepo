import { BACKUP_PBKDF2_ITERATIONS } from '../constants/metadata'
import type {
  EncryptedIdentityBackup,
  IdentityArtifact,
} from '../types/identity'

/**
 * Encrypted local-artifact backup using Web Crypto (works in both browser
 * and Edge runtime).
 *
 *   Plaintext: JSON.stringify(IdentityArtifact[])
 *   KDF:       PBKDF2-SHA-256 with 600 000 iterations (NIST SP 800-132)
 *   Cipher:    AES-GCM-256, fresh 12-byte IV per backup
 *
 * Output is a JSON blob safe to upload to IPFS — recovering the artifact
 * back requires the user's original passphrase.
 *
 * Why not use libsodium? Web Crypto is available everywhere we run
 * (browser, Edge Runtime, Node 18+) and adds 0 bytes of bundle.
 */

const TEXT_ENCODER = new TextEncoder()
const TEXT_DECODER = new TextDecoder()

function getCrypto(): Crypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error(
      '[@ticketpulse/sdk] Web Crypto (SubtleCrypto) is not available. ' +
        'Run inside a modern browser, Edge Runtime, or Node 18+.',
    )
  }
  return globalThis.crypto
}

function toBase64(bytes: Uint8Array): string {
  // Convert without going through `Buffer` so we stay isomorphic.
  let s = ''
  for (let i = 0; i < bytes.length; i += 1) {
    s += String.fromCharCode(bytes[i]!)
  }
  return globalThis.btoa(s)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = globalThis.atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i += 1) {
    bytes[i] = s.charCodeAt(i)
  }
  return bytes
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const crypto = getCrypto()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    TEXT_ENCODER.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt an array of artifacts with the user's passphrase.
 *
 * The salt and IV are freshly generated and stored alongside the ciphertext —
 * the user only needs to remember the passphrase to restore.
 */
export async function encryptIdentityBackup(
  artifacts: IdentityArtifact[],
  passphrase: string,
): Promise<EncryptedIdentityBackup> {
  if (passphrase.length < 8) {
    throw new Error('[backup] passphrase must be at least 8 characters')
  }
  const crypto = getCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(passphrase, salt, BACKUP_PBKDF2_ITERATIONS)

  const plaintext = TEXT_ENCODER.encode(JSON.stringify(artifacts))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  )

  return {
    schemaVersion: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: BACKUP_PBKDF2_ITERATIONS,
    },
  }
}

export async function decryptIdentityBackup(
  backup: EncryptedIdentityBackup,
  passphrase: string,
): Promise<IdentityArtifact[]> {
  if (backup.schemaVersion !== 1) {
    throw new Error(`[backup] unsupported schema: ${backup.schemaVersion}`)
  }
  const crypto = getCrypto()
  const salt = fromBase64(backup.salt)
  const iv = fromBase64(backup.iv)
  const ciphertext = fromBase64(backup.ciphertext)

  const key = await deriveAesKey(passphrase, salt, backup.kdf.iterations)

  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )
  } catch {
    throw new Error('[backup] decryption failed — wrong passphrase or corrupted file')
  }

  const json = TEXT_DECODER.decode(plaintext)
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) {
    throw new Error('[backup] decrypted payload is not an artifact array')
  }
  return parsed as IdentityArtifact[]
}

/** Pretty-print a backup as a JSON blob ready to download / upload to IPFS. */
export function serializeBackup(backup: EncryptedIdentityBackup): string {
  return JSON.stringify(backup, null, 2)
}

/** Parse a backup file with strict schema validation. */
export function parseBackup(input: string): EncryptedIdentityBackup {
  const raw: unknown = JSON.parse(input)
  if (!raw || typeof raw !== 'object') {
    throw new Error('[backup] not a JSON object')
  }
  const b = raw as Record<string, unknown>
  if (b.schemaVersion !== 1) {
    throw new Error(`[backup] unsupported schemaVersion: ${String(b.schemaVersion)}`)
  }
  if (
    typeof b.salt !== 'string' ||
    typeof b.iv !== 'string' ||
    typeof b.ciphertext !== 'string'
  ) {
    throw new Error('[backup] missing salt/iv/ciphertext')
  }
  const kdf = b.kdf as Record<string, unknown> | undefined
  if (
    !kdf ||
    kdf.name !== 'PBKDF2' ||
    kdf.hash !== 'SHA-256' ||
    typeof kdf.iterations !== 'number'
  ) {
    throw new Error('[backup] invalid kdf parameters')
  }
  return {
    schemaVersion: 1,
    salt: b.salt,
    iv: b.iv,
    ciphertext: b.ciphertext,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: kdf.iterations,
    },
  }
}
