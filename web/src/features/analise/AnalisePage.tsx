import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import HospitalView from '../hospital/HospitalView'
import RegionalView from '../regional/RegionalView'
import { ANCHOR_REQUEST_EVENT, requestAnalysisAnchor } from '../../shared/analysisNavigation'
import './AnalisePage.css'

function anchorIsReady(target: HTMLElement, id: string) {
  // The hospital section exists while its state panel is loading, but its
  // position is not final until the current hospital list has arrived.
  return id !== 'hospital' || target.dataset.anchorReady === 'true'
}

/**
 * A investigação inteira em uma página. Descer é estreitar o recorte:
 * território e, em seguida, os estabelecimentos onde o sinal se concentra. O
 * contexto de competência e território acompanha as duas etapas.
 */
export default function AnalisePage() {
  const { hash } = useLocation()

  // A âncora precisa esperar a seção real existir: #hospital também existe como
  // placeholder durante o carregamento, mas sua posição só é confiável depois
  // da lista da competência atual.
  useEffect(() => {
    let pendingAnchor: string | null = null
    const scrollIfReady = (id: string) => {
      const target = document.getElementById(id)
      if (!target || !anchorIsReady(target, id)) {
        pendingAnchor = id
        return
      }
      pendingAnchor = null
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({
        block: 'start',
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
      target.focus({ preventScroll: true })
    }
    const onAnchorRequest = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      if (id) scrollIfReady(id)
    }

    const observer = new MutationObserver(() => {
      if (pendingAnchor) scrollIfReady(pendingAnchor)
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-anchor-ready'],
    })
    window.addEventListener(ANCHOR_REQUEST_EVENT, onAnchorRequest)
    if (hash) scrollIfReady(hash.slice(1))

    return () => {
      window.removeEventListener(ANCHOR_REQUEST_EVENT, onAnchorRequest)
      observer.disconnect()
    }
  }, [hash])

  return (
    <main className="page-main analysis-page">
      <RegionalView
        onViewHospitals={() => requestAnalysisAnchor('hospital')}
      />
      <HospitalView />
    </main>
  )
}
