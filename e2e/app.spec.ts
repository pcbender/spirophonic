import { expect, test, type Page } from '@playwright/test'

/**
 * These checks cover the acceptance criteria that jsdom cannot reach: real
 * layout, real Canvas painting, and a real Web Audio clock. Deterministic core
 * and scheduler behaviour stays in the Vitest suite.
 */

const pageErrors: Array<string> = []

test.beforeEach(async ({ page }) => {
  pageErrors.length = 0
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Spirophonic' }),
  ).toBeVisible()
})

test.afterEach(() => {
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([])
})

/**
 * Non-blank pixel count, so we can tell drawing from an empty canvas. Returns
 * -1 until the renderer has sized the backing store, because a default 300x150
 * canvas is not yet the scene and would read as a spurious zero.
 */
const canvasInk = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return -1
    if (canvas.width <= 300 || canvas.height <= 150) return -1
    const context = canvas.getContext('2d')
    if (!context) return -1
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    let lit = 0
    // The background is a flat dark fill; count anything brighter.
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 40 || data[index + 1] > 40 || data[index + 2] > 40) {
        lit += 1
      }
    }
    return lit
  })

// Loading the example replaces the workspace, so it is confirmed rather than
// applied on the first click.
const loadReference = async (page: Page) => {
  await page.getByRole('button', { name: 'Load example' }).click()
  await page.getByRole('button', { name: 'Discard and load example' }).click()
  // Scoped to the tree: a Wheel's name also labels its checkbox in every Part's
  // filter, so an unscoped query matches once per Part as well.
  await expect(
    page.getByRole('region', { name: 'Composition tree' }).getByText('Wheel 4'),
  ).toBeVisible()
}

test('renders the composition canvas with visible geometry', async ({ page }) => {
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  const box = await canvas.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(200)
  expect(box?.height ?? 0).toBeGreaterThan(200)
  // The scene paints on an effect after mount, so poll rather than read once.
  await expect
    .poll(async () => canvasInk(page), { timeout: 15_000 })
    .toBeGreaterThan(500)
})

test('no panel overflows its rail horizontally', async ({ page }) => {
  await loadReference(page)

  // The page itself must never scroll sideways.
  const bodyOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(bodyOverflow).toBeLessThanOrEqual(1)

  // Every panel's content must fit inside the panel box. This is the check
  // that would have caught the MG-13 Fields button overflow.
  const overflows = await page.evaluate(() => {
    const bad: Array<{ label: string; overflow: number }> = []
    // `.import-export` is included because MG-20 added four controls to it.
    for (const panel of document.querySelectorAll(
      '.control-panel, .import-export',
    )) {
      const overflow = panel.scrollWidth - panel.clientWidth
      if (overflow > 1) {
        bad.push({
          label: panel.getAttribute('aria-label') ?? panel.className,
          overflow,
        })
      }
    }
    return bad
  })
  expect(overflows).toEqual([])
})

test('every Field kind draws an overlay on the canvas', async ({ page }) => {
  const fields = page.getByRole('region', { name: 'Fields' })
  const before = await canvasInk(page)

  // MG-13 families, added on top of the default rings and spokes.
  for (const name of ['Add ellipses', 'Add bands', 'Add grid', 'Add spiral']) {
    await fields.getByRole('button', { name }).click()
  }

  await expect
    .poll(async () => canvasInk(page), { timeout: 15_000 })
    .toBeGreaterThan(before)
})

test('a rotating Field animates while the Head path is unchanged', async ({
  page,
}) => {
  const fields = page.getByRole('region', { name: 'Fields' })
  await fields.getByRole('button', { name: 'Add ellipses' }).click()

  const motion = fields.getByLabel(/^Motion field-ellipses/)
  await motion.selectOption('rotating')
  await expect(fields.getByLabel(/^Turns per second/)).toBeVisible()

  // Seek across the window and confirm the drawing actually changes.
  const slider = page.getByRole('slider', { name: 'Transport position' })
  await slider.fill('0')
  const atStart = await canvasInk(page)
  await slider.fill('1.4')
  await expect.poll(async () => canvasInk(page)).not.toBe(atStart)
})

