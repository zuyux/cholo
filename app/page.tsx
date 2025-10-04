'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import Footer from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

const IMAGES = [
  '/meme/CHOLOSURF.jpg',
  '/meme/CHOLOBULL.png',
  '/meme/CHOLONORTE.webp',
  '/meme/CHOLOBEACH.webp'
];

export default function Page() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const onScroll = () => {
      setCurrentIndex(Math.round(container.scrollTop / window.innerHeight));
    };

    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="h-screen bg-black overflow-hidden relative">
      <Navbar />
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollPaddingTop: '5rem' }}
      >
        {IMAGES.map((src, i) => (
          <div key={i} className="h-screen w-full snap-start snap-always relative pt-20">
            <Image 
              src={src} 
              alt={`CHOLO ${i}`} 
              fill 
              className="object-cover"
              priority={i === 0} 
            />
          </div>
        ))}
      </div>

      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col gap-2">
          {IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                containerRef.current?.scrollTo({
                  top: i * window.innerHeight,
                  behavior: 'smooth'
                });
              }}
              className={`w-2 h-2 rounded-full border border-white transition-colors ${
                currentIndex === i ? 'bg-white' : 'bg-transparent'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}