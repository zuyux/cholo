'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Copy, LoaderCircle, X } from 'lucide-react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { OPEN_AUTH_FLOW_EVENT } from '@/lib/authEvents';
import { OPEN_REWARD_CLAIM_EVENT } from '@/lib/rewardEvents';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';

const gallery = Array.from(
  { length: 21 },
  (_, index) => `/nft/${String(index + 1).padStart(2, '0')}.png`,
);

const allocations = [
  ['01', 'Liquidez DEX', '28.57%'],
  ['02', 'Airdrops comunitarios', '17.14%'],
  ['03', 'Fondo DeSci', '14.29%'],
  ['04', 'Recompensas de staking', '14.29%'],
  ['05', 'Reserva de tesorería', '14.21%'],
  ['06', 'Ecosistema NFT', '11.43%'],
];

const CHOLO_CONTRACT = 'SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD.cholo';

const choloArchive = [
  ['/cholo/cholo-001.png', 'Origen', 'Antes de los imperios'],
  ['/cholo/cholo-01.png', 'Ancestro', 'El guardián aparece'],
  ['/cholo/cholo-02.png', 'Civilización', 'Memoria de la costa norte'],
  ['/cholo/cholo-buda.png', 'Espíritu', 'El perro contempla'],
  ['/cholo/cholo-yisus.png', 'Fe', 'Un nuevo relato llega'],
  ['/cholo/cholo-calle.png', 'Calle', 'La ciudad lo adopta'],
  ['/cholo/cholo-gansta.png', 'Resistencia', 'Sin miedo ni permiso'],
  ['/cholo/cholo-surfer.png', 'Costa', 'Regreso al Pacífico'],
  ['/cholo/cholo-wallstreet.png', 'Mercado', 'El cholo entra al sistema'],
  ['/cholo/cholo-moderno.png', 'Ahora', 'Identidad contemporánea'],
  ['/cholo/cholo-underconstruction.png', 'Construcción', 'La comunidad programa'],
  ['/cholo/cholo-astral.png', 'Futuro', 'Más allá de la cadena'],
  ['/cholo/cholo-cyber.png', 'Cypherpunk', 'El guardián digital'],
] as const;

function GalleryImage({ src, index }: { src: string; index: number }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && (
        <div className="cholo-gallery-loader" aria-hidden="true">
          <LoaderCircle aria-hidden="true" />
        </div>
      )}
      <Image
        src={src}
        alt={`Arte CHOLO ${index + 1}`}
        fill
        sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 25vw"
        className={isLoading ? 'is-loading' : 'is-loaded'}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
    </>
  );
}

function CholoArchiveTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.35 });
  const x = useTransform(progress, [0, 1], ['0%', '-91%']);
  const lineScale = useTransform(progress, [0, 1], [0, 1]);

  return (
    <div className="archive-scroll" ref={timelineRef}>
      <div className="archive-sticky">
        <div className="archive-ui cholo-shell"><span>ARCHIVO CRONOLÓGICO / 001—CYBER</span><span>DESLIZA PARA AVANZAR →</span></div>
        <div className="archive-progress cholo-shell"><motion.i style={{ scaleX: lineScale }} /></div>
        <motion.div className="archive-track" style={{ x }}>
          {choloArchive.map(([src, era, description], index) => (
            <article className="archive-era" key={src}>
              <div className="archive-image">
                <Image src={src} alt={`${era}: ${description}`} fill sizes="(max-width: 680px) 82vw, 46vw" />
                <span>{String(index + 1).padStart(3, '0')}</span>
              </div>
              <div className="archive-caption">
                <span>{index === 0 ? 'TIEMPO ANCESTRAL' : index === choloArchive.length - 1 ? 'ACTUALIDAD' : `ERA ${String(index + 1).padStart(2, '0')}`}</span>
                <h3>{era}</h3><p>{description}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const currentAddress = useCurrentAddress();

  const copyContract = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(CHOLO_CONTRACT);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = CHOLO_CONTRACT;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();

        const copiedWithFallback = document.execCommand('copy');
        textArea.remove();

        if (!copiedWithFallback) throw new Error('Copy command was rejected');
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('Unable to copy the CHOLO contract:', error);
    }
  };

  const openAuthFlow = () => {
    window.dispatchEvent(new Event(OPEN_AUTH_FLOW_EVENT));
  };

  const openRewardFlow = () => {
    window.dispatchEvent(new Event(currentAddress ? OPEN_REWARD_CLAIM_EVENT : OPEN_AUTH_FLOW_EVENT));
  };

  return (
    <div className="cholo-site">
      <div className="cholo-ticker" aria-label="Estado de la red CHOLO">
        <div className="cholo-shell cholo-ticker-inner">
          <span className="cholo-live"><i />EN VIVO</span>
          <span><b>RED</b> STACKS</span>
          <span><b>ANCLADO A</b> BITCOIN</span>
          <span className="ticker-end">LATAM · DESDE 2025</span>
        </div>
      </div>

      <section className="cholo-hero" id="top">
        <div className="hero-copy-cholo">
          <p className="cholo-kicker">Edición Bitcoin Punk · Costa Norte</p>
          <h1>el perro que nunca obdc</h1>
          <p className="cholo-deck">
            desde este momento, eres libre e independiente, por la voluntad general de CHOLO
          </p>
          <div className="cholo-actions">
            <a className="cholo-button cholo-button-primary" href="#files">Conoce al Cholo</a>
            <Link className="cholo-button cholo-button-outline" href="/wallet">Abrir billetera <ArrowUpRight size={15} /></Link>
          </div>
          <dl className="cholo-stats">
            <div><dt>Suministro</dt><dd>8.9B</dd></div>
            <div><dt>Capa</dt><dd>Stacks</dd></div>
            <div><dt>Base</dt><dd>Bitcoin</dd></div>
          </dl>
        </div>

        <div className="cholo-hero-art mt-0" aria-label="Arte del archivo CHOLO">
          <div className="cholo-paper cholo-paper-back" />
          <div className="cholo-paper cholo-paper-mid" />
          <div className="cholo-terminal hero-terminal">
            <div className="cholo-terminal-bar"><span>ARCHIVO_CHOLO / EDICIÓN_01</span><span>□ □ ×</span></div>
            <div className="cholo-art-stage">
              <Image src="/a-cholo.png" alt="Moneda dorada de CHOLO" fill priority sizes="(max-width: 900px) 90vw, 48vw" />
              <span className="cross cross-one">+</span><span className="cross cross-two">+</span>
              <div className="scanline" />
            </div>
          </div>
          <div className="cholo-issue"><span>ARCHIVO VIVO</span><strong>PERÚ / BITCOIN</strong><i /></div>
          <a className="cholo-ticket" href="#gallery"><span>MINISTERIO DE MEMES</span>21 COLECCIONABLES <b>↓</b></a>
        </div>
      </section>

      <div className="cholo-shell cholo-scroll"><span>Desplázate para investigar</span><ArrowDown size={15} /></div>

      <section className="cholo-paper-section" id="files">
        <div className="cholo-shell cholo-story-grid">
          <div>
            <p className="cholo-kicker">01 / Los archivos CHOLO</p>
            <h2>Todo internet necesita un guardián.</h2>
          </div>
          <div className="cholo-story-copy">
            <p className="story-lead">Nacido antes de los imperios. Reaparecido justo a tiempo para la economía digital.</p>
            <p>$CHOLO está inspirado en el viringo peruano: un símbolo vivo de resistencia, identidad y adaptación. La comunidad mezcla arte, cultura cypherpunk y educación para crear infraestructura pública alrededor de Bitcoin.</p>
            <blockquote>“Sin pelo. Sin miedo. Sin permiso.”</blockquote>
          </div>
        </div>
        <CholoArchiveTimeline />
      </section>

      <section className="cholo-dark-section" id="tokenomics">
        <div className="cholo-shell">
          <div className="cholo-heading-row">
            <div><p className="cholo-kicker">02 / Economía Cholo</p><h2>Distribución con propósito.</h2></div>
            <p>Una economía comunitaria para liquidez, participación, ciencia descentralizada y cultura digital verificable.</p>
          </div>
          <div className="cholo-terminal token-terminal-cholo">
            <div className="cholo-terminal-bar"><span>INFO_TOKEN_CHOLO.SYS</span><span className="system-online"><i />SISTEMA EN LÍNEA</span></div>
            <div className="allocation-grid">
              {allocations.map(([index, label, value]) => (
                <article key={index}><span>{index}</span><strong>{value}</strong><p>{label}</p></article>
              ))}
            </div>
            <div className="contract-row-cholo">
              <div><span>Contrato en Stacks</span><code>{CHOLO_CONTRACT}</code></div>
              <button onClick={copyContract}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copiado' : 'Copiar'}</button>
              <a href="https://explorer.hiro.so/txid/SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD.cholo?chain=mainnet&tab=sourceCode" target="_blank" rel="noreferrer">Código fuente <ArrowUpRight size={14} /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="cholo-gallery-section" id="gallery">
        <div className="cholo-shell">
          <div className="gallery-heading">
            <div><p className="cholo-kicker">03 / Transmisiones culturales</p><h2>El archivo no se queda quieto.</h2></div>
            <p><strong>{gallery.length}</strong><span>piezas recuperadas</span></p>
          </div>
          <div className="gallery-terminal">
            <div className="cholo-terminal-bar"><span>DIRECTORIO_MULTIMEDIA_CHOLO.SYS</span><span className="system-online"><i />ARCHIVO LISTO</span></div>
            <div className="cholo-gallery-grid">
              {gallery.map((src, index) => (
                <button key={src} onClick={() => setSelectedImage(src)} aria-label={`Abrir arte CHOLO ${index + 1}`}>
                  <GalleryImage src={src} index={index} />
                  <span>{String(index + 1).padStart(2, '0')} / CHOLO</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cholo-paper-section cholo-mission" id="mission">
        <div className="cholo-shell mission-grid">
          <div>
            <p className="cholo-kicker">04 / La misión</p>
            <h2 className="text-right">no prometemos nada. <br/>lo haremos todo.</h2>
            <p>$CHOLO convierte la energía de una comunidad meme en apoyo al desarrollo de un videojuego, investigación, educación cripto, arte y código abierto.</p>
            <button className="cholo-button mission-button" type="button" onClick={openAuthFlow}>Entrar al ecosistema <ArrowUpRight size={15} /></button>
          </div>
          <div className="mission-list">
            <article><span>01</span><h3>GameFi</h3><p>Juego de metaverso abierto para competir por $CHOLOs.</p></article>
            <article><span>02</span><h3>DeSci</h3><p>Subvenciones abiertas para ciencia e investigación chola.</p></article>
            <article><span>03</span><h3>Cultura</h3><p>Memoria ancestral reinterpretada por artistas cholazos.</p></article>
            <article><span>04</span><h3>Código abierto</h3><p>Herramientas públicas, transparentes y cholas.</p></article>
          </div>
        </div>
      </section>

      <section className="cholo-paper-section cholo-rewards text-white" id="rewards">
        <div className="cholo-shell mission-grid">
          <div className="rewards-copy">
            <p className="cholo-kicker">05 / Recompensas de la comunidad</p>
            <h2 className="text-right">¿Quieres ganar<br/><span>100 $CHOLOs?</span></h2>
            <span className="my-10 inline-block bg-white px-3 py-2 text-[#b7132f]">Sigue a la manada en X y participa por una recompensa de 100 $CHOLOs.</span>
            <button className="cholo-button mission-button" type="button" onClick={openRewardFlow}>Reclamar 100 $CHOLOs <ArrowUpRight size={15} /></button>
          </div>
          <div className="mission-list reward-social-list">
            <article><span>01</span><h3><b aria-hidden="true">𝕏</b> X</h3><a href="https://x.com/cholocoinmeme" target="_blank" rel="noreferrer">@cholocoinmeme <ArrowUpRight size={15} /></a></article>
            <p className="reward-note"><strong>01</strong> Sigue la cuenta <i /> <strong>02</strong> Mantente atento al anuncio</p>
          </div>
        </div>
      </section>

      <footer className="cholo-footer">
        <div className="cholo-shell footer-main-cholo">
          <a href="#top" className="footer-brand-cholo"><Image src="/a-cholo.png" alt="" width={52} height={52} /><span>$CHOLO<br /></span></a>
          <p>el perro punk que nunca obdc.</p>
          <div><a href="https://x.com/cholocoinmeme" target="_blank" rel="noreferrer">X ↗</a><Link href="/wallet">Billetera ↗</Link><Link href="/account">Cuenta ↗</Link></div>
        </div>
        <div className="cholo-shell footer-fineprint"><span>© 2026 $CHOLO</span><p>Token cultural y educativo. No representa una promesa de retorno financiero.</p></div>
      </footer>

      {selectedImage && (
        <div className="cholo-lightbox" role="dialog" aria-modal="true" onClick={() => setSelectedImage(null)}>
          <button onClick={() => setSelectedImage(null)} aria-label="Cerrar"><X /></button>
          <div onClick={(event) => event.stopPropagation()}><Image src={selectedImage} alt="Arte CHOLO ampliado" fill sizes="90vw" /></div>
        </div>
      )}
    </div>
  );
}