test('the reference Composition plays and advances the Transport', async ({
  page,
}) => {
  await loadReference(page)

  await page.getByRole('button', { name: 'Play' }).click()
  // Position is driven by the audio clock, so this proves Web Audio started.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const slider = document.querySelector<HTMLInputElement>(
            'input[type="range"]',
          )
          return Number(slider?.value ?? 0)
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.2)

  await page.getByRole('button', { name: 'Pause' }).click()
})

test('a Relation and Control Part author cleanly', async ({ page }) => {
  const parts = page.getByRole('region', { name: 'Parts' })
  await parts.getByRole('button', { name: 'Add Relation' }).click()
  await parts.getByRole('button', { name: 'Add Control' }).click()

  await expect(parts.getByLabel(/^Relation kind/)).toBeVisible()
  await expect(parts.getByLabel(/^Control source/)).toBeVisible()

  await parts.getByLabel(/^Relation kind/).selectOption('opposition')
  await parts.getByLabel(/^Control source/).selectOption('approach-rate')

  // Authoring must not put the Composition into a compile-error state.
  const diagnostics = page.getByRole('region', {
    name: 'Compile diagnostics',
  })
  await expect(diagnostics).not.toContainText('error')
})

test('Trace observation authoring stays free of errors', async ({ page }) => {
  const heads = page.getByRole('region', { name: 'Head controls' })
  await heads.getByLabel(/^Observe trace/).check()

  // Settings appear only once observation is on.
  await expect(heads.getByLabel(/^Trace retention/)).toBeVisible()
  await heads.getByLabel(/^Trace retention/).selectOption('full')
  await heads.getByLabel(/^Allow self crossing/).check()

  const diagnostics = page.getByRole('region', { name: 'Compile diagnostics' })
  await expect(diagnostics).not.toContainText('error')

  // Observation must not blank the canvas.
  await expect
    .poll(async () => canvasInk(page), { timeout: 15_000 })
    .toBeGreaterThan(500)
})

/**
 * MG-20 renders audio through a real OfflineAudioContext. jsdom has no Web
 * Audio at all, so whether a repeated render actually reproduces can only be
 * settled here, in the browser that will do the rendering.
 */
