'use client';

import React, { useState, useEffect } from 'react';
import { getPersistedNetwork } from '@/lib/network';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export function NetworkNotification() {
  const [network, setNetwork] = useState<string>('mainnet');
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentNetwork = getPersistedNetwork();
    setNetwork(currentNetwork);
    
    // Show notification if not dismissed and not on mainnet
    const isDismissed = localStorage.getItem('network-notification-dismissed') === 'true';
    setDismissed(isDismissed);
    
    if (!isDismissed && currentNetwork !== 'mainnet') {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('network-notification-dismissed', 'true');
  };

  const getNetworkInfo = () => {
    switch (network) {
      case 'mainnet':
        return {
          icon: CheckCircle,
          color: 'bg-green-500/10 border-green-500/20 text-green-400',
          iconColor: 'text-green-400',
          title: 'Mainnet Active',
          message: 'You are connected to Stacks Mainnet. Real STX and transactions.'
        };
      case 'testnet':
        return {
          icon: AlertTriangle,
          color: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
          iconColor: 'text-orange-400',
          title: 'Testnet Active',
          message: 'You are on Stacks Testnet. Use test STX only. No real value.'
        };
      case 'devnet':
        return {
          icon: Info,
          color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          iconColor: 'text-blue-400',
          title: 'Devnet Active',
          message: 'You are on Stacks Devnet. Development environment only.'
        };
      default:
        return {
          icon: Info,
          color: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
          iconColor: 'text-gray-400',
          title: 'Network Unknown',
          message: 'Network status unclear. Please check your connection.'
        };
    }
  };

  if (!show || dismissed) return null;

  const networkInfo = getNetworkInfo();
  const Icon = networkInfo.icon;

  return (
    <div className={`fixed top-20 left-4 right-4 md:left-auto md:right-4 md:w-96 ${networkInfo.color} backdrop-blur-sm border rounded-lg p-4 z-40 shadow-lg`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${networkInfo.iconColor} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{networkInfo.title}</h4>
          <p className="text-xs opacity-90 leading-relaxed">{networkInfo.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Descartar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
