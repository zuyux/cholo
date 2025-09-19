"use client";
import GetInModal from '@/components/GetInModal';
import { useState } from "react";
import Footer from '@/components/Footer';

export default function Home() {
  const [showGetInModal, setShowGetInModal] = useState(false);

  return (
  <div className="min-h-screen dotted-grid-background text-foreground">

      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
        <Footer/>
    </div>
  )
}
