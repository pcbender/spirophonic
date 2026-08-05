import type {
  SoundBankFormat,
  SoundBankReference,
} from '../core/composition'

const DATABASE_VERSION = 1
const BANK_METADATA_STORE = 'soundbank-metadata'
const BANK_BYTES_STORE = 'soundbank-bytes'
const SHA_256_HEX = /^[0-9a-f]{64}$/

export type SoundBankStoreErrorCode =
  | 'digest-failed'
  | 'digest-mismatch'
  | 'invalid-record'
  | 'quota-exceeded'
  | 'storage-error'
  | 'unavailable'

export class SoundBankStoreError extends Error {
  readonly code: SoundBankStoreErrorCode
  readonly cause?: unknown

  constructor(
    code: SoundBankStoreErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message)
    this.name = 'SoundBankStoreError'
    this.code = code
    this.cause = options.cause
  }
}

export type StoredSoundBankMetadata = {
  digest: string
  name: string
  format: SoundBankFormat
  byteLength: number
  license: string
  attribution: string
  importedAt: string
}

export type StoredSoundBank = {
  metadata: StoredSoundBankMetadata
  bytes: ArrayBuffer
}

export type SoundBankImport = {
  bytes: ArrayBuffer | ArrayBufferView | Blob
  name: string
  format: SoundBankFormat
  license: string
  attribution?: string
}

export type SoundBankImportResult = {
  metadata: StoredSoundBankMetadata
  created: boolean
}

export type SoundBankStoreOptions = {
  databaseName?: string
  indexedDB?: IDBFactory | null
  subtleCrypto?: SubtleCrypto | null
  now?: () => string
  estimateStorage?: () => Promise<{ usage?: number; quota?: number }>
}

type StoredSoundBankBytes = {
  digest: string
  bytes: ArrayBuffer
}

const asError = (value: unknown) =>
  value instanceof Error ? value : new Error(String(value))

export const soundBankStoreErrorFor = (
  error: unknown,
  action: string,
): SoundBankStoreError => {
  if (error instanceof SoundBankStoreError) return error
  const cause = asError(error)
  const quota =
    cause.name === 'QuotaExceededError' ||
    cause.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  return new SoundBankStoreError(
    quota ? 'quota-exceeded' : 'storage-error',
    quota
      ? `Not enough browser storage to ${action}.`
      : `Browser storage failed while trying to ${action}: ${cause.message}`,
    { cause: error },
  )
}

const cloneBytes = (bytes: ArrayBuffer) => bytes.slice(0)

const isArrayBufferValue = (value: unknown): value is ArrayBuffer =>
  Object.prototype.toString.call(value) === '[object ArrayBuffer]'

const readBytes = async (
  input: ArrayBuffer | ArrayBufferView | Blob,
): Promise<ArrayBuffer> => {
  if (input instanceof Blob) return input.arrayBuffer()
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    ).slice().buffer
  }
  return cloneBytes(input)
}

export const sha256Hex = async (
  bytes: ArrayBuffer,
  subtleCrypto: SubtleCrypto | undefined = globalThis.crypto?.subtle,
) => {
  try {
    if (!subtleCrypto) throw new Error('Web Crypto is unavailable.')
    const digest = await subtleCrypto.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('')
  } catch (error) {
    throw new SoundBankStoreError(
      'digest-failed',
      'Could not calculate the SoundFont SHA-256 digest.',
      { cause: error },
    )
  }
}

const requestResult = <T>(request: IDBRequest<T>, action: string) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(soundBankStoreErrorFor(request.error, action))
  })

const transactionComplete = (transaction: IDBTransaction, action: string) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(soundBankStoreErrorFor(transaction.error, action))
    transaction.onabort = () =>
      reject(soundBankStoreErrorFor(transaction.error, action))
  })

const validMetadata = (value: unknown): value is StoredSoundBankMetadata => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredSoundBankMetadata>
  return (
    typeof record.digest === 'string' &&
    SHA_256_HEX.test(record.digest) &&
    typeof record.name === 'string' &&
    (record.format === 'sf2' ||
      record.format === 'sf3' ||
      record.format === 'dls') &&
    typeof record.byteLength === 'number' &&
    typeof record.license === 'string' &&
    typeof record.attribution === 'string' &&
    typeof record.importedAt === 'string'
  )
}