test('a native offline render reproduces byte-for-byte', async ({ page }) => {
  const comparison = await page.evaluate(async () => {
    // Two independent contexts, the same schedule in each: this is exactly
    // what pressing Export WAV twice does.
    const renderOnce = async () => {
      const context = new OfflineAudioContext(2, 44_100 * 2, 44_100)
      const master = context.createGain()
      master.gain.value = 0.3
      master.connect(context.destination)

      for (let index = 0; index < 8; index += 1) {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const at = index * 0.2
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(220 * (1 + index / 8), at)
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.linearRampToValueAtTime(0.8, at + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
        oscillator.connect(gain)
        gain.connect(master)
        oscillator.start(at)
        oscillator.stop(at + 0.2)
      }

      const buffer = await context.startRendering()
      return [
        Float32Array.from(buffer.getChannelData(0)),
        Float32Array.from(buffer.getChannelData(1)),
      ]
    }

    const first = await renderOnce()
    const second = await renderOnce()

    let largest = 0
    let nonSilent = 0
    for (let channel = 0; channel < first.length; channel += 1) {
      for (let index = 0; index < first[channel].length; index += 1) {
        const difference = Math.abs(first[channel][index] - second[channel][index])
        if (difference > largest) largest = difference
        if (Math.abs(first[channel][index]) > 1e-4) nonSilent += 1
      }
    }
    return { largest, nonSilent }
  })

  // Something was actually rendered, so equality is not equality of silence.
  expect(comparison.nonSilent).toBeGreaterThan(1000)
  expect(comparison.largest).toBe(0)
})

test('the offline render controls are reachable and report their result', async ({
  page,
}) => {
  const io = page.getByRole('region', { name: 'Import and export' })
  await expect(io.getByRole('button', { name: 'Export WAV' })).toBeVisible()
  await expect(io.getByRole('button', { name: 'Export bundle' })).toBeVisible()
  await expect(io.getByRole('button', { name: 'Import bundle' })).toBeVisible()

  // A manifest-only bundle export must say what it did without a vault entry.
  await io.getByRole('button', { name: 'Export bundle' }).click()
  await confirmBundleExport(page)
  await expect(io.locator('output')).toContainText(/Bundled|manifest/)
})

/**
 * The embed choice used to sit in the top bar, read on every glance for a
 * decision made only at export. It now lives in the dialog Export bundle
 * opens, so exporting is two steps and the confirm has to be scoped: the
 * dialog's button carries the same name as the one that opened it.
 */
const bundleDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Export bundle' })

const confirmBundleExport = async (page: Page) => {
  const dialog = bundleDialog(page)
  await expect(dialog).toBeVisible()
  // Exact: the Close button is labelled "Close export bundle", which a
  // substring match on the dialog's own name also picks up.
  await dialog
    .getByRole('button', { name: 'Export bundle', exact: true })
    .click()
  await expect(dialog).toBeHidden()
}

test('the embed choice lives in the Export bundle dialog, not the top bar', async ({
  page,
}) => {
  const embed = page.getByLabel('Embed sound banks in bundle')
  const io = page.getByRole('region', { name: 'Import and export' })

  // Not parked in the header where it was being read for no reason.
  await expect(embed).toBeHidden()

  await io.getByRole('button', { name: 'Export bundle' }).click()
  const dialog = bundleDialog(page)
  await expect(dialog).toBeVisible()
  await expect(embed).toBeVisible()
  await expect(embed).not.toBeChecked()

  // The choice survives being made, and the dialog says what it means.
  await embed.check()
  await expect(dialog).toContainText('opens on any machine')

  // Cancelling leaves the choice set but exports nothing.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await io.getByRole('button', { name: 'Export bundle' }).click()
  await expect(embed).toBeChecked()

  const download = page.waitForEvent('download')
  await confirmBundleExport(page)
  expect((await download).suggestedFilename()).toMatch(/\.spirophonic$/)
})

/**
 * MG-21 platform checks. These confirm the browser APIs the instrument depends
 * on are present and behave, in both supported engines. They are deliberately
 * about the platform contract rather than about musical behaviour, which the
 * Vitest suite owns.
 */
test('the platform APIs the instrument depends on are available', async ({
  page,
}) => {
  const support = await page.evaluate(() => ({
    audioWorklet: typeof AudioWorklet !== 'undefined',
    audioContextWorklet:
      typeof AudioContext !== 'undefined' &&
      'audioWorklet' in AudioContext.prototype,
    offlineAudioContext: typeof OfflineAudioContext !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
    subtleCrypto: typeof crypto !== 'undefined' && !!crypto.subtle,
    structuredClone: typeof structuredClone === 'function',
  }))

  expect(support).toEqual({
    audioWorklet: true,
    audioContextWorklet: true,
    offlineAudioContext: true,
    indexedDB: true,
    subtleCrypto: true,
    structuredClone: true,
  })
})

test('IndexedDB stores and returns bank bytes intact', async ({ page }) => {
  // The vault is where sound banks live. If a browser's IndexedDB mangles
  // ArrayBuffers, every SoundFont Instrument fails in a way that looks like a
  // bad bank, so it is worth confirming directly.
  const roundTrip = await page.evaluate(async () => {
    const open = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('spirophonic-e2e-probe', 1)
        request.onupgradeneeded = () =>
          request.result.createObjectStore('bytes', { keyPath: 'id' })
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

    const database = await open()
    const source = new Uint8Array([0, 1, 2, 253, 254, 255])
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('bytes', 'readwrite')
      transaction.objectStore('bytes').put({ id: 'a', bytes: source.buffer })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })

    const stored = await new Promise<{ bytes: ArrayBuffer }>((resolve, reject) => {
      const request = database
        .transaction('bytes', 'readonly')
        .objectStore('bytes')
        .get('a')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    database.close()
    indexedDB.deleteDatabase('spirophonic-e2e-probe')
    return Array.from(new Uint8Array(stored.bytes))
  })

  expect(roundTrip).toEqual([0, 1, 2, 253, 254, 255])
})

test('an edited Composition survives a reload', async ({ browser }) => {
  // A dedicated context: the shared `beforeEach` installs an init script that
  // clears localStorage on *every* navigation, which would wipe the workspace
  // during the reload this test exists to check.
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  })
  const fresh = await context.newPage()
  const errors: Array<string> = []
  fresh.on('pageerror', (error) => errors.push(error.message))

  await fresh.goto('/')
  await loadReference(fresh)

  const tempo = fresh.getByLabel(/^Tempo/)
  await tempo.fill('96')
  await expect(tempo).toHaveValue('96')

  await fresh.reload()
  await expect(
    fresh.getByRole('heading', { level: 1, name: 'Spirophonic' }),
  ).toBeVisible()

  await expect(fresh.getByLabel(/^Tempo/)).toHaveValue('96')
  await expect(
    fresh.getByRole('region', { name: 'Composition tree' }).getByText('Wheel 4'),
  ).toBeVisible()
  expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([])

  await context.close()
})

