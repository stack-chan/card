import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function openExport(page: Page) {
  await page.getByRole('button', { name: '書き出し', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '書き出し', exact: true })).toBeVisible()
}
async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'デザインの調整', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'デザインの調整' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.preview-card svg')).toBeVisible()
})

test('idle screen contains the current editor, backgrounds and preview', async ({ page }) => {
  await expect(page.locator('.fields-panel input,.fields-panel textarea')).toHaveCount(9)
  await expect(page.getByRole('radio')).toHaveCount(8)
  await expect(page.getByRole('button')).toHaveCount(3)
  await expect(page.getByRole('button', { name: '画像を選ぶ' })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
  const text = await page.locator('body').innerText()
  for (const removed of ['YOUR CARD', 'LIVE PREVIEW', '保存済み', '6 PATTERNS', '自動フィット', '入力して']) expect(text).not.toContain(removed)
})

test('header shows the version and links to the card repository', async ({ page }) => {
  await expect(page.locator('.brand-version')).toContainText('v0.2.0')
  const repository = page.getByRole('link', { name: 'GitHubでcardのリポジトリを見る' })
  await expect(repository).toHaveAttribute('href', 'https://github.com/stack-chan/card')
  await expect(repository.locator('svg')).toBeVisible()
})

test('editing updates the card and survives a reload', async ({ page }) => {
  await page.getByLabel('名前', { exact: true }).fill('開発者 太郎')
  await expect(page.locator('.preview-card [data-field="name"]')).toHaveText('開発者 太郎')
  await page.waitForFunction(() => localStorage.getItem('stackchan-card-studio:v1')?.includes('開発者 太郎'))
  await page.reload()
  await expect(page.getByLabel('名前', { exact: true })).toHaveValue('開発者 太郎')
})

test('accounts accept handles, omit URL prefixes and hide empty fields', async ({ page }) => {
  await page.getByLabel('GitHub', { exact: true }).fill('https://github.com/example-user')
  await page.getByLabel('X', { exact: true }).fill('@example_user')
  await expect(page.locator('.preview-card [data-field="github"]')).toHaveText('example-user')
  await expect(page.locator('.preview-card [data-field="x"]')).toHaveText('@example_user')
  await page.getByLabel('X', { exact: true }).fill('')
  await expect(page.locator('.preview-card [data-field="x"]')).toHaveCount(0)
})

test('email and websites appear first, and empty contacts leave no icons', async ({ page }) => {
  await page.getByLabel('メールアドレス').fill('hello@example.com')
  await page.getByLabel('Webサイト 1').fill('https://example.com/')
  await page.getByLabel('Webサイト 2').fill('https://stack-chan.com/')
  const contacts = page.locator('.preview-card [data-field]')
  await expect(contacts.filter({ hasText: 'hello@example.com' })).toHaveCount(1)
  await expect(page.locator('.preview-card [data-field="website1"]')).toHaveText('example.com')
  await expect(page.locator('.preview-card [data-field="website2"]')).toHaveText('stack-chan.com')
  for (const label of ['メールアドレス', 'Webサイト 1', 'Webサイト 2', 'GitHub', 'X']) await page.getByLabel(label, { exact: true }).fill('')
  await expect(page.locator('.preview-card [data-field="email"],.preview-card [data-field="website1"],.preview-card [data-field="website2"],.preview-card [data-field="github"],.preview-card [data-field="x"]')).toHaveCount(0)
})

test('avatar persists, exports inside the thought bubble, and can be deleted', async ({ page }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1kAAAAASUVORK5CYII=', 'base64')
  await page.locator('input[type=file]').setInputFiles({ name: 'icon.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('[data-avatar-bubble]')).toHaveCount(1)
  await page.waitForFunction(() => localStorage.getItem('stackchan-card-studio:avatar:v1')?.startsWith('data:image/jpeg;base64,'))
  await page.reload()
  await expect(page.getByRole('button', { name: '画像を変更' })).toBeVisible()
  await openExport(page)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SVG', exact: true }).click()
  const content = await readFile((await (await pending).path())!, 'utf8')
  expect(content).toContain('data-avatar-bubble="true"')
  expect(content).toContain('data:image/jpeg;base64,')
  await page.getByRole('button', { name: '画像を削除' }).click()
  await expect(page.locator('[data-avatar-bubble]')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: '画像を選ぶ' })).toBeVisible()
})

test('portrait changes paper dimensions, layout, and exported PNG size', async ({ page }) => {
  await page.getByRole('radio', { name: '縦' }).check()
  await expect(page.locator('.preview-card svg')).toHaveAttribute('viewBox', '0 0 550 910')
  await expect(page.locator('.paper-caption')).toContainText('55 × 91 mm')
  await openExport(page)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: /^PNG/ }).click()
  const bytes = await readFile((await (await pending).path())!)
  expect(bytes.readUInt32BE(16)).toBe(1299)
  expect(bytes.readUInt32BE(20)).toBe(2150)
})