const validBytes = (value: unknown): value is StoredSoundBankBytes => {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredSoundBankBytes>
  return (
    typeof record.digest === 'string' &&
    SHA_256_HEX.test(record.digest) &&
    isArrayBufferValue(record.bytes)
  )
}

export class SoundBankStore {
  private readonly databaseName: string
  private readonly factory?: IDBFactory
  private readonly subtleCrypto?: SubtleCrypto
  private readonly now: () => string
  private readonly estimateStorage?: SoundBankStoreOptions['estimateStorage']
  private databasePromise?: Promise<IDBDatabase>

  constructor(options: SoundBankStoreOptions = {}) {
    this.databaseName = options.databaseName ?? 'spirophonic-soundbanks'
    this.factory =
      options.indexedDB === null
        ? undefined
        : (options.indexedDB ?? globalThis.indexedDB)
    this.subtleCrypto =
      options.subtleCrypto === null
        ? undefined
        : (options.subtleCrypto ?? globalThis.crypto?.subtle)
    this.now = options.now ?? (() => new Date().toISOString())
    this.estimateStorage =
      options.estimateStorage ??
      (globalThis.navigator?.storage?.estimate
        ? () => globalThis.navigator.storage.estimate()
        : undefined)
  }

  async importBank(input: SoundBankImport): Promise<SoundBankImportResult> {
    const bytes = await readBytes(input.bytes)
    const digest = await this.digest(bytes)
    const existing = await this.metadata(digest)
    if (existing) return { metadata: existing, created: false }

    await this.requireCapacity(bytes.byteLength)
    const metadata = this.metadataFor(input, digest, bytes)
    await this.put(metadata, bytes)
    return { metadata, created: true }
  }

  async relink(
    expectedDigest: string,
    input: SoundBankImport,
  ): Promise<StoredSoundBankMetadata> {
    if (!SHA_256_HEX.test(expectedDigest)) {
      throw new SoundBankStoreError(
        'digest-mismatch',
        'The expected SoundFont digest is not a SHA-256 value.',
      )
    }
    const bytes = await readBytes(input.bytes)
    const digest = await this.digest(bytes)
    if (digest !== expectedDigest) {
      throw new SoundBankStoreError(
        'digest-mismatch',
        `Selected bank digest ${digest} does not match ${expectedDigest}.`,
      )
    }

    const existing = await this.metadata(digest)
    if (!existing) await this.requireCapacity(bytes.byteLength)
    const metadata = this.metadataFor(
      input,
      digest,
      bytes,
      existing?.importedAt,
    )
    await this.put(metadata, bytes)
    return metadata
  }

  async get(digest: string): Promise<StoredSoundBank | undefined> {
    const database = await this.database()
    const transaction = database.transaction(
      [BANK_METADATA_STORE, BANK_BYTES_STORE],
      'readonly',
    )
    const [metadata, byteRecord] = await Promise.all([
      requestResult(
        transaction.objectStore(BANK_METADATA_STORE).get(digest),
        'read SoundFont metadata',
      ),
      requestResult(
        transaction.objectStore(BANK_BYTES_STORE).get(digest),
        'read SoundFont bytes',
      ),
    ])
    await transactionComplete(transaction, 'read a SoundFont bank')
    if (metadata === undefined && byteRecord === undefined) return undefined
    if (
      !validMetadata(metadata) ||
      !validBytes(byteRecord) ||
      metadata.digest !== byteRecord.digest ||
      metadata.byteLength !== byteRecord.bytes.byteLength
    ) {
      throw new SoundBankStoreError(
        'invalid-record',
        `Stored SoundFont record ${digest} is invalid.`,
      )
    }
    return {
      metadata,
      bytes: cloneBytes(byteRecord.bytes),
    }
  }