test('playback recovers after the tab goes to the background', async ({
  page,
}) => {
  await loadReference(page)
  await page.getByRole('button', { name: 'Play' }).click()

  const position = () =>
    page.evaluate(() => {
      const slider = document.querySelector<HTMLInputElement>(
        'input[type="range"]',
      )
      return Number(slider?.value ?? 0)
    })
  await expect.poll(position, { timeout: 10_000 }).toBeGreaterThan(0.1)

  // Browsers throttle timers in a hidden tab. The Transport is driven by the
  // audio clock rather than by those timers, so it must keep its place.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hiddenAt = await position()

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })

  await expect.poll(position, { timeout: 10_000 }).toBeGreaterThanOrEqual(
    hiddenAt,
  )
  await page.getByRole('button', { name: 'Pause' }).click()
})

test('an audio device change does not lose the Composition', async ({ page }) => {
  await loadReference(page)
  await page.getByRole('button', { name: 'Play' }).click()
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const slider = document.querySelector<HTMLInputElement>(
            'input[type="range"]',
          )
          return Number(slider?.value ?? 0)
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.1)

  // A device change fires on the media device list, not on the AudioContext.
  // Whatever the audio stack does, the document must survive it.
  await page.evaluate(() => {
    navigator.mediaDevices?.dispatchEvent(new Event('devicechange'))
  })

  await expect(
    page.getByRole('region', { name: 'Composition tree' }).getByText('Wheel 4'),
  ).toBeVisible()
  await expect(page.getByLabel(/^Tempo/)).toHaveValue('110')
  await page.getByRole('button', { name: 'Pause' }).click()
})

/**
 * The MG-21 showcase acceptance criterion, end to end in a real browser:
 * play, seek, edit, loop, export MIDI/Strudel/WAV, save JSON, and bundle.
 */
