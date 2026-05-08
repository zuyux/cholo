'use client';

import Image from 'next/image';
import { useState } from 'react';
import { X, LoaderCircle } from 'lucide-react';
import Footer from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

const IMAGES = [
  'https://cholo.mypinata.cloud/ipfs/bafkreihic2cxadjbw6bcfavr2huy2yx4u2ysfkmf4nje6fieocejaajqge',
  'https://cholo.mypinata.cloud/ipfs/bafkreiekcsn5g5mya7cvb2fe6aaagbfv62dudhvpx7wp2eqzimqsl5rqsq',
  'https://cholo.mypinata.cloud/ipfs/bafybeifnimvxznay73e23qhgekst43cuh2ccdypo4qiwt44juwbkdzrgza',
  'https://cholo.mypinata.cloud/ipfs/bafkreiapigqic2dl6wijrja5aj2ov26kepntupy4bummljk7v5pxdz7iui',
  'https://cholo.mypinata.cloud/ipfs/bafkreiflzp5xosko44rjyxoz44ykyij2sys26yr72r7ketbopa2xji4goe',
  'https://cholo.mypinata.cloud/ipfs/bafkreie7edzm6amvlyj2bym2npwu65jchpdtxmq3cvabi3hyp2lbdmoplq',
  'https://cholo.mypinata.cloud/ipfs/bafybeihmudtaslctegym5nceddxxxa4njqnf5toydbiysi4a52ixhiwziy',
  'https://cholo.mypinata.cloud/ipfs/bafybeidpp52otfi7yqiq4cqblvamocant5vwp4xznecbkl2nfywsv2lpre',
  'https://cholo.mypinata.cloud/ipfs/bafybeiaelvfe35r5ebeywcufewunreouryvfpj4zorgy5cwydhr4ljofse',
  'https://cholo.mypinata.cloud/ipfs/bafybeiggyhaglct5rjwim3dci5upttcoh4g2ydtuoqz7yb6bgm5fcvt27i',
  'https://cholo.mypinata.cloud/ipfs/bafybeihq7p2trgiygomt2jm263qh3yd4y6x2odcqvk5fqdwgmprvxegqru',
  'https://cholo.mypinata.cloud/ipfs/bafybeif4mkahouwzr5vfegxwttvgv743hqsvenr5pemzhx5c4srosd3nrq'
];