  async list(): Promise<Array<StoredSoundBankMetadata>> {
    const database = await this.database()
    const transaction = database.transaction(BANK_METADATA_STORE, 'readonly')
    const records = await requestResult(
      transaction.objectStore(BANK_METADATA_STORE).getAll(),
      'list SoundFont banks',
    )
    await transactionComplete(transaction, 'list SoundFont banks')
    return records
      .map((record) => {
        if (!validMetadata(record)) {
          throw new SoundBankStoreError(
            'invalid-record',
            'A stored SoundFont record is invalid.',
          )
        }
        return record
      })
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.digest.localeCompare(right.digest),
      )
  }

  async delete(digest: string): Promise<boolean> {
    const existing = await this.metadata(digest)
    if (!existing) return false
    const database = await this.database()
    const transaction = database.transaction(
      [BANK_METADATA_STORE, BANK_BYTES_STORE],
      'readwrite',
    )
    transaction.objectStore(BANK_METADATA_STORE).delete(digest)
    transaction.objectStore(BANK_BYTES_STORE).delete(digest)
    await transactionComplete(transaction, 'delete a SoundFont bank')
    return true
  }

  close() {
    void this.databasePromise?.then((database) => database.close())
    this.databasePromise = undefined
  }

  toReference(
    id: string,
    metadata: StoredSoundBankMetadata,
  ): SoundBankReference {
    return {
      id,
      name: metadata.name,
      digest: metadata.digest,
      format: metadata.format,
      source: 'local',
      license: metadata.license,
      attribution: metadata.attribution,
    }
  }

  private async digest(bytes: ArrayBuffer) {
    if (!this.subtleCrypto) {
      throw new SoundBankStoreError(
        'unavailable',
        'Web Crypto is unavailable; SoundFont banks cannot be identified safely.',
      )
    }
    return sha256Hex(bytes, this.subtleCrypto)
  }

  private database() {
    if (!this.factory) {
      return Promise.reject(
        new SoundBankStoreError(
          'unavailable',
          'IndexedDB is unavailable; SoundFont banks cannot be stored locally.',
        ),
      )
    }
    if (this.databasePromise) return this.databasePromise

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest
      try {
        request = this.factory!.open(this.databaseName, DATABASE_VERSION)
      } catch (error) {
        reject(soundBankStoreErrorFor(error, 'open the SoundFont vault'))
        return
      }
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(BANK_METADATA_STORE)) {
          database.createObjectStore(BANK_METADATA_STORE, { keyPath: 'digest' })
        }
        if (!database.objectStoreNames.contains(BANK_BYTES_STORE)) {
          database.createObjectStore(BANK_BYTES_STORE, { keyPath: 'digest' })
        }
      }
      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => database.close()
        resolve(database)
      }
      request.onerror = () =>
        reject(
          soundBankStoreErrorFor(request.error, 'open the SoundFont vault'),
        )
      request.onblocked = () =>
        reject(
          new SoundBankStoreError(
            'storage-error',
            'Another tab is blocking a SoundFont vault upgrade.',
          ),
        )
    })
    return this.databasePromise
  }

  private async requireCapacity(byteLength: number) {
    if (!this.estimateStorage) return
    let estimate: { usage?: number; quota?: number }
    try {
      estimate = await this.estimateStorage()
    } catch (error) {
      throw soundBankStoreErrorFor(error, 'estimate SoundFont storage')
    }
    if (
      estimate.quota !== undefined &&
      (estimate.usage ?? 0) + byteLength > estimate.quota
    ) {
      throw new SoundBankStoreError(
        'quota-exceeded',
        `The ${byteLength}-byte SoundFont does not fit in available browser storage.`,
      )
    }
  }

  private metadataFor(
    input: SoundBankImport,
    digest: string,
    bytes: ArrayBuffer,
    importedAt = this.now(),
  ): StoredSoundBankMetadata {
    return {
      digest,
      name: input.name,
      format: input.format,
      byteLength: bytes.byteLength,
      license: input.license,
      attribution: input.attribution ?? '',
      importedAt,
    }
  }

  private async metadata(digest: string) {
    const database = await this.database()
    const transaction = database.transaction(BANK_METADATA_STORE, 'readonly')
    const metadata = await requestResult(
      transaction.objectStore(BANK_METADATA_STORE).get(digest),
      'read SoundFont metadata',
    )
    await transactionComplete(transaction, 'read SoundFont metadata')
    if (metadata === undefined) return undefined
    if (!validMetadata(metadata)) {
      throw new SoundBankStoreError(
        'invalid-record',
        `Stored SoundFont metadata ${digest} is invalid.`,
      )
    }
    return metadata
  }

  private async put(metadata: StoredSoundBankMetadata, bytes: ArrayBuffer) {
    const database = await this.database()
    const transaction = database.transaction(
      [BANK_METADATA_STORE, BANK_BYTES_STORE],
      'readwrite',
    )
    transaction.objectStore(BANK_METADATA_STORE).put(metadata)
    transaction.objectStore(BANK_BYTES_STORE).put({
      digest: metadata.digest,
      bytes: cloneBytes(bytes),
    })
    await transactionComplete(transaction, 'store a SoundFont bank')
  }
}
