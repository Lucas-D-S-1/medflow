import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import FluxosView from '../fluxos/FluxosView'
import HospitalView from '../hospital/HospitalView'
import RegionalView from '../regional/RegionalView'
import './AnalisePage.css'

/**
 * A investigação inteira em uma página. Descer é estreitar o recorte:
 * território, fluxos e, por fim, os estabelecimentos onde o sinal se
 * concentra. O contexto de competência e território fica na barra global e
 * acompanha as três seções.
 */
export default function AnalisePage() {
  const { hash } = useLocation()

  // A âncora precisa esperar a seção existir: as três carregam dados e só
  // ganham altura depois da primeira resposta. Sem isso, abrir um link com
  // #hospital rola para uma posição que ainda não é a da seção.
  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)

    let frame = 0
    let attempts = 0
    const tryScroll = () => {
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ block: 'start' })
        return
      }
      if (attempts++ < 60) frame = requestAnimationFrame(tryScroll)
    }
    frame = requestAnimationFrame(tryScroll)

    return () => cancelAnimationFrame(frame)
  }, [hash])

  return (
    <main className="page-main analysis-page">
      <RegionalView />
      <FluxosView />
      <HospitalView />
    </main>
  )
}
