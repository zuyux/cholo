'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import GetInModal from '@/components/GetInModal';

export const Navbar = () => {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 select-none h-20">
      <div className="mx-auto p-0 full">
        <div className="flex justify-between items-center h-full">
          {/* Logo Section */}
          <Link href="/" className="no-underline">
            <Button className="title py-6 font-extrabold text-3xl md:text-5xl lg:text-6xl text-white backdrop-blur-sm bg-transparent hover:bg-black/20">
              $CHOLO
            </Button>
          </Link>

          {showModal && (
            <GetInModal onClose={() => setShowModal(false)} />
          )}
        </div>
      </div>
    </nav>
  )
}