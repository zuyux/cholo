'use client';

import { Button } from '@/components/ui/button';
import { WalletMinimal } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const Navbar = () => {

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full bg-background/15 backdrop-blur supports-[backdrop-filter]:bg-background/10 z-100 select-none">
        <div className="mx-auto px-2 md:px-4">
          <div className="flex justify-between h-24 items-center">
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="no-underline">
                <Button className="text-foreground bg-transparent cursor-pointer hover:bg-background">
                  <WalletMinimal/>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
