"use client";
import Link from 'next/link';
import GetInModal from '@/components/GetInModal';
import { Globe } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [showGetInModal, setShowGetInModal] = useState(false);

  return (
    <div className="h-screen bg-gradient-to-b from-black to-gray-900 text-white dotted-grid-background flex items-center justify-center">
      <div className="max-w-xl w-full mx-auto text-center px-6 py-12 bg-black/70 rounded-2xl shadow-2xl border border-gray-800">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-transparent bg-clip-text">
          kapu: Easy Wallet for BTC & L2s
        </h1>
        <p className="text-lg md:text-xl text-gray-300 mx-6 my-12">
          Kapu makes it effortless to create, manage, and use wallets for Bitcoin and Layer 2 networks.<br />
          Instantly onboard, connect, and explore the world of BTC and L2s with a simple, secure experience.
        </p>
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-lg shadow-lg transition cursor-pointer select-none"
          onClick={() => setShowGetInModal(true)}
        >
          <Globe size={22} />
          Get Your Account
        </button>
        <div className="mt-8 text-sm text-gray-400">
          <Link href="https://github.com/fabohax/kapu" target="_blank">
          <span className="font-semibold text-[#333]">Open Source Software</span></Link>
        </div>
      </div>
      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
    </div>
  )
}
