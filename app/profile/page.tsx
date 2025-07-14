'use client';

import React from 'react';
import { HiroWalletContext } from '@/components/HiroWalletProvider';

export default function ProfilePage() {
  const { mainnetAddress, testnetAddress } = React.useContext(HiroWalletContext);
  const currentAddress = mainnetAddress || testnetAddress || null;

  if (!currentAddress) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <div className='bg-[#333] rounded-full h-24 w-24 flex items-center justify-center mb-8'>
          {/* Optionally add a user icon here */}
        </div>
        <h2 className='text-2xl mb-2'>Profile</h2>
        <p className='text-sm text-[#777]'>Please connect your wallet.</p>
      </div>
    );
  }

  return (
    <div className='my-24 mx-auto w-full px-8'>
      <div className='text-center items-center justify-center'>
        <div className='mt-36 mx-auto'>
          <div className='mx-auto my-8 bg-[#333] rounded-full h-24 w-24 cursor-pointer select-none'>
            {/* You can add a user icon here if desired */}
          </div>
        </div>
        <h2 className='text-4xl mt-8'>@username</h2>
        <p className='mt-4 mb-8 text-sm text-[#777]'>{currentAddress}</p>
      </div>
    </div>
  );
}