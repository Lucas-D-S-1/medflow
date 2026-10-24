import { useRef, useState } from 'react'

// Substitua os três arquivos deste caminho para atualizar o filme, sem mudar a tela.
const VIDEO_PATH = `${import.meta.env.BASE_URL}video/medflow`

export default function EntryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  const play = () => {
    const video = videoRef.current
    if (!video) return
    setStarted(true)
    video.controls = true
    video.muted = false
    void video.play().then(() => video.focus()).catch(() => {
      video.controls = false
      setStarted(false)
    })
  }

  return (
    <section className="entry-video" aria-labelledby="entry-video-title">
      <div className="entry-video-copy">
        <h2 id="entry-video-title">Veja o MedFlow em ação</h2>
        <p>Da região ao hospital, com a FlowIA explicando cada indicador.</p>
      </div>
      <div className="entry-video-player">
        <video
          ref={videoRef}
          aria-label="Vídeo do MedFlow"
          poster={`${VIDEO_PATH}.jpg`}
          preload="none"
          controls={started}
          playsInline
          tabIndex={started ? 0 : -1}
          width="1280"
          height="720"
        >
          <source src={`${VIDEO_PATH}.mp4`} type="video/mp4" />
          <track kind="captions" src={`${VIDEO_PATH}.pt-BR.vtt`} srcLang="pt-BR" label="Português" default />
        </video>
        {!started && <button className="entry-video-play" type="button" aria-label="Assistir ao vídeo do MedFlow, 2 minutos" onClick={play}>
          <span className="entry-video-play-icon" aria-hidden="true">▶</span>
          <span>Assista em 2 minutos</span>
        </button>}
      </div>
    </section>
  )
}
