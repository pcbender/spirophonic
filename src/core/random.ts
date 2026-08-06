/**
 * Versioned deterministic randomness.
 *
 * Bump `randomVersion` for any change that alters the numbers this module
 * produces. A Recording carries the version it was made under, so a later
 * engine can tell that it would reroll rather than reproduce.
 */
export const randomVersion = 1

const FNV_OFFSET = 2_166_136_261
const FNV_PRIME = 16_777_619

/**
 * FNV-1a, 32-bit. Chosen because it is small, well documented, and stable
 * across engines: the same string always yields the same integer, which is
 * what makes a seed portable between sessions and machines.
 */
export const hashString = (value: string): number => {
  let hash = FNV_OFFSET
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

/** One round of mulberry32. Pure: state in, value and next state out. */
const mulberry32 = (state: number) => {
  const next = (state + 0x6d2b79f5) >>> 0
  let value = next
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return {
    value: ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296,
    state: next,
  }
}

/** Joins scope parts unambiguously, so a/b and ab cannot collide. */
export const scopeKey = (...parts: ReadonlyArray<string | number>) =>
  parts.map((part) => encodeURIComponent(String(part))).join('')

/**
 * A value in [0, 1) derived from the seed and an explicit scope.
 *
 * This is a pure hash, not a draw from a running stream, and that is the whole
 * point. A sequential generator gives every consumer the *next* number, so
 * adding one consumer shifts every value after it. Deriving each value from its
 * own identity means an unrelated Part, event, or object can appear without
 * disturbing anything else — which is exactly what MG-17 requires.
 */
export const unitValue = (
  seed: string,
  ...scope: ReadonlyArray<string | number>
): number => mulberry32(hashString(`${seed}${scopeKey(...scope)}`)).value

/** A value in [-1, 1), for symmetric bounded deltas. */
export const signedUnitValue = (
  seed: string,
  ...scope: ReadonlyArray<string | number>
): number => unitValue(seed, ...scope) * 2 - 1

/** An integer in [0, count), derived the same way. */
export const indexValue = (
  count: number,
  seed: string,
  ...scope: ReadonlyArray<string | number>
): number => {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError('count must be a positive integer.')
  }
  return Math.min(count - 1, Math.floor(unitValue(seed, ...scope) * count))
}

/**
 * A sequential generator, for the rare case where a genuine stream is wanted.
 * Prefer `unitValue`: a stream reintroduces exactly the ordering dependence
 * that scoped derivation exists to avoid.
 */
export const createSequence = (seed: string) => {
  let state = hashString(seed)
  return () => {
    const step = mulberry32(state)
    state = step.state
    return step.value
  }
}
