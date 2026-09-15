import { useEffect, useState } from 'react'

/**
 * Diz qual seção da página analítica está sendo lida, para o direcionador
 * marcar a posição no argumento em vez de fingir que são rotas distintas.
 *
 * A regra é "a seção mais alta que já cruzou a linha de leitura": um
 * observador simples marcaria a última seção a entrar na tela, o que faz o
 * indicador saltar para a frente quando duas seções aparecem juntas em telas
 * altas.
 */
export function useActiveSection(ids: string[], enabled: boolean) {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return

    const visible = new Set<string>()
    let frame = 0
    const syncFromViewport = () => {
      frame = 0
      const readingLine = window.innerHeight * 0.2
      const sections = ids
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element !== null)
        .map((element) => ({ id: element.id, box: element.getBoundingClientRect() }))
      const visible = sections.filter(
        ({ box }) => box.bottom > 0 && box.top < window.innerHeight,
      )
      // At the bottom of a page a short final section cannot be moved all the
      // way to the reading line. It is still the visible section, so use it
      // when the viewport is actually at the document end. This remains
      // viewport-based and does not infer state from the URL hash.
      const passed = sections
        .filter(({ box }) => box.top <= readingLine)
        .at(-1)
      const atDocumentEnd =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
      const current = atDocumentEnd && window.scrollY > 0 ? visible.at(-1) : passed ?? visible.at(-1)
      if (current) setActive(current.id)
    }
    const scheduleViewportSync = () => {
      if (frame === 0) frame = requestAnimationFrame(syncFromViewport)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = ids.find((id) => visible.has(id))
        if (first) setActive(first)
        syncFromViewport()
      },
      // A linha de leitura fica no terço superior: é onde o olho está quando
      // a seção "começa", não quando ela toca a borda inferior da janela.
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )

    const observed = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    observed.forEach((element) => observer.observe(element))
    window.addEventListener('scroll', scheduleViewportSync, { passive: true })
    window.addEventListener('resize', scheduleViewportSync)
    syncFromViewport()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', scheduleViewportSync)
      window.removeEventListener('resize', scheduleViewportSync)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, ids.join('|')])

  return enabled ? active : ''
}
