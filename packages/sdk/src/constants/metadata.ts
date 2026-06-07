/** Version we always write into `EventMetadata.schemaVersion`. */
export const EVENT_METADATA_SCHEMA_VERSION = '1.0.0' as const

/**
 * EIP-712 domain — both `name` and `version` are written into the typed-data
 * domain separator. Changing either invalidates every existing signature, so
 * treat this as immutable history.
 */
export const EIP712_DOMAIN = {
  name: 'TicketPulse',
  version: '1',
} as const

/** EIP-712 typed-data schema for the identity binding (F-6). */
export const IDENTITY_BINDING_TYPES = {
  IdentityBinding: [
    { name: 'eventName', type: 'string' },
    { name: 'ownerFirstName', type: 'string' },
    { name: 'ownerLastName', type: 'string' },
  ],
} as const

/** Primary type name passed to `signTypedData`. */
export const IDENTITY_BINDING_PRIMARY_TYPE = 'IdentityBinding' as const

/** KDF iterations for the encrypted IPFS backup (NIST SP 800-132 recommendation, 2023+). */
export const BACKUP_PBKDF2_ITERATIONS = 600_000
