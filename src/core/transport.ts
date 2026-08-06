import type {
  CycleRate,
  LoopSpec,
  MeterSpec,
  TransportSpec,
} from './composition'

export type PerformanceRequest = {
  startSeconds: number
  durationSeconds: number
  sampleRateHz: number
  seed?: string
}

export type PerformanceRequestIssue = {
  path: string
  message: string
}

export type PerformanceRequestValidationResult =
  | { ok: true; request: PerformanceRequest }
  | { ok: false; issues: Array<PerformanceRequestIssue> }

export type TransportAddress = {
  seconds: number
  absoluteBeat: number
  barIndex: number
  beatInBar: number
  barPhase: number
}

export const transportLimits = {
  tempoBpm: { min: 20, max: 400, default: 120 },
  beatsPerBar: { min: 1, max: 32, default: 4 },
  loopLengthBeats: { max: 100_000, default: 4 },
  cycleRateCycles: { max: 1_000, default: 1 },
  cycleRateBeats: { max: 100_000, default: 4 },
} as const

export const performanceRequestLimits = {
  startSeconds: { min: 0, max: 31_536_000, default: 0 },
  durationSeconds: { min: 0.001, max: 86_400, default: 8 },
  sampleRateHz: { min: 1, max: 1_000, default: 120 },
} as const

const beatUnits: ReadonlyArray<MeterSpec['beatUnit']> = [2, 4, 8, 16]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const clampFinite = (
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
) => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(maximum, Math.max(minimum, value))
}

const positiveFiniteOr = (value: number, maximum: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(maximum, value)
}

