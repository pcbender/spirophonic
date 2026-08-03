import { describe, expect, it } from 'vitest'

import { defaultModel } from '../core/defaultModel'
import { renderVoices } from '../core/voices'
import { exportStrudelSnippet } from './strudelExport'

const enableOnly = (ids: Array<string>) => ({
  ...defaultModel,
  voices: defaultModel.voices.map((voice) => ({
    ...voice,
    enabled: ids.includes(voice.id),
  })),
})

const countTokens = (snippet: string, token: string) =>
  (snippet.match(/"([^"]*)"/g) ?? [])
    .flatMap((quoted) => quoted.slice(1, -1).split(' '))
    .filter((entry) => entry === token).length

describe('exportStrudelSnippet', () => {
  it('sets the cycle rate', () => {
    expect(exportStrudelSnippet(defaultModel)).toContain('setcps(0.2)')
  })

  it('no longer writes raw frequencies', () => {
    expect(exportStrudelSnippet(defaultModel)).not.toContain('.freq(')
  })

  it('stacks one part per enabled voice', () => {
    const snippet = exportStrudelSnippet(defaultModel)

    expect(snippet).toContain('stack(')
    expect(snippet).toContain('// Kick')
    expect(snippet).toContain('// Closed hat')
    expect(snippet).toContain('// Snare')
    expect(snippet).not.toContain('// Pad')
  })

  it('writes a single voice without a stack', () => {
    const snippet = exportStrudelSnippet(enableOnly(['kick-rose']))

    expect(snippet).not.toContain('stack(')
    expect(snippet).toContain('s("')
  })

  it('writes one step per onset', () => {
    const model = enableOnly(['snare-lissajous-y'])
    const expected = renderVoices(model)[0].notes.length

    expect(countTokens(exportStrudelSnippet(model), 'sd')).toBe(expected)
  })

  it('keeps a three against two polyrhythm in one snippet', () => {
    const snippet = exportStrudelSnippet(
      enableOnly(['hat-lissajous-x', 'snare-lissajous-y']),
    )

    expect(countTokens(snippet, 'hh')).toBe(3)
    expect(countTokens(snippet, 'sd')).toBe(2)
  })

  it('names GM drums as Strudel samples', () => {
    expect(countTokens(exportStrudelSnippet(enableOnly(['kick-rose'])), 'bd')).toBe(5)
  })

  it('writes a pitched voice as scale degrees', () => {
    const snippet = exportStrudelSnippet(enableOnly(['pad-harmonograph']))

    expect(snippet).toContain('n("')
    expect(snippet).toContain('.scale("C3:minPent")')
    expect(snippet).toContain('gm_pad_warm')
  })

  it('aligns the gain pattern with the sound pattern', () => {
    const snippet = exportStrudelSnippet(enableOnly(['kick-rose']))
    const patterns = (snippet.match(/"([^"]*)"/g) ?? []).map((quoted) =>
      quoted.slice(1, -1).split(' '),
    )
    const [sounds, gains] = patterns

    expect(sounds).toHaveLength(gains.length)

    sounds.forEach((token, index) => {
      expect(token === '~').toBe(gains[index] === '~')
    })
  })

  it('falls back to silence with nothing enabled', () => {
    expect(exportStrudelSnippet(enableOnly([]))).toContain('silence')
  })

  it('produces identical output for identical input', () => {
    expect(exportStrudelSnippet(defaultModel)).toBe(
      exportStrudelSnippet(defaultModel),
    )
  })
})

describe('snippet syntax', () => {
  it('separates stacked parts with a comma the comment cannot swallow', () => {
    const lines = exportStrudelSnippet(defaultModel).split('\n')
    const commented = lines.filter((line) => line.trim().startsWith('//'))

    expect(commented.length).toBeGreaterThan(0)

    for (const line of commented) {
      expect(line.trimEnd().endsWith(',')).toBe(false)
    }
  })

  it('balances its parentheses and quotes', () => {
    const snippet = exportStrudelSnippet(defaultModel)
    const opens = (snippet.match(/\(/g) ?? []).length
    const closes = (snippet.match(/\)/g) ?? []).length
    const quotes = (snippet.match(/"/g) ?? []).length

    expect(opens).toBe(closes)
    expect(quotes % 2).toBe(0)
  })

  it('parses as JavaScript', () => {
    // Not executed: the Strudel functions do not exist here. Parsing alone
    // catches the separator and quoting mistakes that make a paste fail.
    const snippet = exportStrudelSnippet(defaultModel)

    expect(() => new Function(`"use strict"; if (false) { ${snippet} }`)).not.toThrow()
  })
})
