'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Copy, X } from 'lucide-react';

const gallery = Array.from({ length: 12 }, (_, index) => `/cholo/gallery-${index + 1}.png`);

const allocations = [
  ['01', 'DEX liquidity', '28.57%'],
  ['02', 'Community airdrops', '17.14%'],
  ['03', 'DeSci fund', '14.29%'],
  ['04', 'Staking rewards', '14.29%'],
  ['05', 'Treasury reserve', '14.21%'],
  ['06', 'NFT ecosystem', '11.43%'],
];

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyContract = async () => {
    await navigator.clipboard.writeText('SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD.cholo');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="cholo-site">
      <div className="cholo-ticker" aria-label="CHOLO network status">
        <div className="cholo-shell cholo-ticker-inner">
          <span className="cholo-live"><i />LIVE</span>
          <span><b>NETWORK</b> STACKS</span>
          <span><b>ANCHORED TO</b> BITCOIN</span>
          <span className="ticker-end">LATAM · EST. 2025</span>
        </div>
      </div>

      <section className="cholo-hero" id="top">
        <div className="hero-copy-cholo">
          <p className="cholo-kicker">Bitcoin Punk Edition · Costa Norte</p>
          <h1>El perro que nunca se domestica.</h1>
          <p className="cholo-deck">
            Cultura ancestral, humor de internet y coordinación abierta. $CHOLO lleva al perro peruano
            sin pelo desde la costa norte hasta Bitcoin.
          </p>
          <div className="cholo-actions">
            <a className="cholo-button cholo-button-primary" href="#files">Conoce al Cholo</a>
            <Link className="cholo-button cholo-button-outline" href="/wallet">Abrir wallet <ArrowUpRight size={15} /></Link>
          </div>
          <dl className="cholo-stats">
            <div><dt>Supply</dt><dd>7B</dd></div>
            <div><dt>Layer</dt><dd>Stacks</dd></div>
            <div><dt>Finality</dt><dd>Bitcoin</dd></div>
          </dl>
        </div>

        <div className="cholo-hero-art" aria-label="CHOLO archive artwork">
          <div className="cholo-paper cholo-paper-back" />
          <div className="cholo-paper cholo-paper-mid" />
          <div className="cholo-terminal hero-terminal">
            <div className="cholo-terminal-bar"><span>CHOLO_ARCHIVE / ISSUE_01</span><span>□ □ ×</span></div>
            <div className="cholo-art-stage">
              <Image src="/cholo/cholo-hero.png" alt="Moneda dorada de CHOLO" fill priority sizes="(max-width: 900px) 90vw, 48vw" />
              <span className="cross cross-one">+</span><span className="cross cross-two">+</span>
              <div className="scanline" />
            </div>
          </div>
          <div className="cholo-issue"><span>ARCHIVO VIVO</span><strong>PERÚ / BITCOIN</strong><i /></div>
          <a className="cholo-ticket" href="#gallery"><span>MEME DEPARTMENT</span>12 transmissions <b>↓</b></a>
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
          <div className="cholo-portrait">
            <Image src="/cholo/gallery-11.png" alt="Arte de CHOLO" fill sizes="(max-width: 900px) 90vw, 45vw" />
            <span>ARCHIVO / COSTA NORTE</span>
          </div>
          <div className="cholo-timeline">
            <div><strong>ANTES</strong><span>Guardián del mundo prehispánico</span></div>
            <div><strong>AHORA</strong><span>Memecoin cultural en Stacks</span></div>
            <div><strong>DESPUÉS</strong><span>GameFi, DeSci y código abierto</span></div>
          </div>
        </div>
      </section>

      <section className="cholo-dark-section" id="tokenomics">
        <div className="cholo-shell">
          <div className="cholo-heading-row">
            <div><p className="cholo-kicker">02 / Cholo economics</p><h2>Distribución con propósito.</h2></div>
            <p>Una economía comunitaria para liquidez, participación, ciencia descentralizada y cultura digital verificable.</p>
          </div>
          <div className="cholo-terminal token-terminal-cholo">
            <div className="cholo-terminal-bar"><span>CHOLO_TOKEN_INFO.SYS</span><span className="system-online"><i />SYSTEM ONLINE</span></div>
            <div className="allocation-grid">
              {allocations.map(([index, label, value]) => (
                <article key={index}><span>{index}</span><strong>{value}</strong><p>{label}</p></article>
              ))}
            </div>
            <div className="contract-row-cholo">
              <div><span>Stacks contract</span><code>SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD.cholo</code></div>
              <button onClick={copyContract}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copiado' : 'Copiar'}</button>
              <a href="https://explorer.hiro.so" target="_blank" rel="noreferrer">Explorer <ArrowUpRight size={14} /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="cholo-gallery-section" id="gallery">
        <div className="cholo-shell">
          <div className="gallery-heading">
            <div><p className="cholo-kicker">03 / Transmisiones culturales</p><h2>El archivo no se queda quieto.</h2></div>
            <p><strong>12</strong><span>piezas recuperadas</span></p>
          </div>
          <div className="gallery-terminal">
            <div className="cholo-terminal-bar"><span>CHOLO_MEDIA_DIRECTORY.SYS</span><span className="system-online"><i />ARCHIVE READY</span></div>
            <div className="cholo-gallery-grid">
              {gallery.map((src, index) => (
                <button key={src} onClick={() => setSelectedImage(src)} aria-label={`Abrir arte CHOLO ${index + 1}`}>
                  <Image src={src} alt={`Arte CHOLO ${index + 1}`} fill sizes="(max-width: 680px) 50vw, (max-width: 1100px) 33vw, 25vw" />
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
            <h2>Cultura que financia conocimiento abierto.</h2>
            <p>$CHOLO convierte la energía de una comunidad meme en apoyo a investigación, educación cripto, conservación cultural y software open source.</p>
            <Link className="cholo-button mission-button" href="/wallet">Entrar al ecosistema <ArrowUpRight size={15} /></Link>
          </div>
          <div className="mission-list">
            <article><span>01</span><h3>DeSci</h3><p>Grants abiertos para ciencia e investigación verificable.</p></article>
            <article><span>02</span><h3>Cultura</h3><p>Memoria ancestral reinterpretada por artistas digitales.</p></article>
            <article><span>03</span><h3>Open source</h3><p>Herramientas públicas, transparentes y componibles.</p></article>
          </div>
        </div>
      </section>

      <footer className="cholo-footer">
        <div className="cholo-shell footer-main-cholo">
          <a href="#top" className="footer-brand-cholo"><Image src="/cholo/cholo-hero.png" alt="" width={52} height={52} /><span>$CHOLO<br />PERÚ</span></a>
          <p>El perro punk nunca duerme.</p>
          <div><a href="https://x.com/cholocoinmeme" target="_blank" rel="noreferrer">X ↗</a><Link href="/wallet">Wallet ↗</Link><Link href="/account">Account ↗</Link></div>
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
