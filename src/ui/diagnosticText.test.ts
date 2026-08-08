import { describe, expect, it } from 'vitest'

import type { PerformanceDiagnostic } from '../core/performance'
import {
  diagnosticLocation,
  errorConsequence,
  groupDiagnostics,
} from './diagnosticText'

const error = (
  code: PerformanceDiagnostic['code'],
): PerformanceDiagnostic => ({ severity: 'error', code, message: 'no' })

describe('diagnosticLocation', () => {
  /*
   * `$.tuningContexts[1].id` is exactly where the fault is, in a notation
   * nobody editing music has a reason to read.
   */
  it('names the object a diagnostic points at, not its JSON path', () => {
    expect(diagnosticLocation('$.tuningContexts[1].id')).toBe('Tuning 2')
    expect(diagnosticLocation('$.wheels[0].heads[2].phaseOffset')).toBe(
      'Wheel 1 › Head 3',
    )
    expect(diagnosticLocation('$.fields[0].boundaries[0].radius')).toBe(
      'Field 1 › Boundary 1',
    )
    expect(diagnosticLocation('$.parts[3].pitch.kind')).toBe('Part 4')
  })

  it('says nothing rather than guess when the path names no object', () => {
    // The Composition's own fields have no panel to point at.
    expect(diagnosticLocation('$.name')).toBe('')
    expect(diagnosticLocation('$.transport.tempoBpm')).toBe('')
    expect(diagnosticLocation('$')).toBe('')
  })
})

describe('groupDiagnostics', () => {
  const mapping = (partId: string): PerformanceDiagnostic => ({
    severity: 'error',
    code: 'mapping-error',
    message: 'Spirogram radii describe a rolling relationship.',
    partId,
  })

  /*
   * One Part with an unusable pitch mapping raises the identical sentence once
   * per Encounter — fifteen lines of the same text on the reference
   * Composition, burying every other diagnostic under it.
   */
  it('collapses a fault repeated per Encounter into one counted row', () => {
    const rows = groupDiagnostics(
      [mapping('part-1'), mapping('part-1'), mapping('part-1')],
      (diagnostic) => diagnostic.partId ?? '',
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(3)
    expect(rows[0].where).toBe('part-1')
  })

  it('keeps the same message apart when it comes from different Parts', () => {
    const rows = groupDiagnostics(
      [mapping('part-1'), mapping('part-2'), mapping('part-1')],
      (diagnostic) => diagnostic.partId ?? '',
    )

    expect(rows.map((row) => [row.where, row.count])).toEqual([
      ['part-1', 2],
      ['part-2', 1],
    ])
  })

  it('reports distinct faults separately, in the order the compiler found them', () => {
    const rows = groupDiagnostics(
      [error('invalid-composition'), mapping('part-1'), error('encounter-scan')],
      () => '',
    )

    expect(rows.map((row) => row.count)).toEqual([1, 1, 1])
    expect(rows[0].message).toBe('no')
  })
})

describe('errorConsequence', () => {
  /*
   * The distinction is the whole point. A validation failure never reaches the
   * compiler and costs every note in the piece; a mapping failure costs one
   * Part the Encounters it could not map. Reporting both as total silence
   * would teach the reader to disbelieve the line in the case where it is true.
   */
  it('reports total silence only when the Composition never compiled', () => {
    expect(errorConsequence([error('invalid-composition')])).toMatch(
      /no notes at all/,
    )
    expect(errorConsequence([error('invalid-performance-request')])).toMatch(
      /no notes at all/,
    )
  })

  it('reports a partial loss when the piece still plays', () => {
    expect(errorConsequence([error('mapping-error')])).toMatch(
      /the rest of the Composition still plays/,
    )
    expect(errorConsequence([error('invalid-musical-range')])).toMatch(
      /the rest of the Composition still plays/,
    )
  })

  it('takes the worse of the two when both are present', () => {
    expect(
      errorConsequence([error('mapping-error'), error('invalid-composition')]),
    ).toMatch(/no notes at all/)
  })
})
