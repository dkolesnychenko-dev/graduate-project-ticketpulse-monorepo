export {
  buildIdentityBindingDomain,
  buildIdentityBindingTypedData,
  hashIdentitySignature,
  type IdentityBindingTypedData,
} from './eip712'

export {
  buildOwnershipProofMessage,
  packQrPayload,
  parseQrPayload,
  isQrOwnershipFresh,
} from './qr'

export {
  encryptIdentityBackup,
  decryptIdentityBackup,
  serializeBackup,
  parseBackup,
} from './backup'

export {
  loadIdentityArtifacts,
  saveIdentityArtifact,
  removeIdentityArtifact,
  identityArtifactKey,
  IDENTITY_STORAGE_PREFIX,
} from './storage'
