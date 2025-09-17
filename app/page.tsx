"use client";
import Link from 'next/link';
import Image from 'next/image';
import GetInModal from '@/components/GetInModal';
import { Globe } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [showGetInModal, setShowGetInModal] = useState(false);

  return (
  <div className="min-h-screen dotted-grid-background text-foreground">
      {/* Hero Section */}
      <div className="h-screen flex items-center justify-center">
        <div className="max-w-xl w-full mx-auto text-center px-6 py-12 bg-background rounded-2xl shadow-2xl border border-muted-foreground">
          <div className="my-16 flex justify-center">
            <Image 
              src="/bitcoin-logo.svg" 
              alt="Bitcoin Logo" 
              width={80} 
              height={80} 
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold my-4 tracking-tight bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-transparent bg-clip-text">
            Easy Wallet for BTC & L2s
          </h1>
          <p className="text-lg md:text-xl text-foreground   mx-6 my-12">
            Kapo makes it effortless to create, manage, and use wallets for Bitcoin and Layer 2 networks.<br />
            Instantly onboard, connect, and explore the world of BTC and L2s with a simple, secure experience.
          </p>
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-background font-semibold text-lg shadow-lg transition cursor-pointer select-none"
            onClick={() => setShowGetInModal(true)}
          >
            <Globe size={22} />
            Get Your Account
          </button>
          <div className="mt-8 text-sm text-gray-400">
            <Link href="https://github.com/fabohax/kapo" target="_blank">
            <span className="font-semibold text-foreground">Open Source Software</span></Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-transparent bg-clip-text">
            Why Choose Kapo?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-background rounded-xl border border-gray-700">
              <div className="w-16 h-16 bg-[#2563eb] rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe size={32} className="text-background" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Setup</h3>
              <p className="text-foreground">
                Create your wallet in seconds with just a few clicks. No technical knowledge required.
              </p>
            </div>
            <div className="text-center p-6 bg-background rounded-xl border border-gray-700">
              <div className="w-16 h-16 bg-[#2563eb] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-background" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure</h3>
              <p className="text-foreground">
                Your private keys are stored securely and never leave your device. Full control over your funds.
              </p>
            </div>
            <div className="text-center p-6 bg-background rounded-xl border border-gray-700">
              <div className="w-16 h-16 bg-[#2563eb] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-background" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Chain</h3>
              <p className="text-foreground">
                Support for Bitcoin and Layer 2 networks. Manage all your assets in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-transparent bg-clip-text">
            How It Works
          </h2>
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="w-12 h-12 bg-[#2563eb] rounded-full flex items-center justify-center text-background font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-2xl font-semibold mb-3">Create Your Wallet</h3>
                <p className="text-foreground text-lg">
                  Generate a new wallet instantly or import an existing one using your seed phrase. 
                  Your wallet is created securely on your device.
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-16 h-16 text-background" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M12,2L14.39,5.42C15.92,7.31 17.68,8.88 19.66,10.12C20.1,10.36 20.2,10.95 19.83,11.31L12,21.5L4.17,11.31C3.8,10.95 3.9,10.36 4.34,10.12C6.32,8.88 8.08,7.31 9.61,5.42L12,2Z"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="flex-1">
                <div className="w-12 h-12 bg-[#2563eb] rounded-full flex items-center justify-center text-background font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-2xl font-semibold mb-3">Manage Your Assets</h3>
                <p className="text-foreground text-lg">
                  View your Bitcoin and Layer 2 balances, send and receive funds, 
                  and track your transaction history all in one simple interface.
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-16 h-16 text-background" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 11,10V14A2,2 0 0,1 9,16H1V8H9Z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="w-12 h-12 bg-[#2563eb] rounded-full flex items-center justify-center text-background font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-2xl font-semibold mb-3">Explore L2 Ecosystem</h3>
                <p className="text-foreground text-lg">
                  Access Layer 2 networks for faster, cheaper transactions. 
                  Participate in DeFi, NFTs, and other Web3 applications with ease.
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-16 h-16 text-background" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-transparent bg-clip-text">
            Ready to Start?
          </h2>
          <p className="text-xl text-foreground mb-8">
            Join thousands of users who trust Kapo for their Bitcoin and Layer 2 needs.
          </p>
          <button
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-background font-semibold text-xl shadow-lg transition cursor-pointer select-none"
            onClick={() => setShowGetInModal(true)}
          >
            <Globe size={24} />
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-transparent bg-clip-text">
                Kapo Wallet
              </h3>
              <p className="text-gray-400 mb-6">
                The easiest way to manage your Bitcoin and Layer 2 assets. 
                Secure, simple, and built for everyone. Open source software under GNU License.
              </p>
              <div className="flex gap-4">
                <Link href="https://github.com/fabohax/kapo" target="_blank" className="text-gray-400 hover:text-foreground transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </Link>
                <Link href="https://twitter.com/kapo" target="_blank" className="text-gray-400 hover:text-foreground transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                  </svg>
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/wallet" className="hover:text-foreground transition">Wallet</Link></li>
                <li><Link href="/features" className="hover:text-foreground transition">Features</Link></li>
                <li><Link href="/security" className="hover:text-foreground transition">Security</Link></li>
                <li><Link href="/roadmap" className="hover:text-foreground transition">Roadmap</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/docs" className="hover:text-foreground transition">Documentation</Link></li>
                <li><Link href="/help" className="hover:text-foreground transition">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition">Contact</Link></li>
                <li><Link href="/community" className="hover:text-white transition">Community</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 Kapo Wallet. Open source software licensed under GNU License.
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
              <Link href="/cookies" className="hover:text-white transition">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {showGetInModal && <GetInModal onClose={() => setShowGetInModal(false)} />}
    </div>
  )
}
