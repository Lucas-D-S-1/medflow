import { expect, test } from '@playwright/test'
import { mockLiveSource } from './apoio'

// A configuração Node dos e2e não inclui DOM; descrevemos só a API medida.
type EntryPlayer = HTMLElement & {
  currentTime: number
  textTracks: { mode: string; language: string; activeCues: ArrayLike<{ text: string }> | null }[]
  pause: () => void
  play: () => Promise<void>
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 1440, height: 768 }, { width: 1024, height: 768 }, { width: 1280, height: 720 }]) {
  test(`vídeo da entrada: disposição, reprodução e legenda em ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mockLiveSource(page)
    const mediaRequests: string[] = []
    page.on('request', (request) => { if (request.url().endsWith('.mp4')) mediaRequests.push(request.url()) })
    await page.goto('/')
    const video = page.locator('.entry-video video')
    const play = page.getByRole('button', { name: 'Assistir ao vídeo do MedFlow, 2 minutos' })
    await expect(play).toBeVisible()
    await page.evaluate('document.fonts.ready')
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveJSProperty('paused', true)
    await expect(video).toHaveJSProperty('controls', false)
    expect(mediaRequests).toEqual([])
    await expect(page.locator('.entry-video')).toHaveCSS('animation-name', 'none')
    const intro = (await page.locator('.entry-intro').boundingBox())!
    const card = (await page.locator('.entry-video').boundingBox())!
    const player = (await video.boundingBox())!
    const actions = (await page.locator('.entry-actions').boundingBox())!
    const bubble = (await page.locator('.assistant-widget').boundingBox())!
    expect(Math.abs(player.width / player.height - 16 / 9)).toBeLessThan(.02)
    if (viewport.width >= 1024) {
      expect(card.x).toBeGreaterThan(intro.x + intro.width)
      expect(card.y + card.height).toBeLessThan(viewport.height)
    } else {
      expect(card.y).toBeGreaterThanOrEqual(intro.y + intro.height)
      expect(card.y + card.height).toBeLessThanOrEqual(actions.y)
    }
    expect(bubble.y >= card.y + card.height || bubble.x >= card.x + card.width || bubble.x + bubble.width <= card.x).toBe(true)
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', viewport.width)
    // Teclado deve disparar o mesmo gesto de reprodução e entregar foco ao player.
    await play.focus()
    await page.keyboard.press('Enter')
    await expect(video).toHaveJSProperty('paused', false)
    await expect(video).toHaveJSProperty('muted', false)
    await expect(video).toHaveJSProperty('controls', true)
    await expect(video).toBeFocused()
    await expect(play).toHaveCount(0)
    await expect.poll(() => video.evaluate((element: EntryPlayer) => element.currentTime)).toBeGreaterThan(.3)
    await expect.poll(() => video.evaluate((element: EntryPlayer) => element.textTracks[0]?.mode)).toBe('showing')
    await expect.poll(() => video.evaluate((element: EntryPlayer) => element.textTracks[0]?.activeCues?.[0]?.text)).toContain('MedFlow')
    expect(await video.evaluate((element: EntryPlayer) => element.textTracks[0].language)).toBe('pt-BR')
    await video.evaluate((element: EntryPlayer) => element.pause())
  })
}

test('play volta a ficar disponível se o navegador recusar reprodução', async ({ page }) => {
  await mockLiveSource(page)
  await page.goto('/')
  await page.locator('video').evaluate((video: EntryPlayer) => {
    video.play = () => Promise.reject(new DOMException('Reprodução indisponível', 'NotAllowedError'))
  })
  const play = page.getByRole('button', { name: 'Assistir ao vídeo do MedFlow, 2 minutos' })
  await play.click()
  await expect(play).toBeVisible()
  await expect(page.locator('video')).toHaveJSProperty('controls', false)
})

test('MP4 aceita download parcial e VTT é servido como legenda', async ({ request }) => {
  const response = await request.get('/video/medflow.mp4', { headers: { Range: 'bytes=0-1023' } })
  expect(response.status()).toBe(206)
  expect(response.headers()['content-type']).toContain('video/mp4')
  expect(response.headers()['content-range']).toMatch(/^bytes 0-1023\//)
  expect((await response.body()).length).toBe(1024)
  const captions = await request.get('/video/medflow.pt-BR.vtt')
  expect(captions.headers()['content-type']).toContain('text/vtt')
  expect(await captions.text()).toMatch(/^WEBVTT/)
})
