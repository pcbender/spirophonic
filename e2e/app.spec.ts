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

const loadReference = async (page: Page) => {
  await page.getByRole('button', { name: 'Load reference' }).click()
  await expect(page.getByText('Wheel 4')).toBeVisible()
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
    for (const panel of document.querySelectorAll('.control-panel')) {
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