const requireFinite = (value: number, name: string) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`)
  }

  return value
}

const withoutNegativeZero = (value: number) => (Object.is(value, -0) ? 0 : value)

const closestBeatUnit = (value: number): MeterSpec['beatUnit'] => {
  if (!Number.isFinite(value)) return 4

  return beatUnits.reduce((closest, candidate) =>
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest,
  )
}

/**
 * Produces the safe constant-tempo Transport used by all time calculations.
 * Strict Composition validation remains the save/load boundary; normalization
 * protects live numeric controls from transient out-of-range values.
 */
export const normalizeTransport = (transport: TransportSpec): TransportSpec => ({
  tempoBpm: clampFinite(
    transport.tempoBpm,
    transportLimits.tempoBpm.min,
    transportLimits.tempoBpm.max,
    transportLimits.tempoBpm.default,
  ),
  meter: {
    beatsPerBar: Math.round(
      clampFinite(
        transport.meter.beatsPerBar,
        transportLimits.beatsPerBar.min,
        transportLimits.beatsPerBar.max,
        transportLimits.beatsPerBar.default,
      ),
    ),
    beatUnit: closestBeatUnit(transport.meter.beatUnit),
  },
  loop: {
    startBeat: Math.max(
      0,
      Number.isFinite(transport.loop.startBeat) ? transport.loop.startBeat : 0,
    ),
    lengthBeats: positiveFiniteOr(
      transport.loop.lengthBeats,
      transportLimits.loopLengthBeats.max,
      transportLimits.loopLengthBeats.default,
    ),
  },
})

export const normalizeCycleRate = (rate: CycleRate): CycleRate => ({
  cycles: positiveFiniteOr(
    rate.cycles,
    transportLimits.cycleRateCycles.max,
    transportLimits.cycleRateCycles.default,
  ),
  beats: positiveFiniteOr(
    rate.beats,
    transportLimits.cycleRateBeats.max,
    transportLimits.cycleRateBeats.default,
  ),
})

export const normalizePerformanceRequest = (
  request: PerformanceRequest,
): PerformanceRequest => {
  const normalized = {
    startSeconds: clampFinite(
      request.startSeconds,
      performanceRequestLimits.startSeconds.min,
      performanceRequestLimits.startSeconds.max,
      performanceRequestLimits.startSeconds.default,
    ),
    durationSeconds: clampFinite(
      request.durationSeconds,
      performanceRequestLimits.durationSeconds.min,
      performanceRequestLimits.durationSeconds.max,
      performanceRequestLimits.durationSeconds.default,
    ),
    sampleRateHz: clampFinite(
      request.sampleRateHz,
      performanceRequestLimits.sampleRateHz.min,
      performanceRequestLimits.sampleRateHz.max,
      performanceRequestLimits.sampleRateHz.default,
    ),
  }

  return request.seed === undefined
    ? normalized
    : { ...normalized, seed: request.seed }
}

/** Strict compiler boundary; normalization is reserved for live controls. */
export const validatePerformanceRequest = (
  value: unknown,
): PerformanceRequestValidationResult => {
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: '$', message: 'Expected a PerformanceRequest object.' }],
    }
  }

  const issues: Array<PerformanceRequestIssue> = []
  const knownKeys = new Set([
    'startSeconds',
    'durationSeconds',
    'sampleRateHz',
    'seed',
  ])

  for (const key of Object.keys(value).sort()) {
    if (!knownKeys.has(key)) {
      issues.push({ path: `$.${key}`, message: 'Unknown property.' })
    }
  }

  const validateNumber = (
    key: 'startSeconds' | 'durationSeconds' | 'sampleRateHz',
    minimum: number,
    maximum: number,
  ) => {
    const candidate = value[key]
    const path = `$.${key}`

    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
      issues.push({ path, message: 'Expected a finite number.' })
    } else if (candidate < minimum || candidate > maximum) {
      issues.push({
        path,
        message: `Expected a value from ${minimum} through ${maximum}.`,
      })
    }
  }

  validateNumber(
    'startSeconds',
    performanceRequestLimits.startSeconds.min,
    performanceRequestLimits.startSeconds.max,
  )
  validateNumber(
    'durationSeconds',
    performanceRequestLimits.durationSeconds.min,
    performanceRequestLimits.durationSeconds.max,
  )
  validateNumber(
    'sampleRateHz',
    performanceRequestLimits.sampleRateHz.min,
    performanceRequestLimits.sampleRateHz.max,
  )

  if (value.seed !== undefined && typeof value.seed !== 'string') {
    issues.push({ path: '$.seed', message: 'Expected a string.' })
  }

  return issues.length === 0
    ? { ok: true, request: value as PerformanceRequest }
    : { ok: false, issues }
}

export const secondsPerBeat = (tempoBpm: number) =>
  60 /
  clampFinite(
    tempoBpm,
    transportLimits.tempoBpm.min,
    transportLimits.tempoBpm.max,
    transportLimits.tempoBpm.default,
  )

export const secondsToBeats = (seconds: number, tempoBpm: number) =>
  requireFinite(seconds, 'seconds') / secondsPerBeat(tempoBpm)

export const beatsToSeconds = (beats: number, tempoBpm: number) =>
  requireFinite(beats, 'beats') * secondsPerBeat(tempoBpm)

export const beatsToBars = (beats: number, meter: MeterSpec) => {
  const normalizedMeter = normalizeTransport({
    tempoBpm: transportLimits.tempoBpm.default,
    meter,
    loop: { startBeat: 0, lengthBeats: transportLimits.loopLengthBeats.default },
  }).meter

  return requireFinite(beats, 'beats') / normalizedMeter.beatsPerBar
}

export const barsToBeats = (bars: number, meter: MeterSpec) => {
  const normalizedMeter = normalizeTransport({
    tempoBpm: transportLimits.tempoBpm.default,
    meter,
    loop: { startBeat: 0, lengthBeats: transportLimits.loopLengthBeats.default },
  }).meter

  return requireFinite(bars, 'bars') * normalizedMeter.beatsPerBar
}

/** Wraps an unbounded cycle value into [0, 1). */
export const wrapCyclePhase = (phase: number) => {
  const finitePhase = requireFinite(phase, 'phase')
  return withoutNegativeZero(finitePhase - Math.floor(finitePhase))
}

export const barPhaseAtBeat = (absoluteBeat: number, meter: MeterSpec) =>
  wrapCyclePhase(beatsToBars(absoluteBeat, meter))

/**
 * Returns a zero-based bar address. beatInBar may be fractional; barPhase is
 * normalized to [0, 1).
 */
export const transportAddressAtSeconds = (
  transport: TransportSpec,
  seconds: number,
): TransportAddress => {
  const normalized = normalizeTransport(transport)
  const finiteSeconds = requireFinite(seconds, 'seconds')
  const absoluteBeat = secondsToBeats(finiteSeconds, normalized.tempoBpm)
  const barPosition = beatsToBars(absoluteBeat, normalized.meter)
  const barIndex = Math.floor(barPosition)
  const beatInBar =
    absoluteBeat - barIndex * normalized.meter.beatsPerBar

  return {
    seconds: finiteSeconds,
    absoluteBeat: withoutNegativeZero(absoluteBeat),
    barIndex,
    beatInBar: withoutNegativeZero(beatInBar),
    barPhase: wrapCyclePhase(barPosition),
  }
}

export const wheelPhaseAtBeat = (
  rate: CycleRate,
  absoluteBeat: number,
  initialPhase = 0,
  direction: 'forward' | 'reverse' = 'forward',
) => {
  const normalizedRate = normalizeCycleRate(rate)
  const beat = requireFinite(absoluteBeat, 'absoluteBeat')
  const phase = requireFinite(initialPhase, 'initialPhase')
  const sign = direction === 'reverse' ? -1 : 1

  return wrapCyclePhase(
    phase + sign * beat * (normalizedRate.cycles / normalizedRate.beats),
  )
}

export const wheelPhaseAtSeconds = (
  rate: CycleRate,
  transport: TransportSpec,
  seconds: number,
  initialPhase = 0,
  direction: 'forward' | 'reverse' = 'forward',
) =>
  wheelPhaseAtBeat(
    rate,
    transportAddressAtSeconds(transport, seconds).absoluteBeat,
    initialPhase,
    direction,
  )

export const loopPhaseAtBeat = (absoluteBeat: number, loop: LoopSpec) => {
  const normalizedLoop = normalizeTransport({
    tempoBpm: transportLimits.tempoBpm.default,
    meter: { beatsPerBar: 4, beatUnit: 4 },
    loop,
  }).loop

  return wrapCyclePhase(
    (requireFinite(absoluteBeat, 'absoluteBeat') - normalizedLoop.startBeat) /
      normalizedLoop.lengthBeats,
  )
}

/**
 * Iterates an inclusive compiler grid without repeated floating-point addition.
 * Every interior time is calculated from its integer interval index. The final
 * request boundary is emitted directly, including when it is off-grid.
 */
export function* iterateTimeGrid(
  input: PerformanceRequest,
): Generator<number, void, undefined> {
  const validation = validatePerformanceRequest(input)

  if (!validation.ok) {
    const detail = validation.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join(' ')
    throw new RangeError(`Invalid PerformanceRequest. ${detail}`)
  }

  const request = validation.request
  const endSeconds = request.startSeconds + request.durationSeconds
  const intervalCount = Math.ceil(
    request.durationSeconds * request.sampleRateHz,
  )

  yield request.startSeconds

  for (let index = 1; index < intervalCount; index += 1) {
    const seconds = request.startSeconds + index / request.sampleRateHz

    if (seconds > request.startSeconds && seconds < endSeconds) {
      yield seconds
    }
  }

  yield endSeconds
}