test('the showcase runs the full workflow without errors', async ({ page }) => {
  await loadReference(page)
  const io = page.getByRole('region', { name: 'Import and export' })

  // Play and seek.
  await page.getByRole('button', { name: 'Play' }).click()
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const slider = document.querySelector<HTMLInputElement>(
            'input[type="range"]',
          )
          return Number(slider?.value ?? 0)
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.1)
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('slider', { name: 'Transport position' }).fill('1.2')

  // Edit at a safe boundary: the Composition must stay compilable throughout.
  await page.getByLabel(/^Tempo/).fill('104')
  const diagnostics = page.getByRole('region', { name: 'Compile diagnostics' })
  await expect(diagnostics).not.toContainText('error')

  // Every export path runs. Downloads are captured rather than written.
  for (const name of ['Export MIDI', 'Export SVG', 'Export JSON']) {
    const download = page.waitForEvent('download')
    await io.getByRole('button', { name }).click()
    expect((await download).suggestedFilename()).toBeTruthy()
  }

  const wav = page.waitForEvent('download')
  await io.getByRole('button', { name: 'Export WAV' }).click()
  expect((await wav).suggestedFilename()).toMatch(/\.wav$/)

  const bundle = page.waitForEvent('download')
  await io.getByRole('button', { name: 'Export bundle' }).click()
  await confirmBundleExport(page)
  expect((await bundle).suggestedFilename()).toMatch(/\.spirophonic$/)

  await expect(diagnostics).not.toContainText('error')
})

/**
 * The SoundFont path, end to end, with a real bank.
 *
 * `spessasynth_core` generates an 890-byte SF2 carrying a single saw-wave
 * preset, so this drives the real import UI with a real bank without any bank
 * shipping in the repository. The bytes are generated in the test process and
 * handed to the file input, because the page runs the built bundle and cannot
 * resolve a bare module specifier at runtime.
 *
 * Until this existed the SoundFont path could only be reasoned about.
 */
const sampleBankFile = async () => {
  const { BasicSoundBank } = await import('spessasynth_core')
  return {
    name: 'sample-saw.sf2',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(BasicSoundBank.getSampleSoundBankFile()),
  }
}

/**
 * Imports the sample bank through the real Settings dialog.
 *
 * Bank setup lives behind the Settings door and preset assignment stays in the
 * rail, so an import now crosses two surfaces sharing one inspection. Driving
 * both here is the only place that seam is exercised in a real browser.
 */
const importSampleBank = async (
  page: Page,
  fields: { license: string; attribution?: string },
) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('region', { name: 'Sound bank settings' })
  await expect(settings).toBeVisible()

  await settings.getByLabel('SoundFont license').fill(fields.license)
  if (fields.attribution) {
    await settings.getByLabel('SoundFont attribution').fill(fields.attribution)
  }
  await settings.getByLabel('SoundFont file').setInputFiles(await sampleBankFile())
  await settings.getByRole('button', { name: 'Import local bank' }).click()
  return settings
}

/**
 * jsdom ships <dialog> without showModal even at v27, so the unit suite falls
 * back to opening it non-modally and cannot see the focus trap, the inert
 * background, or Escape. Those are the whole reason for using the element, so
 * they are checked here, where the browser is real.
 */
test('Settings opens as a true modal and closes on Escape', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(dialog).toBeVisible()

  // Modal, not merely on top: the workspace behind it is inert, so a control
  // in the rail cannot be reached while Settings is open.
  const tempo = page.getByLabel('Tempo')
  await expect(tempo).not.toBeFocused()
  await expect(dialog).toHaveJSProperty('open', true)
  expect(
    await page.evaluate(() => {
      // By label, not by class: there is more than one modal in the document
      // now, and the first in source order is the Export bundle dialog.
      const element = document.querySelector('dialog[aria-label="Settings"]')
      return element instanceof HTMLDialogElement && element.matches(':modal')
    }),
  ).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // React owns the open state: reopening has to work, which it does not if the
  // element closed itself behind React's back on the first Escape.
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(dialog).toBeVisible()
})

