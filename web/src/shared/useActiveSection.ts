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
export function useActiveSection(ids: string[], enabled: boolean, hash = '') {
  const [active, setActive] = useState(ids[0] ?? '')
  const requested = hash.replace('#', '')

  // Uma etapa escolhida no direcionador vale na hora. Esperar o observador
  // reagir ao scroll deixaria o indicador — e o contexto da FlowIA — atrás do
  // clique que o usuário acabou de dar.
  useEffect(() => {
    if (!enabled || !requested || !ids.includes(requested)) return
    setActive(requested)
  }, [enabled, ids.join('|'), requested])

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = ids.find((id) => visible.has(id))
        if (first) setActive(first)
      },
      // A linha de leitura fica no terço superior: é onde o olho está quando
      // a seção "começa", não quando ela toca a borda inferior da janela.
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )

    const observed = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    observed.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [enabled, ids.join('|')])

  return enabled ? active : ''
}
