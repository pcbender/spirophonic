import { describe, expect, it } from 'vitest'
import { defaultModel } from '../core/defaultModel'
import { generateSpiroPoints } from '../core/spirograph'
import { exportStrudelSnippet } from './strudelExport'

describe('Strudel export', () => {
  it('exports model-derived Strudel-style text without runtime dependency', () => {
    const snippet = exportStrudelSnippet(
      defaultModel,
      generateSpiroPoints(defaultModel),
    )

    expect(snippet).toContain('setcps(')
    expect(snippet).toContain(`s("${defaultModel.sound.waveform}")`)
    expect(snippet).toContain('.freq("<')
  })
})