test('portrait preview fits a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('radio', { name: '縦' }).check()
  const card = await page.locator('.preview-card').boundingBox()
  expect(card).not.toBeNull()
  expect(card!.x).toBeGreaterThanOrEqual(0)
  expect(card!.x + card!.width).toBeLessThanOrEqual(390)
  expect(card!.width / card!.height).toBeCloseTo(55 / 91, 2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('six backgrounds are selectable with mouse and keyboard', async ({ page }) => {
  for (const [name, id] of [['設計図', 'blueprint'], ['ドット', 'dots'], ['やわらか', 'soft'], ['ストライプ', 'stripe'], ['シンプル', 'plain'], ['仲間たち', 'scatter']]) {
    await page.getByRole('radio', { name, exact: true }).check()
    await expect(page.locator('.preview-card [data-background]')).toHaveAttribute('data-background', id)
  }
  await page.getByRole('radio', { name: '仲間たち', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: '設計図', exact: true })).toBeChecked()
})

test('settings use native controls and Escape restores focus', async ({ page }) => {
  await openSettings(page)
  for (const [name, x] of [['文字を右に', '61'], ['中央揃え', '383'], ['文字を左に', '595']]) {
    await page.getByRole('radio', { name, exact: true }).check()
    await expect(page.locator('[data-main-robot]')).toHaveAttribute('x', x)
  }
  await page.getByRole('radio', { name: 'ティール', exact: true }).check()
  await page.getByLabel('柄の濃さ').focus()
  await page.keyboard.press('End')
  await expect(page.getByLabel('柄の濃さ')).toHaveValue('100')
  await page.getByRole('checkbox', { name: 'ガイドを表示' }).check()
  await expect(page.locator('.preview-card [data-guide]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'デザインの調整' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'デザインの調整', exact: true })).toBeFocused()
})

test('outside click dismisses the popover', async ({ page }) => {
  await openSettings(page)
  await page.locator('.brand').click()
  await expect(page.getByRole('dialog', { name: 'デザインの調整' })).not.toBeVisible()
})

test('invalid names get inline feedback and cannot export', async ({ page }) => {
  for (const name of ['', '極'.repeat(60)]) {
    await page.getByLabel('名前', { exact: true }).fill(name)
    await expect(page.getByLabel('名前', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await openExport(page)
    await expect(page.getByRole('button', { name: 'SVG', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
  }
})

test('SVG export embeds images, preserves dimensions and removes guides', async ({ page }) => {
  await openSettings(page)
  await page.getByRole('checkbox', { name: 'ガイドを表示' }).check()
  await page.keyboard.press('Escape')
  await openExport(page)
  await page.getByRole('checkbox', { name: '塗り足し 3 mm' }).check()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SVG', exact: true }).click()
  const download = await pending
  const content = await readFile((await download.path())!, 'utf8')
  expect(content).toContain('width="97mm"')
  expect(content).toContain('height="61mm"')
  expect(content).toContain('data:image/png;base64,')
  expect(content).not.toContain('data-guide')
})

test('PNG export contains real PNG data', async ({ page }) => {
  await openExport(page)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: /^PNG/ }).click()
  const download = await pending
  const bytes = await readFile((await download.path())!)
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(bytes.readUInt32BE(16)).toBe(2150)
  expect(bytes.readUInt32BE(20)).toBe(1299)
  expect(bytes.includes(Buffer.from('pHYs'))).toBeTruthy()
})

test('print opens the card at the selected paper size', async ({ page }) => {
  await page.getByRole('radio', { name: '縦' }).check()
  await openExport(page)
  const pending = page.waitForEvent('popup')
  await page.getByRole('button', { name: '印刷 / PDF' }).click()
  const popup = await pending
  await expect(popup.getByRole('button', { name: '印刷 / PDF保存' })).toBeVisible()
  await expect(popup.getByText('55 × 91 mm', { exact: true })).toBeVisible()
  await popup.close()
})

test('reset requires confirmation and restores the view', async ({ page }) => {
  await page.getByLabel('名前', { exact: true }).fill('変更')
  await openSettings(page)
  page.once('dialog', d => d.dismiss())
  await page.getByRole('button', { name: '初期値に戻す' }).click()
  await expect(page.getByLabel('名前', { exact: true })).toHaveValue('変更')
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: '初期値に戻す' }).click()
  await expect(page.getByLabel('名前', { exact: true })).toHaveValue('ししかわ')
})

for (const [width, height] of [[320, 640], [390, 844], [760, 800], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440]]) {
  test(`${width}x${height}: paper remains framed with no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    const card = await page.locator('.preview-card').boundingBox()
    expect(card).not.toBeNull()
    expect(card!.x).toBeGreaterThanOrEqual(0)
    expect(card!.x + card!.width).toBeLessThanOrEqual(width + .1)
    expect(card!.y + card!.height).toBeLessThanOrEqual(height + .1)
    expect(card!.width / card!.height).toBeCloseTo(91 / 55, 2)
    await openSettings(page)
    const panel = await page.getByRole('dialog', { name: 'デザインの調整' }).boundingBox()
    expect(panel!.x).toBeGreaterThanOrEqual(0)
    expect(panel!.y).toBeGreaterThanOrEqual(0)
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(width + .1)
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(height + .1)
  })
}