test('a real SoundFont bank imports, exposes its preset, and assigns', async ({
  page,
}) => {
  const file = await sampleBankFile()
  expect(file.buffer.byteLength).toBe(890)

  const settings = await importSampleBank(page, {
    license: 'Apache-2.0',
    attribution: 'spessasynth_core',
  })

  // Provenance is reported where the controls that act on it live.
  await expect(settings).toContainText('Apache-2.0', { timeout: 30_000 })
  await expect(settings).toContainText('spessasynth_core')

  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(settings).toBeHidden()

  // The bank reaches the Composition and its presets are listed, which only
  // happens if the worklet registered and the bank actually parsed. Presets
  // live in a select, so the assertion reads its options rather than text.
  const banks = page.getByRole('region', { name: 'Sound banks' })
  const presets = banks.getByLabel(/^Preset /)
  await expect(presets).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(async () => presets.locator('option').allTextContents(), {
      timeout: 30_000,
    })
    .toEqual(expect.arrayContaining([expect.stringMatching(/Saw Wave/i)]))

  // Assigning the preset to an Instrument must not break compilation.
  await banks.getByLabel(/^Assign preset /).click()
  const diagnostics = page.getByRole('region', { name: 'Compile diagnostics' })
  await expect(diagnostics).not.toContainText('error')
})

test('an imported SoundFont bank survives a reload', async ({ browser }) => {
  // Its own context, because the shared beforeEach clears storage on every
  // navigation. IndexedDB is where a bank lives between sessions, so this is
  // the check that a user does not have to re-import after closing the tab.
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  })
  const fresh = await context.newPage()
  const errors: Array<string> = []
  fresh.on('pageerror', (error) => errors.push(error.message))

  await fresh.goto('/')
  await importSampleBank(fresh, { license: 'Apache-2.0' })
  await fresh.getByRole('button', { name: 'Close settings' }).click()
  const banks = fresh.getByRole('region', { name: 'Sound banks' })
  await expect(banks.getByLabel(/^Preset /)).toBeVisible({ timeout: 30_000 })

  await fresh.reload()
  await expect(
    fresh.getByRole('heading', { level: 1, name: 'Spirophonic' }),
  ).toBeVisible()

  // The vault still holds the exact bytes, keyed by their digest.
  const storedBytes = await fresh.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('spirophonic-soundbanks')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const records = await new Promise<Array<{ bytes: ArrayBuffer }>>(
      (resolve, reject) => {
        const request = database
          .transaction('soundbank-bytes', 'readonly')
          .objectStore('soundbank-bytes')
          .getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      },
    )
    database.close()
    return records.map((record) => record.bytes.byteLength)
  })

  expect(storedBytes).toEqual([890])
  expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([])
  await context.close()
})

/**
 * The bundled General MIDI bank. This is the only place the real 38 MB file is
 * exercised: the unit tests stand a generated 890-byte SoundFont in for it,
 * because the policy under test there does not depend on which bytes arrive.
 */
test('the bundled bank is served and matches its declared digest', async ({
  request,
}) => {
  // Fetched through the API context rather than the page: a 38 MB response
  // repeatedly written to the browser cache fails with ERR_CACHE_WRITE_FAILURE
  // headless, and what is under test here is the served file, not the browser.
  const response = await request.get('/soundbanks/MuseScore_General.sf3')
  expect(response.ok()).toBe(true)

  const body = await response.body()
  const { createHash } = await import('node:crypto')
  const digest = createHash('sha256').update(body).digest('hex')

  expect(body.byteLength).toBe(39_900_972)
  expect(body.subarray(0, 4).toString('latin1')).toBe('RIFF')
  expect(body.subarray(8, 12).toString('latin1')).toBe('sfbk')
  // The digest the app checks before storing anything.
  expect(digest).toBe(
    '5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3',
  )
})

test('the bundled bank licence ships beside it', async ({ request }) => {
  const response = await request.get(
    '/soundbanks/MuseScore_General_License.md',
  )
  expect(response.ok()).toBe(true)

  const text = await response.text()
  // MIT requires the copyright notices to travel with the work.
  expect(text).toMatch(/MIT license/i)
  expect(text).toMatch(/Frank Wen/)
  expect(text).toMatch(/S\. Christian Collins/)
})

