"use client";
import Image from 'next/image';
import GetInModal from '@/components/GetInModal';
import { useState, useRef, useEffect } from "react";
import Footer from '@/components/Footer';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

export default function Home() {
  const [showGetInModal, setShowGetInModal] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [sliderInstanceRef, setSliderInstanceRef] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // KeenSlider setup
  const [instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created(slider) {
      setLoaded(true);
      setSliderInstanceRef(slider);
    },
  });

  // Auto-play functionality
  useEffect(() => {
    if (!sliderInstanceRef) return;
    const interval = setInterval(() => {
      sliderInstanceRef.next();
    }, 3500);
    return () => clearInterval(interval);
  }, [sliderInstanceRef]);

  return (
    <div className="min-h-screen h-screen w-screen overflow-hidden dotted-grid-background text-foreground flex flex-col">
      <div ref={instanceRef} className="keen-slider relative z-12 flex-1 min-h-screen h-screen w-full">
        {/* Tablet/Desktop only slides */}
        <div className="keen-slider__slide min-h-screen h-screen w-full relative hidden sm:flex items-center justify-center">
          <Image src="/meme/CHOLOSURF.jpg" alt="CHOLO SURF" fill style={{objectFit: 'cover', objectPosition: 'center'}} priority />
        </div>
        <div className="keen-slider__slide min-h-screen h-screen w-full relative hidden sm:flex items-center justify-center">
          <Image src="/meme/CHOLOBULL.jpg" alt="CHOLO BULL" fill style={{objectFit: 'cover', objectPosition: 'center'}} priority />
        </div>
        <div className="keen-slider__slide min-h-screen h-screen w-full relative hidden sm:flex items-center justify-center">
          <Image src="/meme/CHOLONORTE.webp" alt="CHOLO NORTE" fill style={{objectFit: 'cover', objectPosition: 'center'}} priority />
        </div>
        {/* Mobile only slides */}
        <div className="keen-slider__slide min-h-screen h-screen w-full relative flex sm:hidden items-center justify-center">
          <Image src="/meme/CHOLOWORK.webp" alt="CHOLO WORK" fill style={{objectFit: 'cover', objectPosition: 'center'}} priority />
        </div>
        <div className="keen-slider__slide min-h-screen h-screen w-full relative flex sm:hidden items-center justify-center">
          <Image src="/meme/CHOLOYISUS.webp" alt="CHOLO YISUS" fill style={{objectFit: 'cover', objectPosition: 'center'}} priority />
        </div>

        {/* Slider navigation arrows */}
        {loaded && sliderInstanceRef && (
          <>
            <button
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition"
              onClick={() => sliderInstanceRef.prev()}
              aria-label="Previous slide"
            >
              &#8592;
            </button>
            <button
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 bg-black/40 text-white rounded-full p-2 hover:bg-black/70 transition"
              onClick={() => sliderInstanceRef.next()}
              aria-label="Next slide"
            >
              &#8594;
            </button>
          </>
        )}

        {/* Dots navigation */}
        {loaded && sliderInstanceRef && (
          <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex gap-2">
            {/* Dots: 3 for desktop/tablet, 2 for mobile */}
            <>
              <span className="hidden sm:flex">
                {[0,1,2].map(idx => (
                  <button
                    key={idx}
                    onClick={() => sliderInstanceRef.moveToIdx(idx)}
                    className={`w-3 h-3 rounded-full border border-white ${currentSlide === idx ? 'bg-white' : 'bg-transparent'}`}
                    aria-label={`Go to slide ${idx+1}`}
                  />
                ))}
              </span>
              <span className="flex sm:hidden">
                {[0,1].map(idx => (
                  <button
                    key={idx}
                    onClick={() => sliderInstanceRef.moveToIdx(idx+3)}
                    className={`w-3 h-3 rounded-full border border-white ${currentSlide === idx+3 ? 'bg-white' : 'bg-transparent'}`}
                    aria-label={`Go to slide ${idx+4}`}
                  />
                ))}
              </span>
            </>
          </div>
        )}
      </div>

      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
      <Footer/>
    </div>
  )
}