export default function Page() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const openModal = (src: string) => {
    setSelectedImage(src);
    setIsImageLoading(true);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setIsImageLoading(false);
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 sm:pt-20 px-2 sm:px-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 max-w-7xl mx-auto">
          {IMAGES.map((src, i) => (
            <div 
              key={i} 
              className="aspect-square relative rounded-md sm:rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => openModal(src)}
            >
              <Image 
                src={src} 
                alt={`CHOLO ${i}`} 
                fill 
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                priority={i < 4} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* $CHOLO Information Section */}
      <div className="max-w-4xl mx-auto px-16 py-16 mb-16 bg-card rounded-3xl border border-border my-8">
        <div className="text-center mb-12">
          <Image
            src="https://cholo.mypinata.cloud/ipfs/bafybeid6oo6es4erf2etwtxmpac3z2v7swfamkcslqq2q55yseshl3wwoa"
            alt="$CHOLO"
            width={200}
            height={200}
            className="mx-auto mb-4 rounded-full"
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">$CHOLO</h1>
          <p className="text-xl text-muted-foreground mb-6">
            El perro legendario de la costa norte, ahora guardián punk INTERPLANETARIO
          </p>
          <div className="flex justify-center mb-8">
            <a 
              href="https://x.com/cholocoinmeme" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-foreground text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors font-semibold"
            >
              Síguenos en X @cholocoinmeme
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* About Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">¿Qué es $CHOLO?</h2>
              <p className="text-muted-foreground leading-relaxed">
                $CHOLO es un memecoin cultural y cypherpunk inspirado en el viringo perro calato (o &ldquo;perro CHOLO&rdquo;), 
                anclado a Bitcoin mediante la red Stacks como un token comunitario que une tradición prehispánica 
                de mirada histriónica y estética punk impulsada por la tecnología de protocolos distribuidos par-a-par.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Su objetivo es mezclar humor, arte y cultura digital con utilidad social educativa sobre las criptomonedas, destinando parte de su 
                ecosistema a apoyar iniciativas DeSci y proyectos de código abierto.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">🔒 Seguridad Técnica</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Token estándar:</strong> Estándar Stacks interoperable y seguro</li>
                <li>• <strong>Liquidez garantizada:</strong> Pares en exchanges descentralizados</li>
                <li>• <strong>Transparencia total:</strong> Contratos auditados y equipo identificado</li>
                <li>• <strong>Distribución justa:</strong> Sin preventa, airdrops comunitarios</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">🌐 Comunidad y Cultura</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Historia ancestral:</strong> Conexión con cultura mochica y perros CHOLO</li>
                <li>• <strong>Arte original:</strong> Diseños únicos y memes compartibles</li>
                <li>• <strong>Roadmap transparente:</strong> Desarrollo comunitario y colaborativo</li>
              </ul>
            </div>
          </div>

          {/* Tokenomics Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">🧬 Tokenomics DeSci</h2>
              <div className="bg-muted rounded-xl p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-semibold">Liquidez DEX</span>
                    <span className="text-primary">28.57%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-semibold">Airdrops Comunidad</span>
                    <span className="text-primary">17.14%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-semibold">Fondo DeSci</span>
                    <span className="text-green-500">14.29%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-semibold">Recompensas Staking</span>
                    <span className="text-primary">14.29%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-semibold">Tesorería Reserva</span>
                    <span className="text-primary">14.21%</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="font-semibold">Ecosistema NFT</span>
                    <span className="text-primary">11.43%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">DAO Zuyux</span>
                    <span className="text-primary">0.07%</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">🧪 Fondo DeSci</h3>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-muted-foreground mb-3">
                  <strong>Objetivo:</strong> Financiar investigación abierta en biotecnología, sostenibilidad, 
                  conservación cultural y tecnológica usando modelos de ciencia descentralizada.
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Votaciones comunitarias para asignar fondos</li>
                  <li>• Grants abiertos a investigadores alineados</li>
                  <li>• Reportes transparentes on-chain</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">🚀 Ideas de Crecimiento</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• <strong>NFTs CHOLO:</strong> Arte único con ediciones limitadas</li>
                <li>• <strong>Merchandise:</strong> Camisetas y stickers con diseños originales</li>
                <li>• <strong>Colaboraciones:</strong> Creadores de contenido latinoamericanos</li>
                <li>• <strong>Impacto social:</strong> Conservación y educación cultural</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-yellow-400 border border-primary/20 rounded-xl text-center">
          <h3 className="text-lg font-semibold text-background mb-2">💡 Dato curioso</h3>
          <p className="text-background text-xl">
            $CHOLO es la primera memecoin basada en LATAM y anclada a la capa 2 de Bitcoin mediante la red Stacks.
          </p>
        </div>
      </div>

      {/* Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
          onClick={closeModal}
        >
          {/* Close button - positioned absolutely to be on top of everything */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 z-[60] bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-2 sm:p-3 transition-all duration-200 border border-white/20 hover:border-white/40 shadow-2xl cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
            {/* Loading spinner */}
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <LoaderCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-spin" />
              </div>
            )}
            
            {/* Full size image with enhanced padding */}
            <div 
              className="relative flex items-center justify-center max-w-full max-h-full w-fit h-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage}
                alt="CHOLO Full View"
                width={1200}
                height={1200}
                className={`object-contain max-w-[90vw] max-h-[85vh] sm:max-w-[85vw] sm:max-h-[85vh] w-auto h-auto shadow-2xl rounded-md sm:rounded-lg transition-opacity duration-300 ${
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                priority
                onLoad={handleImageLoad}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}