test('the bundled bank reaches the vault and its presets load', async ({
  browser,
}) => {
  // 38 MB to fetch and hash, then a bank load and a two-second render. This is
  // the slowest check in the suite by design; it is the only one that touches
  // the real file.
  test.setTimeout(180_000)
  // Its own context: the shared beforeEach clears storage on every navigation,
  // and this test is about the bank persisting into the vault.
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
  })
  const fresh = await context.newPage()
  await fresh.goto('/')
  await expect(
    fresh.getByRole('heading', { level: 1, name: 'Spirophonic' }),
  ).toBeVisible()

  // Wait on the UI, not on IndexedDB. Opening the database from here without a
  // version creates an empty one at version 1, which would stop the app's own
  // upgrade from ever running and permanently break the vault it is meant to
  // observe. The Sound banks panel lists presets only after the bank has been
  // fetched, digest-verified, stored, and parsed by the app's own engine, so it
  // is both a safer signal and a stronger one.
  const banks = fresh.getByRole('region', { name: 'Sound banks' })
  // Exact: "Find preset …" and "Assign preset …" also contain this label.
  const presets = banks.getByLabel('Preset bank-musescore-general', {
    exact: true,
  })
  await expect(presets).toBeVisible({ timeout: 150_000 })

  const names = await presets.locator('option').allTextContents()
  expect(names.length).toBeGreaterThan(100)
  expect(names.join(' ')).toMatch(/Grand Piano/)

  // Only now, once the app owns the database, read what it stored.
  const stored = await fresh.evaluate(async () => {
    const digest =
      '5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3'
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('spirophonic-soundbanks')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const record = await new Promise<{ bytes: ArrayBuffer } | undefined>(
      (resolve, reject) => {
        const get = database
          .transaction('soundbank-bytes', 'readonly')
          .objectStore('soundbank-bytes')
          .get(digest)
        get.onsuccess = () => resolve(get.result)
        get.onerror = () => reject(get.error)
      },
    )
    database.close()
    return record ? record.bytes.byteLength : 0
  })

  expect(stored).toBe(39_900_972)

  await context.close()
})

/**
 * Whether compilation actually left the render thread.
 *
 * This is the only place the claim can be tested. jsdom has no Worker, so the
 * unit tests exercise the ordering rules against a stub and say nothing about
 * blocking. Here the page is asked to record its own frame timing across a real
 * edit of the reference Composition, which is the Composition that used to cost
 * about 164 ms per keystroke.
 */
test('editing the reference Composition does not block the frame', async ({
  page,
}) => {
  await loadReference(page)
  // Let the first compile and paint settle before measuring.
  await expect
    .poll(async () => canvasInk(page), { timeout: 15_000 })
    .toBeGreaterThan(500)

  await page.evaluate(() => {
    const window_ = window as unknown as {
      __frames: Array<number>
      __stop?: () => void
    }
    window_.__frames = []
    let last = performance.now()
    let running = true
    const tick = () => {
      if (!running) return
      const now = performance.now()
      window_.__frames.push(now - last)
      last = now
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    window_.__stop = () => {
      running = false
    }
  })

  // A real edit: the tempo field recompiles the whole Composition.
  const tempo = page.getByLabel(/^Tempo/)
  for (const value of ['104', '108', '112', '116', '120']) {
    await tempo.fill(value)
    await page.waitForTimeout(120)
  }

  const frames = await page.evaluate(() => {
    const window_ = window as unknown as {
      __frames: Array<number>
      __stop?: () => void
    }
    window_.__stop?.()
    return window_.__frames
  })

  expect(frames.length).toBeGreaterThan(20)
  const longest = Math.max(...frames)

  // Compiling on the render thread put a ~164 ms gap in this record on every
  // edit. The ceiling is generous enough to survive a loaded CI box while
  // still failing if the work moves back onto the main thread.
  expect(longest, `longest frame gap ${longest.toFixed(1)}ms`).toBeLessThan(100)
})
