import type { PerformanceDiagnostic } from '../core/performance'

/**
 * Turns a compiler diagnostic into something a composer can act on.
 *
 * The compiler reports faults in the vocabulary of the document format —
 * a JSON path, a severity, a code — which is exactly right for a compiler and
 * useless at the moment someone is wondering why the sound stopped. These two
 * translate the parts of a diagnostic that a person has to read.
 */

const sections: Record<string, string> = {
  wheels: 'Wheel',
  heads: 'Head',
  fields: 'Field',
  boundaries: 'Boundary',
  parts: 'Part',
  relations: 'Relation',
  tuningContexts: 'Tuning',
  instruments: 'Instrument',
  soundBanks: 'Sound bank',
}

/**
 * Where a diagnostic points, named the way the panels name it.
 *
 * `$.tuningContexts[1].id` says exactly where the fault is, in a notation
 * nobody editing music has a reason to read. This keeps the precision and
 * drops the punctuation, and says nothing at all rather than guess when the
 * path names no object — the Composition's own fields have no panel to point
 * at.
 */
export const diagnosticLocation = (path: string) => {
  const steps: Array<string> = []

  for (const match of path
    .replace(/^\$\.?/, '')
    .matchAll(/([A-Za-z]+)(?:\[(\d+)\])?/g)) {
    const [, key, index] = match
    const label = sections[key]
    if (!label) continue
    steps.push(index === undefined ? label : `${label} ${Number(index) + 1}`)
  }
  return steps.join(' › ')
}

export type DiagnosticRow = Readonly<{
  key: string
  severity: PerformanceDiagnostic['severity']
  /** Already resolved to a name; '' when the diagnostic points nowhere. */
  where: string
  message: string
  /** How many diagnostics collapsed into this row. */
  count: number
}>

/**
 * Collapses a repeated fault into one line that says how often it happened.
 *
 * Mapping errors are raised per Encounter, so one Part with an unusable pitch
 * mapping reports the identical sentence once for every crossing it made —
 * fifteen lines of the same text on the reference Composition, which buries
 * every other diagnostic under it. The count is worth keeping: it is the
 * difference between one bad Encounter and a Part that never plays.
 */
export const groupDiagnostics = (
  diagnostics: ReadonlyArray<PerformanceDiagnostic>,
  locate: (diagnostic: PerformanceDiagnostic) => string,
): ReadonlyArray<DiagnosticRow> => {
  const rows = new Map<string, DiagnosticRow>()

  for (const diagnostic of diagnostics) {
    const where = locate(diagnostic)
    const key = `${diagnostic.severity}|${diagnostic.code}|${where}|${diagnostic.message}`
    const seen = rows.get(key)
    if (seen) {
      rows.set(key, { ...seen, count: seen.count + 1 })
      continue
    }
    rows.set(key, {
      key,
      severity: diagnostic.severity,
      where,
      message: diagnostic.message,
      count: 1,
    })
  }

  return [...rows.values()]
}

/**
 * What these errors cost, which is not the same thing for all of them.
 *
 * A Composition or request that fails validation never reaches the compiler:
 * it returns an empty performance, so every Part in the piece goes silent at
 * once. The rest are per-Encounter faults — a Part loses the notes it could not
 * map, and everything else still plays. Saying "no notes at all" for both would
 * be false half the time, and the half where it is true is precisely the half
 * that reads as broken audio rather than as a Composition that will not
 * compile.
 */
export const errorConsequence = (
  errors: ReadonlyArray<PerformanceDiagnostic>,
) =>
  errors.some(
    (error) =>
      error.code === 'invalid-composition' ||
      error.code === 'invalid-performance-request',
  )
    ? 'this Composition compiles to no notes at all until they are fixed.'
    : 'the Encounters they name produce no note; the rest of the Composition still plays.'
